const { app } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * PreferencesManager - Manages user preferences with file-based persistence
 */
class PreferencesManager {
    constructor() {
        this.prefsPath = path.join(app.getPath('userData'), 'preferences.json');
        
        this.defaults = {
            globalHotkey: 'Command+L',
            copyWithFormatting: true,
            pasteWithFormatting: true,
            autoHideAfterCopy: true,
            sidebarPosition: 'right',
            sidebarWidth: 400,
            sidebarItemLimit: 100,
            maxHistoryItems: 1000,
            retentionDays: 30,
            launchAtLogin: false,
            excludedApplications: [],
            ignorePasswords: false,
            enableSoundEffects: false,
            theme: 'system', // system, light, dark
            saveImages: false // Enable/disable image storage (default: disabled to save space)
        };

        this.preferences = this.load();
    }

    /**
     * Get all preferences
     */
    getAll() {
        return { ...this.preferences };
    }

    /**
     * Get single preference value
     */
    get(key) {
        return this.preferences[key];
    }

    /**
     * Update preferences
     */
    update(updates) {
        try {
            // Validate and merge updates
            const validatedUpdates = this.validateUpdates(updates);
            
            this.preferences = {
                ...this.preferences,
                ...validatedUpdates
            };

            this.save();
            console.log('Preferences updated:', Object.keys(validatedUpdates));
            
            return true;
        } catch (error) {
            console.error('Error updating preferences:', error);
            return false;
        }
    }

    /**
     * Reset to default values
     */
    resetToDefaults() {
        try {
            this.preferences = { ...this.defaults };
            this.save();
            console.log('Preferences reset to defaults');
            return true;
        } catch (error) {
            console.error('Error resetting preferences:', error);
            return false;
        }
    }

    /**
     * Save preferences to file
     */
    save() {
        try {
            const data = JSON.stringify(this.preferences, null, 2);
            fs.writeFileSync(this.prefsPath, data, 'utf8');
            return true;
        } catch (error) {
            console.error('Error saving preferences:', error);
            throw error;
        }
    }

    /**
     * Load preferences from file
     */
    load() {
        try {
            if (fs.existsSync(this.prefsPath)) {
                const data = fs.readFileSync(this.prefsPath, 'utf8');
                const loaded = JSON.parse(data);
                
                // Merge with defaults to ensure all keys exist
                return {
                    ...this.defaults,
                    ...loaded
                };
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        }

        // Return defaults if file doesn't exist or error occurred
        return { ...this.defaults };
    }

    /**
     * Validate preference updates
     */
    validateUpdates(updates) {
        const validated = {};

        for (const [key, value] of Object.entries(updates)) {
            // Only allow known preference keys
            if (!(key in this.defaults)) {
                console.warn(`Unknown preference key: ${key}`);
                continue;
            }

            // Validate specific preferences
            switch (key) {
                case 'sidebarWidth':
                    validated[key] = Math.max(300, Math.min(800, value));
                    break;

                case 'maxHistoryItems':
                    validated[key] = Math.max(100, Math.min(10000, value));
                    break;

                case 'sidebarItemLimit':
                    validated[key] = Math.max(10, Math.min(500, value));
                    break;

                case 'retentionDays':
                    validated[key] = Math.max(1, Math.min(365, value));
                    break;

                case 'sidebarPosition':
                    validated[key] = ['left', 'right'].includes(value) ? value : 'right';
                    break;

                case 'theme':
                    validated[key] = ['system', 'light', 'dark'].includes(value) ? value : 'system';
                    break;

                case 'excludedApplications':
                    validated[key] = Array.isArray(value) ? value : [];
                    break;

                case 'globalHotkey':
                    // Basic validation for hotkey format
                    if (typeof value === 'string' && value.length > 0) {
                        validated[key] = value;
                    }
                    break;

                default:
                    // For boolean and other simple types, just copy
                    validated[key] = value;
            }
        }

        return validated;
    }

    /**
     * Add application to exclusion list
     */
    addExcludedApplication(appName) {
        const excluded = this.preferences.excludedApplications;
        if (!excluded.includes(appName)) {
            excluded.push(appName);
            this.update({ excludedApplications: excluded });
        }
    }

    /**
     * Remove application from exclusion list
     */
    removeExcludedApplication(appName) {
        const excluded = this.preferences.excludedApplications.filter(
            name => name !== appName
        );
        this.update({ excludedApplications: excluded });
    }

    /**
     * Check if application is excluded
     */
    isApplicationExcluded(appName) {
        return this.preferences.excludedApplications.includes(appName);
    }

    /**
     * Export preferences to file
     */
    exportToFile(filePath) {
        try {
            const data = JSON.stringify(this.preferences, null, 2);
            fs.writeFileSync(filePath, data, 'utf8');
            console.log('Preferences exported to:', filePath);
            return true;
        } catch (error) {
            console.error('Error exporting preferences:', error);
            return false;
        }
    }

    /**
     * Import preferences from file
     */
    importFromFile(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error('File does not exist');
            }

            const data = fs.readFileSync(filePath, 'utf8');
            const imported = JSON.parse(data);
            
            // Validate and update
            this.update(imported);
            
            console.log('Preferences imported from:', filePath);
            return true;
        } catch (error) {
            console.error('Error importing preferences:', error);
            return false;
        }
    }
}

module.exports = PreferencesManager;
