// Load preferences on startup
document.addEventListener('DOMContentLoaded', async () => {
  if (window.electronAPI) {
    const prefs = await window.electronAPI.getPreferences();
    
    document.getElementById('globalHotkey').value = prefs.globalHotkey || 'Command+L';
    document.getElementById('sidebarItemLimit').value = prefs.sidebarItemLimit || 100;
    document.getElementById('saveImages').checked = prefs.saveImages === true; // Default false
    document.getElementById('maxHistoryItems').value = prefs.maxHistoryItems || 1000;
    document.getElementById('retentionDays').value = prefs.retentionDays || 30;
    document.getElementById('autoHideAfterCopy').checked = prefs.autoHideAfterCopy || false;
    document.getElementById('copyWithFormatting').checked = prefs.copyWithFormatting || false;
    document.getElementById('launchAtLogin').checked = prefs.launchAtLogin || false;
  }

  // Save button
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const prefs = {
      globalHotkey: document.getElementById('globalHotkey').value,
      sidebarItemLimit: parseInt(document.getElementById('sidebarItemLimit').value),
      saveImages: document.getElementById('saveImages').checked,
      maxHistoryItems: parseInt(document.getElementById('maxHistoryItems').value),
      retentionDays: parseInt(document.getElementById('retentionDays').value),
      autoHideAfterCopy: document.getElementById('autoHideAfterCopy').checked,
      copyWithFormatting: document.getElementById('copyWithFormatting').checked,
      launchAtLogin: document.getElementById('launchAtLogin').checked
    };

    if (window.electronAPI) {
      await window.electronAPI.updatePreferences(prefs);
      alert('Preferences saved! Restart the app for hotkey changes to take effect.');
    }
  });

  // Export button
  document.getElementById('exportBtn').addEventListener('click', async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.exportHistory();
      if (result.success) {
        alert(`History exported successfully to:\n${result.path}`);
      } else {
        alert('Export cancelled or failed');
      }
    }
  });

  // Import (merge) button
  document.getElementById('importBtn').addEventListener('click', async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.importHistory(true);
      if (result.success) {
        alert(`Successfully imported ${result.count} items!`);
      } else {
        alert('Import cancelled or failed');
      }
    }
  });

  // Import (replace) button
  document.getElementById('importReplaceBtn').addEventListener('click', async () => {
    if (!confirm('This will delete all existing history and replace it with imported data. Continue?')) {
      return;
    }
    
    if (window.electronAPI) {
      const result = await window.electronAPI.importHistory(false);
      if (result.success) {
        alert(`Successfully imported ${result.count} items!`);
      } else {
        alert('Import cancelled or failed');
      }
    }
  });
});
