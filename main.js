const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, clipboard } = require('electron');
const path = require('path');
const ClipboardMonitor = require('./clipboardMonitor');
const HistoryManager = require('./historyManager');
const PreferencesManager = require('./preferencesManager');
const PermissionManager = require('./permissionManager');
const ImageStorageManager = require('./imageStorageManager');
const { ClipboardItem } = require('./clipboardItem');

class PasteBroApp {
  constructor() {
    this.mainWindow = null;
    this.preferencesWindow = null;
    this.historyViewerWindow = null;
    this.tray = null;
    this.isQuitting = false;
    this.clipboardMonitor = null;
    this.historyManager = null;
    this.preferencesManager = null;
    this.permissionManager = null;
    this.imageStorageManager = null;
  }

  async initialize() {
    const startTime = Date.now();

    // Wait for app to be ready
    await app.whenReady();

    // Hide dock icon (menu bar app only)
    if (process.platform === 'darwin') {
      app.dock.hide();
    }

    // PHASE 1: Immediate - Create tray icon first (< 100ms)
    this.createTray();
    console.log(`Tray created in ${Date.now() - startTime}ms`);

    // PHASE 2: Background - Initialize managers and window (< 500ms)
    await Promise.all([
      this.initializeManagers(),
      this.createMainWindow()
    ]);
    console.log(`Managers and window ready in ${Date.now() - startTime}ms`);

    // PHASE 3: Setup - IPC handlers and shortcuts
    this.setupIpcHandlers();
    this.registerGlobalShortcuts();
    this.setupAppLifecycle();

    // PHASE 4: Start monitoring (< 1000ms)
    this.clipboardMonitor.startMonitoring();
    console.log(`App fully initialized in ${Date.now() - startTime}ms`);

    // PHASE 5: Start background migration checker
    this.startBackgroundMigration();
  }

  startBackgroundMigration() {
    // Check for BLOB images to migrate every 2 seconds
    setInterval(async () => {
      try {
        const items = this.historyManager.db.query({
          limit: 10, // Migrate 10 at a time
          offset: 0
        });

        const blobItems = items.filter(item =>
          item.type === 'image' && item.imageData && !item.imagePath
        );

        if (blobItems.length > 0) {
          console.log(`Background migration: Found ${blobItems.length} BLOB images to migrate`);

          for (const item of blobItems) {
            try {
              const { imagePath, thumbnailPath } = await this.imageStorageManager.saveImage(
                item.imageData,
                item.id
              );

              await this.historyManager.db.update(item.id, {
                image_path: imagePath,
                thumbnail_path: thumbnailPath,
                image_data: null,
                thumbnail_data: null
              });

              console.log(`Migrated image ${item.id} - cleared BLOB data`);
            } catch (error) {
              console.error(`Failed to migrate image ${item.id}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Background migration error:', error);
      }
    }, 2000); // Every 2 seconds
  }

  async initializeManagers() {
    // Initialize preferences (fast, synchronous)
    this.preferencesManager = new PreferencesManager();

    // Initialize permission manager
    this.permissionManager = new PermissionManager(this.preferencesManager);

    // Check and notify about Full Disk Access
    this.permissionManager.checkAndNotify();

    // Initialize image storage manager
    const userDataPath = app.getPath('userData');
    this.imageStorageManager = new ImageStorageManager(userDataPath);
    await this.imageStorageManager.initialize();

    // Initialize history manager (async)
    this.historyManager = new HistoryManager();

    // Update history manager with preferences
    this.historyManager.updatePreferences({
      maxHistoryItems: this.preferencesManager.get('maxHistoryItems'),
      retentionDays: this.preferencesManager.get('retentionDays')
    });

    // Migrate BLOB images to file storage (background)
    setImmediate(() => {
      this.migrateBlobImagesToFiles();
    });

    // Run cleanup in background (non-blocking)
    setImmediate(() => {
      this.historyManager.enforceStorageLimits();
    });

    // Initialize clipboard monitor with image storage
    this.clipboardMonitor = new ClipboardMonitor((item) => {
      this.handleClipboardChange(item);
    }, this.imageStorageManager);
  }

  async migrateBlobImagesToFiles() {
    try {
      console.log('Checking for BLOB images to migrate...');

      // Find items with image_data BLOB
      const items = await this.historyManager.db.query({
        limit: 10000,
        offset: 0
      });

      const blobItems = items.filter(item => item.imageData && !item.imagePath);

      if (blobItems.length === 0) {
        console.log('No BLOB images to migrate');
        return;
      }

      console.log(`Migrating ${blobItems.length} BLOB images to file storage...`);

      let migrated = 0;
      for (const item of blobItems) {
        try {
          // Save to file storage
          const { imagePath, thumbnailPath } = await this.imageStorageManager.saveImage(
            item.imageData,
            item.id
          );

          // Update database
          await this.historyManager.db.update(item.id, {
            image_path: imagePath,
            thumbnail_path: thumbnailPath
          });

          migrated++;

          if (migrated % 10 === 0) {
            console.log(`Migrated ${migrated}/${blobItems.length} images`);
          }
        } catch (error) {
          console.error(`Failed to migrate image ${item.id}:`, error);
        }
      }

      console.log(`Migration complete: ${migrated}/${blobItems.length} images migrated`);
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }

  async handleClipboardChange(item) {
    try {
      // Add item to history (non-blocking)
      this.historyManager.addItem(item).then(itemId => {
        if (itemId && this.mainWindow) {
          // Send lightweight notification without full image data
          const notification = {
            id: item.id,
            type: item.type,
            timestamp: item.timestamp,
            isPinned: item.isPinned,
            plainText: item.plainText,
            sourceApplication: item.sourceApplication
          };
          this.mainWindow.webContents.send('clipboard-updated', notification);
        }
      }).catch(error => {
        console.error('Error adding item to history:', error);
      });
    } catch (error) {
      console.error('Error handling clipboard change:', error);
    }
  }

  setupIpcHandlers() {
    // Get clipboard history
    ipcMain.handle('get-clipboard-history', async () => {
      try {
        const limit = this.preferencesManager.get('sidebarItemLimit') || 100;
        const items = await this.historyManager.getItems({ limit, offset: 0 });

        // Migrate BLOB images to file storage on load
        const fs = require('fs');
        for (const item of items) {
          if (item.type === 'image' && item.imageData && !item.imagePath) {
            try {
              console.log(`Migrating BLOB image ${item.id} to file storage...`);
              const { imagePath, thumbnailPath } = await this.imageStorageManager.saveImage(
                item.imageData,
                item.id
              );

              await this.historyManager.db.update(item.id, {
                image_path: imagePath,
                thumbnail_path: thumbnailPath,
                image_data: null,
                thumbnail_data: null
              });

              item.imagePath = imagePath;
              item.thumbnailPath = thumbnailPath;
              item.imageData = null;
              item.thumbnailData = null;
            } catch (error) {
              console.error(`Failed to migrate image ${item.id}:`, error);
            }
          }
        }

        return items.map(item => item.toDatabase());
      } catch (error) {
        console.error('Error getting clipboard history:', error);
        return [];
      }
    });

    // Copy item to clipboard
    ipcMain.handle('copy-to-clipboard', async (event, item) => {
      try {
        // Pause monitoring to avoid capturing our own copy
        this.clipboardMonitor.pauseMonitoring();

        if (item.type === 'text' || item.type === 'richText') {
          if (item.richText && this.preferencesManager.get('copyWithFormatting')) {
            clipboard.writeHTML(item.richText);
          } else {
            clipboard.writeText(item.plainText || '');
          }
        } else if (item.type === 'image') {
          const { nativeImage } = require('electron');
          const fs = require('fs');

          // ALWAYS migrate BLOB images to file storage when copying
          if (item.imageData && !item.imagePath) {
            console.log('Migrating BLOB image to file storage...');
            try {
              const { imagePath, thumbnailPath } = await this.imageStorageManager.saveImage(
                item.imageData,
                item.id
              );

              // Update database and clear BLOB data
              await this.historyManager.db.update(item.id, {
                image_path: imagePath,
                thumbnail_path: thumbnailPath,
                image_data: null,
                thumbnail_data: null
              });

              item.imagePath = imagePath;
              item.thumbnailPath = thumbnailPath;

              // Clear BLOB data from memory
              item.imageData = null;
              item.imageThumbnail = null;

              console.log('Migration successful:', imagePath);
            } catch (error) {
              console.error('Migration failed:', error);
            }
          }

          // Copy image to clipboard
          if (item.imagePath && fs.existsSync(item.imagePath)) {
            // Load from file storage
            const imageBuffer = fs.readFileSync(item.imagePath);
            const image = nativeImage.createFromBuffer(imageBuffer);
            clipboard.writeImage(image);
          } else if (item.imageData) {
            // Fallback to BLOB data
            const buffer = Buffer.isBuffer(item.imageData)
              ? item.imageData
              : Buffer.from(item.imageData);
            const image = nativeImage.createFromBuffer(buffer);
            clipboard.writeImage(image);
          }
        } else if (item.type === 'multi-file' && item.filePaths) {
          // Copy multiple files to clipboard
          const paths = typeof item.filePaths === 'string'
            ? JSON.parse(item.filePaths)
            : item.filePaths;

          // Write file URLs in macOS format
          const fileUrls = paths.map(p => `file://${p}`).join('\n');
          clipboard.write({
            text: paths.map(p => p.split('/').pop()).join('\n'),
            bookmark: fileUrls
          });
        } else if (item.type === 'file' && item.filePaths) {
          // Copy file paths
          const paths = typeof item.filePaths === 'string'
            ? JSON.parse(item.filePaths)
            : item.filePaths;
          clipboard.writeText(paths.join('\n'));
        }

        // Update timestamp to move item to top (unless it's a multi-item copy)
        if (item.id && !item.skipTimestampUpdate) {
          await this.historyManager.db.update(item.id, {
            timestamp: Date.now()
          });
        }

        // Resume monitoring after a short delay
        setTimeout(() => {
          this.clipboardMonitor.resumeMonitoring();
        }, 100);

        // Auto-hide if preference is set
        if (this.preferencesManager.get('autoHideAfterCopy')) {
          this.mainWindow.hide();
        }

        return true;
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        this.clipboardMonitor.resumeMonitoring();
        return false;
      }
    });

    // Copy multiple images - Creative workaround using file URLs
    ipcMain.handle('copy-multiple-images', async (event, items) => {
      try {
        this.clipboardMonitor.pauseMonitoring();

        const fs = require('fs');
        const filePaths = [];

        // Collect all image file paths
        for (const item of items) {
          if (item.imagePath && fs.existsSync(item.imagePath)) {
            filePaths.push(item.imagePath);
          }
        }

        console.log(`Copying ${filePaths.length} images as file references`);

        if (filePaths.length > 0) {
          // Write file paths to clipboard in macOS format
          // This allows apps to read the files directly
          clipboard.write({
            text: filePaths.join('\n'),
            // Use NSFilenamesPboardType for macOS
            bookmark: filePaths.map(p => `file://${p}`).join('\n')
          });

          // Alternative: Use clipboard.writeBuffer for native file list
          // This is the format Finder uses
          try {
            const fileListBuffer = Buffer.from(filePaths.join('\n'));
            clipboard.writeBuffer('NSFilenamesPboardType', fileListBuffer);
          } catch (e) {
            console.log('NSFilenamesPboardType not available, using bookmark format');
          }
        }

        setTimeout(() => {
          this.clipboardMonitor.resumeMonitoring();
        }, 100);

        if (this.preferencesManager.get('autoHideAfterCopy')) {
          this.mainWindow.hide();
        }

        return true;
      } catch (error) {
        console.error('Error copying multiple images:', error);
        this.clipboardMonitor.resumeMonitoring();
        return false;
      }
    });

    // Delete item
    ipcMain.handle('delete-item', async (event, itemId) => {
      try {
        await this.historyManager.moveToTrash([itemId]);
        return true;
      } catch (error) {
        console.error('Error deleting item:', error);
        return false;
      }
    });

    // Pin/unpin item
    ipcMain.handle('pin-item', async (event, itemId) => {
      try {
        await this.historyManager.togglePin(itemId);
        return true;
      } catch (error) {
        console.error('Error pinning item:', error);
        return false;
      }
    });

    // Search items
    ipcMain.handle('search-items', async (event, query) => {
      try {
        const items = await this.historyManager.searchItems(query, { limit: 50 });
        return items.map(item => item.toDatabase());
      } catch (error) {
        console.error('Error searching items:', error);
        return [];
      }
    });

    // Get preferences
    ipcMain.handle('get-preferences', async () => {
      try {
        return this.preferencesManager.getAll();
      } catch (error) {
        console.error('Error getting preferences:', error);
        return {};
      }
    });

    // Update preferences
    ipcMain.handle('update-preferences', async (event, prefs) => {
      try {
        this.preferencesManager.update(prefs);

        // Update history manager if relevant prefs changed
        if (prefs.maxHistoryItems || prefs.retentionDays) {
          this.historyManager.updatePreferences({
            maxHistoryItems: this.preferencesManager.get('maxHistoryItems'),
            retentionDays: this.preferencesManager.get('retentionDays')
          });
        }

        return true;
      } catch (error) {
        console.error('Error updating preferences:', error);
        return false;
      }
    });

    // Restore from trash
    ipcMain.handle('restore-item', async (event, itemId) => {
      try {
        await this.historyManager.restoreFromTrash([itemId]);
        return true;
      } catch (error) {
        console.error('Error restoring item:', error);
        return false;
      }
    });

    // Empty trash
    ipcMain.handle('empty-trash', async () => {
      try {
        const count = await this.historyManager.emptyTrash();
        return count;
      } catch (error) {
        console.error('Error emptying trash:', error);
        return 0;
      }
    });

    // Clear all history (except pinned)
    ipcMain.handle('clear-all-history', async () => {
      try {
        const count = await this.historyManager.clearAllHistory();
        return count;
      } catch (error) {
        console.error('Error clearing history:', error);
        return 0;
      }
    });

    // Export history
    ipcMain.handle('export-history', async () => {
      try {
        const { dialog } = require('electron');
        const result = await dialog.showSaveDialog({
          title: 'Export Clipboard History',
          defaultPath: `pastebro-export-${Date.now()}.json`,
          filters: [
            { name: 'JSON Files', extensions: ['json'] }
          ]
        });

        if (!result.canceled && result.filePath) {
          const items = await this.historyManager.getItems({ limit: 10000 });
          const exportData = {
            version: 1,
            exportDate: Date.now(),
            items: items.map(item => item.toDatabase())
          };

          const fs = require('fs');
          fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2));
          return { success: true, path: result.filePath };
        }

        return { success: false };
      } catch (error) {
        console.error('Error exporting history:', error);
        return { success: false, error: error.message };
      }
    });

    // Import history
    ipcMain.handle('import-history', async (event, merge = true) => {
      try {
        const { dialog } = require('electron');
        const result = await dialog.showOpenDialog({
          title: 'Import Clipboard History',
          filters: [
            { name: 'JSON Files', extensions: ['json'] }
          ],
          properties: ['openFile']
        });

        if (!result.canceled && result.filePaths.length > 0) {
          const fs = require('fs');
          const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));

          if (!data.items || !Array.isArray(data.items)) {
            throw new Error('Invalid export file format');
          }

          // Clear existing history if not merging
          if (!merge) {
            await this.historyManager.clearAllHistory();
          }

          // Import items
          let importedCount = 0;
          for (const itemData of data.items) {
            try {
              const item = ClipboardItem.fromDatabase(itemData);
              await this.historyManager.addItem(item);
              importedCount++;
            } catch (err) {
              console.error('Error importing item:', err);
            }
          }

          return { success: true, count: importedCount };
        }

        return { success: false };
      } catch (error) {
        console.error('Error importing history:', error);
        return { success: false, error: error.message };
      }
    });

    // Hide sidebar
    ipcMain.on('hide-sidebar', () => {
      this.mainWindow.hide();
    });
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 400,
      height: 800,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      type: 'panel', // Makes it work over fullscreen apps
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    // Make window appear above fullscreen apps (NSWindowCollectionBehaviorFullScreenAuxiliary)
    this.mainWindow.setAlwaysOnTop(true, 'floating');
    this.mainWindow.setVisibleOnAllWorkspaces(true);
    this.mainWindow.setFullScreenable(false);

    // Prevent minimizing to keep it accessible
    this.mainWindow.setMinimizable(false);

    // Load the renderer
    this.mainWindow.loadFile('renderer/index.html');

    // Handle window close
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow.hide();
      }
    });

    // Handle blur (click outside)
    this.mainWindow.on('blur', () => {
      if (!this.mainWindow.webContents.isDevToolsOpened()) {
        this.mainWindow.hide();
      }
    });
  }

  createTray() {
    // Create tray icon
    const iconPath = path.join(__dirname, 'assets', 'tray-icon16.png');
    this.tray = new Tray(iconPath);

    this.tray.setToolTip('PasteBro');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Sidebar',
        click: () => this.toggleSidebar()
      },
      {
        label: 'View All History',
        click: () => this.openHistoryViewer()
      },
      {
        label: 'Preferences',
        click: () => this.openPreferences()
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          this.isQuitting = true;
          app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);

    // Tray icon click removed - use menu or hotkey instead
  }

  registerGlobalShortcuts() {
    // Get hotkey from preferences
    const hotkey = this.preferencesManager.get('globalHotkey') || 'CommandOrControl+L';

    const ret = globalShortcut.register(hotkey, () => {
      this.toggleSidebar();
    });

    if (!ret) {
      console.error('Global shortcut registration failed for:', hotkey);
    } else {
      console.log('Global shortcut registered:', hotkey);
    }
  }

  toggleSidebar() {
    if (this.mainWindow.isVisible()) {
      this.mainWindow.hide();
    } else {
      this.showSidebar();
    }
  }

  showSidebar() {
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Position at right edge
    const windowWidth = 400;
    this.mainWindow.setBounds({
      x: width - windowWidth,
      y: 0,
      width: windowWidth,
      height: height
    });

    this.mainWindow.show();
    this.mainWindow.focus();
  }

  openPreferences() {
    // Create preferences window if it doesn't exist
    if (this.preferencesWindow) {
      this.preferencesWindow.focus();
      return;
    }

    this.preferencesWindow = new BrowserWindow({
      width: 600,
      height: 600,
      title: 'PasteBro Preferences',
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    this.preferencesWindow.loadFile('renderer/preferences.html');

    this.preferencesWindow.on('closed', () => {
      this.preferencesWindow = null;
    });
  }

  openHistoryViewer() {
    // Create history viewer window if it doesn't exist
    if (this.historyViewerWindow) {
      this.historyViewerWindow.focus();
      return;
    }

    this.historyViewerWindow = new BrowserWindow({
      width: 900,
      height: 700,
      title: 'PasteBro - All History',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    this.historyViewerWindow.loadFile('renderer/history.html');

    this.historyViewerWindow.on('closed', () => {
      this.historyViewerWindow = null;
    });
  }

  setupAppLifecycle() {
    // Quit when all windows are closed (except on macOS)
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Unregister shortcuts on quit
    app.on('will-quit', () => {
      globalShortcut.unregisterAll();

      // Stop clipboard monitoring
      if (this.clipboardMonitor) {
        this.clipboardMonitor.stopMonitoring();
      }

      // Close database
      if (this.historyManager) {
        this.historyManager.close();
      }
    });

    // Handle activation (macOS)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }
}

// Create and initialize app
const pasteBroApp = new PasteBroApp();
pasteBroApp.initialize().catch(console.error);
