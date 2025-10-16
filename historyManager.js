const DatabaseManager = require('./database');
const { ClipboardItem } = require('./clipboardItem');

/**
 * HistoryManager - Manages clipboard history operations
 * Coordinates between ClipboardMonitor and DatabaseManager
 */
class HistoryManager {
    constructor(dbPath = null) {
        this.db = new DatabaseManager(dbPath);
        this.db.init();
        this.maxItems = 1000;
        this.retentionDays = 30;
    }

    /**
     * Add new clipboard item to history
     * Handles duplicate detection and storage limits
     */
    async addItem(item) {
        try {
            // Check for duplicate by content hash
            const existingId = this.db.existsByHash(item.contentHash);
            
            if (existingId) {
                // Update timestamp of existing item instead of creating duplicate
                this.db.update(existingId, {
                    timestamp: item.timestamp
                });
                console.log('Updated timestamp for existing item:', existingId);
                return existingId;
            }

            // Insert new item
            const success = this.db.insert(item.toDatabase());
            
            if (success) {
                console.log('Added new clipboard item:', item.id);
                
                // Enforce storage limits
                this.enforceStorageLimits();
                
                return item.id;
            }
            
            return null;
        } catch (error) {
            console.error('Error adding item to history:', error);
            throw error;
        }
    }

    /**
     * Get clipboard items with pagination
     */
    async getItems(options = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                isPinned = null,
                isDeleted = false
            } = options;

            const items = this.db.query({
                limit,
                offset,
                isPinned,
                isDeleted,
                orderBy: 'timestamp',
                orderDirection: 'DESC'
            });

            return items.map(item => ClipboardItem.fromDatabase(item));
        } catch (error) {
            console.error('Error getting items:', error);
            throw error;
        }
    }

    /**
     * Search clipboard items by text content
     */
    async searchItems(query, options = {}) {
        try {
            if (!query || query.trim() === '') {
                return this.getItems(options);
            }

            const items = this.db.search(query, options);
            return items.map(item => ClipboardItem.fromDatabase(item));
        } catch (error) {
            console.error('Error searching items:', error);
            throw error;
        }
    }

    /**
     * Get single item by ID
     */
    async getItemById(id) {
        try {
            const item = this.db.getById(id);
            return item ? ClipboardItem.fromDatabase(item) : null;
        } catch (error) {
            console.error('Error getting item by ID:', error);
            throw error;
        }
    }

    /**
     * Pin an item
     */
    async pinItem(id) {
        try {
            const success = this.db.update(id, { isPinned: true });
            if (success) {
                console.log('Pinned item:', id);
            }
            return success;
        } catch (error) {
            console.error('Error pinning item:', error);
            throw error;
        }
    }

    /**
     * Unpin an item
     */
    async unpinItem(id) {
        try {
            const success = this.db.update(id, { isPinned: false });
            if (success) {
                console.log('Unpinned item:', id);
            }
            return success;
        } catch (error) {
            console.error('Error unpinning item:', error);
            throw error;
        }
    }

    /**
     * Toggle pin status
     */
    async togglePin(id) {
        try {
            const item = await this.getItemById(id);
            if (!item) {
                return false;
            }

            if (item.isPinned) {
                return this.unpinItem(id);
            } else {
                return this.pinItem(id);
            }
        } catch (error) {
            console.error('Error toggling pin:', error);
            throw error;
        }
    }

    /**
     * Move items to trash (soft delete)
     */
    async moveToTrash(ids) {
        try {
            if (!Array.isArray(ids)) {
                ids = [ids];
            }

            let successCount = 0;
            for (const id of ids) {
                const success = this.db.update(id, { isDeleted: true });
                if (success) {
                    successCount++;
                }
            }

            console.log(`Moved ${successCount} items to trash`);
            return successCount;
        } catch (error) {
            console.error('Error moving items to trash:', error);
            throw error;
        }
    }

    /**
     * Restore items from trash
     */
    async restoreFromTrash(ids) {
        try {
            if (!Array.isArray(ids)) {
                ids = [ids];
            }

            let successCount = 0;
            for (const id of ids) {
                const success = this.db.update(id, { isDeleted: false });
                if (success) {
                    successCount++;
                }
            }

            console.log(`Restored ${successCount} items from trash`);
            return successCount;
        } catch (error) {
            console.error('Error restoring items from trash:', error);
            throw error;
        }
    }

    /**
     * Permanently delete items
     */
    async deleteItems(ids) {
        try {
            if (!Array.isArray(ids)) {
                ids = [ids];
            }

            const deletedCount = this.db.delete(ids);
            console.log(`Permanently deleted ${deletedCount} items`);
            return deletedCount;
        } catch (error) {
            console.error('Error deleting items:', error);
            throw error;
        }
    }

    /**
     * Empty trash - permanently delete all trashed items
     */
    async emptyTrash() {
        try {
            const trashedItems = this.db.query({
                isDeleted: true,
                limit: 10000
            });

            const ids = trashedItems.map(item => item.id);
            
            if (ids.length > 0) {
                const deletedCount = this.db.delete(ids);
                console.log(`Emptied trash: ${deletedCount} items deleted`);
                return deletedCount;
            }

            return 0;
        } catch (error) {
            console.error('Error emptying trash:', error);
            throw error;
        }
    }

    /**
     * Clear all history (except pinned items)
     */
    async clearAllHistory() {
        try {
            const items = this.db.query({
                isPinned: false,
                isDeleted: false,
                limit: 10000
            });

            const ids = items.map(item => item.id);
            
            if (ids.length > 0) {
                const deletedCount = this.db.delete(ids);
                console.log(`Cleared history: ${deletedCount} items deleted`);
                return deletedCount;
            }

            return 0;
        } catch (error) {
            console.error('Error clearing history:', error);
            throw error;
        }
    }

    /**
     * Get count of items
     */
    async getCount(options = {}) {
        try {
            return this.db.count(options);
        } catch (error) {
            console.error('Error getting count:', error);
            throw error;
        }
    }

    /**
     * Enforce storage limits
     * Remove oldest non-pinned items if exceeding max items
     */
    enforceStorageLimits() {
        try {
            // Check total count (excluding deleted)
            const totalCount = this.db.count({ isDeleted: false });
            
            if (totalCount > this.maxItems) {
                const excessCount = totalCount - this.maxItems;
                
                // Get oldest non-pinned items
                const oldestItems = this.db.query({
                    isPinned: false,
                    isDeleted: false,
                    limit: excessCount,
                    orderBy: 'timestamp',
                    orderDirection: 'ASC'
                });

                const idsToDelete = oldestItems.map(item => item.id);
                
                if (idsToDelete.length > 0) {
                    this.db.delete(idsToDelete);
                    console.log(`Enforced storage limit: removed ${idsToDelete.length} oldest items`);
                }
            }

            // Enforce retention period
            if (this.retentionDays > 0) {
                const cutoffTimestamp = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
                
                const expiredItems = this.db.query({
                    isPinned: false,
                    isDeleted: false,
                    limit: 10000,
                    orderBy: 'timestamp',
                    orderDirection: 'ASC'
                }).filter(item => item.timestamp < cutoffTimestamp);

                const idsToDelete = expiredItems.map(item => item.id);
                
                if (idsToDelete.length > 0) {
                    this.db.delete(idsToDelete);
                    console.log(`Enforced retention period: removed ${idsToDelete.length} expired items`);
                }
            }
        } catch (error) {
            console.error('Error enforcing storage limits:', error);
        }
    }

    /**
     * Update preferences
     */
    updatePreferences(prefs) {
        if (prefs.maxHistoryItems !== undefined) {
            this.maxItems = prefs.maxHistoryItems;
        }
        if (prefs.retentionDays !== undefined) {
            this.retentionDays = prefs.retentionDays;
        }
        
        // Enforce new limits
        this.enforceStorageLimits();
    }

    /**
     * Close database connection
     */
    close() {
        this.db.close();
    }
}

module.exports = HistoryManager;
