const { Notification, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * PermissionManager - Handles macOS Full Disk Access permission detection and notification
 */
class PermissionManager {
  constructor(preferencesManager) {
    this.preferencesManager = preferencesManager;
  }

  /**
   * Check if Full Disk Access is granted
   * Attempts to read a protected file to determine permission status
   */
  checkFullDiskAccess() {
    try {
      // Try to access Safari history database (protected file)
      const protectedPath = path.join(os.homedir(), 'Library', 'Safari', 'History.db');
      
      // Attempt to read the file
      fs.accessSync(protectedPath, fs.constants.R_OK);
      return true;
    } catch (error) {
      // If we get EPERM or EACCES, permission is denied
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        return false;
      }
      // If file doesn't exist, try another protected location
      try {
        const altPath = path.join(os.homedir(), 'Library', 'Mail');
        fs.accessSync(altPath, fs.constants.R_OK);
        return true;
      } catch {
        // Assume permission is granted if we can't determine
        return true;
      }
    }
  }

  /**
   * Check if we should show the permission notification
   */
  shouldShowPermissionNotification() {
    // Check if user has dismissed the notification
    const dismissed = this.preferencesManager.get('fullDiskAccessNotificationDismissed');
    if (dismissed) {
      return false;
    }

    // Check if permission is granted
    const hasPermission = this.checkFullDiskAccess();
    return !hasPermission;
  }

  /**
   * Show Full Disk Access permission notification
   */
  showPermissionNotification() {
    const notification = new Notification({
      title: 'PasteBro Needs Full Disk Access',
      body: 'To copy images and files from all apps, please grant Full Disk Access in System Preferences.',
      actions: [
        {
          type: 'button',
          text: 'Open System Preferences'
        },
        {
          type: 'button',
          text: 'Don\'t Show Again'
        }
      ]
    });

    notification.on('action', (event, index) => {
      if (index === 0) {
        // Open System Preferences to Full Disk Access
        this.openSystemPreferences();
      } else if (index === 1) {
        // Don't show again
        this.preferencesManager.update({ fullDiskAccessNotificationDismissed: true });
      }
    });

    notification.on('click', () => {
      this.openSystemPreferences();
    });

    notification.show();
  }

  /**
   * Open System Preferences to Full Disk Access panel
   */
  openSystemPreferences() {
    // macOS Big Sur and later
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles');
  }

  /**
   * Check and show notification if needed
   */
  checkAndNotify() {
    if (this.shouldShowPermissionNotification()) {
      // Delay notification slightly so it doesn't interfere with startup
      setTimeout(() => {
        this.showPermissionNotification();
      }, 2000);
    }
  }
}

module.exports = PermissionManager;
