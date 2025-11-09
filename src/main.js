import * as THREE from 'three';
import { FirstPersonController } from './FirstPersonController.js';
import { Environment } from './Environment.js';
import { EnvironmentManager } from './EnvironmentManager.js';
import { NPC } from './NPC.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue (will be updated by day/night cycle)
        
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
        
        // Ground
        this.createGround();
        
        // First-person controller
        this.controller = new FirstPersonController(this.camera, this.renderer.domElement);
        
        // Static environment (hut, trees, bushes, rocks)
        this.environment = new Environment(this.scene);
        
        // Environment manager (day/night, weather, birds)
        this.environmentManager = new EnvironmentManager(this.scene, this.camera);
        
        // Weather display element
        this.weatherDisplay = {
            type: document.getElementById('weather-type'),
            details: document.getElementById('weather-details'),
            icon: document.querySelector('.weather-icon')
        };
        
        // Time display element
        this.timeDisplay = {
            text: document.getElementById('time-text'),
            timeOfDay: document.getElementById('time-of-day')
        };
        
        // NPCs
        this.npcs = [];
        this.spawnNPCs();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start game loop
        this.animate();
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
            const npc = new NPC(this.scene, position, index, this.environmentManager);
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
        
        // Update environment manager (day/night, weather, birds)
        this.environmentManager.update(clampedDelta);
        
        // Update weather display
        this.updateWeatherDisplay();
        
        // Update time display
        this.updateTimeDisplay();
        
        // Update controller with actual delta time
        this.controller.update(clampedDelta);
        
        // Update NPCs (for future animations/behaviors)
        this.npcs.forEach(npc => npc.update(clampedDelta));
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
    
    updateWeatherDisplay() {
        const envState = this.environmentManager.getState();
        
        if (!envState) return;
        
        // Update weather type
        const weatherType = envState.weather;
        const weatherNames = {
            'sunny': 'Sunny',
            'rainy': 'Rainy',
            'windy+foggy': 'Windy & Foggy'
        };
        
        this.weatherDisplay.type.textContent = weatherNames[weatherType] || weatherType;
        
        // Update weather icon
        const weatherIcons = {
            'sunny': '☀️',
            'rainy': '🌧️',
            'windy+foggy': '🌫️'
        };
        
        this.weatherDisplay.icon.textContent = weatherIcons[weatherType] || '☀️';
        
        // Update weather details
        const details = [];
        if (envState.isRaining) {
            details.push('Rain falling');
        }
        if (envState.isFoggy) {
            details.push('Dense fog');
        }
        if (envState.isWindy) {
            details.push(`Wind: ${(envState.windSpeed * 10).toFixed(1)} km/h`);
        }
        if (envState.visibility < 1.0) {
            details.push(`Visibility: ${(envState.visibility * 100).toFixed(0)}%`);
        }
        if (details.length === 0) {
            details.push('Clear skies');
        }
        
        this.weatherDisplay.details.textContent = details.join(' • ');
    }
    
    updateTimeDisplay() {
        const timeInfo = this.environmentManager.getTime();
        
        if (!timeInfo) return;
        
        // Update time text
        this.timeDisplay.text.textContent = timeInfo.formatted;
        
        // Update time of day
        const timeOfDayNames = {
            'dawn': 'Dawn',
            'day': 'Day',
            'dusk': 'Dusk',
            'night': 'Night'
        };
        this.timeDisplay.timeOfDay.textContent = timeOfDayNames[timeInfo.timeOfDay] || timeInfo.timeOfDay;
    }
    
    /**
     * Get current time
     * Exposed for LLM context and external use
     */
    getTime() {
        return this.environmentManager.getTime();
    }
}

// Start the game
const game = new Game();

// Expose getTime globally for LLM context
window.getTime = () => game.getTime();

