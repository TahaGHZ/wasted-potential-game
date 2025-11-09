import * as THREE from 'three';

export class NPC {
    constructor(scene, position, id, environmentManager = null) {
        this.scene = scene;
        this.position = position.clone();
        this.id = id;
        this.environmentManager = environmentManager;
        
        // NPC attributes (for future expansion)
        this.personality = this.generatePersonality();
        this.attributes = this.generateAttributes();
        this.state = 'idle'; // idle, walking, talking, etc.
        
        // Create visual representation
        this.mesh = this.createMesh();
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
        
        // Initialize behavior system
        this.behavior = this.initializeBehavior();
    }
    
    generatePersonality() {
        // Personality traits for future implementation
        return {
            friendliness: Math.random(),
            curiosity: Math.random(),
            energy: Math.random(),
            talkativeness: Math.random()
        };
    }
    
    generateAttributes() {
        // Character attributes for future implementation
        return {
            health: 100,
            stamina: 100,
            level: 1,
            experience: 0,
            hitCount: 0 // Track number of times hit
        };
    }
    
    createMesh() {
        const npcGroup = new THREE.Group();
        
        // Body (torso)
        const bodyGeometry = new THREE.BoxGeometry(0.6, 1, 0.4);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: this.id === 0 ? 0x4169E1 : 0xFF6347 // Blue or Tomato red
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        body.castShadow = true;
        body.receiveShadow = true;
        npcGroup.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFDBB3 // Skin tone
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.8;
        head.castShadow = true;
        head.receiveShadow = true;
        npcGroup.add(head);
        
        // Arms
        const armGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
        const armMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFDBB3
        });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.4, 1, 0);
        leftArm.castShadow = true;
        leftArm.receiveShadow = true;
        npcGroup.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.4, 1, 0);
        rightArm.castShadow = true;
        rightArm.receiveShadow = true;
        npcGroup.add(rightArm);
        
        // Legs
        const legGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
        const legMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2F2F2F // Dark gray
        });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.2, 0.4, 0);
        leftLeg.castShadow = true;
        leftLeg.receiveShadow = true;
        npcGroup.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.2, 0.4, 0);
        rightLeg.castShadow = true;
        rightLeg.receiveShadow = true;
        npcGroup.add(rightLeg);
        
        // Name tag (for identification)
        const nameTagGeometry = new THREE.PlaneGeometry(1, 0.3);
        const nameTagMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 0.7
        });
        const nameTag = new THREE.Mesh(nameTagGeometry, nameTagMaterial);
        nameTag.position.y = 2.5;
        nameTag.lookAt(0, 2.5, 0); // Face camera direction (simplified)
        npcGroup.add(nameTag);
        
        return npcGroup;
    }
    
    initializeBehavior() {
        // Behavior system for future implementation
        return {
            currentAction: null,
            actionQueue: [],
            lastActionTime: Date.now(),
            updateInterval: 1000 // Update every second (for future behaviors)
        };
    }
    
    update(delta = 0.016) {
        // Update method for future behaviors
        // Currently static, but structure is ready for:
        // - Animation
        // - State changes
        // - Interaction logic
        // - Pathfinding
        // - Dialogue system
        
        // Example: Update name tag to face camera (simplified)
        // In a full implementation, this would use the camera position
        // delta parameter is available for frame-independent animations
    }
    
    // Methods for future implementation
    interact(player) {
        // Handle player interaction
        // Could trigger dialogue, quests, trades, etc.
        console.log(`NPC ${this.id} interacted with player`);
    }
    
    setState(newState) {
        // Change NPC state (idle, walking, talking, etc.)
        this.state = newState;
    }
    
    getPersonality() {
        return this.personality;
    }
    
    getAttributes() {
        return this.attributes;
    }
    
    /**
     * Get current environment state
     * Used by LLM agents to understand surroundings
     */
    getEnvironmentState() {
        if (this.environmentManager) {
            return this.environmentManager.getState();
        }
        return null;
    }
    
    /**
     * Get full context for LLM agent
     * Includes NPC state, personality, and environment
     */
    getContextForLLM() {
        return {
            npcId: this.id,
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            },
            state: this.state,
            personality: this.personality,
            attributes: this.attributes,
            environment: this.getEnvironmentState()
        };
    }
    
    /**
     * Handle being hit by a projectile
     * @param {Object} thrower - Object that threw the projectile
     */
    onHit(thrower) {
        // Increment hit count
        if (this.attributes) {
            this.attributes.hitCount = (this.attributes.hitCount || 0) + 1;
        }
        
        // Change state to indicate being hit
        this.state = 'hit';
        
        // Log hit for debugging/LLM context
        console.log(`NPC ${this.id} hit by ${thrower?.id || 'unknown'} at position (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)})`);
        
        // Visual feedback: briefly change color or add effect
        if (this.mesh && this.mesh.children && this.mesh.children.length > 0) {
            const body = this.mesh.children.find(child => child.material && child.material.color);
            if (body && body.material) {
                const originalColor = body.material.color.clone();
                body.material.color.setHex(0xff0000); // Red flash
                setTimeout(() => {
                    if (body.material) {
                        body.material.color.copy(originalColor);
                    }
                }, 200);
            }
        }
        
        // Reset state after a short delay (could be handled in update method)
        setTimeout(() => {
            if (this.state === 'hit') {
                this.state = 'idle';
            }
        }, 1000);
    }
}

