class Tetris3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.gameBoard = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.ghostPiece = null; // Shadow piece showing where current piece will land
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.dropTimer = 0;
        this.dropInterval = 1000;
        this.boardWidth = 10;
        this.boardHeight = 20;
        this.boardDepth = 10;
        this.blockSize = 0.9;
        
        // Camera control
        this.cameraRotation = { x: 0, y: 0 };
        this.isDragging = false;
        this.lastTouch = { x: 0, y: 0 };
        this.cameraDistance = 15;
        
        // Board remains fixed at position 0 - no rotation
        
        // Swipe detection
        this.swipeStart = { x: 0, y: 0 };
        this.swipeThreshold = 50;
        
        this.pieceTypes = [
            { // I-piece
                blocks: [[0,0,0], [0,1,0], [0,2,0], [0,3,0]],
                color: 0x00ffff
            },
            { // O-piece
                blocks: [[0,0,0], [1,0,0], [0,1,0], [1,1,0]],
                color: 0xffff00
            },
            { // T-piece
                blocks: [[0,1,0], [1,0,0], [1,1,0], [1,2,0]],
                color: 0x800080
            },
            { // S-piece
                blocks: [[0,1,0], [0,2,0], [1,0,0], [1,1,0]],
                color: 0x00ff00
            },
            { // Z-piece
                blocks: [[0,0,0], [0,1,0], [1,1,0], [1,2,0]],
                color: 0xff0000
            },
            { // J-piece
                blocks: [[0,0,0], [1,0,0], [1,1,0], [1,2,0]],
                color: 0x0000ff
            },
            { // L-piece
                blocks: [[0,2,0], [1,0,0], [1,1,0], [1,2,0]],
                color: 0xffa500
            }
        ];
        
        // Initialize board tilt for drag controls
        this.boardTilt = { x: 0, z: 0 };
        
        this.init();
    }
    
    init() {
        this.setupThreeJS();
        this.setupGameBoard();
        this.setupControls();
        this.setupUI();
        this.startGame();
        this.animate();
    }
    
    setupThreeJS() {
        const canvas = document.getElementById('gameCanvas');
        const container = document.getElementById('gameArea');
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        
        // Camera - Fixed side view position
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        
        // Set camera position at 45 degrees laterally
        const distance = 20;
        const angle = Math.PI / 4; // 45 degrees
        this.cameraAngle = angle;
        this.cameraDistance = distance;
        this.camera.position.set(
            Math.cos(this.cameraAngle) * this.cameraDistance,
            this.boardHeight/2 + 5,
            Math.sin(this.cameraAngle) * this.cameraDistance
        );
        this.camera.lookAt(0, this.boardHeight/2, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);
        
        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupGameBoard() {
        // Initialize empty board
        this.gameBoard = [];
        for (let x = 0; x < this.boardWidth; x++) {
            this.gameBoard[x] = [];
            for (let y = 0; y < this.boardHeight; y++) {
                this.gameBoard[x][y] = [];
                for (let z = 0; z < this.boardDepth; z++) {
                    this.gameBoard[x][y][z] = null;
                }
            }
        }
        
        // Create board group and center it
        this.boardGroup = new THREE.Group();
        // Center the board in the scene
        this.boardGroup.position.set(
            -(this.boardWidth - 1) / 2,
            0,
            -(this.boardDepth - 1) / 2
        );
        this.scene.add(this.boardGroup);
        
        // Create board boundaries
        this.createBoardBoundaries();
    }
    
    // Board rotation removed - board stays fixed at position 0
    
    resetBoardTilt() {
        if (!this.boardTilt) return;
        
        // Gradually return board to level position
        const resetSpeed = 0.1;
        this.boardTilt.x *= (1 - resetSpeed);
        this.boardTilt.z *= (1 - resetSpeed);
        
        // Apply the gradual reset
        this.boardGroup.rotation.x = this.boardTilt.x;
        this.boardGroup.rotation.z = this.boardTilt.z;
        
        // Stop when close enough to zero
        if (Math.abs(this.boardTilt.x) < 0.01 && Math.abs(this.boardTilt.z) < 0.01) {
            this.boardTilt.x = 0;
            this.boardTilt.z = 0;
            this.boardGroup.rotation.x = 0;
            this.boardGroup.rotation.z = 0;
        }
    }
    
    createBoardBoundaries() {
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x333333, 
            transparent: true, 
            opacity: 0.3 
        });
    }
    
    rotatePieceDirectional(touchInfo) {
        if (!this.currentPiece) return;
        
        const centerX = touchInfo.canvasWidth / 2;
        const centerY = touchInfo.canvasHeight / 2;
        const touchX = touchInfo.x;
        const touchY = touchInfo.y;
        
        // Calculate relative position from center
        const deltaX = touchX - centerX;
        const deltaY = touchY - centerY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        // Get current camera orientation to determine visible face
        const cameraAngleY = this.cameraAngle || 0;
        
        // Normalize angle to 0-2π range
        const normalizedAngle = ((cameraAngleY % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
        
        let rotationAxis;
        
        // Determine rotation axis based on touch direction and current view angle
        if (absY > absX) {
            // Vertical touch
            if (deltaY < 0) {
                // Touch up - rotate "away" from viewer
                rotationAxis = this.getAxisForDirection('up', normalizedAngle);
            } else {
                // Touch down - rotate "toward" viewer  
                rotationAxis = this.getAxisForDirection('down', normalizedAngle);
            }
        } else {
            // Horizontal touch
            if (deltaX < 0) {
                // Touch left - rotate left relative to current view
                rotationAxis = this.getAxisForDirection('left', normalizedAngle);
            } else {
                // Touch right - rotate right relative to current view
                rotationAxis = this.getAxisForDirection('right', normalizedAngle);
            }
        }
        
        // Apply rotation
        if (!this.rotatePiece(this.currentPiece, rotationAxis)) {
            // Fallback to Y-axis rotation if the intended rotation fails
            this.rotatePiece(this.currentPiece, 'y');
        }
    }
    
    getAxisForDirection(direction, viewAngle) {
        // Determine which 3D axis corresponds to the touch direction based on current view
        const sector = Math.floor((viewAngle + Math.PI/4) / (Math.PI/2)) % 4;
        
        switch(direction) {
            case 'up':
            case 'down':
                // Vertical touches always rotate around X-axis (pitch)
                return 'x';
                
            case 'left':
            case 'right':
                // Horizontal touches rotate around different axes based on view angle
                switch(sector) {
                    case 0: // Front view
                    case 2: // Back view
                        return 'z'; // Roll rotation
                    case 1: // Right side view
                    case 3: // Left side view
                        return 'y'; // Yaw rotation
                    default:
                        return 'z';
                }
                
            default:
                return 'y';
        }
    }
    
    createBoardBoundaries() {
        // Create a more solid and attractive base
        const baseThickness = 0.5;
        const baseGeometry = new THREE.BoxGeometry(this.boardWidth + 1, baseThickness, this.boardDepth + 1);
        const baseMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2c3e50,
            shininess: 30,
            transparent: false
        });
        
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.set(this.boardWidth/2 - 0.5, -baseThickness/2 - 0.5, this.boardDepth/2 - 0.5);
        base.receiveShadow = true;
        this.boardGroup.add(base);
        
        // Create grid lines on the base for better visual reference
        const gridMaterial = new THREE.LineBasicMaterial({ color: 0x34495e, linewidth: 1 });
        
        // Vertical grid lines
        for (let x = 0; x <= this.boardWidth; x++) {
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x - 0.5, -0.4, -0.5),
                new THREE.Vector3(x - 0.5, -0.4, this.boardDepth - 0.5)
            ]);
            const line = new THREE.Line(geometry, gridMaterial);
            this.boardGroup.add(line);
        }
        
        // Horizontal grid lines
        for (let z = 0; z <= this.boardDepth; z++) {
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-0.5, -0.4, z - 0.5),
                new THREE.Vector3(this.boardWidth - 0.5, -0.4, z - 0.5)
            ]);
            const line = new THREE.Line(geometry, gridMaterial);
            this.boardGroup.add(line);
        }
        
        // Create elegant side borders
        const borderHeight = 0.3;
        const borderMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x34495e,
            shininess: 50,
            transparent: true,
            opacity: 0.8
        });
        
        // Front border
        const frontBorder = new THREE.BoxGeometry(this.boardWidth + 1, borderHeight, 0.1);
        const frontBorderMesh = new THREE.Mesh(frontBorder, borderMaterial);
        frontBorderMesh.position.set(this.boardWidth/2 - 0.5, borderHeight/2 - 0.5, this.boardDepth - 0.45);
        frontBorderMesh.castShadow = true;
        this.boardGroup.add(frontBorderMesh);
        
        // Back border
        const backBorderMesh = new THREE.Mesh(frontBorder, borderMaterial);
        backBorderMesh.position.set(this.boardWidth/2 - 0.5, borderHeight/2 - 0.5, -0.55);
        backBorderMesh.castShadow = true;
        this.boardGroup.add(backBorderMesh);
        
        // Left border
        const sideBorder = new THREE.BoxGeometry(0.1, borderHeight, this.boardDepth + 1);
        const leftBorderMesh = new THREE.Mesh(sideBorder, borderMaterial);
        leftBorderMesh.position.set(-0.55, borderHeight/2 - 0.5, this.boardDepth/2 - 0.5);
        leftBorderMesh.castShadow = true;
        this.boardGroup.add(leftBorderMesh);
        
        // Right border
        const rightBorderMesh = new THREE.Mesh(sideBorder, borderMaterial);
        rightBorderMesh.position.set(this.boardWidth - 0.45, borderHeight/2 - 0.5, this.boardDepth/2 - 0.5);
        rightBorderMesh.castShadow = true;
        this.boardGroup.add(rightBorderMesh);
        
        // Add corner decorations
        const cornerSize = 0.2;
        const cornerMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x3498db,
            shininess: 100
        });
        
        const cornerGeometry = new THREE.SphereGeometry(cornerSize, 8, 8);
        const corners = [
            [-0.5, 0, -0.5],
            [this.boardWidth - 0.5, 0, -0.5],
            [-0.5, 0, this.boardDepth - 0.5],
            [this.boardWidth - 0.5, 0, this.boardDepth - 0.5]
        ];
        
        corners.forEach(pos => {
            const corner = new THREE.Mesh(cornerGeometry, cornerMaterial);
            corner.position.set(pos[0], pos[1], pos[2]);
            corner.castShadow = true;
            this.boardGroup.add(corner);
        });
    }
    
    createBlock(color, x, y, z) {
        const geometry = new THREE.BoxGeometry(this.blockSize, this.blockSize, this.blockSize);
        const material = new THREE.MeshLambertMaterial({ color: color });
        const block = new THREE.Mesh(geometry, material);
        
        block.position.set(x, y, z);
        block.castShadow = true;
        block.receiveShadow = true;
        
        // Add edge lines
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        block.add(wireframe);
        
        return block;
    }
    
    createPiece(type) {
        const pieceData = this.pieceTypes[type];
        const piece = {
            type: type,
            blocks: [],
            meshes: [],
            position: { x: Math.floor(this.boardWidth/2), y: this.boardHeight - 1, z: Math.floor(this.boardDepth/2) },
            rotation: { x: 0, y: 0, z: 0 }
        };
        
        pieceData.blocks.forEach(blockPos => {
            const block = {
                x: blockPos[0],
                y: blockPos[1],
                z: blockPos[2]
            };
            piece.blocks.push(block);
            
            const mesh = this.createBlock(
                pieceData.color,
                piece.position.x + block.x,
                piece.position.y - block.y,
                piece.position.z + block.z
            );
            piece.meshes.push(mesh);
            this.boardGroup.add(mesh);
        });
        
        return piece;
    }
    
    updatePiecePosition(piece) {
        piece.blocks.forEach((block, index) => {
            const mesh = piece.meshes[index];
            mesh.position.set(
                piece.position.x + block.x,
                piece.position.y - block.y,
                piece.position.z + block.z
            );
        });
    }
    
    canMovePiece(piece, dx, dy, dz) {
        for (let block of piece.blocks) {
            const newX = piece.position.x + block.x + dx;
            const newY = piece.position.y - block.y + dy;
            const newZ = piece.position.z + block.z + dz;
            
            // Check boundaries
            if (newX < 0 || newX >= this.boardWidth || 
                newY < 0 || newY >= this.boardHeight ||
                newZ < 0 || newZ >= this.boardDepth) {
                return false;
            }
            
            // Check collision with placed blocks
            if (this.gameBoard[newX][newY][newZ] !== null) {
                return false;
            }
        }
        return true;
    }
    
    movePiece(piece, dx, dy, dz) {
        if (this.canMovePiece(piece, dx, dy, dz)) {
            piece.position.x += dx;
            piece.position.y += dy;
            piece.position.z += dz;
            this.updatePiecePosition(piece);
            
            // Update ghost piece if this is the current piece
            if (piece === this.currentPiece) {
                this.updateGhostPiece();
            }
            
            return true;
        }
        return false;
    }
    
    rotatePiece(piece, axis = 'y') {
        if (!piece) return false;
        
        let rotatedBlocks;
        
        switch(axis) {
            case 'x': // Rotation around X axis
                rotatedBlocks = piece.blocks.map(block => ({
                    x: block.x,
                    y: -block.z,
                    z: block.y
                }));
                break;
            case 'y': // Rotation around Y axis
                rotatedBlocks = piece.blocks.map(block => ({
                    x: -block.z,
                    y: block.y,
                    z: block.x
                }));
                break;
            case 'z': // Rotation around Z axis
                rotatedBlocks = piece.blocks.map(block => ({
                    x: -block.y,
                    y: block.x,
                    z: block.z
                }));
                break;
            default:
                rotatedBlocks = piece.blocks.map(block => ({
                    x: -block.z,
                    y: block.y,
                    z: block.x
                }));
        }
        
        // Check if rotation is valid
        const originalBlocks = piece.blocks;
        piece.blocks = rotatedBlocks;
        
        if (this.canMovePiece(piece, 0, 0, 0)) {
            this.updatePiecePosition(piece);
            
            // Update ghost piece if this is the current piece
            if (piece === this.currentPiece) {
                this.updateGhostPiece();
            }
            
            return true;
        } else {
            piece.blocks = originalBlocks;
            return false;
        }
    }
    
    placePiece(piece) {
        piece.blocks.forEach((block, index) => {
            const x = piece.position.x + block.x;
            const y = piece.position.y - block.y;
            const z = piece.position.z + block.z;
            
            this.gameBoard[x][y][z] = piece.meshes[index];
        });
        
        // Remove ghost piece when placing current piece
        if (piece === this.currentPiece) {
            this.removeGhostPiece();
        }
        
        this.checkForCompletedLayers();
    }
    
    checkForCompletedLayers() {
        let completedLayers = [];
        
        for (let y = 0; y < this.boardHeight; y++) {
            let layerComplete = true;
            for (let x = 0; x < this.boardWidth && layerComplete; x++) {
                for (let z = 0; z < this.boardDepth && layerComplete; z++) {
                    if (this.gameBoard[x][y][z] === null) {
                        layerComplete = false;
                    }
                }
            }
            if (layerComplete) {
                completedLayers.push(y);
            }
        }
        
        if (completedLayers.length > 0) {
            this.clearLayers(completedLayers);
            this.updateScore(completedLayers.length);
        }
    }
    
    clearLayers(layers) {
        // Remove meshes from scene
        layers.forEach(y => {
            for (let x = 0; x < this.boardWidth; x++) {
                for (let z = 0; z < this.boardDepth; z++) {
                    if (this.gameBoard[x][y][z]) {
                        this.boardGroup.remove(this.gameBoard[x][y][z]);
                        this.gameBoard[x][y][z] = null;
                    }
                }
            }
        });
        
        // Move blocks down
        layers.sort((a, b) => b - a); // Sort descending
        layers.forEach(clearedY => {
            for (let y = clearedY; y < this.boardHeight - 1; y++) {
                for (let x = 0; x < this.boardWidth; x++) {
                    for (let z = 0; z < this.boardDepth; z++) {
                        this.gameBoard[x][y][z] = this.gameBoard[x][y + 1][z];
                        if (this.gameBoard[x][y][z]) {
                            this.gameBoard[x][y][z].position.y = y;
                        }
                    }
                }
            }
            // Clear top layer
            for (let x = 0; x < this.boardWidth; x++) {
                for (let z = 0; z < this.boardDepth; z++) {
                    this.gameBoard[x][this.boardHeight - 1][z] = null;
                }
            }
        });
    }
    
    updateScore(linesCleared) {
        const points = [0, 100, 300, 500, 800];
        this.score += points[linesCleared] * this.level;
        this.lines += linesCleared;
        this.level = Math.floor(this.lines / 10) + 1;
        this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
        
        this.updateUI();
    }
    
    updateUI() {
        document.getElementById('scoreValue').textContent = this.score;
        document.getElementById('levelValue').textContent = this.level;
        document.getElementById('linesValue').textContent = this.lines;
    }
    
    updateCameraPosition() {
        const x = Math.cos(this.cameraRotation.y) * Math.cos(this.cameraRotation.x) * this.cameraDistance + this.boardWidth/2;
        const y = Math.sin(this.cameraRotation.x) * this.cameraDistance + this.boardHeight/2;
        const z = Math.sin(this.cameraRotation.y) * Math.cos(this.cameraRotation.x) * this.cameraDistance + this.boardDepth/2;
        
        this.camera.position.set(x, y, z);
        this.camera.lookAt(this.boardWidth/2, this.boardHeight/2, this.boardDepth/2);
    }
    
    setupControls() {
        const canvas = document.getElementById('gameCanvas');
        
        // Touch controls for camera and swipes
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.isDragging = false; // Start as false
            this.hasMoved = false;
            this.lastTouch = { x: touch.clientX, y: touch.clientY };
            this.swipeStart = { x: touch.clientX, y: touch.clientY };
            this.touchStartTime = Date.now();
            
            // Store canvas dimensions for directional piece rotation
            const rect = canvas.getBoundingClientRect();
            this.touchStartCanvas = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top,
                canvasWidth: rect.width,
                canvasHeight: rect.height
            };
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.lastTouch.x;
            const deltaY = touch.clientY - this.lastTouch.y;
            const totalDeltaX = touch.clientX - this.swipeStart.x;
            const totalDeltaY = touch.clientY - this.swipeStart.y;
            const totalDistance = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY);
            
            // If moved more than 20px, consider it camera drag
            if (totalDistance > 20 && !this.hasMoved) {
                this.isDragging = true;
            }
            
            this.hasMoved = true;
            
            // Tilt board and move piece if dragging
            if (this.isDragging) {
                // Tilt the board based on drag direction
                const tiltSpeed = 0.02;
                this.boardTilt = this.boardTilt || { x: 0, z: 0 };
                
                this.boardTilt.z += deltaX * tiltSpeed; // Left/right tilt
                this.boardTilt.x += deltaY * tiltSpeed; // Forward/back tilt
                
                // Limit tilt angles
                this.boardTilt.x = Math.max(-0.3, Math.min(0.3, this.boardTilt.x));
                this.boardTilt.z = Math.max(-0.3, Math.min(0.3, this.boardTilt.z));
                
                // Apply tilt to board
                this.boardGroup.rotation.x = this.boardTilt.x;
                this.boardGroup.rotation.z = this.boardTilt.z;
                
                // Move current piece based on tilt
                if (this.currentPiece) {
                    const moveForce = 0.1;
                    const moveX = Math.round(this.boardTilt.z * moveForce * 10);
                    const moveZ = Math.round(this.boardTilt.x * moveForce * 10);
                    
                    if (moveX !== 0) {
                        this.movePiece(this.currentPiece, moveX, 0, 0);
                    }
                    if (moveZ !== 0) {
                        this.movePiece(this.currentPiece, 0, 0, moveZ);
                    }
                }
            }
            
            this.lastTouch = { x: touch.clientX, y: touch.clientY };
        });
        
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - this.swipeStart.x;
            const deltaY = touch.clientY - this.swipeStart.y;
            const touchDuration = Date.now() - this.touchStartTime;
            
            // Only process swipes if it wasn't a camera drag
             if (!this.isDragging) {
                 // Detect swipes
                 if (Math.abs(deltaX) > this.swipeThreshold || Math.abs(deltaY) > this.swipeThreshold) {
                     if (this.gameRunning && !this.gamePaused && this.currentPiece) {
                         if (Math.abs(deltaX) > Math.abs(deltaY)) {
                              // Horizontal swipe - move piece left/right
                              const direction = deltaX > 0 ? 1 : -1;
                              this.movePiece(this.currentPiece, direction, 0, 0);
                          } else {
                              // Vertical swipe - move piece forward/back or drop
                              if (deltaY > 0) {
                                  // Swipe down - hard drop
                                  this.hardDrop();
                              } else {
                                  // Swipe up - move piece forward/back
                                  this.movePiece(this.currentPiece, 0, 0, -1);
                              }
                          }
                     }
                 } else if (!this.hasMoved && touchDuration < 200) {
                     // Quick tap - directional piece rotation
                     if (this.currentPiece && this.touchStartCanvas && this.gameRunning && !this.gamePaused) {
                         this.rotatePieceDirectional(this.touchStartCanvas);
                     }
                 }
             }
            
            this.isDragging = false;
            this.hasMoved = false;
            
            // Gradually reset board tilt when not dragging
            this.resetBoardTilt();
        });
        
        // Mouse controls for desktop
        canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastTouch = { x: e.clientX, y: e.clientY };
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const deltaX = e.clientX - this.lastTouch.x;
            const deltaY = e.clientY - this.lastTouch.y;
            
            // Tilt the board based on mouse movement
            const tiltSpeed = 0.02;
            this.boardTilt = this.boardTilt || { x: 0, z: 0 };
            
            this.boardTilt.z += deltaX * tiltSpeed; // Left/right tilt
            this.boardTilt.x += deltaY * tiltSpeed; // Forward/back tilt
            
            // Limit tilt angles
            this.boardTilt.x = Math.max(-0.3, Math.min(0.3, this.boardTilt.x));
            this.boardTilt.z = Math.max(-0.3, Math.min(0.3, this.boardTilt.z));
            
            // Apply tilt to board
            this.boardGroup.rotation.x = this.boardTilt.x;
            this.boardGroup.rotation.z = this.boardTilt.z;
            
            // Move current piece based on tilt
            if (this.currentPiece) {
                const moveForce = 0.1;
                const moveX = Math.round(this.boardTilt.z * moveForce * 10);
                const moveZ = Math.round(this.boardTilt.x * moveForce * 10);
                
                if (moveX !== 0) {
                    this.movePiece(this.currentPiece, moveX, 0, 0);
                }
                if (moveZ !== 0) {
                    this.movePiece(this.currentPiece, 0, 0, moveZ);
                }
            }
            
            this.lastTouch = { x: e.clientX, y: e.clientY };
        });
        
        canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            
            // Gradually reset board tilt when not dragging
            this.resetBoardTilt();
        });
        
        // Button controls (simplified)
        let rotationAxis = 0; // 0=y, 1=x, 2=z
        document.getElementById('rotateBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.currentPiece && this.gameRunning && !this.gamePaused) {
                const axes = ['y', 'x', 'z'];
                if (!this.rotatePiece(this.currentPiece, axes[rotationAxis])) {
                    // If rotation fails, try next axis
                    rotationAxis = (rotationAxis + 1) % 3;
                    if (!this.rotatePiece(this.currentPiece, axes[rotationAxis])) {
                        rotationAxis = (rotationAxis + 1) % 3;
                        this.rotatePiece(this.currentPiece, axes[rotationAxis]);
                    }
                }
                rotationAxis = (rotationAxis + 1) % 3; // Cycle for next rotation
            }
        });
        
        // Rotate button - only rotates current piece
        document.getElementById('rotateBtn').addEventListener('click', () => {
            if (this.currentPiece && this.gameRunning && !this.gamePaused) {
                // Try different rotations until one works
                if (!this.rotatePiece(this.currentPiece, 'y')) {
                    if (!this.rotatePiece(this.currentPiece, 'x')) {
                        this.rotatePiece(this.currentPiece, 'z');
                    }
                }
            }
        });
        
        document.getElementById('dropBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.currentPiece && this.gameRunning && !this.gamePaused) {
                this.hardDrop();
            }
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning || this.gamePaused) return;
            
            switch(e.code) {
                case 'ArrowLeft':
                    this.movePiece(this.currentPiece, -1, 0, 0);
                    break;
                case 'ArrowRight':
                    this.movePiece(this.currentPiece, 1, 0, 0);
                    break;
                case 'ArrowDown':
                    this.movePiece(this.currentPiece, 0, 0, 1);
                    break;
                case 'ArrowUp':
                    this.movePiece(this.currentPiece, 0, 0, -1);
                    break;
                case 'KeyW':
                    this.movePiece(this.currentPiece, 0, 0, -1);
                    break;
                case 'KeyS':
                    this.movePiece(this.currentPiece, 0, 0, 1);
                    break;
                case 'KeyA':
                    this.movePiece(this.currentPiece, -1, 0, 0);
                    break;
                case 'KeyD':
                    this.movePiece(this.currentPiece, 1, 0, 0);
                    break;
                case 'KeyQ':
                    this.rotatePiece(this.currentPiece, 'y'); // Rotate around Y
                    break;
                case 'KeyE':
                    this.rotatePiece(this.currentPiece, 'x'); // Rotate around X
                    break;
                case 'KeyR':
                    this.rotatePiece(this.currentPiece, 'z'); // Rotate around Z
                    break;
                case 'KeyF':
                    // Try all rotations like swipe up
                    if (!this.rotatePiece(this.currentPiece, 'y')) {
                        if (!this.rotatePiece(this.currentPiece, 'x')) {
                            this.rotatePiece(this.currentPiece, 'z');
                        }
                    }
                    break;
                case 'Space':
                    e.preventDefault();
                    this.hardDrop();
                    break;
                case 'KeyP':
                    this.togglePause();
                    break;
            }
        });
    }
    
    setupUI() {
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.restartGame();
        });
    }
    
    hardDrop() {
        while (this.movePiece(this.currentPiece, 0, -1, 0)) {
            // Keep dropping until it can't move down
        }
        this.placePiece(this.currentPiece);
        this.spawnNewPiece();
    }
    
    calculateDropPosition(piece) {
        if (!piece) return null;
        
        // Create a copy of the piece to test drop position
        const testPiece = {
            blocks: piece.blocks.map(block => ({...block})),
            position: {...piece.position}
        };
        
        // Keep moving down until we can't
        let dropY = testPiece.position.y;
        while (this.canMovePiece(testPiece, 0, -1, 0)) {
            dropY--;
            testPiece.position.y = dropY;
        }
        
        return dropY;
    }
    
    createGhostPiece(piece) {
        if (!piece) return;
        
        const dropY = this.calculateDropPosition(piece);
        if (dropY === null || dropY === piece.position.y) return;
        
        // Remove existing ghost piece
        this.removeGhostPiece();
        
        // Create ghost piece with transparent material
        const ghostMaterial = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            wireframe: false
        });
        
        this.ghostPiece = {
            blocks: piece.blocks.map(block => ({...block})),
            meshes: [],
            position: {
                x: piece.position.x,
                y: dropY,
                z: piece.position.z
            }
        };
        
        // Create ghost meshes
        this.ghostPiece.blocks.forEach(block => {
            const geometry = new THREE.BoxGeometry(this.blockSize, this.blockSize, this.blockSize);
            const mesh = new THREE.Mesh(geometry, ghostMaterial);
            
            mesh.position.set(
                this.ghostPiece.position.x + block.x,
                this.ghostPiece.position.y - block.y,
                this.ghostPiece.position.z + block.z
            );
            
            this.ghostPiece.meshes.push(mesh);
            this.boardGroup.add(mesh);
        });
    }
    
    removeGhostPiece() {
        if (this.ghostPiece) {
            this.ghostPiece.meshes.forEach(mesh => {
                this.boardGroup.remove(mesh);
            });
            this.ghostPiece = null;
        }
    }
    
    updateGhostPiece() {
        if (this.currentPiece) {
            this.createGhostPiece(this.currentPiece);
        }
    }
    
    spawnNewPiece() {
        const pieceTypeIndex = Math.floor(Math.random() * this.pieceTypes.length);
        
        // Spawn position always at center of the board
        let spawnX = Math.floor(this.boardWidth / 2);
        let spawnZ = Math.floor(this.boardDepth / 2);
        
        this.currentPiece = this.createPiece(pieceTypeIndex);
        this.currentPiece.position.x = spawnX;
        this.currentPiece.position.y = this.boardHeight - 2;
        this.currentPiece.position.z = spawnZ;
        this.updatePiecePosition(this.currentPiece);
        
        // Create ghost piece to show where it will land
        this.updateGhostPiece();
        
        // Check game over
        if (!this.canMovePiece(this.currentPiece, 0, 0, 0)) {
            this.gameOver();
        }
    }
    
    startGame() {
        this.gameRunning = true;
        this.gamePaused = false;
        this.spawnNewPiece();
        this.lastTime = performance.now();
    }
    
    restartGame() {
        // Clear scene
        this.scene.children = this.scene.children.filter(child => 
            child.type === 'AmbientLight' || 
            child.type === 'DirectionalLight' ||
            child.material?.opacity < 1
        );
        
        // Reset game state
        this.setupGameBoard();
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.dropInterval = 1000;
        this.updateUI();
        
        // Hide menus
        document.getElementById('gameOver').classList.add('hidden');
        document.getElementById('pauseMenu').classList.add('hidden');
        
        this.startGame();
    }
    
    togglePause() {
        this.gamePaused = !this.gamePaused;
        if (this.gamePaused) {
            document.getElementById('pauseMenu').classList.remove('hidden');
        } else {
            document.getElementById('pauseMenu').classList.add('hidden');
        }
    }
    
    gameOver() {
        this.gameRunning = false;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').classList.remove('hidden');
    }
    
    applyPhysics(deltaTime) {
        if (!this.currentPiece) return;
        
        // Initialize world position tracking if not exists
        if (!this.currentPiece.worldPosition) {
            this.currentPiece.worldPosition = {
                x: this.currentPiece.position.x,
                z: this.currentPiece.position.z
            };
        }
        
        // Calculate the "ideal" position where the piece should be in world space
        // This simulates the piece staying in place while the board moves underneath
        const gravityStrength = 0.015; // Strength of the sliding effect
        const minRotation = 0.02; // Very sensitive to small rotations
        
        // Calculate where the piece "wants" to be based on board tilt
        let targetWorldX = this.currentPiece.worldPosition.x;
        let targetWorldZ = this.currentPiece.worldPosition.z;
        
        // No gravity forces - pieces only move through direct controls
        
        // Update world position with some momentum
        this.currentPiece.worldPosition.x = targetWorldX;
        this.currentPiece.worldPosition.z = targetWorldZ;
        
        // Convert world position to board grid position
        const targetGridX = Math.round(this.currentPiece.worldPosition.x);
        const targetGridZ = Math.round(this.currentPiece.worldPosition.z);
        
        // Calculate movement needed
        const deltaX = targetGridX - this.currentPiece.position.x;
        const deltaZ = targetGridZ - this.currentPiece.position.z;
        
        // Apply movement if significant enough and valid
        if (Math.abs(deltaX) >= 1) {
            const moveX = deltaX > 0 ? 1 : -1;
            if (this.movePiece(this.currentPiece, moveX, 0, 0)) {
                // Successful move - adjust world position to match grid
                this.currentPiece.worldPosition.x = this.currentPiece.position.x;
            }
        }
        
        if (Math.abs(deltaZ) >= 1) {
            const moveZ = deltaZ > 0 ? 1 : -1;
            if (this.movePiece(this.currentPiece, 0, 0, moveZ)) {
                // Successful move - adjust world position to match grid
                this.currentPiece.worldPosition.z = this.currentPiece.position.z;
            }
        }
    }
    
    onWindowResize() {
        const container = document.getElementById('gameArea');
        const aspect = container.clientWidth / container.clientHeight;
        
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const currentTime = performance.now();
        const deltaTime = currentTime - (this.lastTime || currentTime);
        this.lastTime = currentTime;
        
        if (this.gameRunning && !this.gamePaused) {
            this.dropTimer += deltaTime;
            
            if (this.dropTimer >= this.dropInterval) {
                if (this.currentPiece) {
                    // Apply gravity (downward movement)
                    let moved = this.movePiece(this.currentPiece, 0, -1, 0);
                    
                    if (!moved) {
                        this.placePiece(this.currentPiece);
                        this.spawnNewPiece();
                    }
                }
                this.dropTimer = 0;
            }
            
            // Apply physics based on board rotation
            if (this.currentPiece) {
                this.applyPhysics(deltaTime);
            }
        }
        
        // Camera is now controlled by user input
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new Tetris3D();
});