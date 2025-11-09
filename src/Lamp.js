import * as THREE from 'three';

/**
 * Lamp - Interactive lamp that can be turned on/off
 * LLM-ready for NPC interactions
 */
export class Lamp {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position.clone();
        this.isOn = false;
        
        // Create lamp mesh
        this.mesh = this.createLamp();
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
        
        // Light source (will be enabled when lamp is on)
        this.light = null;
        this.setupLight();
        
        // Interaction range
        this.interactionRange = 3.0;
        
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
        context.fillText('Press F to interact', canvas.width * 0.7, canvas.height / 2);
        
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
            this.position.y + 2,
            this.position.z+0.5
        );
        this.interactionPrompt.scale.set(2, 0.5, 1);
        this.interactionPrompt.visible = false;
        this.scene.add(this.interactionPrompt);
    }
    
    createLamp() {
        const lampGroup = new THREE.Group();
        
        // Lamp post (pole)
        const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
        const postMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.y = 1.5;
        post.castShadow = true;
        post.receiveShadow = true;
        lampGroup.add(post);
        
        // Lamp head (shade)
        const headGeometry = new THREE.ConeGeometry(0.4, 0.6, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            emissive: 0x000000,
            emissiveIntensity: 0
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 3.3;
        head.rotation.x = Math.PI;
        head.castShadow = true;
        head.receiveShadow = true;
        lampGroup.add(head);
        
        // Lamp base
        const baseGeometry = new THREE.CylinderGeometry(0.2, 0.15, 0.3, 8);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.15;
        base.castShadow = true;
        base.receiveShadow = true;
        lampGroup.add(base);
        
        // Store reference to head for emissive updates
        this.lampHead = head;
        this.lampHeadMaterial = headMaterial;
        
        return lampGroup;
    }
    
    setupLight() {
        // Point light that will be positioned at the lamp head
        this.light = new THREE.PointLight(0xffeb3b, 0, 10, 2);
        this.light.position.set(
            this.position.x,
            this.position.y + 3.3,
            this.position.z
        );
        this.light.castShadow = true;
        this.light.shadow.mapSize.width = 512;
        this.light.shadow.mapSize.height = 512;
        this.light.shadow.camera.near = 0.5;
        this.light.shadow.camera.far = 10;
        this.scene.add(this.light);
    }
    
    turnOn() {
        if (this.isOn) return;
        
        this.isOn = true;
        this.light.intensity = 1.5;
        this.light.color.setHex(0xffeb3b); // Warm yellow
        
        // Make lamp head glow
        this.lampHeadMaterial.emissive.setHex(0xffeb3b);
        this.lampHeadMaterial.emissiveIntensity = 0.5;
    }
    
    turnOff() {
        if (!this.isOn) return;
        
        this.isOn = false;
        this.light.intensity = 0;
        
        // Remove glow from lamp head
        this.lampHeadMaterial.emissive.setHex(0x000000);
        this.lampHeadMaterial.emissiveIntensity = 0;
    }
    
    toggle() {
        if (this.isOn) {
            this.turnOff();
        } else {
            this.turnOn();
        }
    }
    
    getState() {
        return {
            isOn: this.isOn,
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
        if (this.interactionPrompt) {
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
}

