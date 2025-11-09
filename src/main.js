import * as THREE from 'three';
import { FirstPersonController } from './FirstPersonController.js';
import { Environment } from './Environment.js';
import { EnvironmentManager } from './EnvironmentManager.js';
import { NPC } from './NPC.js';
import { Lamp } from './Lamp.js';
import { InteractionSystem } from './InteractionSystem.js';
import { Inventory } from './Inventory.js';
import { ProjectileSystem } from './ProjectileSystem.js';
import { Rock } from './Rock.js';
import { SpeechToText } from './SpeechToText.js';
import { NPCAgent } from './NPCAgent.js';
import { NPCMemory } from './NPCMemory.js';
import { GameSetup } from './GameSetup.js';

class Game {
    constructor(setupData = null) {
        this.setupData = setupData || this.loadPlayerInfo();
        this.playerInfo = this.setupData?.player || { name: 'Player', interests: '' };
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue (will be updated by day/night cycle)
        
        // Clock for delta time tracking
        this.clock = new THREE.Clock();
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1.6, 0); // Eye level
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Only append renderer if setup is complete (canvas-container should exist)
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) {
            canvasContainer.appendChild(this.renderer.domElement);
        }
        
        // Ground
        this.createGround();
        
        // First-person controller
        this.controller = new FirstPersonController(this.camera, this.renderer.domElement);
        
        // Static environment (hut, trees, bushes, rocks)
        this.environment = new Environment(this.scene);
        
        // Environment manager (day/night, weather, birds)
        this.environmentManager = new EnvironmentManager(this.scene, this.camera);
        
        // Weather display elements
        this.weatherDisplay = {
            current: {
                icon: document.getElementById('weather-icon-current'),
                type: document.getElementById('weather-type-current')
            },
            next: {
                icon: document.getElementById('weather-icon-next'),
                type: document.getElementById('weather-type-next')
            },
            progressFill: document.getElementById('weather-progress-fill'),
            progressText: document.getElementById('weather-progress-text')
        };
        
        // Time display element
        this.timeDisplay = {
            text: document.getElementById('time-text'),
            timeOfDay: document.getElementById('time-of-day')
        };
        
        // Interaction system
        this.interactionSystem = new InteractionSystem(this.camera, this.scene);
        
        // Inventory system
        this.inventory = new Inventory();
        this.setupInventoryUI();
        
        // Projectile system
        this.projectileSystem = new ProjectileSystem(this.scene);
        // Enable debug mode for collision detection (set to false in production)
        this.projectileSystem.debug = true; // Set to false to disable debug logs
        
        // Lamps
        this.lamps = [];
        this.createLamps();
        
        // Register rocks with interaction system
        this.registerRocks();
        
        // NPCs
        this.npcs = [];
        this.spawnNPCs();
        
        // Setup keyboard listeners for throwing rocks
        this.setupThrowListener();
        
        // Speech-to-text system
        this.speechToText = new SpeechToText();
        this.setupSpeechToText();
        this.setupSpeechUI();
        
        // Text input system
        this.textInputVisible = false;
        this.setupTextInput();
        
        // Listen for rock collection
        document.addEventListener('interactionResult', (event) => {
            if (event.detail === true) {
                // Rock was collected
                this.inventory.addRocks(1);
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start game loop
        this.animate();
    }
    
    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x90EE90 // Light green
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }
    
    createLamps() {
        // Create 2 lamps at strategic positions
        const lampPositions = [
            new THREE.Vector3(1, 0, 1),   // Near hut
            new THREE.Vector3(-8, 0, -8)  // Opposite side
        ];
        
        lampPositions.forEach((position) => {
            const lamp = new Lamp(this.scene, position);
            this.lamps.push(lamp);
            // Register with interaction system
            this.interactionSystem.registerInteractable(lamp);
        });
    }
    
    registerRocks() {
        // Register all rocks with interaction system
        const rocks = this.environment.getRocks();
        rocks.forEach(rock => {
            this.interactionSystem.registerInteractable(rock);
        });
    }
    
    setupInventoryUI() {
        // Create inventory display element if it doesn't exist
        let inventoryDisplay = document.getElementById('inventory-display');
        if (!inventoryDisplay) {
            inventoryDisplay = document.createElement('div');
            inventoryDisplay.id = 'inventory-display';
            inventoryDisplay.style.cssText = `
                position: absolute;
                bottom: 20px;
                left: 20px;
                color: white;
                background: rgba(0, 0, 0, 0.7);
                padding: 15px;
                border-radius: 8px;
                z-index: 100;
                font-size: 14px;
                min-width: 150px;
            `;
            document.body.appendChild(inventoryDisplay);
        }
        
        this.inventoryDisplay = inventoryDisplay;
        this.inventoryDisplay.innerHTML = '<h3>Inventory</h3><div id="rock-count">Rocks: 0</div>';
        
        // Update inventory display when inventory changes
        this.inventory.onChange((state) => {
            const rockCountEl = document.getElementById('rock-count');
            if (rockCountEl) {
                rockCountEl.textContent = `Rocks: ${state.rocks}`;
            }
        });
    }
    
    setupThrowListener() {
        document.addEventListener('keydown', (event) => {
            if (event.code === 'KeyG') {
                this.throwRock();
            }
        });
    }
    
    setupSpeechToText() {
        // Set up real-time transcript callback
        this.speechToText.onTranscript((transcript, interim) => {
            this.updateSpeechCaption(transcript, interim);
        });
        
        // Set up final transcript callback
        this.speechToText.onFinal((finalTranscript) => {
            this.handleFinalTranscript(finalTranscript);
        });
        
        // Set up V key listener (only if text input is not visible)
        let vKeyPressed = false;
        
        document.addEventListener('keydown', (event) => {
            // Don't start speaking if text input is visible
            if (this.textInputVisible) return;
            
            if (event.code === 'KeyV' && !vKeyPressed) {
                vKeyPressed = true;
                this.startSpeaking();
            }
        });
        
        document.addEventListener('keyup', (event) => {
            if (event.code === 'KeyV' && vKeyPressed) {
                vKeyPressed = false;
                this.stopSpeaking();
            }
        });
    }
    
    setupSpeechUI() {
        // Create speech caption display element
        let speechDisplay = document.getElementById('speech-caption');
        if (!speechDisplay) {
            speechDisplay = document.createElement('div');
            speechDisplay.id = 'speech-caption';
            speechDisplay.style.cssText = `
                position: absolute;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                color: white;
                background: rgba(0, 0, 0, 0.8);
                padding: 15px 25px;
                border-radius: 8px;
                z-index: 100;
                font-size: 18px;
                max-width: 80%;
                text-align: center;
                display: none;
                font-family: Arial, sans-serif;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            `;
            document.body.appendChild(speechDisplay);
        }
        
        this.speechCaption = speechDisplay;
    }
    
    setupTextInput() {
        // Create text input container
        let textInputContainer = document.getElementById('text-input-container');
        if (!textInputContainer) {
            textInputContainer = document.createElement('div');
            textInputContainer.id = 'text-input-container';
            textInputContainer.style.cssText = `
                position: absolute;
                bottom: 150px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 101;
                display: none;
                font-family: Arial, sans-serif;
            `;
            document.body.appendChild(textInputContainer);
        }
        
        // Create text input field
        let textInput = document.getElementById('text-input');
        if (!textInput) {
            textInput = document.createElement('input');
            textInput.id = 'text-input';
            textInput.type = 'text';
            textInput.placeholder = 'Type your message... (Enter to send, Esc to cancel)';
            textInput.style.cssText = `
                width: 500px;
                padding: 15px 20px;
                font-size: 18px;
                border: 3px solid rgba(255, 255, 255, 0.8);
                border-radius: 8px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                outline: none;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
            `;
            textInputContainer.appendChild(textInput);
        }
        
        this.textInputContainer = textInputContainer;
        this.textInput = textInput;
        
        // Set up keyboard listeners
        document.addEventListener('keydown', (event) => {
            // T key to toggle text input
            if (event.code === 'KeyT' && !event.repeat) {
                // Don't toggle if already typing in the input
                if (event.target === textInput) return;
                
                this.toggleTextInput();
                event.preventDefault();
            }
            
            // Enter key to submit (only when input is visible and focused)
            if (event.code === 'Enter' && this.textInputVisible && document.activeElement === textInput) {
                this.submitTextInput();
                event.preventDefault();
            }
            
            // Escape key to cancel (only when input is visible)
            if (event.code === 'Escape' && this.textInputVisible) {
                this.hideTextInput();
                event.preventDefault();
            }
        });
        
        // Prevent game controls when typing
        textInput.addEventListener('focus', () => {
            this.controller.enabled = false;
        });
        
        textInput.addEventListener('blur', () => {
            this.controller.enabled = true;
        });
    }
    
    toggleTextInput() {
        if (this.textInputVisible) {
            this.hideTextInput();
        } else {
            this.showTextInput();
        }
    }
    
    showTextInput() {
        this.textInputVisible = true;
        this.textInputContainer.style.display = 'block';
        this.textInput.value = '';
        this.textInput.focus();
        
        // Disable controller while typing
        this.controller.enabled = false;
    }
    
    hideTextInput() {
        this.textInputVisible = false;
        this.textInputContainer.style.display = 'none';
        this.textInput.value = '';
        
        // Re-enable controller
        this.controller.enabled = true;
        this.textInput.blur();
    }
    
    submitTextInput() {
        const text = this.textInput.value.trim();
        
        if (text === '') {
            // Empty message, just hide
            this.hideTextInput();
            return;
        }
        
        console.log('Text input submitted:', text);
        
        // Show the message briefly (similar to speech caption)
        if (this.speechCaption) {
            this.speechCaption.textContent = text;
            this.speechCaption.style.display = 'block';
            this.speechCaption.style.background = 'rgba(0, 0, 0, 0.8)';
            
            setTimeout(() => {
                this.speechCaption.style.display = 'none';
            }, 3000);
        }
        
        // Hide input
        this.hideTextInput();
        
        // Send to nearby NPCs (same as speech-to-text)
        this.sendToNearbyNPCs(text);
    }
    
    startSpeaking() {
        if (this.speechToText.startListening()) {
            this.speechCaption.style.display = 'block';
            this.speechCaption.textContent = '🎤 Listening...';
            this.speechCaption.style.background = 'rgba(0, 150, 0, 0.8)'; // Green when listening
        } else {
            this.speechCaption.style.display = 'block';
            this.speechCaption.textContent = '❌ Microphone not available';
            this.speechCaption.style.background = 'rgba(150, 0, 0, 0.8)'; // Red for error
            setTimeout(() => {
                this.speechCaption.style.display = 'none';
            }, 2000);
        }
    }
    
    stopSpeaking() {
        this.speechToText.stopListening();
        // Caption will be updated by the transcript callback
    }
    
    updateSpeechCaption(transcript, interim) {
        if (!this.speechCaption) return;
        
        if (transcript.trim() === '') {
            this.speechCaption.textContent = '🎤 Listening...';
        } else {
            // Show transcript with visual indicator for interim results
            let displayText = transcript;
            if (interim && interim.trim() !== '') {
                displayText += '...'; // Indicate interim results
            }
            this.speechCaption.textContent = displayText;
        }
        
        // Update background color based on state
        if (this.speechToText.getIsListening()) {
            this.speechCaption.style.background = 'rgba(0, 150, 0, 0.8)'; // Green when listening
        } else {
            this.speechCaption.style.background = 'rgba(0, 0, 0, 0.8)'; // Black when processing
        }
    }
    
    handleFinalTranscript(finalTranscript) {
        if (!finalTranscript || finalTranscript.trim() === '') {
            // No speech detected
            this.speechCaption.textContent = 'No speech detected';
            this.speechCaption.style.background = 'rgba(100, 100, 100, 0.8)';
            setTimeout(() => {
                this.speechCaption.style.display = 'none';
            }, 1500);
            return;
        }
        
        // Log the final transcript
        console.log('Final transcript:', finalTranscript);
        
        // Show final transcript briefly
        this.speechCaption.textContent = finalTranscript;
        this.speechCaption.style.background = 'rgba(0, 0, 0, 0.8)';
        
        // Hide caption after a delay
        setTimeout(() => {
            this.speechCaption.style.display = 'none';
        }, 3000);
        
        // TODO: Send to in-range NPCs
        this.sendToNearbyNPCs(finalTranscript);
    }
    
    /**
     * Detect if an NPC name is mentioned in the transcript
     * @param {string} transcript - The player's message
     * @returns {NPC|null} - The NPC whose name was mentioned, or null if none
     */
    findMentionedNPC(transcript) {
        const lowerTranscript = transcript.toLowerCase();
        
        // Check each NPC for name matches
        for (const npc of this.npcs) {
            if (npc.personality && npc.personality.name) {
                const npcName = npc.personality.name.toLowerCase();
                const displayName = npc.personality.displayName ? npc.personality.displayName.toLowerCase() : npcName;
                
                // Check if the name appears in the transcript (word boundary matching)
                const nameRegex = new RegExp(`\\b${npcName}\\b`, 'i');
                const displayNameRegex = new RegExp(`\\b${displayName}\\b`, 'i');
                
                if (nameRegex.test(transcript) || displayNameRegex.test(transcript)) {
                    console.log(`[Game] Found mentioned NPC: ${npc.personality.name} (ID: ${npc.id})`);
                    return npc;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Find the closest NPC to the player
     * @param {Array} npcs - Array of NPCs to check
     * @param {THREE.Vector3} playerPosition - Player's position
     * @param {number} maxRange - Maximum range to consider
     * @returns {NPC|null} - The closest NPC, or null if none in range
     */
    findClosestNPC(npcs, playerPosition, maxRange = 15.0) {
        let closestNPC = null;
        let closestDistance = Infinity;
        
        for (const npc of npcs) {
            if (!npc.position) continue;
            
            const distance = playerPosition.distanceTo(npc.position);
            if (distance <= maxRange && distance < closestDistance) {
                closestDistance = distance;
                closestNPC = npc;
            }
        }
        
        if (closestNPC) {
            console.log(`[Game] Closest NPC: ${closestNPC.personality?.name || `NPC ${closestNPC.id}`} at distance ${closestDistance.toFixed(2)}`);
        }
        
        return closestNPC;
    }
    
    sendToNearbyNPCs(transcript) {
        console.log(`[Game] sendToNearbyNPCs called with transcript: "${transcript}"`);
        
        // Get player position (camera position)
        const playerPosition = this.camera.position;
        const interactionRange = 15.0; // Range for NPC interaction
        
        console.log(`[Game] Player position: (${playerPosition.x.toFixed(2)}, ${playerPosition.y.toFixed(2)}, ${playerPosition.z.toFixed(2)})`);
        console.log(`[Game] Total NPCs: ${this.npcs.length}`);
        
        // Check if a specific NPC name is mentioned
        const mentionedNPC = this.findMentionedNPC(transcript);
        
        let targetNPCs = [];
        
        if (mentionedNPC) {
            // If a name is mentioned, check if that NPC is in range
            if (mentionedNPC.position) {
                const distance = playerPosition.distanceTo(mentionedNPC.position);
                if (distance <= interactionRange) {
                    targetNPCs = [mentionedNPC];
                    console.log(`[Game] Name mentioned: ${mentionedNPC.personality?.name || `NPC ${mentionedNPC.id}`} is in range (${distance.toFixed(2)})`);
                } else {
                    console.log(`[Game] Name mentioned: ${mentionedNPC.personality?.name || `NPC ${mentionedNPC.id}`} is out of range (${distance.toFixed(2)})`);
                }
            }
        } else {
            // No name mentioned, find the closest NPC
            const closestNPC = this.findClosestNPC(this.npcs, playerPosition, interactionRange);
            if (closestNPC) {
                targetNPCs = [closestNPC];
                console.log(`[Game] No name mentioned, using closest NPC: ${closestNPC.personality?.name || `NPC ${closestNPC.id}`}`);
            }
        }
        
        if (targetNPCs.length > 0) {
            // Send to the selected NPC(s)
            targetNPCs.forEach(npc => {
                const distance = playerPosition.distanceTo(npc.position).toFixed(2);
                console.log(`[Game] Processing NPC ${npc.id} (${npc.personality?.name || `NPC ${npc.id}`}) at distance ${distance}`);
                
                // Check if agent exists
                if (!npc.agent) {
                    console.error(`[Game] NPC ${npc.id}: No agent found!`);
                    return;
                }
                
                console.log(`[Game] NPC ${npc.id}: Agent found`);
                
                // Check if memory exists
                if (!npc.agent.memory) {
                    console.error(`[Game] NPC ${npc.id}: No memory found!`);
                    return;
                }
                
                console.log(`[Game] NPC ${npc.id}: Memory found`);
                
                // Trigger agent processing (will analyze sentiment and record message)
                console.log(`[Game] NPC ${npc.id}: Triggering processEvent('player_query')...`);
                npc.agent.processEvent('player_query', { transcript: transcript });
                console.log(`[Game] NPC ${npc.id}: processEvent called`);
            });
        } else {
            console.log(`[Game] No NPCs available to receive transcript (either out of range or no NPCs found)`);
        }
    }
    
    throwRock() {
        // Get camera direction
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        
        // Start position (slightly in front of camera)
        const startPosition = this.camera.position.clone();
        startPosition.add(direction.multiplyScalar(0.5));
        startPosition.y += 0.2; // Slightly above camera
        
        // Normalize direction again after multiplication
        direction.normalize();
        
        // Throw speed
        const speed = 15;
        
        // Create projectile (player is thrower)
        const player = { id: 'player', type: 'player' };
        
        // Use throwRockAt with inventory check for player
        this.throwRockAt(startPosition, direction, speed, player, true);
    }
    
    spawnNPCs() {
        // Spawn 1 merchant NPC behind the counter at the merchant place
        // Merchant place is at (10, 0, 10), counter is at z = -1.5 relative to merchant place
        // So merchant should be at z = -0.5 (behind counter) relative to merchant place
        // const merchantPosition = new THREE.Vector3(10, 0, 9.5); // Behind the counter
        
        // const merchant = new NPC(this.scene, merchantPosition, 0, this.environmentManager);
        // this.npcs.push(merchant);
        
        // Tree positions for spawning: (-15, 15), (20, -10), (-20, -15), (15, 20), (-10, 25), (25, 10), (-25, -5)
        const spawnPositions = [
            new THREE.Vector3(-12, 2, 12),
            new THREE.Vector3(17, 2, -7),
            new THREE.Vector3(-17, 0, -12),
            new THREE.Vector3(12, 0, 17),
            new THREE.Vector3(-7, 0, 22),
            new THREE.Vector3(22, 0, 7),
            new THREE.Vector3(-22, 0, -2)
        ];
        
        // Get NPC profiles from setup data
        const npcProfiles = this.setupData?.npcProfiles || [];
        
        if (npcProfiles.length === 0) {
            // Default NPCs if no setup data
            const npc1 = new NPC(this.scene, spawnPositions[0], 1, this.environmentManager, null);
            const npc2 = new NPC(this.scene, spawnPositions[1], 2, this.environmentManager, null);
        this.npcs.push(npc1);
            this.npcs.push(npc2);
        } else {
            // Spawn NPCs from profiles
            npcProfiles.forEach((profile, index) => {
                if (index < spawnPositions.length) {
                    const npc = new NPC(
                        this.scene,
                        spawnPositions[index],
                        profile.id || index,
                        this.environmentManager,
                        profile
                    );
                    this.npcs.push(npc);
                }
            });
        }
        
        // Set up AI agents for NPCs (after adding to array)
        this.setupNPCAgents();
    }
    
    /**
     * Load player info from localStorage
     */
    loadPlayerInfo() {
        try {
            const stored = localStorage.getItem('player_info');
            if (stored) {
                const playerInfo = JSON.parse(stored);
                return {
                    player: {
                        name: playerInfo.name || 'Player',
                        interests: playerInfo.interests || ''
                    },
                    npcProfiles: [] // Will be loaded separately
                };
            }
        } catch (error) {
            console.error('[Game] Error loading player info:', error);
        }
        return null;
    }
    
    setupNPCAgents() {
        console.log(`[Game] Setting up AI agents for ${this.npcs.length} NPC(s)`);
        
        // Initialize agents for all NPCs
        this.npcs.forEach(npc => {
            console.log(`[Game] Initializing agent for NPC ${npc.id}...`);
            
            // Set game reference
            npc.setGame(this);
            console.log(`[Game] NPC ${npc.id}: Game reference set`);
            
            // Create memory (will load from localStorage if profile exists)
            const memory = new NPCMemory(npc.id, npc.personality);
            console.log(`[Game] NPC ${npc.id}: Memory created`);
            
            // Create agent with player info
            const agent = new NPCAgent(npc, this, memory, this.playerInfo);
            console.log(`[Game] NPC ${npc.id}: Agent created`);
            
            // Link agent to NPC
            npc.setAgent(agent);
            console.log(`[Game] NPC ${npc.id}: Agent linked to NPC`);
            
            // Verify agent is set
            if (npc.agent) {
                console.log(`[Game] NPC ${npc.id}: Agent verified, ready to process events`);
            } else {
                console.error(`[Game] NPC ${npc.id}: Agent NOT set!`);
            }
        });
        
        console.log(`[Game] Agent setup complete for ${this.npcs.length} NPC(s)`);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Get delta time (time since last frame)
        const delta = this.clock.getDelta();
        
        // Cap delta to prevent large jumps (e.g., when tab is inactive)
        const clampedDelta = Math.min(delta, 0.1);
        
        // Update environment manager (day/night, weather, birds)
        if (!this.previousEnvState) {
            this.previousEnvState = this.environmentManager.getState();
        }
        this.environmentManager.update(clampedDelta);
        const currentEnvState = this.environmentManager.getState();
        
        // Check for environment changes and notify NPCs
        this.checkEnvironmentChanges(this.previousEnvState, currentEnvState);
        this.previousEnvState = currentEnvState;
        
        // Update weather display
        this.updateWeatherDisplay();
        
        // Update time display
        this.updateTimeDisplay();
        
        // Update interaction system
        this.interactionSystem.update();
        
        // Update projectile system
        const hits = this.projectileSystem.update(clampedDelta, this.npcs);
        this.handleProjectileHits(hits);
        
        // Update controller with actual delta time
        this.controller.update(clampedDelta);
        
        // Update NPCs (for future animations/behaviors)
        this.npcs.forEach(npc => npc.update(clampedDelta));
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
    
    updateWeatherDisplay() {
        const envState = this.environmentManager.getState();
        
        if (!envState) return;
        
        // Weather names and icons
        const weatherNames = {
            'sunny': 'Sunny',
            'rainy': 'Rainy',
            'windy+foggy': 'Windy & Foggy'
        };
        
        const weatherIcons = {
            'sunny': '☀️',
            'rainy': '🌧️',
            'windy+foggy': '🌫️'
        };
        
        // Update current weather
        const currentWeather = envState.weather;
        this.weatherDisplay.current.icon.textContent = weatherIcons[currentWeather] || '☀️';
        this.weatherDisplay.current.type.textContent = weatherNames[currentWeather] || currentWeather;
        
        // Update next weather
        const nextWeather = envState.nextWeather || currentWeather;
        this.weatherDisplay.next.icon.textContent = weatherIcons[nextWeather] || '☀️';
        this.weatherDisplay.next.type.textContent = weatherNames[nextWeather] || nextWeather;
        
        // Update progress bar
        const progress = envState.weatherProgress || 0;
        const progressPercent = Math.min(100, Math.max(0, progress * 100));
        this.weatherDisplay.progressFill.style.width = `${progressPercent}%`;
        
        // Update progress text (time remaining)
        const timeRemaining = envState.timeRemaining || 0;
        const secondsRemaining = Math.ceil(timeRemaining);
        this.weatherDisplay.progressText.textContent = `${secondsRemaining}s remaining`;
    }
    
    updateTimeDisplay() {
        const timeInfo = this.environmentManager.getTime();
        
        if (!timeInfo) return;
        
        // Update time text
        this.timeDisplay.text.textContent = timeInfo.formatted;
        
        // Update time of day
        const timeOfDayNames = {
            'dawn': 'Dawn',
            'day': 'Day',
            'dusk': 'Dusk',
            'night': 'Night'
        };
        this.timeDisplay.timeOfDay.textContent = timeOfDayNames[timeInfo.timeOfDay] || timeInfo.timeOfDay;
    }
    
    /**
     * Get current time
     * Exposed for LLM context and external use
     */
    getTime() {
        return this.environmentManager.getTime();
    }
    
    /**
     * Get all interactables (for LLM/NPC access)
     */
    getInteractables() {
        return this.interactionSystem.getInteractables();
    }
    
    handleProjectileHits(hits) {
        // Handle projectile hits on NPCs
        if (hits && hits.length > 0) {
            hits.forEach(hit => {
                if (hit.npc && hit.npc.onHit) {
                    // onHit is already called in ProjectileSystem, but we can add additional handling here
                    console.log(`Hit detected: NPC ${hit.npc.id} hit by ${hit.projectile.thrower?.id || 'unknown'}`);
                }
            });
        }
    }
    
    /**
     * Interact with a lamp (for NPC use)
     * @param {number} lampIndex - Index of the lamp (0 or 1)
     */
    interactWithLamp(lampIndex) {
        if (this.lamps[lampIndex]) {
            this.lamps[lampIndex].toggle();
        }
    }
    
    /**
     * Collect a rock (for NPC use)
     * @param {Object} rock - Rock instance to collect
     * @returns {boolean} - True if successful
     */
    collectRock(rock) {
        if (rock && rock.collect && rock.collect()) {
            this.inventory.addRocks(1);
            return true;
        }
        return false;
    }
    
    /**
     * Throw a rock (for NPC use)
     * @param {THREE.Vector3} startPosition - Starting position
     * @param {THREE.Vector3} direction - Direction vector (normalized)
     * @param {number} speed - Throw speed
     * @param {Object} thrower - Thrower object (NPC or player)
     * @param {boolean} checkInventory - Whether to check inventory (default: true for player, false for NPCs)
     * @returns {boolean} - True if successful
     */
    throwRockAt(startPosition, direction, speed = 15, thrower = null, checkInventory = true) {
        // For NPCs, skip inventory check (they can throw rocks they've collected)
        // For player, check inventory
        if (checkInventory) {
            if (!this.inventory.hasRocks(1)) {
                return false;
            }
            
            if (!this.inventory.removeRocks(1)) {
                return false;
            }
        }
        
        this.projectileSystem.throwRock(startPosition, direction, speed, thrower);
        return true;
    }
    
    /**
     * Get available rocks in the environment (for NPC use)
     */
    getAvailableRocks() {
        return this.environment.getRocks();
    }
    
    /**
     * Get inventory state (for NPC use)
     */
    getInventory() {
        return this.inventory.getState();
    }
    
    /**
     * Check for environment changes and notify NPCs
     */
    checkEnvironmentChanges(previousState, currentState) {
        if (!previousState || !currentState) {
            console.log(`[Game] checkEnvironmentChanges: Missing state data`);
            return;
        }
        
        // Check weather change
        if (previousState.weather !== currentState.weather) {
            console.log(`[Game] Weather change detected: ${previousState.weather} -> ${currentState.weather}`);
            this.npcs.forEach(npc => {
                if (npc.agent) {
                    console.log(`[Game] Notifying NPC ${npc.id} of weather change`);
                    npc.agent.processEvent('environment_change', {
                        change: 'weather',
                        details: `Weather changed from ${previousState.weather} to ${currentState.weather}`,
                        previous: previousState.weather,
                        current: currentState.weather
                    });
                } else {
                    console.warn(`[Game] NPC ${npc.id} has no agent for weather change notification`);
                }
            });
        }
        
        // Check time of day change
        if (previousState.timeOfDay !== currentState.timeOfDay) {
            console.log(`[Game] Time of day change detected: ${previousState.timeOfDay} -> ${currentState.timeOfDay}`);
            this.npcs.forEach(npc => {
                if (npc.agent) {
                    console.log(`[Game] Notifying NPC ${npc.id} of time change`);
                    npc.agent.processEvent('environment_change', {
                        change: 'time_of_day',
                        details: `Time changed from ${previousState.timeOfDay} to ${currentState.timeOfDay}`,
                        previous: previousState.timeOfDay,
                        current: currentState.timeOfDay
                    });
                } else {
                    console.warn(`[Game] NPC ${npc.id} has no agent for time change notification`);
                }
            });
        }
    }
}

// Initialize setup screen
const gameSetup = new GameSetup();

// Show setup screen first
gameSetup.showSetup();

// Wait for setup to complete
let game = null;
window.addEventListener('gameSetupComplete', (event) => {
    const setupData = event.detail;
    console.log('[Main] Game setup complete, starting game...', setupData);
    
    // Start game with setup data
    game = new Game(setupData);

// Expose methods globally for LLM context
window.getTime = () => game.getTime();
window.getInteractables = () => game.getInteractables();
window.interactWithLamp = (lampIndex) => game.interactWithLamp(lampIndex);
window.collectRock = (rock) => game.collectRock(rock);
window.throwRockAt = (startPosition, direction, speed, thrower, checkInventory = false) => {
    const pos = new THREE.Vector3(startPosition.x, startPosition.y, startPosition.z);
    const dir = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
    return game.throwRockAt(pos, dir, speed, thrower, checkInventory);
};
window.getAvailableRocks = () => game.getAvailableRocks();
window.getInventory = () => game.getInventory();
});

