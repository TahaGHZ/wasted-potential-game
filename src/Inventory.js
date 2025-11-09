/**
 * Inventory - Manages player inventory
 * LLM-ready for NPC inventory tracking
 */
export class Inventory {
    constructor() {
        this.items = {
            rocks: 0
        };
        
        // Callbacks for inventory changes
        this.onChangeCallbacks = [];
    }
    
    /**
     * Add rocks to inventory
     * @param {number} count - Number of rocks to add
     */
    addRocks(count = 1) {
        this.items.rocks += count;
        this.notifyChange();
        return this.items.rocks;
    }
    
    /**
     * Remove rocks from inventory
     * @param {number} count - Number of rocks to remove
     * @returns {boolean} - True if successful, false if not enough rocks
     */
    removeRocks(count = 1) {
        if (this.items.rocks >= count) {
            this.items.rocks -= count;
            this.notifyChange();
            return true;
        }
        return false;
    }
    
    /**
     * Get number of rocks in inventory
     */
    getRockCount() {
        return this.items.rocks;
    }
    
    /**
     * Check if player has rocks
     */
    hasRocks(count = 1) {
        return this.items.rocks >= count;
    }
    
    /**
     * Get full inventory state
     */
    getState() {
        return {
            ...this.items
        };
    }
    
    /**
     * Register callback for inventory changes
     */
    onChange(callback) {
        this.onChangeCallbacks.push(callback);
    }
    
    /**
     * Notify all callbacks of inventory change
     */
    notifyChange() {
        this.onChangeCallbacks.forEach(callback => {
            if (typeof callback === 'function') {
                callback(this.getState());
            }
        });
    }
}

