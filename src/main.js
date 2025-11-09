import * as THREE from 'three';
import { FirstPersonController } from './FirstPersonController.js';
import { Environment } from './Environment.js';
import { NPC } from './NPC.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
        
        // Clock for delta time tracking
        this.clock = new THREE.Clock();
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1.6, 0); // Eye level
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        
        // Lighting
        this.setupLighting();
        
        // Ground
        this.createGround();
        
        // First-person controller
        this.controller = new FirstPersonController(this.camera, this.renderer.domElement);
        
        // Environment
        this.environment = new Environment(this.scene);
        
        // NPCs
        this.npcs = [];
        this.spawnNPCs();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start game loop
        this.animate();
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
    }
    
    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x90EE90 // Light green
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }
    
    spawnNPCs() {
        // Spawn 2 NPCs near the player (at origin)
        const spawnPositions = [
            new THREE.Vector3(5, 0, 5),
            new THREE.Vector3(-5, 0, 5)
        ];
        
        spawnPositions.forEach((position, index) => {
            const npc = new NPC(this.scene, position, index);
            this.npcs.push(npc);
        });
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Get delta time (time since last frame)
        const delta = this.clock.getDelta();
        
        // Cap delta to prevent large jumps (e.g., when tab is inactive)
        const clampedDelta = Math.min(delta, 0.1);
        
        // Update controller with actual delta time
        this.controller.update(clampedDelta);
        
        // Update NPCs (for future animations/behaviors)
        this.npcs.forEach(npc => npc.update(clampedDelta));
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
new Game();

