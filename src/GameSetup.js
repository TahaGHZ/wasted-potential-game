/**
 * GameSetup - Pre-game configuration interface
 * Handles player info and NPC profile creation
 */
export class GameSetup {
    constructor() {
        this.setupData = null;
        this.npcProfiles = this.loadNPCProfiles();
    }
    
    /**
     * Show setup screen
     */
    showSetup() {
        console.log('[GameSetup] showSetup called');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            console.log('[GameSetup] DOM not ready, waiting...');
            document.addEventListener('DOMContentLoaded', () => this.showSetup());
            return;
        }
        
        console.log('[GameSetup] DOM ready, creating setup screen');
        
        // Create setup container (don't clear canvas-container, add overlay instead)
        let setupContainer = document.getElementById('game-setup');
        if (!setupContainer) {
            console.log('[GameSetup] Creating new setup container');
            setupContainer = document.createElement('div');
            setupContainer.id = 'game-setup';
            document.body.appendChild(setupContainer);
        } else {
            console.log('[GameSetup] Using existing setup container');
        }
        
        // Set styles on the container itself
        setupContainer.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
            z-index: 10000 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            padding: 20px !important;
            box-sizing: border-box !important;
        `;
        
        const setupHTML = `
            <div style="
                width: 100%;
                min-height: 100%;
                display: flex;
                justify-content: center;
                align-items: flex-start;
                padding: 20px 0;
                box-sizing: border-box;
            ">
                <div style="
                    background: white;
                    border-radius: 16px;
                    padding: 30px;
                    max-width: 900px;
                    width: 100%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    margin: auto;
                    box-sizing: border-box;
                ">
                    <h1 style="text-align: center; margin-bottom: 25px; margin-top: 0; color: #333; font-size: 28px; font-weight: 600;">Game Setup</h1>
                    
                    <!-- Configuration Section -->
                    <div id="config-section" style="margin-bottom: 25px; padding: 20px; background: #f8f9fa; border-radius: 12px; box-sizing: border-box;">
                        <h2 style="margin-bottom: 18px; margin-top: 0; color: #555; font-size: 20px; font-weight: 600; border-bottom: 2px solid #667eea; padding-bottom: 8px;">Configuration</h2>
                        
                        <!-- Player Info and NPC Count in a row -->
                        <div style="display: flex; gap: 20px; margin-bottom: 18px; flex-wrap: wrap; align-items: flex-end;">
                            <div style="flex: 1; min-width: 200px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #444; font-size: 14px;">Your Name:</label>
                                <input type="text" id="player-name" placeholder="Enter your name" value="" style="
                                    width: 100%;
                                    padding: 12px;
                                    border: 2px solid #ddd;
                                    border-radius: 8px;
                                    font-size: 15px;
                                    box-sizing: border-box;
                                    display: block;
                                    background: white;
                                    color: #333;
                                    transition: border-color 0.3s;
                                " onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#ddd'">
                            </div>
                            <div style="flex: 0 0 auto; min-width: 150px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #444; font-size: 14px;">Number of NPCs:</label>
                                <input type="number" id="npc-count" min="1" max="5" value="2" style="
                                    width: 100%;
                                    padding: 12px;
                                    border: 2px solid #ddd;
                                    border-radius: 8px;
                                    font-size: 15px;
                                    box-sizing: border-box;
                                    background: white;
                                    color: #333;
                                    transition: border-color 0.3s;
                                " onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#ddd'">
                            </div>
                        </div>
                        
                        <!-- Player Interests -->
                        <div style="margin-bottom: 0;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #444; font-size: 14px;">Your Interests:</label>
                            <textarea id="player-interests" placeholder="e.g., I love exploring, collecting rocks, talking to NPCs..." style="
                                width: 100%;
                                padding: 12px;
                                border: 2px solid #ddd;
                                border-radius: 8px;
                                font-size: 15px;
                                min-height: 90px;
                                max-height: 150px;
                                resize: vertical;
                                box-sizing: border-box;
                                font-family: inherit;
                                background: white;
                                color: #333;
                                transition: border-color 0.3s;
                            " onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#ddd'"></textarea>
                        </div>
                    </div>
                    
                    <!-- NPC Configuration Section -->
                    <div id="npc-config-section" style="margin-bottom: 25px;">
                        <h2 style="margin-bottom: 18px; margin-top: 0; color: #555; font-size: 20px; font-weight: 600; border-bottom: 2px solid #667eea; padding-bottom: 8px;">NPC Profiles</h2>
                        <div id="npc-profiles-container" style="margin-bottom: 15px;"></div>
                        <button id="add-npc-btn" style="
                            margin-top: 10px;
                            padding: 12px 24px;
                            background: #667eea;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 15px;
                            font-weight: 600;
                            transition: background-color 0.3s, transform 0.1s;
                        " onmouseover="this.style.backgroundColor='#5568d3'; this.style.transform='translateY(-2px)'" onmouseout="this.style.backgroundColor='#667eea'; this.style.transform='translateY(0)'">Add NPC Profile</button>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                        <button id="start-game-btn" style="
                            padding: 14px 35px;
                            background: #4CAF50;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 17px;
                            font-weight: 600;
                            transition: background-color 0.3s, transform 0.1s;
                            box-shadow: 0 4px 6px rgba(76, 175, 80, 0.3);
                        " onmouseover="this.style.backgroundColor='#45a049'; this.style.transform='translateY(-2px)'" onmouseout="this.style.backgroundColor='#4CAF50'; this.style.transform='translateY(0)'">Start Game</button>
                        <button id="load-profiles-btn" style="
                            padding: 14px 35px;
                            background: #2196F3;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 17px;
                            font-weight: 600;
                            transition: background-color 0.3s, transform 0.1s;
                            box-shadow: 0 4px 6px rgba(33, 150, 243, 0.3);
                        " onmouseover="this.style.backgroundColor='#0b7dda'; this.style.transform='translateY(-2px)'" onmouseout="this.style.backgroundColor='#2196F3'; this.style.transform='translateY(0)'">Load Saved Profiles</button>
                    </div>
                </div>
            </div>
        `;
        
        setupContainer.innerHTML = setupHTML;
        
        // Ensure container is visible
        setupContainer.style.display = 'flex';
        setupContainer.style.visibility = 'visible';
        setupContainer.style.opacity = '1';
        
        console.log('[GameSetup] Setup HTML inserted, container:', setupContainer);
        console.log('[GameSetup] Container display:', setupContainer.style.display);
        console.log('[GameSetup] Container visibility:', setupContainer.style.visibility);
        console.log('[GameSetup] Player name input exists:', !!document.getElementById('player-name'));
        
        // Wait a moment for DOM to update, then verify
        setTimeout(() => {
            const playerNameInput = document.getElementById('player-name');
            console.log('[GameSetup] After timeout - Player name input:', playerNameInput);
            if (playerNameInput) {
                console.log('[GameSetup] Input is visible:', playerNameInput.offsetWidth > 0 && playerNameInput.offsetHeight > 0);
                console.log('[GameSetup] Input computed style:', window.getComputedStyle(playerNameInput).display);
            }
        }, 100);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize with default NPCs
        this.updateNPCProfiles();
        
        console.log('[GameSetup] Setup screen should be visible now');
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const npcCountInput = document.getElementById('npc-count');
        if (npcCountInput) {
            npcCountInput.addEventListener('change', () => {
                this.updateNPCProfiles();
            });
        }
        
        const addBtn = document.getElementById('add-npc-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.addNPCProfile();
            });
        }
        
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startGame();
            });
        }
        
        const loadBtn = document.getElementById('load-profiles-btn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                this.loadSavedProfiles();
            });
        }
    }
    
    /**
     * Update NPC profiles based on count
     */
    updateNPCProfiles() {
        const npcCountInput = document.getElementById('npc-count');
        if (!npcCountInput) return;
        
        const count = parseInt(npcCountInput.value) || 2;
        const container = document.getElementById('npc-profiles-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            this.addNPCProfile(i);
        }
    }
    
    /**
     * Add NPC profile form
     */
    addNPCProfile(index = null) {
        const container = document.getElementById('npc-profiles-container');
        const npcIndex = index !== null ? index : container.children.length;
        const profileId = `npc-${npcIndex}`;
        
        // Check if profile already exists
        const existingProfile = this.npcProfiles.find(p => p.id === profileId);
        
        const profileHTML = `
            <div id="profile-${profileId}" style="
                border: 2px solid #e0e0e0;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 18px;
                background: #ffffff;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                transition: box-shadow 0.3s, border-color 0.3s;
                box-sizing: border-box;
            " onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.12)'; this.style.borderColor='#667eea'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'; this.style.borderColor='#e0e0e0'">
                <h3 style="margin-top: 0; margin-bottom: 18px; color: #667eea; font-size: 18px; font-weight: 600; border-bottom: 2px solid #667eea; padding-bottom: 10px;">NPC ${npcIndex + 1}</h3>
                
                <div style="display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444; font-size: 13px;">Profile Name:</label>
                        <input type="text" id="${profileId}-name" placeholder="e.g., Elenor" value="${existingProfile?.name || ''}" style="
                            width: 100%;
                            padding: 10px;
                            border: 2px solid #ddd;
                            border-radius: 8px;
                            font-size: 14px;
                            box-sizing: border-box;
                            background: white;
                            color: #333;
                            transition: border-color 0.3s;
                        " onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#ddd'">
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444; font-size: 13px;">Quick Template:</label>
                        <select id="${profileId}-template" style="
                            width: 100%;
                            padding: 10px;
                            border: 2px solid #ddd;
                            border-radius: 8px;
                            font-size: 14px;
                            box-sizing: border-box;
                            background: white;
                            color: #333;
                            cursor: pointer;
                            transition: border-color 0.3s;
                        " onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#ddd'">
                            <option value="">Custom</option>
                            <option value="elven-mage">Elven Mage (Wise, Orderly)</option>
                            <option value="warrior-guard">Warrior Guard (Honorable, Protective)</option>
                            <option value="merchant">Merchant (Shrewd, Opportunistic)</option>
                            <option value="scholar">Scholar (Curious, Knowledgeable)</option>
                            <option value="wanderer">Wanderer (Free-spirited, Adventurous)</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444; font-size: 13px;">Backstory/Personality:</label>
                    <textarea id="${profileId}-backstory" placeholder="Describe the NPC's personality and backstory..." style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #ddd;
                        border-radius: 8px;
                        min-height: 100px;
                        max-height: 200px;
                        resize: vertical;
                        font-size: 14px;
                        box-sizing: border-box;
                        font-family: inherit;
                        background: white;
                        color: #333;
                        transition: border-color 0.3s;
                    " onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#ddd'">${existingProfile?.backstory || ''}</textarea>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #444; font-size: 13px;">Traits (comma-separated):</label>
                    <input type="text" id="${profileId}-traits" placeholder="e.g., friendly:0.8, curious:0.9, brave:0.7" value="${existingProfile?.traitsString || ''}" style="
                        width: 100%;
                        padding: 10px;
                        border: 2px solid #ddd;
                        border-radius: 8px;
                        font-size: 14px;
                        box-sizing: border-box;
                        background: white;
                        color: #333;
                        transition: border-color 0.3s;
                    " onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#ddd'">
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="load-profile-btn" data-profile-id="${profileId}" style="
                        padding: 10px 20px;
                        background: #2196F3;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        transition: background-color 0.3s, transform 0.1s;
                        flex: 1;
                    " onmouseover="this.style.backgroundColor='#0b7dda'; this.style.transform='translateY(-1px)'" onmouseout="this.style.backgroundColor='#2196F3'; this.style.transform='translateY(0)'">Load Saved</button>
                    
                    <button class="save-profile-btn" data-profile-id="${profileId}" style="
                        padding: 10px 20px;
                        background: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        transition: background-color 0.3s, transform 0.1s;
                        flex: 1;
                    " onmouseover="this.style.backgroundColor='#45a049'; this.style.transform='translateY(-1px)'" onmouseout="this.style.backgroundColor='#4CAF50'; this.style.transform='translateY(0)'">Save Profile</button>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', profileHTML);
        
        // Setup template selector
        const templateSelect = document.getElementById(`${profileId}-template`);
        templateSelect.addEventListener('change', (e) => {
            this.applyTemplate(profileId, e.target.value);
        });
        
        // Setup save/load buttons
        document.querySelector(`[data-profile-id="${profileId}"].save-profile-btn`).addEventListener('click', () => {
            this.saveNPCProfile(profileId);
        });
        
        document.querySelector(`[data-profile-id="${profileId}"].load-profile-btn`).addEventListener('click', () => {
            this.loadNPCProfile(profileId);
        });
    }
    
    /**
     * Apply template to NPC profile
     */
    applyTemplate(profileId, template) {
        const templates = {
            'elven-mage': {
                name: 'Elenor',
                backstory: 'You are Elenor, an elven mage from the Silverwoods. You value order, wisdom, and loyalty.',
                traits: 'order:0.9, wisdom:0.95, loyalty:0.85, friendliness:0.7, curiosity:0.8, energy:0.6, talkativeness:0.75'
            },
            'warrior-guard': {
                name: 'Marcus',
                backstory: 'You are Marcus, a seasoned warrior and guard from the northern fortresses. You value honor, strength, and duty. You are straightforward and protective, always ready to defend those in need.',
                traits: 'honor:0.9, strength:0.85, duty:0.9, friendliness:0.65, courage:0.95, energy:0.85, talkativeness:0.6'
            },
            'merchant': {
                name: 'Thaddeus',
                backstory: 'You are Thaddeus, a shrewd merchant trader from the bustling port city. You value profit, negotiation, and opportunity. You are friendly but always looking for a good deal.',
                traits: 'greed:0.8, negotiation:0.9, opportunism:0.85, friendliness:0.75, curiosity:0.7, energy:0.8, talkativeness:0.85'
            },
            'scholar': {
                name: 'Lydia',
                backstory: 'You are Lydia, a curious scholar from the Great Library. You value knowledge, discovery, and understanding. You are always eager to learn and share what you know.',
                traits: 'curiosity:0.95, wisdom:0.9, knowledge:0.9, friendliness:0.8, energy:0.7, talkativeness:0.85'
            },
            'wanderer': {
                name: 'Finn',
                backstory: 'You are Finn, a free-spirited wanderer who travels the lands. You value freedom, adventure, and new experiences. You are friendly and open to meeting new people.',
                traits: 'freedom:0.9, adventure:0.9, friendliness:0.85, curiosity:0.9, energy:0.9, talkativeness:0.7'
            }
        };
        
        if (templates[template]) {
            const t = templates[template];
            document.getElementById(`${profileId}-name`).value = t.name;
            document.getElementById(`${profileId}-backstory`).value = t.backstory;
            document.getElementById(`${profileId}-traits`).value = t.traits;
        }
    }
    
    /**
     * Save NPC profile
     */
    saveNPCProfile(profileId) {
        const name = document.getElementById(`${profileId}-name`).value.trim();
        const backstory = document.getElementById(`${profileId}-backstory`).value.trim();
        const traitsString = document.getElementById(`${profileId}-traits`).value.trim();
        
        if (!name) {
            alert('Please enter a profile name');
            return;
        }
        
        // Parse traits
        const traits = {};
        if (traitsString) {
            traitsString.split(',').forEach(trait => {
                const [key, value] = trait.split(':').map(s => s.trim());
                if (key && value) {
                    traits[key] = parseFloat(value) || 0.5;
                }
            });
        }
        
        // Check if profile with this name already exists (to preserve memory ID)
        const savedProfiles = JSON.parse(localStorage.getItem('npc_profiles') || '[]');
        const existingProfile = savedProfiles.find(p => p.name === name);
        const finalId = existingProfile ? existingProfile.id : profileId;
        
        const profile = {
            id: finalId,
            name: name,
            backstory: backstory,
            traits: traits,
            traitsString: traitsString,
            savedAt: new Date().toISOString()
        };
        
        // Save to localStorage
        const existingIndex = savedProfiles.findIndex(p => p.id === finalId || p.name === name);
        if (existingIndex >= 0) {
            savedProfiles[existingIndex] = profile;
        } else {
            savedProfiles.push(profile);
        }
        localStorage.setItem('npc_profiles', JSON.stringify(savedProfiles));
        
        alert(`Profile "${name}" saved! This NPC will remember their past interactions with you.`);
    }
    
    /**
     * Load NPC profile
     */
    loadNPCProfile(profileId) {
        const savedProfiles = JSON.parse(localStorage.getItem('npc_profiles') || '[]');
        const name = document.getElementById(`${profileId}-name`).value.trim();
        
        const profile = savedProfiles.find(p => p.id === profileId || p.name === name);
        if (profile) {
            document.getElementById(`${profileId}-name`).value = profile.name || '';
            document.getElementById(`${profileId}-backstory`).value = profile.backstory || '';
            document.getElementById(`${profileId}-traits`).value = profile.traitsString || '';
            alert(`Profile "${profile.name}" loaded!`);
        } else {
            alert('Profile not found. Make sure the name matches a saved profile.');
        }
    }
    
    /**
     * Load saved NPC profiles
     */
    loadNPCProfiles() {
        return JSON.parse(localStorage.getItem('npc_profiles') || '[]');
    }
    
    /**
     * Load saved profiles into form
     */
    loadSavedProfiles() {
        const savedProfiles = this.loadNPCProfiles();
        if (savedProfiles.length === 0) {
            alert('No saved profiles found.');
            return;
        }
        
        const count = savedProfiles.length;
        document.getElementById('npc-count').value = count;
        this.updateNPCProfiles();
        
        // Wait for DOM to update, then load profiles
        setTimeout(() => {
            savedProfiles.forEach((profile, index) => {
                const profileId = `npc-${index}`;
                if (document.getElementById(`${profileId}-name`)) {
                    document.getElementById(`${profileId}-name`).value = profile.name || '';
                    document.getElementById(`${profileId}-backstory`).value = profile.backstory || '';
                    document.getElementById(`${profileId}-traits`).value = profile.traitsString || '';
                }
            });
            alert(`Loaded ${count} saved profile(s)!`);
        }, 100);
    }
    
    /**
     * Start game with setup data
     */
    startGame() {
        const playerName = document.getElementById('player-name').value.trim();
        const playerInterests = document.getElementById('player-interests').value.trim();
        const npcCount = parseInt(document.getElementById('npc-count').value) || 2;
        
        if (!playerName) {
            alert('Please enter your name');
            return;
        }
        
        // Collect NPC profiles
        const npcProfiles = [];
        for (let i = 0; i < npcCount; i++) {
            const profileId = `npc-${i}`;
            const name = document.getElementById(`${profileId}-name`).value.trim();
            const backstory = document.getElementById(`${profileId}-backstory`).value.trim();
            const traitsString = document.getElementById(`${profileId}-traits`).value.trim();
            
            if (!name || !backstory) {
                alert(`Please fill in all fields for NPC ${i + 1}`);
                return;
            }
            
            // Parse traits
            const traits = {};
            if (traitsString) {
                traitsString.split(',').forEach(trait => {
                    const [key, value] = trait.split(':').map(s => s.trim());
                    if (key && value) {
                        traits[key] = parseFloat(value) || 0.5;
                    }
                });
            }
            
            // Check if this profile exists in saved profiles (to preserve memory)
            const savedProfiles = this.loadNPCProfiles();
            const savedProfile = savedProfiles.find(p => p.name === name);
            
            // Use saved profile ID if exists, otherwise use index
            const finalProfileId = savedProfile ? savedProfile.id : i;
            
            npcProfiles.push({
                id: finalProfileId,
                name: name,
                displayName: name,
                backstory: backstory,
                traits: traits
            });
            
            // Save profile to localStorage (for future sessions)
            const profileToSave = {
                id: finalProfileId,
                name: name,
                backstory: backstory,
                traits: traits,
                traitsString: traitsString,
                savedAt: new Date().toISOString()
            };
            
            const allSavedProfiles = this.loadNPCProfiles();
            const existingIndex = allSavedProfiles.findIndex(p => p.id === finalProfileId || p.name === name);
            if (existingIndex >= 0) {
                allSavedProfiles[existingIndex] = profileToSave;
            } else {
                allSavedProfiles.push(profileToSave);
            }
            localStorage.setItem('npc_profiles', JSON.stringify(allSavedProfiles));
        }
        
        // Store setup data
        this.setupData = {
            player: {
                name: playerName,
                interests: playerInterests
            },
            npcProfiles: npcProfiles
        };
        
        // Save player info
        localStorage.setItem('player_info', JSON.stringify({
            name: playerName,
            interests: playerInterests
        }));
        
        // Hide setup screen
        const setupContainer = document.getElementById('game-setup');
        if (setupContainer) {
            setupContainer.style.display = 'none';
        }
        
        // Dispatch event to start game
        window.dispatchEvent(new CustomEvent('gameSetupComplete', { detail: this.setupData }));
    }
    
    /**
     * Get setup data
     */
    getSetupData() {
        return this.setupData;
    }
}

