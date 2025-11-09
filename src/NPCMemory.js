/**
 * NPCMemory - Manages long-term memory for NPCs
 * Stores conversation history, action memory, and personality
 */
export class NPCMemory {
    constructor(npcId) {
        this.npcId = npcId;
        
        // Initialize memory structure
        this.memory = {
            npcId: npcId,
            personality: null, // Will store full personality object: { name, displayName, backstory, traits, ... }
            conversationHistory: [],
            actionMemory: [],
            lastUpdated: new Date().toISOString()
        };
        
        // Load existing memory
        this.loadMemory();
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
                console.log(`[Memory NPC ${this.npcId}] Memory loaded:`, {
                    conversations: this.memory.conversationHistory.length,
                    actions: this.memory.actionMemory.length,
                    hasPersonality: !!this.memory.personality
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
     */
    addConversation(role, content, timestamp = null) {
        console.log(`[Memory NPC ${this.npcId}] Adding conversation: ${role} - "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
        this.memory.conversationHistory.push({
            role: role, // 'user' or 'assistant'
            content: content,
            timestamp: timestamp || new Date().toISOString()
        });
        
        // Keep only last 50 conversations
        if (this.memory.conversationHistory.length > 50) {
            this.memory.conversationHistory = this.memory.conversationHistory.slice(-50);
        }
        
        console.log(`[Memory NPC ${this.npcId}] Conversation history now has ${this.memory.conversationHistory.length} entries`);
        this.saveMemory();
    }
    
    /**
     * Add action memory
     */
    addAction(action, details = {}) {
        console.log(`[Memory NPC ${this.npcId}] Adding action: ${action}`, details);
        this.memory.actionMemory.push({
            action: action,
            details: details,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 actions
        if (this.memory.actionMemory.length > 100) {
            this.memory.actionMemory = this.memory.actionMemory.slice(-100);
        }
        
        console.log(`[Memory NPC ${this.npcId}] Action memory now has ${this.memory.actionMemory.length} entries`);
        this.saveMemory();
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
        return {
            personality: this.memory.personality,
            recentConversations: this.memory.conversationHistory.slice(-10), // Last 10 conversations
            recentActions: this.memory.actionMemory.slice(-20), // Last 20 actions
            totalConversations: this.memory.conversationHistory.length,
            totalActions: this.memory.actionMemory.length
        };
    }
    
    /**
     * Get full memory (for debugging)
     */
    getFullMemory() {
        return this.memory;
    }
}

