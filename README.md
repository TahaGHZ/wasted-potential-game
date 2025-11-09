# Wasted Potential Game

A Three.js first-person game MVP with environment and NPCs.

Watch the project demo : https://drive.google.com/drive/folders/1wMcjeZUnxxQjFv-XirCTFLBwgLxFhf4J?usp=drive_link
## Features

- First-person perspective with WASD movement and mouse look
- Small environment with hut, trees, bushes, and rocks
- 2 NPCs that spawn near the player
- Modular NPC system ready for future expansion (personality, attributes, behaviors)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Open your browser to the URL shown (typically http://localhost:5173)

## Controls

- **WASD** - Move around
- **Mouse** - Look around
- **Click** - Lock pointer for mouse control

## Project Structure

- `src/main.js` - Main game entry point
- `src/FirstPersonController.js` - First-person camera and movement controls
- `src/Environment.js` - Environment generation (hut, trees, bushes, rocks)
- `src/NPC.js` - NPC class with structure for future expansion

## Future Expansion

The NPC system is designed with future features in mind:
- Personality traits
- Character attributes
- Behavior system
- State management
- Interaction system

