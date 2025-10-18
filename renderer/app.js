// Clipboard items state
let clipboardItems = [];
let selectedItems = new Set();
let selectionOrder = []; // Track order of selection
let currentFilter = 'all';

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  // Prevent app crash
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent app crash
  event.preventDefault();
});

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  try {
    setupEventListeners();
    loadClipboardHistory();
    
    // Clear selections when window becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        clearSelections();
      }
    });
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
});

function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', debounce(handleSearch, 300));
  
  // Filter tabs
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => handleFilterChange(tab));
  });
  
  // Delete all button
  const deleteAllBtn = document.getElementById('delete-all-btn');
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', handleDeleteAll);
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyDown);
  
  // Listen for clipboard updates from main process
  if (window.electronAPI) {
    window.electronAPI.onClipboardUpdate((item) => {
      clipboardItems.unshift(item);
      // Limit array size to prevent memory growth
      if (clipboardItems.length > 1000) {
        clipboardItems = clipboardItems.slice(0, 1000);
      }
      renderItems();
    });
  }
}

function handleKeyDown(event) {
  // Escape to hide sidebar
  if (event.key === 'Escape') {
    clearSelections();
    window.electronAPI?.hideSidebar();
  }
  
  // Cmd+A to select all
  if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
    event.preventDefault();
    selectAll();
  }
  
  // Cmd+C to copy selected items
  if ((event.metaKey || event.ctrlKey) && event.key === 'c') {
    if (selectedItems.size > 0 && !event.target.matches('input')) {
      event.preventDefault();
      copySelectedItems();
    }
  }
  
  // Delete key
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (selectedItems.size > 0 && !event.target.matches('input')) {
      event.preventDefault();
      deleteSelectedItems();
    }
  }
}

function clearSelections() {
  selectedItems.clear();
  selectionOrder = [];
  lastSelectedIndex = -1;
  renderItems();
}

async function copySelectedItems() {
  if (selectedItems.size === 0) return;
  
  // Get items in selection order (not display order)
  const itemsToCopy = selectionOrder
    .map(id => clipboardItems.find(item => item.id === id))
    .filter(item => item); // Remove any undefined items
  
  console.log('Selection order:', selectionOrder);
  console.log('Items to copy:', itemsToCopy.map(i => i.id));
  
  if (itemsToCopy.length === 1) {
    // Single item - copy as-is
    await copyItem(itemsToCopy[0].id);
  } else {
    // Check if all items are images
    const allImages = itemsToCopy.every(item => item.type === 'image');
    
    if (allImages) {
      // Multiple images - pass the full items so main process can load from storage
      if (window.electronAPI) {
        await window.electronAPI.copyMultipleImages(itemsToCopy);
      }
    } else {
      // Mixed content - concatenate text
      const content = itemsToCopy
        .map(item => {
          if (item.type === 'text' || item.type === 'richText') {
            return item.plainText || '';
          } else if (item.type === 'image') {
            return item.plainText || '';
          } else if (item.type === 'file') {
            const paths = typeof item.filePaths === 'string' ? JSON.parse(item.filePaths) : item.filePaths;
            return paths ? paths.join('\n') : '';
          }
          return '';
        })
        .filter(text => text)
        .join('\n');
      
      if (window.electronAPI && content) {
        await window.electronAPI.copyToClipboard({
          type: 'text',
          plainText: content,
          skipTimestampUpdate: true
        });
      }
    }
    
    // Visual feedback for all selected (keep selection)
    selectedItems.forEach(id => {
      const element = document.querySelector(`[data-id="${id}"]`);
      if (element) {
        const originalBg = element.style.background;
        element.style.background = '#4CAF50';
        setTimeout(() => {
          element.style.background = originalBg;
        }, 200);
      }
    });
    
    // Don't reload - keep items in place
  }
}

async function loadClipboardHistory() {
  // Clear selection when loading
  selectedItems.clear();
  lastSelectedIndex = -1;
  
  if (window.electronAPI) {
    try {
      clipboardItems = await window.electronAPI.getClipboardHistory();
      renderItems();
      
      // Reset scroll to top
      const container = document.getElementById('items-container');
      if (container) {
        container.scrollTop = 0;
      }
    } catch (error) {
      console.error('Failed to load clipboard history:', error);
    }
  } else {
    // Mock data for testing
    clipboardItems = [
      {
        id: '1',
        type: 'text',
        plainText: 'Sample clipboard item 1',
        timestamp: Date.now() - 1000,
        isPinned: false
      },
      {
        id: '2',
        type: 'text',
        plainText: 'Sample clipboard item 2',
        timestamp: Date.now() - 2000,
        isPinned: false
      }
    ];
    renderItems();
  }
}

function handleSearch(event) {
  const query = event.target.value.toLowerCase();
  renderItems(query);
}

function handleFilterChange(tab) {
  // Update active tab
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  
  currentFilter = tab.dataset.filter;
  renderItems();
}

function renderItems(searchQuery = '') {
  const container = document.getElementById('items-container');
  
  // Filter items
  let filteredItems = clipboardItems.filter(item => {
    // Apply filter
    if (currentFilter === 'pinned' && !item.isPinned) return false;
    if (currentFilter === 'trash' && !item.isDeleted) return false;
    if (currentFilter === 'all' && item.isDeleted) return false;
    
    // Apply search
    if (searchQuery && item.plainText) {
      return item.plainText.toLowerCase().includes(searchQuery);
    }
    
    return true;
  });
  
  // Sort: pinned items first, then by timestamp
  filteredItems.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.timestamp - a.timestamp;
  });
  
  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = filteredItems.map(item => createItemHTML(item)).join('');
  
  while (tempDiv.firstChild) {
    fragment.appendChild(tempDiv.firstChild);
  }
  
  // Clear and append in one operation
  container.innerHTML = '';
  container.appendChild(fragment);
  
  // Attach event listeners
  container.querySelectorAll('.clipboard-item').forEach(el => {
    el.addEventListener('click', (e) => handleItemClick(e, el.dataset.id));
    
    // Right-click context menu
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, el.dataset.id);
    });
    
    // Double-click to copy
    el.addEventListener('dblclick', (e) => {
      e.preventDefault();
      copyItem(el.dataset.id);
    });
    
    const copyBtn = el.querySelector('.action-btn.copy');
    const pinBtn = el.querySelector('.action-btn.pin');
    const deleteBtn = el.querySelector('.action-btn.delete');
    const restoreBtn = el.querySelector('.action-btn.restore');
    
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyItem(el.dataset.id);
      });
    }
    
    if (pinBtn) {
      pinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePin(el.dataset.id);
      });
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentFilter === 'trash') {
          permanentlyDeleteItem(el.dataset.id);
        } else {
          deleteItem(el.dataset.id);
        }
      });
    }
    
    if (restoreBtn) {
      restoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        restoreItem(el.dataset.id);
      });
    }
  });
}

function createItemHTML(item) {
  const isSelected = selectedItems.has(item.id);
  const preview = getItemPreview(item);
  const timestamp = formatTimestamp(item.timestamp);
  
  // Different actions for trash view
  if (currentFilter === 'trash') {
    return `
      <div class="clipboard-item ${isSelected ? 'selected' : ''}" data-id="${item.id}">
        <div class="item-content">${preview}</div>
        <div class="item-footer">
          <span class="timestamp">${timestamp}</span>
          <div class="item-actions">
            <button class="action-btn restore">Restore</button>
            <button class="action-btn delete">Delete Forever</button>
          </div>
        </div>
      </div>
    `;
  }
  
  const sourceApp = item.sourceApplication ? `<span class="source-app">from ${escapeHtml(item.sourceApplication)}</span>` : '';
  
  return `
    <div class="clipboard-item ${isSelected ? 'selected' : ''}" data-id="${item.id}">
      <div class="item-content">${preview}</div>
      <div class="item-footer">
        <div class="item-meta">
          <span class="timestamp">${timestamp}</span>
          ${sourceApp}
        </div>
        <div class="item-actions">
          <button class="action-btn copy">Copy</button>
          <button class="action-btn pin">${item.isPinned ? 'Unpin' : 'Pin'}</button>
          <button class="action-btn delete">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function getItemPreview(item) {
  if (item.type === 'text' || item.type === 'richText') {
    if (item.plainText) {
      // Limit preview length to prevent DOM bloat
      const preview = item.plainText.substring(0, 200);
      return escapeHtml(preview);
    }
  } else if (item.type === 'image') {
    // Show actual image thumbnail with lazy loading
    if (item.thumbnailPath) {
      // Use thumbnail from file storage with lazy loading
      return `<img src="file://${item.thumbnailPath}" loading="lazy" style="max-width: 100%; max-height: 120px; border-radius: 4px;" alt="Image">`;
    } else if (item.imagePath) {
      // Use full image if no thumbnail with lazy loading
      return `<img src="file://${item.imagePath}" loading="lazy" style="max-width: 100%; max-height: 120px; border-radius: 4px;" alt="Image">`;
    } else if (item.plainText) {
      const fileName = item.plainText.split('/').pop();
      return `🖼️ ${escapeHtml(fileName)}`;
    }
    return '🖼️ Image';
  } else if (item.type === 'multi-file') {
    // Multi-file display
    const fileCount = item.fileCount || (item.filePaths ? item.filePaths.length : 0);
    const label = item.isAllImages ? `${fileCount} images` : `${fileCount} files`;
    
    // If all images, show thumbnail grid
    if (item.isAllImages && item.filePaths) {
      const paths = typeof item.filePaths === 'string' ? JSON.parse(item.filePaths) : item.filePaths;
      const displayCount = Math.min(4, paths.length);
      const remaining = paths.length - displayCount;
      
      let thumbnailsHTML = '<div class="thumbnail-grid">';
      for (let i = 0; i < displayCount; i++) {
        const fileName = paths[i].split('/').pop();
        thumbnailsHTML += `<div class="thumbnail-placeholder" title="${escapeHtml(fileName)}">🖼️</div>`;
      }
      thumbnailsHTML += '</div>';
      
      if (remaining > 0) {
        thumbnailsHTML += `<div class="more-indicator">+${remaining} more</div>`;
      }
      
      return `<div class="multi-file-header">${label}</div>${thumbnailsHTML}`;
    }
    
    return `📦 ${label}`;
  } else if (item.type === 'file') {
    if (item.filePaths) {
      const paths = typeof item.filePaths === 'string' ? JSON.parse(item.filePaths) : item.filePaths;
      const fileName = paths[0].split('/').pop();
      
      // Get file extension for better description
      const ext = fileName.includes('.') ? fileName.split('.').pop().toUpperCase() : '';
      const fileType = ext ? `${ext} file` : 'File';
      
      const count = paths.length > 1 ? ` +${paths.length - 1} more` : '';
      return `📄 <strong>${escapeHtml(fileName)}</strong><br><span style="font-size: 11px; color: #666;">${fileType}${count}</span>`;
    }
    return '📄 File';
  } else if (item.type === 'color') {
    return `<div class="color-swatch" style="background-color: ${item.colorValue}"></div> ${item.colorValue}`;
  }
  return 'Clipboard item';
}

function arrayBufferToBase64(buffer) {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function formatTimestamp(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

let lastSelectedIndex = -1;

function handleItemClick(event, itemId) {
  const currentIndex = clipboardItems.findIndex(i => i.id === itemId);
  
  if (event.shiftKey && lastSelectedIndex !== -1) {
    // Range selection with Shift - add in visual order (top to bottom or bottom to top)
    const start = Math.min(lastSelectedIndex, currentIndex);
    const end = Math.max(lastSelectedIndex, currentIndex);
    
    // Determine direction: if clicking down, add forward; if clicking up, add backward
    const isClickingDown = currentIndex > lastSelectedIndex;
    
    if (isClickingDown) {
      // Clicking down: add from start to end
      for (let i = start; i <= end; i++) {
        if (!clipboardItems[i].isDeleted && !selectedItems.has(clipboardItems[i].id)) {
          selectedItems.add(clipboardItems[i].id);
          selectionOrder.push(clipboardItems[i].id);
        }
      }
    } else {
      // Clicking up: add from end to start (reverse)
      for (let i = end; i >= start; i--) {
        if (!clipboardItems[i].isDeleted && !selectedItems.has(clipboardItems[i].id)) {
          selectedItems.add(clipboardItems[i].id);
          selectionOrder.push(clipboardItems[i].id);
        }
      }
    }
    
    // Update last selected to current
    lastSelectedIndex = currentIndex;
  } else if (event.metaKey || event.ctrlKey) {
    // Toggle individual selection with Cmd/Ctrl
    if (selectedItems.has(itemId)) {
      selectedItems.delete(itemId);
      selectionOrder = selectionOrder.filter(id => id !== itemId);
    } else {
      selectedItems.add(itemId);
      selectionOrder.push(itemId);
    }
    lastSelectedIndex = currentIndex;
  } else {
    // Single click - select only
    selectedItems.clear();
    selectionOrder = [];
    selectedItems.add(itemId);
    selectionOrder.push(itemId);
    lastSelectedIndex = currentIndex;
  }
  
  renderItems();
}

function selectAll() {
  selectionOrder = [];
  clipboardItems.forEach(item => {
    if (!item.isDeleted) {
      selectedItems.add(item.id);
      selectionOrder.push(item.id);
    }
  });
  renderItems();
}

async function copyItem(itemId) {
  // Single item copy
  const item = clipboardItems.find(i => i.id === itemId);
  if (!item) {
    console.error('Item not found:', itemId);
    return;
  }
  
  try {
    if (window.electronAPI) {
      const success = await window.electronAPI.copyToClipboard(item);
      
      if (success) {
        // Visual feedback - green flash
        const element = document.querySelector(`[data-id="${itemId}"]`);
        if (element) {
          const originalBg = element.style.background;
          element.style.background = '#4CAF50';
          element.style.transition = 'background 0.2s';
          setTimeout(() => {
            element.style.background = originalBg;
          }, 200);
        }
      }
    }
  } catch (error) {
    console.error('Failed to copy item:', error);
  }
}

async function togglePin(itemId) {
  if (window.electronAPI) {
    const success = await window.electronAPI.pinItem(itemId);
    if (success) {
      const item = clipboardItems.find(i => i.id === itemId);
      if (item) {
        item.isPinned = !item.isPinned;
        renderItems();
      }
    }
  } else {
    const item = clipboardItems.find(i => i.id === itemId);
    if (item) {
      item.isPinned = !item.isPinned;
      renderItems();
    }
  }
}

async function deleteItem(itemId) {
  if (window.electronAPI) {
    await window.electronAPI.deleteItem(itemId);
  }
  
  const item = clipboardItems.find(i => i.id === itemId);
  if (item) {
    item.isDeleted = true;
    renderItems();
  }
}

async function deleteSelectedItems() {
  for (const itemId of selectedItems) {
    await deleteItem(itemId);
  }
  selectedItems.clear();
}

async function restoreItem(itemId) {
  if (window.electronAPI) {
    const success = await window.electronAPI.restoreItem(itemId);
    if (success) {
      const item = clipboardItems.find(i => i.id === itemId);
      if (item) {
        item.isDeleted = false;
        renderItems();
      }
    }
  }
}

async function permanentlyDeleteItem(itemId) {
  if (window.electronAPI) {
    // Remove from local array
    clipboardItems = clipboardItems.filter(i => i.id !== itemId);
    renderItems();
  }
}

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function handleDeleteAll() {
  if (!confirm('Delete all non-pinned items permanently? This cannot be undone.')) {
    return;
  }
  
  if (window.electronAPI) {
    await window.electronAPI.clearAllHistory();
    // Remove non-pinned items from local array
    clipboardItems = clipboardItems.filter(item => item.isPinned);
    renderItems();
  }
}

function showContextMenu(event, itemId) {
  const item = clipboardItems.find(i => i.id === itemId);
  if (!item) return;
  
  // Remove existing context menu
  const existingMenu = document.querySelector('.context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  // Create context menu
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = event.pageX + 'px';
  menu.style.top = event.pageY + 'px';
  
  const menuItems = [];
  
  if (currentFilter !== 'trash') {
    menuItems.push(
      { label: 'Copy', action: () => copyItem(itemId) },
      { label: 'Copy as Plain Text', action: () => copyAsPlainText(itemId) },
      { label: item.isPinned ? 'Unpin' : 'Pin', action: () => togglePin(itemId) },
      { label: 'Delete', action: () => deleteItem(itemId) }
    );
  } else {
    menuItems.push(
      { label: 'Restore', action: () => restoreItem(itemId) },
      { label: 'Delete Forever', action: () => permanentlyDeleteItem(itemId) }
    );
  }
  
  menuItems.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.className = 'context-menu-item';
    menuItem.textContent = item.label;
    menuItem.addEventListener('click', () => {
      item.action();
      menu.remove();
    });
    menu.appendChild(menuItem);
  });
  
  document.body.appendChild(menu);
  
  // Close menu on click outside or escape
  const closeMenu = () => {
    if (menu.parentNode) {
      menu.remove();
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', closeMenu, { once: true });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    }, { once: true });
  }, 0);
}

async function copyAsPlainText(itemId) {
  const item = clipboardItems.find(i => i.id === itemId);
  if (!item || !item.plainText) return;
  
  if (window.electronAPI) {
    await window.electronAPI.copyToClipboard({
      type: 'text',
      plainText: item.plainText
    });
  }
  
  // Visual feedback
  const element = document.querySelector(`[data-id="${itemId}"]`);
  if (element) {
    element.style.background = '#4CAF50';
    setTimeout(() => {
      element.style.background = '';
    }, 200);
  }
}

function showPreview(itemId) {
  const item = clipboardItems.find(i => i.id === itemId);
  if (!item) return;
  
  // Remove existing preview
  const existingPreview = document.querySelector('.preview-modal');
  if (existingPreview) {
    existingPreview.remove();
  }
  
  // Create preview modal
  const modal = document.createElement('div');
  modal.className = 'preview-modal';
  
  const content = document.createElement('div');
  content.className = 'preview-content';
  
  if (item.type === 'text' || item.type === 'richText') {
    content.innerHTML = `<pre>${escapeHtml(item.plainText || '')}</pre>`;
  } else if (item.type === 'image' && item.imageData) {
    const base64 = arrayBufferToBase64(item.imageData);
    content.innerHTML = `<img src="data:image/png;base64,${base64}" style="max-width: 100%; max-height: 80vh;" />`;
  } else {
    content.textContent = 'Preview not available';
  }
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Close on click
  modal.addEventListener('click', () => modal.remove());
}
