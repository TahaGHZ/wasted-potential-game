import * as THREE from 'three';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.createHut();
        this.createTrees();
        this.createBushes();
        this.createRocks();
    }
    
    createHut() {
        const hutGroup = new THREE.Group();
        
        // Base (main structure)
        const baseGeometry = new THREE.BoxGeometry(4, 3, 4);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 1.5;
        base.castShadow = true;
        base.receiveShadow = true;
        hutGroup.add(base);
        
        // Roof
        const roofGeometry = new THREE.ConeGeometry(3.5, 2, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 4;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        roof.receiveShadow = true;
        hutGroup.add(roof);
        
        // Door
        const doorGeometry = new THREE.BoxGeometry(1, 2, 0.1);
        const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x4A4A4A });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 1, 2.01);
        door.castShadow = true;
        hutGroup.add(door);
        
        // Window
        const windowGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.1);
        const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x87CEEB });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(1.5, 2, 2.01);
        hutGroup.add(window);
        
        hutGroup.position.set(10, 0, 10);
        this.scene.add(hutGroup);
    }
    
    createTrees() {
        const treeCount = 7;
        const positions = [
            { x: -15, z: 15 },
            { x: 20, z: -10 },
            { x: -20, z: -15 },
            { x: 15, z: 20 },
            { x: -10, z: 25 },
            { x: 25, z: 10 },
            { x: -25, z: -5 }
        ];
        
        positions.forEach((pos, index) => {
            if (index < treeCount) {
                this.createTree(pos.x, pos.z);
            }
        });
    }
    
    createTree(x, z) {
        const treeGroup = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 3, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        treeGroup.add(trunk);
        
        // Foliage (multiple layers for better look)
        const foliageGeometry = new THREE.ConeGeometry(2, 4, 8);
        const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        const foliage1 = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage1.position.y = 4;
        foliage1.castShadow = true;
        foliage1.receiveShadow = true;
        treeGroup.add(foliage1);
        
        const foliage2 = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage2.position.y = 5.5;
        foliage2.scale.set(0.8, 0.8, 0.8);
        foliage2.castShadow = true;
        foliage2.receiveShadow = true;
        treeGroup.add(foliage2);
        
        treeGroup.position.set(x, 0, z);
        this.scene.add(treeGroup);
    }
    
    createBushes() {
        const bushCount = 8;
        const positions = [
            { x: 5, z: -8 },
            { x: -8, z: 5 },
            { x: 12, z: 8 },
            { x: -12, z: -8 },
            { x: 8, z: -12 },
            { x: -5, z: 12 },
            { x: 15, z: -5 },
            { x: -15, z: 8 }
        ];
        
        positions.forEach((pos, index) => {
            if (index < bushCount) {
                this.createBush(pos.x, pos.z);
            }
        });
    }
    
    createBush(x, z) {
        const bushGroup = new THREE.Group();
        
        // Create irregular bush shape with multiple spheres
        const bushMaterial = new THREE.MeshStandardMaterial({ color: 0x2D5016 });
        
        for (let i = 0; i < 3; i++) {
            const size = 0.4 + Math.random() * 0.3;
            const bushGeometry = new THREE.SphereGeometry(size, 6, 6);
            const bush = new THREE.Mesh(bushGeometry, bushMaterial);
            bush.position.set(
                (Math.random() - 0.5) * 0.8,
                size * 0.5,
                (Math.random() - 0.5) * 0.8
            );
            bush.castShadow = true;
            bush.receiveShadow = true;
            bushGroup.add(bush);
        }
        
        bushGroup.position.set(x, 0, z);
        this.scene.add(bushGroup);
    }
    
    createRocks() {
        const rockCount = 6;
        const positions = [
            { x: 3, z: -5 },
            { x: -6, z: 3 },
            { x: 7, z: 6 },
            { x: -4, z: -7 },
            { x: 9, z: -3 },
            { x: -8, z: 9 }
        ];
        
        positions.forEach((pos, index) => {
            if (index < rockCount) {
                this.createRock(pos.x, pos.z);
            }
        });
    }
    
    createRock(x, z) {
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
        
        rockGroup.position.set(x, 0, z);
        this.scene.add(rockGroup);
    }
}

