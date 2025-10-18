const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Clipboard operations
  getClipboardHistory: () => ipcRenderer.invoke('get-clipboard-history'),
  copyToClipboard: (item) => ipcRenderer.invoke('copy-to-clipboard', item),
  copyMultipleImages: (paths) => ipcRenderer.invoke('copy-multiple-images', paths),
  deleteItem: (itemId) => {
    if (typeof itemId !== 'string') throw new Error('Invalid itemId');
    return ipcRenderer.invoke('delete-item', itemId);
  },
  pinItem: (itemId) => {
    if (typeof itemId !== 'string') throw new Error('Invalid itemId');
    return ipcRenderer.invoke('pin-item', itemId);
  },
  searchItems: (query) => {
    if (typeof query !== 'string') throw new Error('Invalid query');
    return ipcRenderer.invoke('search-items', query);
  },
  restoreItem: (itemId) => {
    if (typeof itemId !== 'string') throw new Error('Invalid itemId');
    return ipcRenderer.invoke('restore-item', itemId);
  },
  emptyTrash: () => ipcRenderer.invoke('empty-trash'),
  clearAllHistory: () => ipcRenderer.invoke('clear-all-history'),
  
  // Import/Export
  exportHistory: () => ipcRenderer.invoke('export-history'),
  importHistory: (merge) => {
    if (typeof merge !== 'boolean') throw new Error('Invalid merge parameter');
    return ipcRenderer.invoke('import-history', merge);
  },
  
  // Window operations
  hideSidebar: () => ipcRenderer.send('hide-sidebar'),
  
  // Preferences
  getPreferences: () => ipcRenderer.invoke('get-preferences'),
  updatePreferences: (prefs) => {
    if (typeof prefs !== 'object' || prefs === null) throw new Error('Invalid preferences');
    return ipcRenderer.invoke('update-preferences', prefs);
  },
  
  // Event listeners
  onClipboardUpdate: (callback) => {
    if (typeof callback !== 'function') throw new Error('Invalid callback');
    ipcRenderer.on('clipboard-updated', (event, item) => callback(item));
  }
});
