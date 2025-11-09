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
        
        // Movement system
        this.targetPosition = null;
        this.moveSpeed = 2.0; // units per second
        this.isMoving = false;
        
        // Speech system
        this.speechBubble = null;
        this.currentSpeech = null;
        this.speechTimeout = null;
        this.setupSpeechBubble();
        
        // Name tag system
        this.nameTag = null;
        this.setupNameTag();
    }
    
    generatePersonality() {
        // Static personality for the single NPC (for now)
        // Later, this will be generated from natural language paragraphs
        return {
            name: 'Elenor',
            displayName: 'Elenor',
            backstory: 'You are Elenor, an elven mage from the Silverwoods. You value order, wisdom, and loyalty.',
            traits: {
                order: 0.9,      // High value for order
                wisdom: 0.95,    // Very high value for wisdom
                loyalty: 0.85,   // High value for loyalty
                friendliness: 0.7,
                curiosity: 0.8,
                energy: 0.6,
                talkativeness: 0.75
            },
            // Legacy numeric traits for compatibility
            friendliness: 0.7,
            curiosity: 0.8,
            energy: 0.6,
            talkativeness: 0.75
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
        
        // Name tag will be created as HTML element (similar to speech bubble)
        // No 3D mesh needed for name tag
        
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
        // Update movement
        if (this.targetPosition && this.isMoving) {
            this.updateMovement(delta);
        }
        
        // Update speech bubble position
        if (this.speechBubble) {
            this.updateSpeechBubble();
        }
        
        // Update name tag position
        if (this.nameTag) {
            this.updateNameTag();
        }
    }
    
    updateMovement(delta) {
        if (!this.targetPosition) return;
        
        const direction = this.targetPosition.clone().sub(this.position);
        const distance = direction.length();
        
        if (distance < 0.1) {
            // Reached target
            this.position.copy(this.targetPosition);
            this.mesh.position.copy(this.position);
            this.targetPosition = null;
            this.isMoving = false;
            this.state = 'idle';
        } else {
            // Move towards target
            direction.normalize();
            const moveDistance = Math.min(this.moveSpeed * delta, distance);
            this.position.add(direction.multiplyScalar(moveDistance));
            this.mesh.position.copy(this.position);
            this.isMoving = true;
            this.state = 'walking';
        }
    }
    
    setupSpeechBubble() {
        // Create speech bubble element
        this.speechBubble = document.createElement('div');
        this.speechBubble.id = `npc-speech-${this.id}`;
        this.speechBubble.style.cssText = `
            position: absolute;
            color: white;
            background: rgba(0, 0, 0, 0.8);
            padding: 10px 15px;
            border-radius: 8px;
            z-index: 100;
            font-size: 14px;
            max-width: 200px;
            text-align: center;
            display: none;
            font-family: Arial, sans-serif;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            pointer-events: none;
        `;
        document.body.appendChild(this.speechBubble);
    }
    
    setupNameTag() {
        // Create name tag element
        const displayName = this.personality?.displayName || this.personality?.name || `NPC ${this.id}`;
        this.nameTag = document.createElement('div');
        this.nameTag.id = `npc-name-${this.id}`;
        this.nameTag.textContent = displayName;
        this.nameTag.style.cssText = `
            position: absolute;
            color: white;
            background: rgba(0, 0, 0, 0.7);
            padding: 4px 10px;
            border-radius: 4px;
            z-index: 99;
            font-size: 12px;
            text-align: center;
            font-family: Arial, sans-serif;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            pointer-events: none;
            white-space: nowrap;
        `;
        document.body.appendChild(this.nameTag);
    }
    
    updateNameTag() {
        if (!this.nameTag || !this.game) return;
        
        // Convert 3D position to screen coordinates
        const vector = this.mesh.position.clone();
        vector.y += 2.3; // Slightly below speech bubble
        
        // Project to screen space
        vector.project(this.game.camera);
        
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
        
        this.nameTag.style.left = `${x}px`;
        this.nameTag.style.top = `${y}px`;
        this.nameTag.style.transform = 'translateX(-50%)';
    }
    
    updateSpeechBubble() {
        if (!this.speechBubble || !this.currentSpeech || !this.game) return;
        
        // Convert 3D position to screen coordinates
        const vector = this.mesh.position.clone();
        vector.y += 2.5; // Above NPC head
        
        // Project to screen space
        vector.project(this.game.camera);
        
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
        
        this.speechBubble.style.left = `${x}px`;
        this.speechBubble.style.top = `${y - 50}px`;
        this.speechBubble.style.transform = 'translateX(-50%)';
    }
    
    speak(message, duration = 5000) {
        if (!this.speechBubble) return;
        
        this.currentSpeech = message;
        this.speechBubble.textContent = message;
        this.speechBubble.style.display = 'block';
        this.state = 'talking';
        
        // Clear existing timeout
        if (this.speechTimeout) {
            clearTimeout(this.speechTimeout);
        }
        
        // Hide after duration
        this.speechTimeout = setTimeout(() => {
            this.speechBubble.style.display = 'none';
            this.currentSpeech = null;
            if (this.state === 'talking') {
                this.state = 'idle';
            }
        }, duration);
    }
    
    setTargetPosition(position) {
        this.targetPosition = position.clone();
        this.isMoving = true;
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
        
        // Trigger agent event
        if (this.agent) {
            console.log(`[NPC ${this.id}] Triggering agent processEvent('hit')...`);
            this.agent.processEvent('hit', { thrower: thrower });
            console.log(`[NPC ${this.id}] Agent processEvent('hit') called`);
        } else {
            console.warn(`[NPC ${this.id}] No agent found to process hit event`);
        }
        
        // Reset state after a short delay (could be handled in update method)
        setTimeout(() => {
            if (this.state === 'hit') {
                this.state = 'idle';
            }
        }, 1000);
    }
    
    setAgent(agent) {
        this.agent = agent;
    }
    
    setGame(game) {
        this.game = game;
    }
}

