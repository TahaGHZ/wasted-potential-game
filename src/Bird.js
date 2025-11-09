import * as THREE from 'three';

/**
 * Bird - Moving bird entity with simple flight behavior
 */
export class Bird {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position.clone();
        
        // Flight parameters
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 5
        );
        this.speed = 2 + Math.random() * 3;
        this.rotationSpeed = 0.5;
        
        // Flight boundaries
        this.boundary = 100;
        this.minHeight = 5;
        this.maxHeight = 30;
        
        // Create bird mesh
        this.mesh = this.createBird();
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
        
        // Target for smooth movement
        this.target = position.clone();
        this.updateTarget();
    }
    
    createBird() {
        const birdGroup = new THREE.Group();
        
        // Simple bird shape (triangle/arrow)
        const birdGeometry = new THREE.ConeGeometry(0.2, 0.5, 3);
        const birdMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a4a4a // Dark gray/black
        });
        
        const body = new THREE.Mesh(birdGeometry, birdMaterial);
        body.rotation.x = Math.PI / 2;
        body.castShadow = true;
        birdGroup.add(body);
        
        // Wings (simple representation)
        const wingGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.1);
        const wingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3a3a3a 
        });
        
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        leftWing.position.set(-0.15, 0, 0);
        leftWing.rotation.z = Math.PI / 6;
        birdGroup.add(leftWing);
        
        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        rightWing.position.set(0.15, 0, 0);
        rightWing.rotation.z = -Math.PI / 6;
        birdGroup.add(rightWing);
        
        return birdGroup;
    }
    
    updateTarget() {
        // Set new random target
        this.target.set(
            (Math.random() - 0.5) * this.boundary * 2,
            this.minHeight + Math.random() * (this.maxHeight - this.minHeight),
            (Math.random() - 0.5) * this.boundary * 2
        );
    }
    
    update(delta) {
        // Calculate direction to target
        const direction = new THREE.Vector3()
            .subVectors(this.target, this.position)
            .normalize();
        
        // Move towards target
        this.velocity.lerp(direction.multiplyScalar(this.speed), delta * 2);
        this.position.add(this.velocity.clone().multiplyScalar(delta));
        
        // Rotate bird to face movement direction
        if (this.velocity.length() > 0.1) {
            const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
            this.mesh.rotation.y = targetRotation;
            
            // Wing flapping animation
            const wingFlap = Math.sin(Date.now() * 0.01) * 0.3;
            if (this.mesh.children.length > 1) {
                this.mesh.children[1].rotation.z = Math.PI / 6 + wingFlap; // Left wing
                this.mesh.children[2].rotation.z = -Math.PI / 6 - wingFlap; // Right wing
            }
        }
        
        // Check if reached target or out of bounds
        const distanceToTarget = this.position.distanceTo(this.target);
        if (distanceToTarget < 2 || 
            Math.abs(this.position.x) > this.boundary ||
            Math.abs(this.position.z) > this.boundary ||
            this.position.y < this.minHeight ||
            this.position.y > this.maxHeight) {
            this.updateTarget();
        }
        
        // Keep within bounds
        if (Math.abs(this.position.x) > this.boundary) {
            this.position.x = Math.sign(this.position.x) * this.boundary;
        }
        if (Math.abs(this.position.z) > this.boundary) {
            this.position.z = Math.sign(this.position.z) * this.boundary;
        }
        this.position.y = Math.max(this.minHeight, Math.min(this.maxHeight, this.position.y));
        
        // Update mesh position
        this.mesh.position.copy(this.position);
    }
    
    getPosition() {
        return this.position.clone();
    }
}

