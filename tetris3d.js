class Tetris3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.gameBoard = [];
        this.currentPiece = null;
        this.nextPiece = null;
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
        
        // Board rotation for swipe controls
        this.boardRotation = { x: 0, y: 0, z: 0 };
        
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
        
        // Camera
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.updateCameraPosition();
        this.camera.lookAt(this.boardWidth/2, this.boardHeight/2, this.boardDepth/2);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
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
        
        // Create board group
        this.boardGroup = new THREE.Group();
        this.scene.add(this.boardGroup);
        
        // Create board boundaries
        this.createBoardBoundaries();
    }
    
    updateBoardRotation() {
        if (this.boardGroup) {
            this.boardGroup.rotation.x = this.boardRotation.x;
            this.boardGroup.rotation.y = this.boardRotation.y;
            this.boardGroup.rotation.z = this.boardRotation.z;
        }
    }
    
    createBoardBoundaries() {
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x333333, 
            transparent: true, 
            opacity: 0.3 
        });
        
        // Bottom
        const bottomGeometry = new THREE.PlaneGeometry(this.boardWidth, this.boardDepth);
        const bottom = new THREE.Mesh(bottomGeometry, material);
        bottom.rotation.x = -Math.PI / 2;
        bottom.position.set(this.boardWidth/2 - 0.5, -0.5, this.boardDepth/2 - 0.5);
        this.boardGroup.add(bottom);
        
        // Walls
        const wallMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x222222, 
            transparent: true, 
            opacity: 0.2 
        });
        
        // Back wall
        const backWallGeometry = new THREE.PlaneGeometry(this.boardWidth, this.boardHeight);
        const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
        backWall.position.set(this.boardWidth/2 - 0.5, this.boardHeight/2 - 0.5, -0.5);
        this.boardGroup.add(backWall);
        
        // Side walls
        const sideWallGeometry = new THREE.PlaneGeometry(this.boardDepth, this.boardHeight);
        
        const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(-0.5, this.boardHeight/2 - 0.5, this.boardDepth/2 - 0.5);
        this.boardGroup.add(leftWall);
        
        const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.position.set(this.boardWidth - 0.5, this.boardHeight/2 - 0.5, this.boardDepth/2 - 0.5);
        this.boardGroup.add(rightWall);
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
            return true;
        }
        return false;
    }
    
    rotatePiece(piece, axis = 'y') {
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
            
            // Only rotate camera if dragging
            if (this.isDragging) {
                this.cameraRotation.y += deltaX * 0.01;
                this.cameraRotation.x -= deltaY * 0.01;
                
                // Limit vertical rotation
                this.cameraRotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.cameraRotation.x));
                
                this.updateCameraPosition();
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
             if (!this.isDragging && touchDuration < 500) {
                 // Detect swipes (only for quick, short movements)
                 if (Math.abs(deltaX) > this.swipeThreshold || Math.abs(deltaY) > this.swipeThreshold) {
                     if (this.gameRunning && !this.gamePaused) {
                         if (Math.abs(deltaX) > Math.abs(deltaY)) {
                              // Horizontal swipe - rotate board around Y axis
                              const rotationSpeed = 0.1;
                              this.boardRotation.y += (deltaX > 0 ? rotationSpeed : -rotationSpeed);
                              this.updateBoardRotation();
                          } else {
                              // Vertical swipe - rotate board around X axis
                              const rotationSpeed = 0.1;
                              this.boardRotation.x += (deltaY > 0 ? -rotationSpeed : rotationSpeed);
                              this.updateBoardRotation();
                          }
                     }
                 }
             }
            
            this.isDragging = false;
            this.hasMoved = false;
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
            
            this.cameraRotation.y += deltaX * 0.01;
            this.cameraRotation.x -= deltaY * 0.01;
            this.cameraRotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.cameraRotation.x));
            
            this.updateCameraPosition();
            this.lastTouch = { x: e.clientX, y: e.clientY };
        });
        
        canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
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
    
    spawnNewPiece() {
        const pieceTypeIndex = Math.floor(Math.random() * this.pieceTypes.length);
        
        // Spawn position varies based on board rotation
        let spawnX = Math.floor(this.boardWidth / 2);
        let spawnZ = Math.floor(this.boardDepth / 2);
        
        // Adjust spawn position based on board tilt to create more interesting gameplay
        if (Math.abs(this.boardRotation.y) > 0.2) {
            // If board is tilted left/right, spawn pieces more towards the higher side
            spawnX += this.boardRotation.y > 0 ? -2 : 2;
            spawnX = Math.max(1, Math.min(this.boardWidth - 2, spawnX));
        }
        
        if (Math.abs(this.boardRotation.x) > 0.2) {
            // If board is tilted forward/back, spawn pieces more towards the higher side
            spawnZ += this.boardRotation.x > 0 ? 2 : -2;
            spawnZ = Math.max(1, Math.min(this.boardDepth - 2, spawnZ));
        }
        
        this.currentPiece = this.createPiece(pieceTypeIndex);
        this.currentPiece.position.x = spawnX;
        this.currentPiece.position.y = this.boardHeight - 2;
        this.currentPiece.position.z = spawnZ;
        this.updatePiecePosition(this.currentPiece);
        
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
        
        // Calculate physics forces based on board rotation
        const gravityStrength = 0.002; // Adjust this value to control sliding speed
        const minRotation = 0.1; // Minimum rotation needed to start sliding
        
        // Calculate horizontal forces based on board tilt
        let forceX = 0;
        let forceZ = 0;
        
        // X-axis rotation affects Z movement (forward/backward sliding)
        if (Math.abs(this.boardRotation.x) > minRotation) {
            forceZ = Math.sin(this.boardRotation.x) * gravityStrength * deltaTime;
        }
        
        // Y-axis rotation affects X movement (left/right sliding)
        if (Math.abs(this.boardRotation.y) > minRotation) {
            forceX = Math.sin(this.boardRotation.y) * gravityStrength * deltaTime;
        }
        
        // Apply accumulated forces
        if (!this.currentPiece.velocity) {
            this.currentPiece.velocity = { x: 0, z: 0 };
        }
        
        this.currentPiece.velocity.x += forceX;
        this.currentPiece.velocity.z += forceZ;
        
        // Apply friction to prevent infinite acceleration
        const friction = 0.95;
        this.currentPiece.velocity.x *= friction;
        this.currentPiece.velocity.z *= friction;
        
        // Move piece based on accumulated velocity
        const moveThreshold = 0.5; // How much velocity needed to actually move a block
        
        if (Math.abs(this.currentPiece.velocity.x) > moveThreshold) {
            const moveX = this.currentPiece.velocity.x > 0 ? 1 : -1;
            if (this.movePiece(this.currentPiece, moveX, 0, 0)) {
                this.currentPiece.velocity.x = 0; // Reset velocity after successful move
            }
        }
        
        if (Math.abs(this.currentPiece.velocity.z) > moveThreshold) {
            const moveZ = this.currentPiece.velocity.z > 0 ? 1 : -1;
            if (this.movePiece(this.currentPiece, 0, 0, moveZ)) {
                this.currentPiece.velocity.z = 0; // Reset velocity after successful move
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