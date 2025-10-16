const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Clipboard operations
  getClipboardHistory: () => ipcRenderer.invoke('get-clipboard-history'),
  copyToClipboard: (item) => ipcRenderer.invoke('copy-to-clipboard', item),
  copyMultipleImages: (paths) => ipcRenderer.invoke('copy-multiple-images', paths),
  deleteItem: (itemId) => ipcRenderer.invoke('delete-item', itemId),
  pinItem: (itemId) => ipcRenderer.invoke('pin-item', itemId),
  searchItems: (query) => ipcRenderer.invoke('search-items', query),
  restoreItem: (itemId) => ipcRenderer.invoke('restore-item', itemId),
  emptyTrash: () => ipcRenderer.invoke('empty-trash'),
  clearAllHistory: () => ipcRenderer.invoke('clear-all-history'),
  
  // Import/Export
  exportHistory: () => ipcRenderer.invoke('export-history'),
  importHistory: (merge) => ipcRenderer.invoke('import-history', merge),
  
  // Window operations
  hideSidebar: () => ipcRenderer.send('hide-sidebar'),
  
  // Preferences
  getPreferences: () => ipcRenderer.invoke('get-preferences'),
  updatePreferences: (prefs) => ipcRenderer.invoke('update-preferences', prefs),
  
  // Event listeners
  onClipboardUpdate: (callback) => {
    ipcRenderer.on('clipboard-updated', (event, item) => callback(item));
  }
});
