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
        this.apiKey = 'AIzaSyCVE70C-PiaKvLXQrtvPMuzjT80yhTcY1k';
        this.model = 'gemini-2.0-flash-lite'; // Using Gemini 2.0 Flash-Lite as specified
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
        
        // Groq API for sentiment analysis
        this.groqApiKey = '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';
        this.groqBaseUrl = 'https://api.groq.com/openai/v1/chat/completions';
        
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
            // For player queries, analyze sentiment first
            if (eventType === 'player_query' && eventData.transcript) {
                console.log(`[NPC ${this.npc.id}] Analyzing sentiment of player message...`);
                const sentiment = await this.analyzeSentiment(eventData.transcript);
                console.log(`[NPC ${this.npc.id}] Sentiment: ${sentiment.label} (confidence: ${sentiment.confidence})`);
                
                // Record player message with sentiment
                this.memory.recordPlayerMessage(eventData.transcript, sentiment);
            }
            
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
     * Analyze sentiment of player message using Groq API
     */
    async analyzeSentiment(message) {
        try {
            const response = await fetch(this.groqBaseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.groqApiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{
                        role: 'user',
                        content: `Analyze the sentiment of this message from a player to an NPC in a game. Respond with ONLY a JSON object in this exact format: {"label": "friendly|hostile|threatening|neutral|positive|negative", "confidence": 0.0-1.0, "reasoning": "brief explanation"}. Message: "${message}"`
                    }],
                    temperature: 0.3,
                    max_tokens: 150
                })
            });
            
            if (!response.ok) {
                console.error(`[NPC ${this.npc.id}] Groq API error: ${response.statusText}`);
                return { label: 'neutral', confidence: 0.5, reasoning: 'Analysis failed' };
            }
            
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';
            
            // Try to parse JSON from response
            try {
                // Extract JSON from response (might have markdown code blocks)
                let jsonStr = content.trim();
                if (jsonStr.startsWith('```')) {
                    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                }
                const sentiment = JSON.parse(jsonStr);
                console.log(`[NPC ${this.npc.id}] Sentiment analysis:`, sentiment);
                return sentiment;
            } catch (parseError) {
                console.error(`[NPC ${this.npc.id}] Failed to parse sentiment response:`, content);
                // Fallback: try to extract label from text
                const lowerContent = content.toLowerCase();
                if (lowerContent.includes('hostile') || lowerContent.includes('threatening') || lowerContent.includes('negative')) {
                    return { label: 'hostile', confidence: 0.7, reasoning: 'Detected from text' };
                } else if (lowerContent.includes('friendly') || lowerContent.includes('positive')) {
                    return { label: 'friendly', confidence: 0.7, reasoning: 'Detected from text' };
                }
                return { label: 'neutral', confidence: 0.5, reasoning: 'Could not parse' };
            }
        } catch (error) {
            console.error(`[NPC ${this.npc.id}] Error analyzing sentiment:`, error);
            return { label: 'neutral', confidence: 0.5, reasoning: 'Analysis error' };
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
                    text: 'You are an NPC agent in a 3D game. You MUST use function calls to interact with the world. Always call at least one function tool when responding to events. Use speak() to communicate, move_to() or navigation tools to move, and interaction tools to interact with objects. Act according to your personality and backstory. When using speak(), use PLAIN TEXT only - no RPG formatting, asterisks, or narrative descriptions.'
                }]
            }
        };
        
        try {
            console.log(`[NPC ${this.npc.id}] Calling Gemini API: ${url}`);
            console.log(`[NPC ${this.npc.id}] Request body:`, {
                contentsCount: requestBody.contents.length,
                toolsCount: requestBody.tools[0].functionDeclarations.length
            });
            
            // Log the final prompt that will be sent to Gemini
            console.log(`[NPC ${this.npc.id}] ========== FINAL PROMPT TO GEMINI ==========`);
            console.log(`[NPC ${this.npc.id}] System Instruction:`, requestBody.systemInstruction.parts[0].text);
            console.log(`[NPC ${this.npc.id}] Conversation History (${conversationHistory.length} messages):`);
            conversationHistory.forEach((msg, idx) => {
                console.log(`[NPC ${this.npc.id}]   [${idx + 1}] ${msg.role}: ${msg.parts[0].text.substring(0, 100)}${msg.parts[0].text.length > 100 ? '...' : ''}`);
            });
            console.log(`[NPC ${this.npc.id}] Current Message (full):`);
            console.log(`[NPC ${this.npc.id}] ${fullMessage}`);
            console.log(`[NPC ${this.npc.id}] ===========================================`);
            
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

PLAYER REPUTATION: ${context.memory.playerReputation > 0 ? `+${context.memory.playerReputation} (Friendly)` : context.memory.playerReputation < 0 ? `${context.memory.playerReputation} (Hostile)` : '0 (Neutral)'}
${context.memory.recentPlayerInteractions.length > 0 ? `Recent player interactions: ${context.memory.recentPlayerInteractions.slice(-3).map(i => `${i.type} (${i.impact})`).join(', ')}` : 'No recent player interactions'}

IMPORTANT: Your treatment of the player should be based on how they have treated you. If they have been hostile (negative reputation), you may be more cautious, defensive, or retaliatory. If they have been friendly (positive reputation), you may be more welcoming and helpful. Adjust your responses and actions accordingly.

IMPORTANT: You MUST use function calls to interact with the world. You have access to these tools:
${this.getToolDefinitions().map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

When responding to events:
1. ALWAYS call at least one function tool to take action
2. Use speak(message) to communicate with others - your speech will be displayed and spoken aloud
3. Use collect_nearest_rock() to find the nearest rock, move to it, and collect it automatically (no parameters needed)
4. Use interact_with_nearest_lamp() to find the nearest lamp, move to it, and toggle it automatically (no parameters needed)
5. Use move_to(x, z) to move to specific coordinates (x and z are required, y defaults to 0)
6. Use throw_rock(target_id) to aim and throw a rock at a target - use "player" for the player, or an NPC ID like "1", "2" (target_id is required)
7. Use hide_from_rain() to find the nearest shelter (tree or hut) and move there when it's raining (no parameters needed)
8. Use get_player_position() to get the current player's position coordinates (no parameters needed)

DO NOT just respond with text - you MUST call function tools to take actions in the world.

IMPORTANT - Response Format:
- DO NOT include reasoning, thinking, or explanations in your text response
- DO NOT include function call syntax (like speak("message")) in your text response
- ONLY use the speak() function tool to communicate - do not write what you would say in the text response
- When using the speak() tool, use PLAIN TEXT only. Do NOT use RPG-style formatting like "*character says*" or "*character does action*"
- Do NOT include asterisks, italics, or narrative descriptions in your speech
- Just speak naturally as the character would, using plain conversational text
- Example: Instead of "*Elenor says, her voice laced with disapproval*", just say "Very well" or "I understand"
- Your personality should come through in WHAT you say, not HOW you format it
- If you need to communicate, ONLY call the speak() function - do not include the message in your text response

Recent player actions: ${context.memory.recentActions.length > 0 ? context.memory.recentActions.slice(-3).map(a => a.action).join(', ') : 'none'}

Based on your personality, backstory, player reputation, and the current situation, decide what actions to take and call the appropriate function tools. Remember who you are and how the player has treated you. Act accordingly.`;
    }
    
    /**
     * Build event message
     */
    buildEventMessage(context) {
        const { eventType, eventData } = context;
        
        switch (eventType) {
            case 'player_query':
                return `The player nearby said: "${eventData.transcript}"\n\nYou MUST respond by calling function tools. Use speak(message) to respond verbally (your speech will be displayed and spoken aloud). You can also use other tools like move_to(x, z), collect_nearest_rock(), or interact_with_nearest_lamp() if appropriate. What actions do you take?`;
            
            case 'environment_change':
                return `The environment changed: ${eventData.change} (${eventData.details || ''})\n\nYou MUST react by calling function tools. For example, if it's raining, use hide_from_rain(). If it's getting dark, use interact_with_nearest_lamp() to find the nearest lamp, move to it, and toggle it automatically. What actions do you take?`;
            
            case 'hit':
                return `You were hit by ${eventData.thrower?.id || 'someone'}!\n\nYou MUST react by calling function tools. You could use speak(message) to respond, throw_rock(target_id) to retaliate (e.g., throw_rock("player") to hit the player, or throw_rock("1") to hit NPC 1), or move_to(x, z) to get away. What actions do you take?`;
            
            case 'periodic':
                return `Periodic check: What do you want to do now? Use function tools to take actions in the world. Available tools: speak(message), move_to(x, z), collect_nearest_rock(), interact_with_nearest_lamp(), throw_rock(target_id), hide_from_rain(), get_player_position().`;
            
            default:
                return `Event occurred: ${eventType}\n\nYou MUST respond by calling function tools. Available tools: speak(message), move_to(x, z), collect_nearest_rock(), interact_with_nearest_lamp(), throw_rock(target_id), hide_from_rain(), get_player_position(). What actions do you take?`;
        }
    }
    
    /**
     * Get tool definitions for Gemini
     */
    getToolDefinitions() {
        return [
            {
                name: 'move_to',
                description: 'Move to a specific position in the world. The NPC will navigate to the given coordinates.',
                parameters: {
                    type: 'object',
                    properties: {
                        x: { type: 'number', description: 'X coordinate (required)' },
                        y: { type: 'number', description: 'Y coordinate (optional, defaults to 0 for ground level)' },
                        z: { type: 'number', description: 'Z coordinate (required)' }
                    },
                    required: ['x', 'z']
                }
            },
            {
                name: 'speak',
                description: 'Speak a message that will be displayed as text above the NPC and spoken aloud using text-to-speech. Use ONLY plain conversational text - no reasoning, explanations, function call syntax, RPG formatting, asterisks, or narrative descriptions. Just the actual words the character would say.',
                parameters: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', description: 'The message to speak (ONLY plain text, no reasoning or function syntax)' }
                    },
                    required: ['message']
                }
            },
            {
                name: 'collect_nearest_rock',
                description: 'Find the nearest collectable rock, move to it, and collect it automatically. This function handles both movement and collection in one action.',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'interact_with_nearest_lamp',
                description: 'Find the nearest lamp, move to it, and toggle it on/off automatically. This function handles both movement and interaction in one action.',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'throw_rock',
                description: 'Aim and throw a rock at a target (player or NPC). The target can be "player" for the player, or an NPC ID number (e.g., "1", "2"). The function will automatically aim at the target and throw the projectile.',
                parameters: {
                    type: 'object',
                    properties: {
                        target_id: { type: 'string', description: 'Target ID: "player" for the player, or an NPC ID number (e.g., "1", "2")' }
                    },
                    required: ['target_id']
                }
            },
            {
                name: 'get_player_position',
                description: 'Get the current player position coordinates. The NPC will speak the player\'s position (x, y, z coordinates).',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            {
                name: 'hide_from_rain',
                description: 'Find the nearest shelter from rain (tree or hut) and move there. The NPC will automatically navigate to the closest available shelter.',
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
        // Handle function calls
        if (response.functionCalls && response.functionCalls.length > 0) {
            console.log(`[NPC ${this.npc.id}] Executing ${response.functionCalls.length} function call(s)`);
            for (const funcCall of response.functionCalls) {
                await this.executeTool(funcCall);
            }
        }
        
        // Handle text response (speak)
        if (response.text && response.text.trim()) {
            console.log(`[NPC ${this.npc.id}] Speaking: "${response.text}"`);
            this.speak(response.text);
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
                
                case 'collect_nearest_rock':
                    this.collectNearestRock();
                    break;
                
                case 'interact_with_nearest_lamp':
                    this.interactWithNearestLamp();
                    break;
                
                case 'throw_rock':
                    this.throwRock(args.target_id);
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
            
            // Record action in memory (only if it's a player action - NPC actions are not saved)
            // NPC actions are not saved to reduce memory clutter
            // Only player actions (hits, etc.) are saved via recordPlayerHit()
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
        // Don't save NPC actions to memory - only player actions are saved
        // this.memory.addAction('move_to', { x, y: y || 0, z }); // Removed
    }
    
    speak(message) {
        console.log(`[NPC ${this.npc.id}] Speaking: "${message}"`);
        this.npc.speak(message);
        // Don't save NPC messages to memory - only player messages are saved
        // this.memory.addConversation('assistant', message); // Removed - NPC messages not saved
    }
    
    collectNearestRock() {
        console.log(`[NPC ${this.npc.id}] Finding nearest rock to collect...`);
        const rocks = this.game.getAvailableRocks();
        if (rocks.length === 0) {
            console.log(`[NPC ${this.npc.id}] No rocks available`);
            this.speak("I don't see any rocks nearby.");
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
            
            // If already close enough, collect directly
            if (minDist < 2.0) {
                console.log(`[NPC ${this.npc.id}] Already close enough, collecting rock...`);
                if (nearest.collect && nearest.collect()) {
                    this.npc.addRock(1);
                    console.log(`[NPC ${this.npc.id}] Rock collected! NPC now has ${this.npc.getRockCount()} rock(s)`);
                }
                return;
            }
            
            // Move to rock position (with small offset to avoid collision)
            const offset = 1.5;
            const direction = new THREE.Vector3()
                .subVectors(this.npc.position, nearest.position)
                .normalize();
            
            // If already very close, use a default offset direction
            if (direction.length() < 0.1) {
                direction.set(1, 0, 0);
            }
            
            const targetPos = nearest.position.clone().add(direction.multiplyScalar(offset));
            this.moveTo(targetPos.x, 0, targetPos.z);
            
            // Store the rock reference for collection after movement
            // Always try to collect after movement, regardless of distance
            setTimeout(() => {
                if (!nearest.isCollected) {
                    if (nearest.collect && nearest.collect()) {
                        this.npc.addRock(1);
                        console.log(`[NPC ${this.npc.id}] Rock collected after movement! NPC now has ${this.npc.getRockCount()} rock(s)`);
                    }
                }
            }, 2000); // Wait 2 seconds for movement
        }
    }
    
    interactWithNearestLamp() {
        console.log(`[NPC ${this.npc.id}] Finding nearest lamp to interact...`);
        const lamps = this.game.lamps || [];
        if (lamps.length === 0) {
            console.log(`[NPC ${this.npc.id}] No lamps available`);
            this.speak("I don't see any lamps nearby.");
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
            
            // If already close enough, toggle directly
            if (minDist < 3.0) {
                console.log(`[NPC ${this.npc.id}] Already close enough, toggling lamp...`);
                nearest.toggle();
                console.log(`[NPC ${this.npc.id}] Lamp toggled`);
                return;
            }
            
            // Move to lamp position (with small offset to avoid collision)
            const offset = 1.5;
            const direction = new THREE.Vector3()
                .subVectors(this.npc.position, nearest.position)
                .normalize();
            
            // If already very close, use a default offset direction
            if (direction.length() < 0.1) {
                direction.set(1, 0, 0);
            }
            
            const targetPos = nearest.position.clone().add(direction.multiplyScalar(offset));
            this.moveTo(targetPos.x, 0, targetPos.z);
            
            // Store the lamp reference for toggling after movement
            // Always try to toggle after movement, regardless of distance
            setTimeout(() => {
                nearest.toggle();
                console.log(`[NPC ${this.npc.id}] Lamp toggled after movement`);
            }, 2000); // Wait 2 seconds for movement
        }
    }
    
    throwRock(targetId) {
        console.log(`[NPC ${this.npc.id}] Attempting to aim and throw rock at target: ${targetId}`);
        
        // Check if NPC has rocks
        if (this.npc.getRockCount() < 1) {
            console.log(`[NPC ${this.npc.id}] Cannot throw rock - no rocks in inventory`);
            this.speak("I don't have any rocks to throw!");
            return;
        }
        
        // Find target position
        let targetPos = null;
        let targetName = '';
        
        if (targetId === 'player' || targetId === 'Player') {
            // Target is the player
            targetPos = this.game.camera.position.clone();
            targetName = 'player';
            console.log(`[NPC ${this.npc.id}] Targeting player at (${targetPos.x.toFixed(2)}, ${targetPos.y.toFixed(2)}, ${targetPos.z.toFixed(2)})`);
        } else {
            // Target is an NPC
            const targetNPCId = parseInt(targetId);
            if (isNaN(targetNPCId)) {
                console.log(`[NPC ${this.npc.id}] Invalid target ID: ${targetId}`);
                this.speak(`I don't know who "${targetId}" is.`);
                return;
            }
            
            // Find the NPC
            const targetNPC = this.game.npcs.find(npc => npc.id === targetNPCId);
            if (!targetNPC) {
                console.log(`[NPC ${this.npc.id}] NPC ${targetNPCId} not found`);
                this.speak(`I can't find NPC ${targetNPCId}.`);
                return;
            }
            
            // Don't throw at self
            if (targetNPCId === this.npc.id) {
                console.log(`[NPC ${this.npc.id}] Cannot throw at self`);
                this.speak("I can't throw at myself!");
                return;
            }
            
            targetPos = targetNPC.position.clone();
            targetPos.y += 1.6; // Aim at NPC head height
            targetName = `NPC ${targetNPCId}`;
            console.log(`[NPC ${this.npc.id}] Targeting ${targetName} at (${targetPos.x.toFixed(2)}, ${targetPos.y.toFixed(2)}, ${targetPos.z.toFixed(2)})`);
        }
        
        // Remove rock from NPC inventory
        if (!this.npc.removeRock(1)) {
            console.log(`[NPC ${this.npc.id}] Failed to remove rock from inventory`);
            return;
        }
        
        // Calculate direction from NPC position to target
        const startPos = this.npc.position.clone();
        startPos.y += 1.6; // Throw from NPC head height
        
        // Calculate direction vector
        const direction = new THREE.Vector3();
        direction.subVectors(targetPos, startPos);
        const distance = direction.length();
        
        if (distance < 0.1) {
            console.log(`[NPC ${this.npc.id}] Target too close, cannot throw`);
            this.npc.addRock(1); // Return rock
            this.speak("The target is too close!");
            return;
        }
        
        direction.normalize();
        const speed = 15;
        
        console.log(`[NPC ${this.npc.id}] Throw details:`, {
            target: targetName,
            startPos: { x: startPos.x.toFixed(2), y: startPos.y.toFixed(2), z: startPos.z.toFixed(2) },
            targetPos: { x: targetPos.x.toFixed(2), y: targetPos.y.toFixed(2), z: targetPos.z.toFixed(2) },
            direction: { x: direction.x.toFixed(2), y: direction.y.toFixed(2), z: direction.z.toFixed(2) },
            speed: speed,
            distance: distance.toFixed(2)
        });
        
        const thrower = { id: this.npc.id, type: 'npc' };
        
        // Throw the rock (checkInventory = false since we already checked NPC inventory)
        const success = this.game.throwRockAt(startPos, direction, speed, thrower, false);
        
        if (success) {
            console.log(`[NPC ${this.npc.id}] Rock thrown successfully at ${targetName}! NPC now has ${this.npc.getRockCount()} rock(s)`);
            console.log(`[NPC ${this.npc.id}] Projectile should be visible in scene`);
        } else {
            console.log(`[NPC ${this.npc.id}] Failed to throw rock - game.throwRockAt returned false`);
            // Return rock to inventory if throw failed
            this.npc.addRock(1);
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

