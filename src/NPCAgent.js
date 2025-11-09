import * as THREE from 'three';

/**
 * NPCAgent - AI agent for NPCs using Gemini API
 * Handles reasoning, tool calling, and memory management
 */
export class NPCAgent {
    constructor(npc, game, memory) {
        console.log(`[Agent NPC ${npc.id}] Initializing agent...`);
        this.npc = npc;
        this.game = game;
        this.memory = memory;
        this.apiKey = 'AIzaSyBQYtUs-QEJ9Vi8wbJPF3wNWynTqACNtg8';
        this.model = 'gemini-2.0-flash-lite';
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
        
        // Agent state
        this.isProcessing = false;
        this.currentTask = null;
        
        console.log(`[Agent NPC ${npc.id}] Agent properties set`);
        console.log(`[Agent NPC ${npc.id}] Memory object:`, !!this.memory);
        console.log(`[Agent NPC ${npc.id}] Memory.memory:`, !!this.memory?.memory);
        
        // Initialize personality in memory if not set
        if (!this.memory.memory.personality) {
            console.log(`[Agent NPC ${npc.id}] Setting personality in memory`);
            this.memory.setPersonality(this.npc.personality);
        } else {
            console.log(`[Agent NPC ${npc.id}] Personality already set in memory`);
        }
        
        console.log(`[Agent NPC ${npc.id}] Agent initialization complete`);
    }
    
    /**
     * Process an event and generate agent response
     */
    async processEvent(eventType, eventData = {}) {
        if (this.isProcessing) {
            console.log(`[NPC ${this.npc.id}] Already processing, skipping event: ${eventType}`);
            return; // Skip if already processing
        }
        
        console.log(`[NPC ${this.npc.id}] Processing event: ${eventType}`, eventData);
        this.isProcessing = true;
        
        try {
            // Get current context
            const context = this.getContext(eventType, eventData);
            console.log(`[NPC ${this.npc.id}] Context prepared, calling Gemini API...`);
            
            // Generate agent response using Gemini
            const response = await this.callGemini(context);
            
            // Parse response and execute actions
            if (response) {
                console.log(`[NPC ${this.npc.id}] Received response:`, {
                    hasText: !!response.text,
                    textLength: response.text?.length || 0,
                    functionCalls: response.functionCalls?.length || 0
                });
                await this.executeResponse(response);
            } else {
                console.warn(`[NPC ${this.npc.id}] No response received from Gemini API`);
            }
        } catch (error) {
            console.error(`[NPC ${this.npc.id}] Error processing event:`, error);
        } finally {
            this.isProcessing = false;
            console.log(`[NPC ${this.npc.id}] Event processing complete`);
        }
    }
    
    /**
     * Get context for agent
     */
    getContext(eventType, eventData) {
        const memoryContext = this.memory.getContext();
        const envState = this.npc.getEnvironmentState();
        const npcState = this.npc.getContextForLLM();
        
        return {
            eventType: eventType,
            eventData: eventData,
            npcState: npcState,
            environment: envState,
            memory: memoryContext,
            availableTools: this.getAvailableTools()
        };
    }
    
    /**
     * Call Gemini API
     */
    async callGemini(context) {
        const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;
        
        // Build system prompt
        const systemPrompt = this.buildSystemPrompt(context);
        
        // Build conversation history (last 5 conversations for context)
        const recentConversations = this.memory.memory.conversationHistory.slice(-5);
        const conversationHistory = recentConversations.map(conv => ({
            role: conv.role === 'user' ? 'user' : 'model',
            parts: [{ text: conv.content }]
        }));
        
        // Add current event as user message
        const currentMessage = this.buildEventMessage(context);
        const fullMessage = systemPrompt + '\n\n' + currentMessage;
        
        const requestBody = {
            contents: [
                ...conversationHistory,
                {
                    role: 'user',
                    parts: [{ text: fullMessage }]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            },
            tools: [{
                functionDeclarations: this.getToolDefinitions()
            }]
        };
        
        try {
            console.log(`[NPC ${this.npc.id}] Calling Gemini API: ${url}`);
            console.log(`[NPC ${this.npc.id}] Request body:`, {
                contentsCount: requestBody.contents.length,
                toolsCount: requestBody.tools[0].functionDeclarations.length
            });
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[NPC ${this.npc.id}] Gemini API error (${response.status}):`, errorText);
                throw new Error(`Gemini API error: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`[NPC ${this.npc.id}] Gemini API response received`);
            
            // Extract response text and function calls
            if (data.candidates && data.candidates[0]) {
                const candidate = data.candidates[0];
                const content = candidate.content;
                
                // Check for function calls
                if (content.parts) {
                    const parts = content.parts;
                    const functionCalls = parts.filter(p => p.functionCall).map(p => ({
                        name: p.functionCall.name,
                        args: p.functionCall.args || {}
                    }));
                    const textParts = parts.filter(p => p.text);
                    
                    const responseText = textParts.map(p => p.text).join(' ').trim();
                    
                    if (functionCalls.length > 0) {
                        console.log(`[NPC ${this.npc.id}] Function calls detected:`, functionCalls.map(fc => fc.name));
                    }
                    if (responseText) {
                        console.log(`[NPC ${this.npc.id}] Response text: "${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}"`);
                    }
                    
                    return {
                        text: responseText,
                        functionCalls: functionCalls
                    };
                }
            }
            
            console.warn(`[NPC ${this.npc.id}] No valid response structure in API response`);
            return null;
        } catch (error) {
            console.error(`[NPC ${this.npc.id}] Error calling Gemini API:`, error);
            throw error;
        }
    }
    
    /**
     * Build system prompt
     */
    buildSystemPrompt(context) {
        const personality = context.memory.personality || this.npc.personality;
        
        return `You are an NPC in a 3D game world. Your personality traits are:
- Friendliness: ${personality.friendliness.toFixed(2)}
- Curiosity: ${personality.curiosity.toFixed(2)}
- Energy: ${personality.energy.toFixed(2)}
- Talkativeness: ${personality.talkativeness.toFixed(2)}

Your current state: ${context.npcState.state}
Your position: (${context.npcState.position.x.toFixed(1)}, ${context.npcState.position.y.toFixed(1)}, ${context.npcState.position.z.toFixed(1)})

Environment:
- Time of day: ${context.environment?.timeOfDay || 'unknown'}
- Weather: ${context.environment?.weather || 'unknown'}
- Temperature: ${context.environment?.temperature || 'unknown'}°C

You can use tools to interact with the world. When you want to perform an action, use the appropriate tool function.
When you want to speak, use the speak tool with your response text.

Recent actions: ${context.memory.recentActions.slice(-5).map(a => a.action).join(', ') || 'none'}

Respond naturally based on your personality and the current situation.`;
    }
    
    /**
     * Build event message
     */
    buildEventMessage(context) {
        const { eventType, eventData } = context;
        
        switch (eventType) {
            case 'player_query':
                return `The player nearby said: "${eventData.transcript}"\n\nHow do you respond?`;
            
            case 'environment_change':
                return `The environment changed: ${eventData.change} (${eventData.details || ''})\n\nHow do you react?`;
            
            case 'hit':
                return `You were hit by ${eventData.thrower?.id || 'someone'}!\n\nHow do you react?`;
            
            case 'periodic':
                return `Periodic check: What do you want to do now?`;
            
            default:
                return `Event occurred: ${eventType}\n\nHow do you respond?`;
        }
    }
    
    /**
     * Get tool definitions for Gemini
     */
    getToolDefinitions() {
        return [
            {
                name: 'move_to',
                description: 'Move to a specific position in the world',
                parameters: {
                    type: 'object',
                    properties: {
                        x: { type: 'number', description: 'X coordinate' },
                        y: { type: 'number', description: 'Y coordinate (usually 0 for ground level)' },
                        z: { type: 'number', description: 'Z coordinate' }
                    },
                    required: ['x', 'z']
                }
            },
            {
                name: 'speak',
                description: 'Speak a message (displayed as text above the NPC)',
                parameters: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', description: 'The message to speak' }
                    },
                    required: ['message']
                }
            },
            {
                name: 'go_to_nearest_rock',
                description: 'Find and move to the nearest collectable rock',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'go_to_nearest_lamp',
                description: 'Find and move to the nearest lamp',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'collect_rock',
                description: 'Collect a rock at current position (if nearby)',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'throw_rock',
                description: 'Throw a rock at a target position',
                parameters: {
                    type: 'object',
                    properties: {
                        target_x: { type: 'number', description: 'Target X coordinate' },
                        target_y: { type: 'number', description: 'Target Y coordinate' },
                        target_z: { type: 'number', description: 'Target Z coordinate' }
                    },
                    required: ['target_x', 'target_z']
                }
            },
            {
                name: 'toggle_lamp',
                description: 'Toggle a lamp on/off (if nearby)',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'get_player_position',
                description: 'Get the current player position',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'hide_from_rain',
                description: 'Find shelter from rain (tree or hut) and move there',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        ];
    }
    
    /**
     * Get available tools (for context)
     */
    getAvailableTools() {
        return this.getToolDefinitions().map(tool => tool.name);
    }
    
    /**
     * Execute agent response (text + function calls)
     */
    async executeResponse(response) {
        // Handle text response (speak)
        if (response.text && response.text.trim()) {
            console.log(`[NPC ${this.npc.id}] Speaking: "${response.text}"`);
            this.speak(response.text);
        }
        
        // Handle function calls
        if (response.functionCalls && response.functionCalls.length > 0) {
            console.log(`[NPC ${this.npc.id}] Executing ${response.functionCalls.length} function call(s)`);
            for (const funcCall of response.functionCalls) {
                await this.executeTool(funcCall);
            }
        }
    }
    
    /**
     * Execute a tool call
     */
    async executeTool(functionCall) {
        const { name, args } = functionCall;
        
        console.log(`[NPC ${this.npc.id}] Executing tool: ${name}`, args);
        
        try {
            switch (name) {
                case 'move_to':
                    this.moveTo(args.x || 0, args.y || 0, args.z || 0);
                    break;
                
                case 'speak':
                    this.speak(args.message || '');
                    break;
                
                case 'go_to_nearest_rock':
                    this.goToNearestRock();
                    break;
                
                case 'go_to_nearest_lamp':
                    this.goToNearestLamp();
                    break;
                
                case 'collect_rock':
                    this.collectRock();
                    break;
                
                case 'throw_rock':
                    this.throwRock(args.target_x, args.target_y || 1.6, args.target_z);
                    break;
                
                case 'toggle_lamp':
                    this.toggleLamp();
                    break;
                
                case 'get_player_position':
                    this.getPlayerPosition();
                    break;
                
                case 'hide_from_rain':
                    this.hideFromRain();
                    break;
                
                default:
                    console.warn(`[NPC ${this.npc.id}] Unknown tool: ${name}`);
            }
            
            // Record action in memory
            this.memory.addAction(name, args);
            console.log(`[NPC ${this.npc.id}] Tool ${name} executed successfully`);
        } catch (error) {
            console.error(`[NPC ${this.npc.id}] Error executing tool ${name}:`, error);
        }
    }
    
    // Tool implementations
    moveTo(x, y, z) {
        console.log(`[NPC ${this.npc.id}] Moving to (${x.toFixed(1)}, ${(y || 0).toFixed(1)}, ${z.toFixed(1)})`);
        const target = new THREE.Vector3(x, y || 0, z);
        this.npc.setTargetPosition(target);
        this.memory.addAction('move_to', { x, y: y || 0, z });
    }
    
    speak(message) {
        console.log(`[NPC ${this.npc.id}] Speaking: "${message}"`);
        this.npc.speak(message);
        this.memory.addConversation('assistant', message);
    }
    
    goToNearestRock() {
        console.log(`[NPC ${this.npc.id}] Searching for nearest rock...`);
        const rocks = this.game.getAvailableRocks();
        if (rocks.length === 0) {
            console.log(`[NPC ${this.npc.id}] No rocks available`);
            return;
        }
        
        let nearest = null;
        let minDist = Infinity;
        
        rocks.forEach(rock => {
            const dist = this.npc.position.distanceTo(rock.position);
            if (dist < minDist) {
                minDist = dist;
                nearest = rock;
            }
        });
        
        if (nearest) {
            console.log(`[NPC ${this.npc.id}] Found nearest rock at distance ${minDist.toFixed(2)}`);
            this.moveTo(nearest.position.x, 0, nearest.position.z);
        }
    }
    
    goToNearestLamp() {
        console.log(`[NPC ${this.npc.id}] Searching for nearest lamp...`);
        const lamps = this.game.lamps || [];
        if (lamps.length === 0) {
            console.log(`[NPC ${this.npc.id}] No lamps available`);
            return;
        }
        
        let nearest = null;
        let minDist = Infinity;
        
        lamps.forEach(lamp => {
            const dist = this.npc.position.distanceTo(lamp.position);
            if (dist < minDist) {
                minDist = dist;
                nearest = lamp;
            }
        });
        
        if (nearest) {
            console.log(`[NPC ${this.npc.id}] Found nearest lamp at distance ${minDist.toFixed(2)}`);
            this.moveTo(nearest.position.x, 0, nearest.position.z);
        }
    }
    
    collectRock() {
        console.log(`[NPC ${this.npc.id}] Attempting to collect rock...`);
        const rocks = this.game.getAvailableRocks();
        const nearby = rocks.filter(rock => 
            this.npc.position.distanceTo(rock.position) < 2.0
        );
        
        if (nearby.length > 0) {
            console.log(`[NPC ${this.npc.id}] Collecting rock at distance ${this.npc.position.distanceTo(nearby[0].position).toFixed(2)}`);
            this.game.collectRock(nearby[0]);
        } else {
            console.log(`[NPC ${this.npc.id}] No rocks nearby to collect`);
        }
    }
    
    throwRock(targetX, targetY, targetZ) {
        console.log(`[NPC ${this.npc.id}] Throwing rock at (${targetX.toFixed(1)}, ${targetY.toFixed(1)}, ${targetZ.toFixed(1)})`);
        const target = new THREE.Vector3(targetX, targetY, targetZ);
        const direction = target.clone().sub(this.npc.position).normalize();
        const speed = 15;
        
        const thrower = { id: this.npc.id, type: 'npc' };
        this.game.throwRockAt(this.npc.position, direction, speed, thrower, false);
    }
    
    toggleLamp() {
        console.log(`[NPC ${this.npc.id}] Attempting to toggle lamp...`);
        const lamps = this.game.lamps || [];
        const nearby = lamps.filter(lamp => 
            this.npc.position.distanceTo(lamp.position) < 3.0
        );
        
        if (nearby.length > 0) {
            console.log(`[NPC ${this.npc.id}] Toggling lamp at distance ${this.npc.position.distanceTo(nearby[0].position).toFixed(2)}`);
            nearby[0].toggle();
        } else {
            console.log(`[NPC ${this.npc.id}] No lamps nearby to toggle`);
        }
    }
    
    getPlayerPosition() {
        const playerPos = this.game.camera.position;
        const message = `Player is at (${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)}, ${playerPos.z.toFixed(1)})`;
        console.log(`[NPC ${this.npc.id}] ${message}`);
        this.speak(message);
    }
    
    hideFromRain() {
        console.log(`[NPC ${this.npc.id}] Searching for shelter from rain...`);
        // Find nearest tree or hut
        // Trees are at: (-15, 15), (20, -10), (-20, -15), (15, 20), (-10, 25), (25, 10), (-25, -5)
        // Hut is at: (10, 0, 10)
        const shelterPositions = [
            { x: -15, z: 15, type: 'tree' },
            { x: 20, z: -10, type: 'tree' },
            { x: -20, z: -15, type: 'tree' },
            { x: 15, z: 20, type: 'tree' },
            { x: -10, z: 25, type: 'tree' },
            { x: 25, z: 10, type: 'tree' },
            { x: -25, z: -5, type: 'tree' },
            { x: 10, z: 10, type: 'hut' }
        ];
        
        let nearest = null;
        let minDist = Infinity;
        
        shelterPositions.forEach(shelter => {
            const dist = Math.sqrt(
                Math.pow(this.npc.position.x - shelter.x, 2) +
                Math.pow(this.npc.position.z - shelter.z, 2)
            );
            if (dist < minDist) {
                minDist = dist;
                nearest = shelter;
            }
        });
        
        if (nearest) {
            console.log(`[NPC ${this.npc.id}] Found nearest shelter: ${nearest.type} at distance ${minDist.toFixed(2)}`);
            this.moveTo(nearest.x, 0, nearest.z);
            this.speak(`Going to ${nearest.type} for shelter`);
        } else {
            console.log(`[NPC ${this.npc.id}] No shelter found`);
        }
    }
}

