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
        this.model = 'gemini-2.0-flash-lite'; // Using Gemini 2.0 Flash-Lite as specified
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
            }],
            toolConfig: {
                functionCallingConfig: {
                    mode: 'AUTO' // AUTO mode allows the model to decide when to call functions
                    // Note: allowedFunctionNames can only be used with ANY mode, not AUTO
                }
            },
            systemInstruction: {
                parts: [{
                    text: 'You are an NPC agent in a 3D game. You MUST use function calls to interact with the world. Always call at least one function tool when responding to events. Use speak() to communicate, move_to() or navigation tools to move, and interaction tools to interact with objects. Act according to your personality and backstory.'
                }]
            }
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
            console.log(`[NPC ${this.npc.id}] Gemini API response received:`, JSON.stringify(data, null, 2));
            
            // Check for direct functionCalls in response (newer API format)
            if (data.functionCalls && data.functionCalls.length > 0) {
                console.log(`[NPC ${this.npc.id}] Function calls found in response.functionCalls:`, data.functionCalls);
                return {
                    text: data.text || '',
                    functionCalls: data.functionCalls.map(fc => ({
                        name: fc.name,
                        args: fc.args || {}
                    }))
                };
            }
            
            // Extract response text and function calls from candidates
            if (data.candidates && data.candidates[0]) {
                const candidate = data.candidates[0];
                const content = candidate.content;
                
                console.log(`[NPC ${this.npc.id}] Candidate content:`, JSON.stringify(content, null, 2));
                
                // Check for function calls
                if (content.parts) {
                    const parts = content.parts;
                    const functionCalls = parts.filter(p => p.functionCall).map(p => {
                        console.log(`[NPC ${this.npc.id}] Found functionCall part:`, p.functionCall);
                        return {
                            name: p.functionCall.name,
                            args: p.functionCall.args || {}
                        };
                    });
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
            console.warn(`[NPC ${this.npc.id}] Full response:`, JSON.stringify(data, null, 2));
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
        
        // Build personality section
        let personalitySection = '';
        if (personality) {
            // Include backstory and identity if available
            if (personality.backstory) {
                personalitySection += `${personality.backstory}\n\n`;
            }
            
            // Include name if available
            if (personality.name) {
                personalitySection += `Your name is ${personality.name}.\n`;
            }
            
            // Include traits if available
            if (personality.traits) {
                personalitySection += `\nYour core values and traits:\n`;
                Object.entries(personality.traits).forEach(([trait, value]) => {
                    if (typeof value === 'number') {
                        personalitySection += `- ${trait.charAt(0).toUpperCase() + trait.slice(1)}: ${value.toFixed(2)}\n`;
                    } else {
                        personalitySection += `- ${trait.charAt(0).toUpperCase() + trait.slice(1)}: ${value}\n`;
                    }
                });
            } else {
                // Fallback to legacy numeric traits
                personalitySection += `\nYour personality traits:\n`;
                personalitySection += `- Friendliness: ${personality.friendliness?.toFixed(2) || '0.50'}\n`;
                personalitySection += `- Curiosity: ${personality.curiosity?.toFixed(2) || '0.50'}\n`;
                personalitySection += `- Energy: ${personality.energy?.toFixed(2) || '0.50'}\n`;
                personalitySection += `- Talkativeness: ${personality.talkativeness?.toFixed(2) || '0.50'}\n`;
            }
        } else {
            personalitySection = `You are an NPC in a 3D game world.\n`;
        }
        
        return `${personalitySection}

Your current state: ${context.npcState.state}
Your position: (${context.npcState.position.x.toFixed(1)}, ${context.npcState.position.y.toFixed(1)}, ${context.npcState.position.z.toFixed(1)})

IMPORTANT: You MUST use function calls to interact with the world. You have access to these tools:
${this.getToolDefinitions().map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

When responding to events:
1. ALWAYS call at least one function tool to take action
2. Use the 'speak' tool to communicate with others
3. Use movement tools (move_to, go_to_nearest_rock, go_to_nearest_lamp) to navigate
4. Use interaction tools (collect_rock, throw_rock, toggle_lamp) to interact with objects
5. Use hide_from_rain when weather is rainy

DO NOT just respond with text - you MUST call function tools to take actions in the world.

Recent actions: ${context.memory.recentActions.slice(-2).map(a => a.action).join(', ') || 'none'}

Based on your personality, backstory, and the current situation, decide what actions to take and call the appropriate function tools. Remember who you are and act accordingly.`;
    }
    
    /**
     * Build event message
     */
    buildEventMessage(context) {
        const { eventType, eventData } = context;
        
        switch (eventType) {
            case 'player_query':
                return `The player nearby said: "${eventData.transcript}"\n\nYou MUST respond by calling function tools. Use the speak() tool to respond verbally, and consider using other tools like move_to(), go_to_nearest_rock(), or collect_rock() if appropriate. What actions do you take?`;
            
            case 'environment_change':
                return `The environment changed: ${eventData.change} (${eventData.details || ''})\n\nYou MUST react by calling function tools. For example, if it's raining, use hide_from_rain(). If it's getting dark, use go_to_nearest_lamp() and toggle_lamp(). What actions do you take?`;
            
            case 'hit':
                return `You were hit by ${eventData.thrower?.id || 'someone'}!\n\nYou MUST react by calling function tools. You could use speak() to respond, throw_rock() to retaliate, or move_to() to get away. What actions do you take?`;
            
            case 'periodic':
                return `Periodic check: What do you want to do now? Use function tools to take actions in the world.`;
            
            default:
                return `Event occurred: ${eventType}\n\nYou MUST respond by calling function tools. What actions do you take?`;
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
            // Add offset to avoid collision (move to position slightly away from rock)
            const offset = 1.5; // Distance to stop from rock
            const direction = new THREE.Vector3()
                .subVectors(this.npc.position, nearest.position)
                .normalize();
            
            // If already very close, use a default offset direction
            if (direction.length() < 0.1) {
                direction.set(1, 0, 0); // Default to positive X direction
            }
            
            const targetPos = nearest.position.clone().add(direction.multiplyScalar(offset));
            this.moveTo(targetPos.x, 0, targetPos.z);
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
            // Add offset to avoid collision (move to position slightly away from lamp)
            const offset = 1.5; // Distance to stop from lamp
            const direction = new THREE.Vector3()
                .subVectors(this.npc.position, nearest.position)
                .normalize();
            
            // If already very close, use a default offset direction
            if (direction.length() < 0.1) {
                direction.set(1, 0, 0); // Default to positive X direction
            }
            
            const targetPos = nearest.position.clone().add(direction.multiplyScalar(offset));
            this.moveTo(targetPos.x, 0, targetPos.z);
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
            // Add offset to avoid collision (move to position slightly away from shelter)
            const offset = 2.0; // Distance to stop from shelter (trees/hut are larger)
            const shelterPos = new THREE.Vector3(nearest.x, 0, nearest.z);
            const direction = new THREE.Vector3()
                .subVectors(this.npc.position, shelterPos)
                .normalize();
            
            // If already very close, use a default offset direction
            if (direction.length() < 0.1) {
                direction.set(1, 0, 0); // Default to positive X direction
            }
            
            const targetPos = shelterPos.clone().add(direction.multiplyScalar(offset));
            this.moveTo(targetPos.x, 0, targetPos.z);
            this.speak(`Going to ${nearest.type} for shelter`);
        } else {
            console.log(`[NPC ${this.npc.id}] No shelter found`);
        }
    }
}

