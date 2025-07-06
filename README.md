# Tetris 3D Mobile

Um jogo Tetris 3D otimizado para dispositivos móveis, desenvolvido com HTML5, CSS3 e JavaScript usando Three.js para renderização 3D.

## Características

- **Jogabilidade 3D**: Peças Tetris em um ambiente tridimensional
- **Otimizado para Mobile**: Interface touch responsiva e controles intuitivos
- **Gráficos Modernos**: Renderização 3D com sombras e iluminação
- **Design Responsivo**: Adapta-se a diferentes tamanhos de tela e orientações
- **Controles Múltiplos**: Suporte para touch e teclado

## Como Jogar

### Controles Touch (Mobile)
- **Arrastar na tela**: Rotacionar câmera 360°
- **Swipe horizontal**: Mover peça (direção baseada na câmera)
- **Swipe para cima**: Rotacionar peça em 3D (tenta Y→X→Z)
- **Swipe para baixo**: Queda rápida
- **Botão ↻**: Cicla rotações nos eixos X/Y/Z
- **Botão ⬇**: Queda rápida

### Controles de Teclado
- **Setas/WASD**: Mover peça em 3D
- **Q**: Rotacionar no eixo Y (horizontal)
- **E**: Rotacionar no eixo X (vertical)
- **R**: Rotacionar no eixo Z (profundidade)
- **F**: Rotação automática (tenta Y→X→Z)
- **Espaço**: Queda rápida
- **Mouse**: Arrastar para rotacionar câmera
- **P**: Pausar/Despausar

### Objetivo
- Complete camadas horizontais para eliminá-las
- Evite que as peças cheguem ao topo
- Ganhe pontos e avance de nível

## Tecnologias Utilizadas

- **HTML5**: Estrutura da aplicação
- **CSS3**: Estilização e animações
- **JavaScript ES6+**: Lógica do jogo
- **Three.js**: Renderização 3D
- **WebGL**: Aceleração gráfica

## Instalação e Execução

1. Clone ou baixe os arquivos do projeto
2. Abra o arquivo `index.html` em um navegador web
3. Para melhor experiência em mobile, acesse via servidor local:
   ```bash
   # Usando Python
   python -m http.server 8000
   
   # Usando Node.js
   npx serve .
   ```
4. Acesse `http://localhost:8000` no seu dispositivo

## Estrutura do Projeto

```
tetrismobile/
├── index.html          # Página principal
├── styles.css          # Estilos e responsividade
├── tetris3d.js         # Lógica do jogo e renderização 3D
└── README.md           # Documentação
```

## Recursos Implementados

- ✅ Renderização 3D com Three.js
- ✅ 7 tipos de peças Tetris clássicas (mais compactas)
- ✅ Sistema de pontuação e níveis
- ✅ Detecção de colisão 3D
- ✅ Eliminação de camadas completas
- ✅ **Controles por swipe intuitivos**
- ✅ **Câmera controlável pelo usuário (360°)**
- ✅ **Movimento 3D baseado na perspectiva da câmera**
- ✅ **Rotação completa em todos os eixos (X, Y, Z)**
- ✅ **Sistema inteligente de rotação automática**
- ✅ Interface responsiva simplificada
- ✅ Animações e efeitos visuais
- ✅ Sistema de pause/resume
- ✅ Game over e restart
- ✅ Suporte para mouse e touch
- ✅ Blocos maiores e mais visíveis

## Compatibilidade

- **Navegadores**: Chrome, Firefox, Safari, Edge (versões modernas)
- **Dispositivos**: Smartphones, tablets, desktops
- **Orientações**: Portrait e landscape

## Melhorias Futuras

- [ ] Sistema de high scores
- [ ] Efeitos sonoros
- [ ] Múltiplos temas visuais
- [ ] Modo multiplayer
- [ ] Peças especiais
- [ ] Tutoriais interativos

## Contribuição

Sinta-se à vontade para contribuir com melhorias, correções de bugs ou novas funcionalidades!

## Licença

Este projeto é open source e está disponível sob a licença MIT.