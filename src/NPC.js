import * as THREE from 'three';

export class NPC {
    constructor(scene, position, id, environmentManager = null, customPersonality = null) {
        this.scene = scene;
        this.position = position.clone();
        this.id = id;
        this.environmentManager = environmentManager;
        
        // NPC attributes (for future expansion)
        // Use custom personality if provided, otherwise generate default
        this.personality = customPersonality || this.generatePersonality();
        this.attributes = this.generateAttributes();
        this.state = 'idle'; // idle, walking, talking, etc.
        
        // Create visual representation
        this.mesh = this.createMesh();
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
        
        // Store reference to bodyGroup for animations
        this.bodyGroup = this.mesh;
        
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
        
        // Text-to-speech system
        this.speechSynthesis = window.speechSynthesis;
        this.currentUtterance = null;
        this.voicesLoaded = false;
        
        // Load voices (may need to wait for them to be available)
        this.loadVoices();
        
        // Name tag system
        this.nameTag = null;
        this.setupNameTag();
        
        // Inventory system (for rocks)
        this.inventory = {
            rocks: 0
        };
        
        // Rock counter display
        this.rockCounter = null;
        this.setupRockCounter();
        
        // Animation system
        this.blinkTimer = 0;
        this.talkingTimer = 0;
        this.isWalking = false;
        this.targetExpression = 'Neutral';
        this.currentExpression = 'Neutral';
        
        // Animation time tracking
        this.animationTime = 0;
    }
    
    generatePersonality() {
        // Generate personality based on NPC ID
        // Later, this will be generated from natural language paragraphs
        if (this.id === 1) {
            // Elenor - Elven mage
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
        } else if (this.id === 2) {
            // Marcus - Warrior guard
            return {
                name: 'Marcus',
                displayName: 'Marcus',
                backstory: 'You are Marcus, a seasoned warrior and guard from the northern fortresses. You value honor, strength, and duty. You are straightforward and protective, always ready to defend those in need.',
                traits: {
                    honor: 0.9,       // High value for honor
                    strength: 0.85,   // High physical strength
                    duty: 0.9,        // Very high sense of duty
                    friendliness: 0.65, // Moderate friendliness
                    courage: 0.95,    // Very high courage
                    energy: 0.85,
                    talkativeness: 0.6 // Less talkative, more action-oriented
                },
                // Legacy numeric traits for compatibility
                friendliness: 0.65,
                curiosity: 0.5,
                energy: 0.85,
                talkativeness: 0.6
            };
        } else {
            // Default personality for other NPCs
            return {
                name: `NPC ${this.id}`,
                displayName: `NPC ${this.id}`,
                backstory: `You are NPC ${this.id}, a character in this world.`,
                traits: {
                    friendliness: 0.5,
                    curiosity: 0.5,
                    energy: 0.5,
                    talkativeness: 0.5
                },
                friendliness: 0.5,
                curiosity: 0.5,
                energy: 0.5,
                talkativeness: 0.5
            };
        }
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
        // Main body group
        this.bodyGroup = new THREE.Group();
        
        // Materials
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
        const shirtMat = new THREE.MeshStandardMaterial({ 
            color: this.id === 0 ? 0x4169E1 : (this.id === 1 ? 0x2C5E91 : 0xFFD700) // Blue, Blue shirt (Elenor), or Gold (Marcus)
        });
        const trousersMat = new THREE.MeshStandardMaterial({ color: 0x2F4F4F });
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        
        // Torso Dimensions
        const torsoWidth = 0.6;
        const torsoHeight = 1.0;
        const torsoDepth = 0.4;
        
        // 1. Torso (Rectangular Block)
        const torsoGeo = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth);
        const torso = new THREE.Mesh(torsoGeo, shirtMat);
        torso.position.y = 0;
        torso.castShadow = true;
        torso.receiveShadow = true;
        this.bodyGroup.add(torso);
        
        // 2. Neck
        const neckGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.2, 16);
        const neck = new THREE.Mesh(neckGeo, skinMat);
        neck.position.y = torsoHeight / 2;
        neck.castShadow = true;
        neck.receiveShadow = true;
        this.bodyGroup.add(neck);
        
        // --- Arms (SEAMLESS JOINTS) ---
        const armSegmentGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 16);
        const shoulderSphereGeo = new THREE.SphereGeometry(0.175, 16, 16);
        const elbowSphereGeo = new THREE.SphereGeometry(0.125, 16, 16);
        const wristSphereGeo = new THREE.SphereGeometry(0.1, 16, 16);
        const handGeo = new THREE.BoxGeometry(0.125, 0.175, 0.1);
        
        // Left Arm Structure
        this.leftArmPivot = new THREE.Group();
        this.leftArmPivot.position.set(-(torsoWidth / 2) - 0.05, 0.25, 0);
        this.bodyGroup.add(this.leftArmPivot);
        
        const leftShoulderSphere = new THREE.Mesh(shoulderSphereGeo, shirtMat);
        leftShoulderSphere.position.set(0, 0, 0);
        this.leftArmPivot.add(leftShoulderSphere);
        
        this.leftUpperArm = new THREE.Mesh(armSegmentGeo, shirtMat);
        this.leftUpperArm.position.y = -0.175;
        this.leftUpperArm.castShadow = true;
        this.leftUpperArm.receiveShadow = true;
        this.leftArmPivot.add(this.leftUpperArm);
        
        const leftElbowSphere = new THREE.Mesh(elbowSphereGeo, skinMat);
        leftElbowSphere.position.y = -0.3;
        this.leftUpperArm.add(leftElbowSphere);
        
        this.leftElbowPivot = new THREE.Group();
        this.leftElbowPivot.position.y = -0.3;
        this.leftUpperArm.add(this.leftElbowPivot);
        
        this.leftLowerArm = new THREE.Mesh(armSegmentGeo, skinMat);
        this.leftLowerArm.position.y = -0.175;
        this.leftLowerArm.castShadow = true;
        this.leftLowerArm.receiveShadow = true;
        this.leftElbowPivot.add(this.leftLowerArm);
        
        const leftWristSphere = new THREE.Mesh(wristSphereGeo, skinMat);
        leftWristSphere.position.y = -0.3;
        this.leftLowerArm.add(leftWristSphere);
        
        this.leftHand = new THREE.Mesh(handGeo, skinMat);
        this.leftHand.position.y = -0.375;
        this.leftHand.castShadow = true;
        this.leftHand.receiveShadow = true;
        this.leftLowerArm.add(this.leftHand);
        
        // Right Arm Structure (Symmetrical)
        this.rightArmPivot = new THREE.Group();
        this.rightArmPivot.position.set((torsoWidth / 2) + 0.05, 0.25, 0);
        this.bodyGroup.add(this.rightArmPivot);
        
        const rightShoulderSphere = new THREE.Mesh(shoulderSphereGeo, shirtMat);
        rightShoulderSphere.position.set(0, 0, 0);
        this.rightArmPivot.add(rightShoulderSphere);
        
        this.rightUpperArm = new THREE.Mesh(armSegmentGeo, shirtMat);
        this.rightUpperArm.position.y = -0.175;
        this.rightUpperArm.castShadow = true;
        this.rightUpperArm.receiveShadow = true;
        this.rightArmPivot.add(this.rightUpperArm);
        
        const rightElbowSphere = new THREE.Mesh(elbowSphereGeo, skinMat);
        rightElbowSphere.position.y = -0.3;
        this.rightUpperArm.add(rightElbowSphere);
        
        this.rightElbowPivot = new THREE.Group();
        this.rightElbowPivot.position.y = -0.3;
        this.rightUpperArm.add(this.rightElbowPivot);
        
        this.rightLowerArm = new THREE.Mesh(armSegmentGeo, skinMat);
        this.rightLowerArm.position.y = -0.175;
        this.rightLowerArm.castShadow = true;
        this.rightLowerArm.receiveShadow = true;
        this.rightElbowPivot.add(this.rightLowerArm);
        
        const rightWristSphere = new THREE.Mesh(wristSphereGeo, skinMat);
        rightWristSphere.position.y = -0.3;
        this.rightLowerArm.add(rightWristSphere);
        
        this.rightHand = new THREE.Mesh(handGeo, skinMat);
        this.rightHand.position.y = -0.375;
        this.rightHand.castShadow = true;
        this.rightHand.receiveShadow = true;
        this.rightLowerArm.add(this.rightHand);
        
        // Initial static pose rotations
        const idleArmRotationZ = 0;
        const staticElbowBend = 0;
        
        this.leftArmPivot.rotation.z = idleArmRotationZ;
        this.rightArmPivot.rotation.z = idleArmRotationZ;
        this.leftElbowPivot.rotation.x = staticElbowBend;
        this.rightElbowPivot.rotation.x = staticElbowBend;
        
        // --- Legs and Feet (SEAMLESS JOINTS) ---
        const upperLegGeo = new THREE.CylinderGeometry(0.175, 0.175, 0.4, 16);
        const lowerLegGeo = new THREE.CylinderGeometry(0.175, 0.175, 0.4, 16);
        const footGeo = new THREE.BoxGeometry(0.2, 0.15, 0.4);
        const kneeGeo = new THREE.SphereGeometry(0.175, 16, 16);
        const hipSphereGeo = new THREE.SphereGeometry(0.2, 16, 16);
        
        // Left Leg Structure
        this.leftLegPivot = new THREE.Group();
        this.leftLegPivot.position.set(-0.2, -(torsoHeight / 2), 0);
        this.bodyGroup.add(this.leftLegPivot);
        
        const leftHipSphere = new THREE.Mesh(hipSphereGeo, trousersMat);
        leftHipSphere.position.y = 0.2;
        this.leftLegPivot.add(leftHipSphere);
        
        this.leftUpperLeg = new THREE.Mesh(upperLegGeo, trousersMat);
        this.leftUpperLeg.position.y = -0.2;
        this.leftUpperLeg.castShadow = true;
        this.leftUpperLeg.receiveShadow = true;
        this.leftLegPivot.add(this.leftUpperLeg);
        
        this.leftKneePivot = new THREE.Group();
        this.leftKneePivot.position.y = -0.4;
        this.leftUpperLeg.add(this.leftKneePivot);
        
        const leftKnee = new THREE.Mesh(kneeGeo, trousersMat);
        leftKnee.position.z = 0.025;
        this.leftKneePivot.add(leftKnee);
        
        this.leftLowerLeg = new THREE.Mesh(lowerLegGeo, trousersMat);
        this.leftLowerLeg.position.y = -0.2;
        this.leftLowerLeg.castShadow = true;
        this.leftLowerLeg.receiveShadow = true;
        this.leftKneePivot.add(this.leftLowerLeg);
        
        this.leftFoot = new THREE.Mesh(footGeo, shoeMat);
        this.leftFoot.position.set(0, -0.4, 0.1);
        this.leftFoot.castShadow = true;
        this.leftFoot.receiveShadow = true;
        this.leftLowerLeg.add(this.leftFoot);
        
        // Right Leg Structure (Symmetrical)
        this.rightLegPivot = new THREE.Group();
        this.rightLegPivot.position.set(0.2, -(torsoHeight / 2), 0);
        this.bodyGroup.add(this.rightLegPivot);
        
        const rightHipSphere = new THREE.Mesh(hipSphereGeo, trousersMat);
        rightHipSphere.position.y = 0.2;
        this.rightLegPivot.add(rightHipSphere);
        
        this.rightUpperLeg = new THREE.Mesh(upperLegGeo, trousersMat);
        this.rightUpperLeg.position.y = -0.2;
        this.rightUpperLeg.castShadow = true;
        this.rightUpperLeg.receiveShadow = true;
        this.rightLegPivot.add(this.rightUpperLeg);
        
        this.rightKneePivot = new THREE.Group();
        this.rightKneePivot.position.y = -0.4;
        this.rightUpperLeg.add(this.rightKneePivot);
        
        const rightKnee = new THREE.Mesh(kneeGeo, trousersMat);
        rightKnee.position.z = 0.025;
        this.rightKneePivot.add(rightKnee);
        
        this.rightLowerLeg = new THREE.Mesh(lowerLegGeo, trousersMat);
        this.rightLowerLeg.position.y = -0.2;
        this.rightLowerLeg.castShadow = true;
        this.rightLowerLeg.receiveShadow = true;
        this.rightKneePivot.add(this.rightLowerLeg);
        
        this.rightFoot = new THREE.Mesh(footGeo, shoeMat);
        this.rightFoot.position.set(0, -0.4, 0.1);
        this.rightFoot.castShadow = true;
        this.rightFoot.receiveShadow = true;
        this.rightLowerLeg.add(this.rightFoot);
        
        // Apply a slight static knee bend
        const staticKneeBend = Math.PI * 0.05;
        this.leftKneePivot.rotation.x = staticKneeBend;
        this.rightKneePivot.rotation.x = staticKneeBend;
        
        // Final body position adjustment
        // Position bodyGroup so feet are at y=0 (ground level)
        // Torso height = 1.0, legs extend down ~1.2 units from torso bottom
        // So bodyGroup should be at y = 1.2 to put feet at y=0
        this.bodyGroup.position.y = 1.2;
        
        // --- Face Setup ---
        this.faceGroup = new THREE.Group();
        this.faceGroup.position.y = 1.0;
        this.bodyGroup.add(this.faceGroup);
        
        // Head
        const headGeo = new THREE.SphereGeometry(0.5, 32, 32);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.castShadow = true;
        head.receiveShadow = true;
        this.faceGroup.add(head);
        
        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.05, 16, 16);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        this.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        this.leftEye.position.set(-0.15, 0.1, 0.45);
        this.rightEye.position.set(0.15, 0.1, 0.45);
        this.faceGroup.add(this.leftEye, this.rightEye);
        
        // Brows
        const browGeo = new THREE.BoxGeometry(0.2, 0.04, 0.025);
        const browMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        this.leftBrow = new THREE.Mesh(browGeo, browMat);
        this.rightBrow = new THREE.Mesh(browGeo, browMat);
        this.leftBrow.position.set(-0.15, 0.275, 0.45);
        this.rightBrow.position.set(0.15, 0.275, 0.45);
        this.faceGroup.add(this.leftBrow, this.rightBrow);
        
        // Cheeks
        const cheekGeo = new THREE.SphereGeometry(0.075, 16, 16);
        const cheekMat = new THREE.MeshStandardMaterial({ color: 0xff9999 });
        this.leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
        this.rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
        this.leftCheek.position.set(-0.25, -0.05, 0.35);
        this.rightCheek.position.set(0.25, -0.05, 0.35);
        this.faceGroup.add(this.leftCheek, this.rightCheek);
        
        // Mouths
        const mouthMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.mouths = {};
        
        this.mouths.Neutral = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.01, 0.025), mouthMat);
        this.mouths.Smile = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.0125, 16, 32, Math.PI), mouthMat);
        this.mouths.Smile.rotation.x = Math.PI;
        this.mouths.Frown = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.0125, 16, 32, Math.PI), mouthMat);
        this.mouths.Angry = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.025, 0.025), mouthMat);
        this.mouths.Surprise = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.025), mouthMat);
        this.mouths.SurpriseTeeth = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.025, 0.025),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        this.mouths.Talking = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 0.025), mouthMat);
        
        this.mouths.Neutral.position.set(0, -0.15, 0.51);
        this.mouths.Smile.position.set(0, -0.125, 0.515);
        this.mouths.Frown.position.set(0, -0.175, 0.515);
        this.mouths.Angry.position.set(0, -0.15, 0.51);
        this.mouths.Surprise.position.set(0, -0.125, 0.51);
        this.mouths.SurpriseTeeth.position.set(0, -0.05, 0.52);
        this.mouths.Talking.position.set(0, -0.15, 0.51);
        
        Object.values(this.mouths).forEach(m => {
            this.faceGroup.add(m);
            m.visible = false;
        });
        
        this.mouths.Neutral.visible = true;
        
        return this.bodyGroup;
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
        // Update animation time
        this.animationTime += delta;
        
        // Update movement
        if (this.targetPosition && this.isMoving) {
            this.updateMovement(delta);
        } else {
            this.isWalking = false;
        }
        
        // Update animations
        this.updateAnimations(delta);
        
        // Update speech bubble position
        if (this.speechBubble) {
            this.updateSpeechBubble();
        }
        
        // Update name tag position
        if (this.nameTag) {
            this.updateNameTag();
        }
        
        // Update rock counter position
        if (this.rockCounter) {
            this.updateRockCounter();
        }
    }
    
    updateAnimations(delta) {
        if (!this.bodyGroup) return;
        
        const time = this.animationTime;
        const staticElbowBend = 0;
        const idleArmRotationZ = 0;
        const staticKneeBend = Math.PI * 0.05;
        
        // --- Face Animations ---
        // Blinking
        this.blinkTimer += delta;
        const blink = Math.sin(this.blinkTimer * Math.PI * 2 / 3) > 0.95 ? 0.1 : 1;
        if (this.leftEye) this.leftEye.scale.y = blink;
        if (this.rightEye) this.rightEye.scale.y = blink;
        
        // No talking animation - only emotion expressions
        
        // --- Body Animations ---
        if (this.isWalking) {
            const walkSpeed = 5;
            const strideLength = Math.PI * 0.3;
            const armSwing = Math.PI * 0.2;
            
            const legMovement = Math.sin(time * walkSpeed);
            
            // Leg Movement: Alternating forward/backward swing
            if (this.leftLegPivot) this.leftLegPivot.rotation.x = legMovement * strideLength;
            if (this.rightLegPivot) this.rightLegPivot.rotation.x = -legMovement * strideLength;
            
            // Arm Movement: Opposite swing for balance
            if (this.leftArmPivot) this.leftArmPivot.rotation.x = -legMovement * armSwing;
            if (this.rightArmPivot) this.rightArmPivot.rotation.x = legMovement * armSwing;
            
            // Simple Knee Bend while walking
            const kneeBend = Math.abs(Math.sin(time * walkSpeed * 0.5)) * Math.PI * 0.1;
            if (this.leftKneePivot) this.leftKneePivot.rotation.x = staticKneeBend + kneeBend;
            if (this.rightKneePivot) this.rightKneePivot.rotation.x = staticKneeBend + kneeBend;
        } else {
            // Static Reset (Interpolation back to Idle Pose)
            if (this.leftArmPivot) {
                this.leftArmPivot.rotation.x += (0 - this.leftArmPivot.rotation.x) * 0.1;
                this.leftArmPivot.rotation.z += (idleArmRotationZ - this.leftArmPivot.rotation.z) * 0.1;
            }
            if (this.rightArmPivot) {
                this.rightArmPivot.rotation.x += (0 - this.rightArmPivot.rotation.x) * 0.1;
                this.rightArmPivot.rotation.z += (idleArmRotationZ - this.rightArmPivot.rotation.z) * 0.1;
            }
            if (this.leftElbowPivot) {
                this.leftElbowPivot.rotation.x += (staticElbowBend - this.leftElbowPivot.rotation.x) * 0.1;
            }
            if (this.rightElbowPivot) {
                this.rightElbowPivot.rotation.x += (staticElbowBend - this.rightElbowPivot.rotation.x) * 0.1;
            }
            
            // Interpolate legs/knees back to their fixed starting pose
            if (this.leftLegPivot) this.leftLegPivot.rotation.x += (0 - this.leftLegPivot.rotation.x) * 0.1;
            if (this.rightLegPivot) this.rightLegPivot.rotation.x += (0 - this.rightLegPivot.rotation.x) * 0.1;
            if (this.leftKneePivot) this.leftKneePivot.rotation.x += (staticKneeBend - this.leftKneePivot.rotation.x) * 0.1;
            if (this.rightKneePivot) this.rightKneePivot.rotation.x += (staticKneeBend - this.rightKneePivot.rotation.x) * 0.1;
        }
        
        // --- Facial Expression Transitions ---
        switch(this.targetExpression) {
            case 'Smile':
                if (this.leftBrow) this.leftBrow.rotation.z += (-0.15 - this.leftBrow.rotation.z) * 0.1;
                if (this.rightBrow) this.rightBrow.rotation.z += (0.15 - this.rightBrow.rotation.z) * 0.1;
                if (this.leftCheek) this.leftCheek.position.y += (0.05 - this.leftCheek.position.y) * 0.1;
                if (this.rightCheek) this.rightCheek.position.y += (0.05 - this.rightCheek.position.y) * 0.1;
                break;
            case 'Frown':
                if (this.leftBrow) this.leftBrow.rotation.z += (0.15 - this.leftBrow.rotation.z) * 0.1;
                if (this.rightBrow) this.rightBrow.rotation.z += (-0.15 - this.rightBrow.rotation.z) * 0.1;
                if (this.leftCheek) this.leftCheek.position.y += (-0.05 - this.leftCheek.position.y) * 0.1;
                if (this.rightCheek) this.rightCheek.position.y += (-0.05 - this.rightCheek.position.y) * 0.1;
                break;
            case 'Angry':
                if (this.leftBrow) this.leftBrow.rotation.z += (-0.3 - this.leftBrow.rotation.z) * 0.1;
                if (this.rightBrow) this.rightBrow.rotation.z += (0.3 - this.rightBrow.rotation.z) * 0.1;
                if (this.leftCheek) this.leftCheek.position.y += (-0.02 - this.leftCheek.position.y) * 0.1;
                if (this.rightCheek) this.rightCheek.position.y += (-0.02 - this.rightCheek.position.y) * 0.1;
                break;
            case 'Surprise':
                if (this.leftBrow) {
                    this.leftBrow.position.y += (0.65 - this.leftBrow.position.y) * 0.1;
                    this.leftBrow.rotation.z += (0 - this.leftBrow.rotation.z) * 0.1;
                }
                if (this.rightBrow) {
                    this.rightBrow.position.y += (0.65 - this.rightBrow.position.y) * 0.1;
                    this.rightBrow.rotation.z += (0 - this.rightBrow.rotation.z) * 0.1;
                }
                if (this.leftCheek) this.leftCheek.position.y += (-0.05 - this.leftCheek.position.y) * 0.1;
                if (this.rightCheek) this.rightCheek.position.y += (-0.05 - this.rightCheek.position.y) * 0.1;
                break;
            default: // Neutral
                if (this.leftBrow) {
                    this.leftBrow.rotation.z += (0 - this.leftBrow.rotation.z) * 0.1;
                    this.leftBrow.position.y += (0.275 - this.leftBrow.position.y) * 0.1;
                }
                if (this.rightBrow) {
                    this.rightBrow.rotation.z += (0 - this.rightBrow.rotation.z) * 0.1;
                    this.rightBrow.position.y += (0.275 - this.rightBrow.position.y) * 0.1;
                }
                if (this.leftCheek) this.leftCheek.position.y += (-0.05 - this.leftCheek.position.y) * 0.1;
                if (this.rightCheek) this.rightCheek.position.y += (-0.05 - this.rightCheek.position.y) * 0.1;
                break;
        }
    }
    
    setExpression(name) {
        if (!this.mouths) return;
        
        this.targetExpression = name;
        this.currentExpression = name;
        
        // Hide all mouths
        Object.values(this.mouths).forEach(m => {
            if (m) m.visible = false;
        });
        
        // Show the selected mouth
        switch(name) {
            case 'Neutral':
                if (this.mouths.Neutral) this.mouths.Neutral.visible = true;
                break;
            case 'Smile':
                if (this.mouths.Smile) this.mouths.Smile.visible = true;
                break;
            case 'Frown':
                if (this.mouths.Frown) this.mouths.Frown.visible = true;
                break;
            case 'Angry':
                if (this.mouths.Angry) this.mouths.Angry.visible = true;
                break;
            case 'Surprise':
                if (this.mouths.Surprise) this.mouths.Surprise.visible = true;
                if (this.mouths.SurpriseTeeth) this.mouths.SurpriseTeeth.visible = true;
                break;
        }
        
        console.log(`[NPC ${this.id}] Expression set to: ${name}`);
    }
    
    updateMovement(delta) {
        if (!this.targetPosition) return;
        
        // Ensure Y coordinate is preserved (NPCs stay on ground level)
        const targetY = this.position.y; // Keep current Y (should be 0 for ground level)
        this.targetPosition.y = targetY; // Force target Y to match current Y
        
        const direction = this.targetPosition.clone().sub(this.position);
        const distance = direction.length();
        
        if (distance < 0.1) {
            // Reached target
            this.position.copy(this.targetPosition);
            this.position.y = targetY; // Ensure Y stays at ground level
            this.mesh.position.copy(this.position);
            this.targetPosition = null;
            this.isMoving = false;
            this.isWalking = false;
            this.state = 'idle';
        } else {
            // Move towards target (only on X and Z axes, preserve Y)
            direction.normalize();
            const moveDistance = Math.min(this.moveSpeed * delta, distance);
            this.position.add(direction.multiplyScalar(moveDistance));
            this.position.y = targetY; // Ensure Y stays at ground level
            this.mesh.position.copy(this.position);
            this.isMoving = true;
            this.isWalking = true;
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
    
    setupRockCounter() {
        // Create rock counter element
        this.rockCounter = document.createElement('div');
        this.rockCounter.id = `npc-rock-counter-${this.id}`;
        this.rockCounter.textContent = '🪨 0';
        this.rockCounter.style.cssText = `
            position: absolute;
            color: white;
            background: rgba(100, 50, 0, 0.8);
            padding: 2px 8px;
            border-radius: 4px;
            z-index: 98;
            font-size: 11px;
            text-align: center;
            font-family: Arial, sans-serif;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            pointer-events: none;
            white-space: nowrap;
            display: none;
        `;
        document.body.appendChild(this.rockCounter);
    }
    
    updateRockCounter() {
        if (!this.rockCounter || !this.game) return;
        
        // Only show if NPC has rocks
        if (this.inventory.rocks > 0) {
            this.rockCounter.textContent = `🪨 ${this.inventory.rocks}`;
            this.rockCounter.style.display = 'block';
            
            // Convert 3D position to screen coordinates
            const vector = this.mesh.position.clone();
            vector.y += 2.0; // Below name tag
            
            // Project to screen space
            vector.project(this.game.camera);
            
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
            
            this.rockCounter.style.left = `${x}px`;
            this.rockCounter.style.top = `${y}px`;
            this.rockCounter.style.transform = 'translateX(-50%)';
        } else {
            this.rockCounter.style.display = 'none';
        }
    }
    
    addRock(count = 1) {
        this.inventory.rocks += count;
        this.updateRockCounter();
    }
    
    removeRock(count = 1) {
        if (this.inventory.rocks >= count) {
            this.inventory.rocks -= count;
            this.updateRockCounter();
            return true;
        }
        return false;
    }
    
    getRockCount() {
        return this.inventory.rocks;
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
        
        // Don't change expression - keep current emotion expression
        
        // Stop any current speech
        this.stopSpeaking();
        
        // Start text-to-speech
        this.speakText(message);
        
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
    
    loadVoices() {
        if (!this.speechSynthesis) {
            return;
        }
        
        // Try to get voices immediately
        const voices = this.speechSynthesis.getVoices();
        if (voices.length > 0) {
            this.voicesLoaded = true;
            return;
        }
        
        // If voices aren't loaded yet, wait for the voiceschanged event
        this.speechSynthesis.onvoiceschanged = () => {
            this.voicesLoaded = true;
            console.log(`[NPC ${this.id}] Voices loaded`);
        };
    }
    
    /**
     * Determine if NPC is female based on personality, name, or backstory
     */
    isFemale() {
        const personality = this.personality || {};
        const name = (personality.name || '').toLowerCase();
        const backstory = (personality.backstory || '').toLowerCase();
        
        // Common female names
        const femaleNames = ['elenor', 'eleanor', 'lydia', 'sarah', 'emily', 'anna', 'maria', 'sophia', 'luna', 'zoe', 'lily', 'ava', 'isabella', 'olivia', 'charlotte', 'amelia', 'harper', 'evelyn', 'abigail', 'ella'];
        
        // Check if name suggests female
        if (femaleNames.some(fn => name.includes(fn))) {
            return true;
        }
        
        // Check backstory for gender indicators
        const femaleIndicators = ['she', 'her', 'woman', 'girl', 'female', 'lady', 'maiden', 'queen', 'princess', 'witch', 'sorceress', 'priestess'];
        const maleIndicators = ['he', 'his', 'him', 'man', 'boy', 'male', 'gentleman', 'king', 'prince', 'wizard', 'sorcerer', 'priest'];
        
        const femaleCount = femaleIndicators.filter(ind => backstory.includes(ind)).length;
        const maleCount = maleIndicators.filter(ind => backstory.includes(ind)).length;
        
        if (femaleCount > maleCount) {
            return true;
        }
        if (maleCount > femaleCount) {
            return false;
        }
        
        // Default based on ID (for backward compatibility)
        return this.id === 1; // Elenor is female by default
    }
    
    speakText(text) {
        if (!this.speechSynthesis) {
            console.warn(`[NPC ${this.id}] Speech synthesis not available`);
            return;
        }
        
        // Stop any current speech
        if (this.currentUtterance) {
            this.speechSynthesis.cancel();
        }
        
        // Create new utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure voice settings
        utterance.rate = 1.0; // Normal speed
        utterance.pitch = 1.0; // Normal pitch
        utterance.volume = 0.8; // 80% volume
        
        // Try to use a more natural voice if available
        const voices = this.speechSynthesis.getVoices();
        if (voices.length > 0) {
            let preferredVoice = null;
            const isFemale = this.isFemale();
            
            if (isFemale) {
                // Female NPC - prioritize UK English female voices
                // First try UK English female voices
                preferredVoice = voices.find(voice => 
                    (voice.lang === 'en-GB' || voice.lang.startsWith('en-GB')) &&
                    (voice.name.toLowerCase().includes('female') || 
                     voice.name.toLowerCase().includes('uk') ||
                     voice.name.toLowerCase().includes('british') ||
                     voice.name.toLowerCase().includes('zira') ||
                     voice.name.toLowerCase().includes('hazel') ||
                     voice.name.toLowerCase().includes('susan'))
                );
                
                // If no UK female found, try any UK English voice
                if (!preferredVoice) {
                    preferredVoice = voices.find(voice => 
                        (voice.lang === 'en-GB' || voice.lang.startsWith('en-GB')) &&
                        !voice.name.toLowerCase().includes('male') &&
                        !voice.name.toLowerCase().includes('david') &&
                        !voice.name.toLowerCase().includes('mark') &&
                        !voice.name.toLowerCase().includes('richard') &&
                        !voice.name.toLowerCase().includes('daniel')
                    );
                }
                
                // If still no UK voice, try any female voice
                if (!preferredVoice) {
                    preferredVoice = voices.find(voice => 
                        voice.name.toLowerCase().includes('female') || 
                        voice.name.toLowerCase().includes('zira') ||
                        voice.name.toLowerCase().includes('samantha') ||
                        voice.name.toLowerCase().includes('susan') ||
                        voice.name.toLowerCase().includes('hazel')
                    );
                }
                
                // Fallback to any English voice (excluding obvious male voices)
                if (!preferredVoice) {
                    preferredVoice = voices.find(voice => 
                        voice.lang.startsWith('en') &&
                        !voice.name.toLowerCase().includes('male') &&
                        !voice.name.toLowerCase().includes('david') &&
                        !voice.name.toLowerCase().includes('mark') &&
                        !voice.name.toLowerCase().includes('richard') &&
                        !voice.name.toLowerCase().includes('daniel')
                    );
                }
            } else {
                // Male NPC - prioritize male voices
                preferredVoice = voices.find(voice => 
                    voice.name.toLowerCase().includes('male') || 
                    voice.name.toLowerCase().includes('david') ||
                    voice.name.toLowerCase().includes('mark') ||
                    voice.name.toLowerCase().includes('richard') ||
                    voice.name.toLowerCase().includes('daniel') ||
                    voice.name.toLowerCase().includes('james') ||
                    voice.name.toLowerCase().includes('thomas')
                );
                
                // If no obvious male voice, try to exclude female voices
                if (!preferredVoice) {
                    preferredVoice = voices.find(voice => 
                        voice.lang.startsWith('en') && 
                        !voice.name.toLowerCase().includes('female') &&
                        !voice.name.toLowerCase().includes('zira') &&
                        !voice.name.toLowerCase().includes('samantha') &&
                        !voice.name.toLowerCase().includes('susan') &&
                        !voice.name.toLowerCase().includes('hazel')
                    );
                }
            }
            
            // Final fallback to any English voice
            if (!preferredVoice) {
                preferredVoice = voices.find(voice => voice.lang.startsWith('en'));
            }
            
            if (preferredVoice) {
                utterance.voice = preferredVoice;
                utterance.lang = preferredVoice.lang || 'en-GB';
                console.log(`[NPC ${this.id}] Using ${isFemale ? 'female' : 'male'} voice: ${preferredVoice.name} (${preferredVoice.lang})`);
            }
        } else {
            // No voices available, use default
            utterance.lang = 'en-GB';
        }
        
        // Event handlers
        utterance.onend = () => {
            console.log(`[NPC ${this.id}] Speech synthesis ended`);
            this.currentUtterance = null;
        };
        
        utterance.onerror = (event) => {
            console.error(`[NPC ${this.id}] Speech synthesis error:`, event.error);
            this.currentUtterance = null;
        };
        
        // Store reference and speak
        this.currentUtterance = utterance;
        this.speechSynthesis.speak(utterance);
        console.log(`[NPC ${this.id}] Speaking text: "${text}"`);
    }
    
    stopSpeaking() {
        if (this.speechSynthesis && this.currentUtterance) {
            this.speechSynthesis.cancel();
            this.currentUtterance = null;
            console.log(`[NPC ${this.id}] Speech synthesis stopped`);
        }
    }
    
    setTargetPosition(position) {
        this.targetPosition = position.clone();
        // Ensure Y coordinate is 0 (ground level) - NPCs move horizontally only
        this.targetPosition.y = 0;
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
        
        // Record player hit if it's from the player
        if (thrower && (thrower.id === 'player' || thrower.type === 'player')) {
            if (this.agent && this.agent.memory) {
                console.log(`[NPC ${this.id}] Recording player hit in memory`);
                this.agent.memory.recordPlayerHit('player');
            }
        }
        
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

