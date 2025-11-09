import * as THREE from 'three';

/**
 * ProjectileSystem - Manages rock projectiles
 * LLM-ready for NPC projectile throwing
 */
export class ProjectileSystem {
    constructor(scene) {
        this.scene = scene;
        this.projectiles = [];
        this.gravity = -9.8; // Gravity acceleration
        this.debug = false; // Set to true for debug logging
    }
    
    /**
     * Throw a rock projectile
     * @param {THREE.Vector3} startPosition - Starting position
     * @param {THREE.Vector3} direction - Direction vector (normalized)
     * @param {number} speed - Initial speed
     * @param {Object} thrower - Object that threw the rock (player/NPC) for collision detection
     * @returns {Object} - Projectile object
     */
    throwRock(startPosition, direction, speed = 15, thrower = null) {
        console.log('[ProjectileSystem] throwRock called:', {
            startPosition: { x: startPosition.x.toFixed(2), y: startPosition.y.toFixed(2), z: startPosition.z.toFixed(2) },
            direction: { x: direction.x.toFixed(2), y: direction.y.toFixed(2), z: direction.z.toFixed(2) },
            speed: speed,
            thrower: thrower
        });
        
        const projectile = {
            mesh: this.createRockProjectile(),
            position: startPosition.clone(),
            velocity: direction.clone().multiplyScalar(speed),
            age: 0,
            maxAge: 5, // Max lifetime in seconds
            thrower: thrower,
            hit: false
        };
        
        projectile.mesh.position.copy(startPosition);
        this.scene.add(projectile.mesh);
        this.projectiles.push(projectile);
        
        console.log('[ProjectileSystem] Projectile created and added to scene:', {
            position: { x: projectile.position.x.toFixed(2), y: projectile.position.y.toFixed(2), z: projectile.position.z.toFixed(2) },
            velocity: { x: projectile.velocity.x.toFixed(2), y: projectile.velocity.y.toFixed(2), z: projectile.velocity.z.toFixed(2) },
            totalProjectiles: this.projectiles.length
        });
        
        return projectile;
    }
    
    /**
     * Create a rock projectile mesh
     */
    createRockProjectile() {
        const rockGroup = new THREE.Group();
        
        const rockMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x696969,
            emissive: 0x333333 // Make it slightly visible
        });
        const size = 0.2; // Slightly larger for visibility
        const rockGeometry = new THREE.BoxGeometry(size, size * 0.6, size);
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.castShadow = true;
        rock.receiveShadow = true;
        rockGroup.add(rock);
        
        console.log('[ProjectileSystem] Created projectile mesh');
        
        return rockGroup;
    }
    
    /**
     * Update all projectiles
     * @param {number} delta - Time delta
     * @param {Array} npcs - Array of NPCs for collision detection
     * @returns {Array} - Array of hit events [{npc, projectile}, ...]
     */
    update(delta, npcs = []) {
        const hits = [];
        
        // Debug: log projectile and NPC counts
        if (this.projectiles.length > 0) {
            console.log(`[ProjectileSystem] Checking ${this.projectiles.length} projectile(s) against ${npcs.length} NPC(s)`);
        }
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            if (projectile.hit) {
                this.removeProjectile(i);
                continue;
            }
            
            // Update age
            projectile.age += delta;
            
            // Remove if too old
            if (projectile.age >= projectile.maxAge) {
                this.removeProjectile(i);
                continue;
            }
            
            // Apply gravity
            projectile.velocity.y += this.gravity * delta;
            
            // Update position
            const movement = projectile.velocity.clone().multiplyScalar(delta);
            projectile.position.add(movement);
            projectile.mesh.position.copy(projectile.position);
            
            // Rotate projectile for visual effect
            projectile.mesh.rotation.x += delta * 5;
            projectile.mesh.rotation.y += delta * 5;
            
            // Check collision with ground
            if (projectile.position.y <= 0.1) {
                this.removeProjectile(i);
                continue;
            }
            
            // Check collision with NPCs
            for (const npc of npcs) {
                if (!npc.mesh) {
                    console.warn(`[ProjectileSystem] NPC ${npc.id} has no mesh`);
                    continue;
                }
                
                if (npc.id === projectile.thrower?.id) {
                    continue; // Skip if same thrower
                }
                
                // Get NPC world position (mesh position is the world position since it's a Group)
                const npcWorldPosition = new THREE.Vector3();
                npc.mesh.getWorldPosition(npcWorldPosition);
                
                // Always use mesh world position for accuracy (it's the actual position in the scene)
                const npcPosition = npcWorldPosition;
                
                // Calculate distance (using X and Z for horizontal distance, Y for vertical)
                const horizontalDistance = Math.sqrt(
                    Math.pow(projectile.position.x - npcPosition.x, 2) +
                    Math.pow(projectile.position.z - npcPosition.z, 2)
                );
                
                // NPC mesh structure: 
                // - mesh.position is at ground level (feet at y=0 relative to mesh)
                // - bodyGroup is at y=1.2 relative to mesh (so feet are at mesh.y + 1.2 - 1.2 = mesh.y)
                // - torso center is at y=0.5 relative to bodyGroup
                // So NPC center (torso) is at: npcPosition.y + 1.2 + 0.5 = npcPosition.y + 1.7
                // NPC height is approximately 2.0 units (from feet to head)
                const npcCenterY = npcPosition.y + 1.7; // Torso center
                const verticalDistance = Math.abs(projectile.position.y - npcCenterY);
                
                // NPC collision radius (approximate body size)
                const npcRadius = 0.8; // Increased for better collision detection
                const npcHeight = 2.5; // NPC height (increased tolerance)
                
                // Check if projectile is within NPC bounds
                // Use more lenient collision detection - allow vertical distance up to npcHeight (not just half)
                // This accounts for projectiles passing through the NPC body at various heights
                if (horizontalDistance < npcRadius && verticalDistance < npcHeight) {
                    // Hit NPC!
                    console.log(`[ProjectileSystem] Collision detected! NPC ${npc.id}:`, {
                        horizontalDist: horizontalDistance.toFixed(2),
                        verticalDist: verticalDistance.toFixed(2),
                        projectilePos: { x: projectile.position.x.toFixed(2), y: projectile.position.y.toFixed(2), z: projectile.position.z.toFixed(2) },
                        npcPos: { x: npcPosition.x.toFixed(2), y: npcPosition.y.toFixed(2), z: npcPosition.z.toFixed(2) },
                        npcCenterY: npcCenterY.toFixed(2),
                        thrower: projectile.thrower?.id || 'unknown'
                    });
                    
                    projectile.hit = true;
                    hits.push({
                        npc: npc,
                        projectile: projectile,
                        position: projectile.position.clone()
                    });
                    
                    // Notify NPC of hit
                    if (npc.onHit) {
                        npc.onHit(projectile.thrower);
                    }
                    
                    this.removeProjectile(i);
                    break;
                } else if (horizontalDistance < npcRadius * 2) {
                    // Log near misses for debugging
                    console.log(`[ProjectileSystem] Near miss on NPC ${npc.id}:`, {
                        horizontalDist: horizontalDistance.toFixed(2),
                        verticalDist: verticalDistance.toFixed(2),
                        required: { h: npcRadius, v: npcHeight / 2 },
                        projectilePos: { x: projectile.position.x.toFixed(2), y: projectile.position.y.toFixed(2), z: projectile.position.z.toFixed(2) },
                        npcPos: { x: npcPosition.x.toFixed(2), y: npcPosition.y.toFixed(2), z: npcPosition.z.toFixed(2) },
                        npcCenterY: npcCenterY.toFixed(2)
                    });
                }
            }
        }
        
        return hits;
    }
    
    /**
     * Remove projectile from scene and array
     */
    removeProjectile(index) {
        const projectile = this.projectiles[index];
        if (projectile && projectile.mesh) {
            this.scene.remove(projectile.mesh);
        }
        this.projectiles.splice(index, 1);
    }
    
    /**
     * Clear all projectiles
     */
    clear() {
        this.projectiles.forEach(projectile => {
            if (projectile.mesh) {
                this.scene.remove(projectile.mesh);
            }
        });
        this.projectiles = [];
    }
    
    /**
     * Get all active projectiles (for LLM/NPC access)
     */
    getProjectiles() {
        return this.projectiles.map(p => ({
            position: {
                x: p.position.x,
                y: p.position.y,
                z: p.position.z
            },
            age: p.age,
            thrower: p.thrower ? p.thrower.id : null
        }));
    }
}

