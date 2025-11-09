import * as THREE from 'three';

/**
 * InteractionSystem - Handles player interactions with interactive objects
 * LLM-ready for NPC interactions
 */
export class InteractionSystem {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        
        // Interactive objects (lamps, etc.)
        this.interactables = [];
        
        // Current interaction state
        this.currentInteractable = null;
        this.interactionKeyPressed = false;
        
        // Setup keyboard listener
        this.setupKeyboardListener();
    }
    
    setupKeyboardListener() {
        document.addEventListener('keydown', (event) => {
            if (event.code === 'KeyF') {
                this.interactionKeyPressed = true;
                const result = this.attemptInteraction();
                // Trigger custom event for rock collection
                if (result !== null && result !== undefined) {
                    document.dispatchEvent(new CustomEvent('interactionResult', { detail: result }));
                }
            }
        });
        
        document.addEventListener('keyup', (event) => {
            if (event.code === 'KeyF') {
                this.interactionKeyPressed = false;
            }
        });
    }
    
    registerInteractable(interactable) {
        this.interactables.push(interactable);
    }
    
    update() {
        // Check for nearby interactables
        const cameraPosition = this.camera.position;
        let nearestInteractable = null;
        let nearestDistance = Infinity;
        
        for (const interactable of this.interactables) {
            const isInRange = interactable.isInRange && interactable.isInRange(cameraPosition);
            
            // Show/hide 3D prompt
            if (interactable.showPrompt && interactable.hidePrompt) {
                if (isInRange) {
                    interactable.showPrompt(cameraPosition);
                } else {
                    interactable.hidePrompt();
                }
            }
            
            if (isInRange) {
                const distance = interactable.getDistance 
                    ? interactable.getDistance(cameraPosition)
                    : interactable.position.distanceTo(cameraPosition);
                
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestInteractable = interactable;
                }
            }
        }
        
        this.currentInteractable = nearestInteractable;
    }
    
    attemptInteraction() {
        if (this.currentInteractable) {
            if (this.currentInteractable.toggle) {
                this.currentInteractable.toggle();
            } else if (this.currentInteractable.interact) {
                const result = this.currentInteractable.interact();
                return result; // Return result for rock collection
            }
        }
        return null;
    }
    
    getCurrentInteractable() {
        return this.currentInteractable;
    }
    
    /**
     * Get all interactables (for LLM/NPC access)
     */
    getInteractables() {
        return this.interactables.map(obj => ({
            type: obj.constructor.name,
            state: obj.getState ? obj.getState() : null,
            position: obj.position ? {
                x: obj.position.x,
                y: obj.position.y,
                z: obj.position.z
            } : null
        }));
    }
}

