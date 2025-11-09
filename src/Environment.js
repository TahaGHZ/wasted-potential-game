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
        const merchantGroup = new THREE.Group();
        
        // Support posts (4 posts to hold the roof)
        const postGeometry = new THREE.CylinderGeometry(0.15, 0.15, 4, 8);
        const postMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        
        const postPositions = [
            { x: -2, z: -2 },
            { x: 2, z: -2 },
            { x: -2, z: 2 },
            { x: 2, z: 2 }
        ];
        
        postPositions.forEach(pos => {
            const post = new THREE.Mesh(postGeometry, postMaterial);
            post.position.set(pos.x, 2, pos.z);
            post.castShadow = true;
            post.receiveShadow = true;
            merchantGroup.add(post);
        });
        
        // Big roof (pyramid style)
        const roofGeometry = new THREE.ConeGeometry(3.5, 2.5, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 4.25;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        roof.receiveShadow = true;
        merchantGroup.add(roof);
        
        // Counter/table (where merchant stands behind)
        const counterGeometry = new THREE.BoxGeometry(3, 0.8, 1);
        const counterMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const counter = new THREE.Mesh(counterGeometry, counterMaterial);
        counter.position.set(0, 0.4, -1.5);
        counter.castShadow = true;
        counter.receiveShadow = true;
        merchantGroup.add(counter);
        
        // Boxes (scattered around)
        const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xD2691E });
        const boxPositions = [
            { x: -1.5, z: 1.5, size: 0.4 },
            { x: 1.5, z: 1.5, size: 0.5 },
            { x: -2, z: 0, size: 0.35 },
            { x: 2, z: 0, size: 0.45 }
        ];
        
        boxPositions.forEach(pos => {
            const boxGeometry = new THREE.BoxGeometry(pos.size, pos.size, pos.size);
            const box = new THREE.Mesh(boxGeometry, boxMaterial);
            box.position.set(pos.x, pos.size / 2, pos.z);
            box.castShadow = true;
            box.receiveShadow = true;
            merchantGroup.add(box);
        });
        
        // Hay bales
        const hayMaterial = new THREE.MeshStandardMaterial({ color: 0xDAA520 });
        const hayPositions = [
            { x: -1, z: 2, rotation: 0 },
            { x: 1, z: 2, rotation: Math.PI / 4 },
            { x: 0, z: 2.5, rotation: Math.PI / 2 }
        ];
        
        hayPositions.forEach(pos => {
            const hayGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 8);
            const hay = new THREE.Mesh(hayGeometry, hayMaterial);
            hay.position.set(pos.x, 0.3, pos.z);
            hay.rotation.z = pos.rotation;
            hay.castShadow = true;
            hay.receiveShadow = true;
            merchantGroup.add(hay);
        });
        
        // Additional crates/barrels
        const crateMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
        const crateGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const crate = new THREE.Mesh(crateGeometry, crateMaterial);
        crate.position.set(-1.8, 0.25, -1);
        crate.castShadow = true;
        crate.receiveShadow = true;
        merchantGroup.add(crate);
        
        const crate2 = new THREE.Mesh(crateGeometry, crateMaterial);
        crate2.position.set(1.8, 0.25, -1);
        crate2.castShadow = true;
        crate2.receiveShadow = true;
        merchantGroup.add(crate2);
        
        merchantGroup.position.set(10, 0, 10);
        this.scene.add(merchantGroup);
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

