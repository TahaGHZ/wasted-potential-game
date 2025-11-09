import * as THREE from 'three';

export class FirstPersonController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        // Movement state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        
        // Movement parameters
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveSpeed = 2.0;
        
        // Rotation state
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.PI_2 = Math.PI / 2;
        
        // Pointer lock
        this.isLocked = false;
        this.pointerLockChange = this.onPointerLockChange.bind(this);
        this.pointerLockError = this.onPointerLockError.bind(this);
        
        // Event listeners
        this.setupEventListeners();
        
        // Request pointer lock on click
        this.domElement.addEventListener('click', () => {
            this.domElement.requestPointerLock();
        });
    }
    
    setupEventListeners() {
        // Pointer lock events
        document.addEventListener('pointerlockchange', this.pointerLockChange);
        document.addEventListener('pointerlockerror', this.pointerLockError);
        
        // Keyboard events
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
        
        // Mouse movement
        document.addEventListener('mousemove', (event) => this.onMouseMove(event));
    }
    
    onPointerLockChange() {
        this.isLocked = document.pointerLockElement === this.domElement;
    }
    
    onPointerLockError() {
        console.error('Pointer lock failed');
    }
    
    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = true;
                break;
        }
    }
    
    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = false;
                break;
        }
    }
    
    onMouseMove(event) {
        if (!this.isLocked) return;
        
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;
        
        this.euler.setFromQuaternion(this.camera.quaternion);
        this.euler.y -= movementX * 0.002;
        this.euler.x -= movementY * 0.002;
        
        // Prevent camera from flipping upside down
        this.euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.euler.x));
        
        this.camera.quaternion.setFromEuler(this.euler);
    }
    
    update(delta = 0.016) {
        // Use actual delta time for frame-independent movement
        // Default to 0.016 (60fps) if delta not provided
        
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;
        
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();
        
        if (this.moveForward || this.moveBackward) {
            this.velocity.z -= this.direction.z * this.moveSpeed * delta;
        }
        if (this.moveLeft || this.moveRight) {
            this.velocity.x += this.direction.x * this.moveSpeed * delta;
        }
        
        // Apply movement relative to camera direction
        const moveVector = new THREE.Vector3();
        moveVector.set(this.velocity.x, 0, this.velocity.z);
        moveVector.applyQuaternion(this.camera.quaternion);
        
        // Keep Y position constant (eye level)
        const currentY = this.camera.position.y;
        this.camera.position.add(moveVector);
        this.camera.position.y = currentY;
        
        // Keep player above ground
        if (this.camera.position.y < 1.6) {
            this.camera.position.y = 1.6;
        }
    }
}

