let allItems = [];
let displayedItems = [];
let currentOffset = 0;
const batchSize = 50;
let isLoading = false;
let searchQuery = '';
let selectedItems = new Set();
let lastSelectedIndex = -1;

document.addEventListener('DOMContentLoaded', () => {
  loadInitialItems();
  setupInfiniteScroll();
  setupSearch();
  setupKeyboardShortcuts();
});

async function loadInitialItems() {
  if (window.electronAPI) {
    try {
      // Load only first batch without full image data
      const items = await window.electronAPI.getClipboardHistory();
      // Remove image data to reduce memory
      allItems = items.map(item => {
        if (item.type === 'image' && item.imageData) {
          // Keep only a flag that it's an image, not the full data
          return { ...item, imageData: null, hasImage: true };
        }
        return item;
      });
      displayedItems = allItems.slice(0, batchSize);
      currentOffset = batchSize;
      renderItems();
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Cmd+A to select all
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      e.preventDefault();
      selectAll();
    }
    
    // Cmd+C to copy selected
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      if (selectedItems.size > 0) {
        e.preventDefault();
        copySelectedItems();
      }
    }
  });
}

function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value.toLowerCase();
    filterItems();
  }, 300));
}

function filterItems() {
  if (!searchQuery) {
    displayedItems = allItems;
  } else {
    displayedItems = allItems.filter(item => {
      if (item.plainText) {
        return item.plainText.toLowerCase().includes(searchQuery);
      }
      return false;
    });
  }
  renderItems();
}

function setupInfiniteScroll() {
  window.addEventListener('scroll', () => {
    if (isLoading) return;
    
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = document.documentElement.scrollTop;
    const clientHeight = document.documentElement.clientHeight;
    
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadMoreItems();
    }
  });
}

async function loadMoreItems() {
  if (isLoading || currentOffset >= allItems.length) return;
  
  isLoading = true;
  document.getElementById('loading').style.display = 'block';
  
  // Load next batch
  const nextBatch = allItems.slice(currentOffset, currentOffset + batchSize);
  displayedItems = [...displayedItems, ...nextBatch];
  currentOffset += batchSize;
  
  renderItems();
  
  isLoading = false;
  document.getElementById('loading').style.display = 'none';
}

function renderItems() {
  const grid = document.getElementById('historyGrid');
  
  grid.innerHTML = displayedItems.map(item => {
    const preview = getItemPreview(item);
    const timestamp = formatTimestamp(item.timestamp);
    const type = item.type || 'text';
    const isSelected = selectedItems.has(item.id);
    
    return `
      <div class="history-item ${isSelected ? 'selected' : ''}" data-id="${item.id}">
        <div class="item-preview">${preview}</div>
        <div class="item-meta">
          <span>${type}</span>
          <span>${timestamp}</span>
        </div>
      </div>
    `;
  }).join('');
  
  // Add click handlers
  grid.querySelectorAll('.history-item').forEach((el, index) => {
    el.addEventListener('click', (e) => handleItemClick(e, el.dataset.id, index));
    el.addEventListener('dblclick', (e) => {
      e.preventDefault();
      copyItem(el.dataset.id);
    });
  });
}

function handleItemClick(event, itemId, index) {
  if (event.shiftKey && lastSelectedIndex !== -1) {
    // Range selection with Shift
    const start = Math.min(lastSelectedIndex, index);
    const end = Math.max(lastSelectedIndex, index);
    
    for (let i = start; i <= end; i++) {
      if (displayedItems[i]) {
        selectedItems.add(displayedItems[i].id);
      }
    }
    renderItems();
  } else if (event.metaKey || event.ctrlKey) {
    // Toggle individual selection with Cmd/Ctrl
    if (selectedItems.has(itemId)) {
      selectedItems.delete(itemId);
    } else {
      selectedItems.add(itemId);
    }
    lastSelectedIndex = index;
    renderItems();
  } else {
    // Single click - just select (don't copy)
    selectedItems.clear();
    selectedItems.add(itemId);
    lastSelectedIndex = index;
    renderItems();
  }
}

function selectAll() {
  displayedItems.forEach(item => selectedItems.add(item.id));
  renderItems();
}

async function copySelectedItems() {
  if (selectedItems.size === 0) return;
  
  const itemsToCopy = displayedItems.filter(item => selectedItems.has(item.id));
  
  if (itemsToCopy.length === 1) {
    await copyItem(itemsToCopy[0].id);
  } else {
    // Concatenate text content
    const textContent = itemsToCopy
      .map(item => item.plainText || '')
      .filter(text => text)
      .join('\n');
    
    if (window.electronAPI && textContent) {
      await window.electronAPI.copyToClipboard({
        type: 'text',
        plainText: textContent
      });
      
      // Visual feedback (but keep selection)
      selectedItems.forEach(id => {
        const element = document.querySelector(`[data-id="${id}"]`);
        if (element) {
          const originalBg = element.style.background;
          element.style.background = '#4CAF50';
          element.style.color = 'white';
          setTimeout(() => {
            element.style.background = originalBg;
            element.style.color = '';
            // Re-render to restore selection styling
            renderItems();
          }, 300);
        }
      });
    }
  }
}

function getItemPreview(item) {
  if (item.type === 'text' || item.type === 'richText') {
    if (item.plainText) {
      return escapeHtml(item.plainText.substring(0, 200));
    }
  } else if (item.type === 'image') {
    // Don't load full image data in grid view for performance
    if (item.hasImage) {
      return '🖼️ Image';
    }
    return '🖼️ Image';
  } else if (item.type === 'file' && item.filePaths) {
    const paths = typeof item.filePaths === 'string' ? JSON.parse(item.filePaths) : item.filePaths;
    return `📄 ${escapeHtml(paths[0])}`;
  }
  return 'Clipboard item';
}

async function copyItem(itemId) {
  const item = allItems.find(i => i.id === itemId);
  if (!item || !window.electronAPI) return;
  
  await window.electronAPI.copyToClipboard(item);
  
  // Visual feedback
  const element = document.querySelector(`[data-id="${itemId}"]`);
  if (element) {
    element.style.background = '#4CAF50';
    element.style.color = 'white';
    setTimeout(() => {
      element.style.background = '';
      element.style.color = '';
    }, 300);
  }
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
