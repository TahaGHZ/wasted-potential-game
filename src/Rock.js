import * as THREE from 'three';

/**
 * Rock - Collectable rock that can be picked up and thrown
 * LLM-ready for NPC interactions
 */
export class Rock {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position.clone();
        this.isCollected = false;
        
        // Create rock mesh
        this.mesh = this.createRockMesh();
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
        
        // Interaction range
        this.interactionRange = 2.0;
        
        // 3D interaction prompt
        this.interactionPrompt = null;
        this.setupInteractionPrompt();
    }
    
    setupInteractionPrompt() {
        // Create canvas for text texture
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        // Draw background
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw border
        context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        context.lineWidth = 2;
        context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
        
        // Draw text
        context.fillStyle = '#ffeb3b';
        context.font = 'bold 20px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('[F]', canvas.width * 0.25, canvas.height / 2);
        
        context.fillStyle = '#ffffff';
        context.font = '16px Arial';
        context.fillText('Collect Rock', canvas.width * 0.7, canvas.height / 2);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Create sprite material
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1
        });
        
        // Create sprite
        this.interactionPrompt = new THREE.Sprite(spriteMaterial);
        this.interactionPrompt.position.set(
            this.position.x,
            this.position.y + 0.5,
            this.position.z + 0.3
        );
        this.interactionPrompt.scale.set(1.5, 0.4, 1);
        this.interactionPrompt.visible = false;
        this.scene.add(this.interactionPrompt);
    }
    
    createRockMesh() {
        const rockGroup = new THREE.Group();
        
        const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x696969 });
        
        // Create irregular rock shape with multiple boxes
        for (let i = 0; i < 2; i++) {
            const size = 0.3 + Math.random() * 0.2;
            const rockGeometry = new THREE.BoxGeometry(size, size * 0.6, size);
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            rock.position.set(
                (Math.random() - 0.5) * 0.5,
                size * 0.3,
                (Math.random() - 0.5) * 0.5
            );
            rock.rotation.set(
                Math.random() * Math.PI * 0.2,
                Math.random() * Math.PI * 0.2,
                Math.random() * Math.PI * 0.2
            );
            rock.castShadow = true;
            rock.receiveShadow = true;
            rockGroup.add(rock);
        }
        
        return rockGroup;
    }
    
    /**
     * Collect the rock (remove from scene, return true if successful)
     */
    collect() {
        if (this.isCollected) return false;
        
        this.isCollected = true;
        
        // Remove from scene
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
        
        // Remove interaction prompt
        if (this.interactionPrompt) {
            this.scene.remove(this.interactionPrompt);
        }
        
        return true;
    }
    
    getState() {
        return {
            isCollected: this.isCollected,
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            },
            interactionRange: this.interactionRange
        };
    }
    
    /**
     * Check if a position is within interaction range
     */
    isInRange(position) {
        if (this.isCollected) return false;
        const distance = this.position.distanceTo(position);
        return distance <= this.interactionRange;
    }
    
    /**
     * Get distance from a position
     */
    getDistance(position) {
        return this.position.distanceTo(position);
    }
    
    /**
     * Show interaction prompt
     */
    showPrompt(cameraPosition) {
        if (this.interactionPrompt && !this.isCollected) {
            this.interactionPrompt.visible = true;
            // Make prompt face camera
            this.interactionPrompt.lookAt(cameraPosition);
        }
    }
    
    /**
     * Hide interaction prompt
     */
    hidePrompt() {
        if (this.interactionPrompt) {
            this.interactionPrompt.visible = false;
        }
    }
    
    /**
     * Interact with rock (collect it)
     */
    interact() {
        return this.collect();
    }
}

