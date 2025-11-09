/**
 * NPCMemory - Manages long-term memory for NPCs
 * Stores conversation history, action memory, and personality
 */
export class NPCMemory {
    constructor(npcId, personality = null) {
        this.npcId = npcId;
        
        // Initialize memory structure
        this.memory = {
            npcId: npcId,
            personality: personality, // Store full personality object: { name, displayName, backstory, traits, ... }
            conversationHistory: [],
            actionMemory: [],
            // Player interaction tracking
            playerReputation: 0, // Starts neutral (0), can go positive (friendly) or negative (hostile)
            playerInteractions: [], // Track significant player actions: hits, messages with sentiment
            lastUpdated: new Date().toISOString()
        };
        
        // Load existing memory (will preserve personality if already saved)
        this.loadMemory();
        
        // If personality was provided and not in memory, save it
        if (personality && !this.memory.personality) {
            this.setPersonality(personality);
        }
    }
    
    /**
     * Load memory from localStorage
     */
    loadMemory() {
        try {
            const stored = localStorage.getItem(`npc_memory_${this.npcId}`);
            if (stored) {
                console.log(`[Memory NPC ${this.npcId}] Loading memory from localStorage (${stored.length} bytes)`);
                this.memory = JSON.parse(stored);
                
                // Initialize new fields if they don't exist (for backward compatibility)
                if (this.memory.playerReputation === undefined) {
                    this.memory.playerReputation = 0;
                }
                if (!this.memory.playerInteractions) {
                    this.memory.playerInteractions = [];
                }
                
                // Preserve personality if it exists in saved memory
                // (This allows NPCs to remember their identity across sessions)
                
                console.log(`[Memory NPC ${this.npcId}] Memory loaded:`, {
                    conversations: this.memory.conversationHistory?.length || 0,
                    actions: this.memory.actionMemory?.length || 0,
                    playerInteractions: this.memory.playerInteractions?.length || 0,
                    playerReputation: this.memory.playerReputation || 0,
                    hasPersonality: !!this.memory.personality,
                    npcName: this.memory.personality?.name || 'Unknown'
                });
            } else {
                console.log(`[Memory NPC ${this.npcId}] No existing memory found, starting fresh`);
            }
        } catch (error) {
            console.error(`[Memory NPC ${this.npcId}] Error loading memory:`, error);
        }
    }
    
    /**
     * Save memory to localStorage
     */
    saveMemory() {
        try {
            this.memory.lastUpdated = new Date().toISOString();
            const memoryJson = JSON.stringify(this.memory, null, 2);
            localStorage.setItem(`npc_memory_${this.npcId}`, memoryJson);
            console.log(`[Memory NPC ${this.npcId}] Saved to localStorage (${memoryJson.length} bytes)`);
        } catch (error) {
            console.error(`[Memory NPC ${this.npcId}] Error saving memory:`, error);
        }
    }
    
    /**
     * Add conversation entry
     * Only saves player messages with sentiment analysis, not NPC's own messages
     */
    addConversation(role, content, timestamp = null, sentiment = null) {
        // Only save player messages to conversation history (NPC messages are less important)
        if (role === 'user') {
            console.log(`[Memory NPC ${this.npcId}] Adding player conversation: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
            this.memory.conversationHistory.push({
                role: role,
                content: content,
                sentiment: sentiment, // Sentiment analysis result
                timestamp: timestamp || new Date().toISOString()
            });
            
            // Keep only last 20 player conversations (reduced from 50)
            if (this.memory.conversationHistory.length > 20) {
                this.memory.conversationHistory = this.memory.conversationHistory.slice(-20);
            }
            
            console.log(`[Memory NPC ${this.npcId}] Conversation history now has ${this.memory.conversationHistory.length} entries`);
            this.saveMemory();
        } else {
            // NPC messages - only log, don't save to memory (less important)
            console.log(`[Memory NPC ${this.npcId}] NPC message (not saved to memory): "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
        }
    }
    
    /**
     * Add action memory
     * Only saves significant player actions, not NPC's own actions
     */
    addAction(action, details = {}, isPlayerAction = false) {
        // Only save player actions (hits, etc.) - NPC's own actions are less important
        if (isPlayerAction) {
            console.log(`[Memory NPC ${this.npcId}] Adding player action: ${action}`, details);
            this.memory.actionMemory.push({
                action: action,
                details: details,
                timestamp: new Date().toISOString()
            });
            
            // Keep only last 30 player actions (reduced from 100)
            if (this.memory.actionMemory.length > 30) {
                this.memory.actionMemory = this.memory.actionMemory.slice(-30);
            }
            
            console.log(`[Memory NPC ${this.npcId}] Action memory now has ${this.memory.actionMemory.length} entries`);
            this.saveMemory();
        } else {
            // NPC actions - only log, don't save (less important)
            console.log(`[Memory NPC ${this.npcId}] NPC action (not saved): ${action}`);
        }
    }
    
    /**
     * Record player hit (hostile action)
     */
    recordPlayerHit(throwerId) {
        console.log(`[Memory NPC ${this.npcId}] Recording player hit from ${throwerId}`);
        
        // Ensure playerReputation and playerInteractions exist
        if (this.memory.playerReputation === undefined) {
            this.memory.playerReputation = 0;
        }
        if (!this.memory.playerInteractions) {
            this.memory.playerInteractions = [];
        }
        
        // Decrease reputation for hostile action
        this.memory.playerReputation -= 10;
        
        // Add to player interactions
        this.memory.playerInteractions.push({
            type: 'hit',
            throwerId: throwerId,
            impact: 'hostile',
            reputationChange: -10,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 50 player interactions
        if (this.memory.playerInteractions.length > 50) {
            this.memory.playerInteractions = this.memory.playerInteractions.slice(-50);
        }
        
        // Also add to action memory
        this.addAction('player_hit', { throwerId: throwerId }, true);
        
        this.saveMemory();
        console.log(`[Memory NPC ${this.npcId}] Player reputation: ${this.memory.playerReputation}`);
    }
    
    /**
     * Record player message with sentiment
     */
    recordPlayerMessage(message, sentiment) {
        console.log(`[Memory NPC ${this.npcId}] Recording player message with sentiment: ${sentiment.label}`);
        
        // Ensure playerReputation and playerInteractions exist
        if (this.memory.playerReputation === undefined) {
            this.memory.playerReputation = 0;
        }
        if (!this.memory.playerInteractions) {
            this.memory.playerInteractions = [];
        }
        
        // Adjust reputation based on sentiment
        // Positive interactions increase reputation slowly, negative interactions decrease it more quickly
        let reputationChange = 0;
        if (sentiment.label === 'friendly' || sentiment.label === 'positive') {
            reputationChange = 2; // Slow positive change (reduced from 5)
        } else if (sentiment.label === 'hostile' || sentiment.label === 'threatening' || sentiment.label === 'negative') {
            reputationChange = -5; // Faster negative change
        } else if (sentiment.label === 'neutral') {
            reputationChange = 1; // Slight positive for neutral (shows good faith)
        }
        
        this.memory.playerReputation += reputationChange;
        
        // Add to player interactions
        this.memory.playerInteractions.push({
            type: 'message',
            message: message,
            sentiment: sentiment,
            impact: sentiment.label,
            reputationChange: reputationChange,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 50 player interactions
        if (this.memory.playerInteractions.length > 50) {
            this.memory.playerInteractions = this.memory.playerInteractions.slice(-50);
        }
        
        // Add to conversation history with sentiment
        this.addConversation('user', message, null, sentiment);
        
        this.saveMemory();
        console.log(`[Memory NPC ${this.npcId}] Player reputation: ${this.memory.playerReputation} (${reputationChange > 0 ? '+' : ''}${reputationChange})`);
    }
    
    /**
     * Get player reputation
     */
    getPlayerReputation() {
        return this.memory.playerReputation || 0;
    }
    
    /**
     * Get recent player interactions
     */
    getRecentPlayerInteractions(limit = 10) {
        return this.memory.playerInteractions.slice(-limit);
    }
    
    /**
     * Set personality (full personality object with name, displayName, backstory, traits)
     */
    setPersonality(personality) {
        this.memory.personality = personality;
        this.saveMemory();
    }
    
    /**
     * Get personality
     */
    getPersonality() {
        return this.memory.personality;
    }
    
    /**
     * Get full memory context for agent
     */
    getContext() {
        // Ensure all fields exist
        if (this.memory.playerReputation === undefined) {
            this.memory.playerReputation = 0;
        }
        if (!this.memory.playerInteractions) {
            this.memory.playerInteractions = [];
        }
        if (!this.memory.conversationHistory) {
            this.memory.conversationHistory = [];
        }
        if (!this.memory.actionMemory) {
            this.memory.actionMemory = [];
        }
        
        return {
            personality: this.memory.personality,
            playerReputation: this.memory.playerReputation || 0,
            recentPlayerInteractions: (this.memory.playerInteractions || []).slice(-10), // Last 10 player interactions
            recentConversations: (this.memory.conversationHistory || []).slice(-10), // Last 10 player conversations
            recentActions: (this.memory.actionMemory || []).slice(-10), // Last 10 player actions
            totalConversations: (this.memory.conversationHistory || []).length,
            totalActions: (this.memory.actionMemory || []).length,
            totalPlayerInteractions: (this.memory.playerInteractions || []).length
        };
    }
    
    /**
     * Get full memory (for debugging)
     */
    getFullMemory() {
        return this.memory;
    }
}

