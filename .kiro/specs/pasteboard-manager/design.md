# PasteBro Design Document

## Overview

PasteBro is a cross-platform clipboard manager built using Electron, Node.js, and React, optimized for macOS (with potential Windows/Linux support). The architecture follows a modular design with clear separation between clipboard monitoring, data persistence, UI rendering, and system integration. The app runs as a menu bar application with a slide-out sidebar interface, prioritizing performance and memory efficiency.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        PasteBro App                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Menu Bar   │  │   Sidebar    │  │  Preferences    │   │
│  │  Controller  │  │  Controller  │  │    Window       │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘   │
│         │                  │                    │            │
│  ┌──────┴──────────────────┴────────────────────┴────────┐  │
│  │            Application Coordinator                     │  │
│  └──────┬──────────────────┬────────────────────┬────────┘  │
│         │                  │                    │            │
│  ┌──────┴───────┐  ┌───────┴────────┐  ┌───────┴────────┐  │
│  │  Clipboard   │  │  History       │  │  Preferences   │  │
│  │  Monitor     │  │  Manager       │  │  Manager       │  │
│  └──────┬───────┘  └───────┬────────┘  └───────┬────────┘  │
│         │                  │                    │            │
│  ┌──────┴──────────────────┴────────────────────┴────────┐  │
│  │              Core Data Store                           │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Runtime**: Electron 28+
- **Language**: JavaScript/TypeScript
- **UI Framework**: React with CSS
- **Data Persistence**: SQLite (better-sqlite3)
- **Hotkey Management**: electron-globalshortcut
- **Clipboard Access**: electron clipboard API
- **Image Processing**: sharp for thumbnails
- **State Management**: React Context/Hooks

## Components and Interfaces

### 1. Main Process (Electron)

**Responsibility**: Central coordinator managing app lifecycle, system integration, and IPC.

```javascript
class MainProcess {
    constructor() {
        this.clipboardMonitor = new ClipboardMonitor();
        this.historyManager = new HistoryManager();
        this.preferencesManager = new PreferencesManager();
        this.tray = null;
        this.sidebarWindow = null;
    }
    
    start() {}
    stop() {}
    showSidebar() {}
    hideSidebar() {}
    handleClipboardChange(item) {}
    setupGlobalShortcut() {}
}
```

### 2. Clipboard Monitor

**Responsibility**: Continuously monitors system clipboard for changes and captures new content.

```javascript
class ClipboardMonitor {
    constructor(onClipboardChange) {
        this.onClipboardChange = onClipboardChange;
        this.lastHash = null;
        this.interval = null;
        this.pollInterval = 50; // 50ms
    }
    
    startMonitoring() {}
    stopMonitoring() {}
    pauseMonitoring() {}
    resumeMonitoring() {}
    checkClipboard() {}
    captureClipboardContent() {}
}
```

**Implementation Details**:
- Uses electron clipboard API to access system clipboard
- Polls clipboard every 50ms using setInterval
- Tracks content hash to detect changes efficiently
- Extracts multiple data types: text, html, image, rtf
- Implements duplicate detection by comparing content hash

### 3. History Manager

**Responsibility**: Manages clipboard history storage, retrieval, and operations.

```javascript
class HistoryManager {
    constructor(dbPath) {
        this.db = new Database(dbPath);
        this.maxItems = 1000;
        this.retentionDays = 30;
    }
    
    async addItem(item) {}
    async getItems(limit, offset) {}
    async searchItems(query) {}
    async deleteItems(items) {}
    async moveToTrash(items) {}
    async restoreFromTrash(items) {}
    async emptyTrash() {}
    async pinItem(item) {}
    async unpinItem(item) {}
    async clearAllHistory() {}
    async exportHistory(filePath) {}
    async importHistory(filePath, merge) {}
    enforceStorageLimits() {}
}
```

### 4. Clipboard Item Model

**Responsibility**: Represents a single clipboard entry with all metadata.

```javascript
const ClipboardItemType = {
    TEXT: 'text',
    RICH_TEXT: 'richText',
    IMAGE: 'image',
    FILE: 'file',
    COLOR: 'color'
};

class ClipboardItem {
    constructor({
        id = uuidv4(),
        type,
        timestamp = new Date(),
        isPinned = false,
        isDeleted = false,
        contentHash,
        plainText = null,
        richText = null,
        imageData = null,
        imageThumbnail = null,
        filePaths = null,
        colorValue = null,
        sourceApplication = null,
        fileSize = null
    }) {
        this.id = id;
        this.type = type;
        this.timestamp = timestamp;
        this.isPinned = isPinned;
        this.isDeleted = isDeleted;
        this.contentHash = contentHash;
        this.plainText = plainText;
        this.richText = richText;
        this.imageData = imageData;
        this.imageThumbnail = imageThumbnail;
        this.filePaths = filePaths;
        this.colorValue = colorValue;
        this.sourceApplication = sourceApplication;
        this.fileSize = fileSize;
    }
    
    getPreview() {}
}
```

### 5. Sidebar Component (React)

**Responsibility**: Manages sidebar UI, animations, and user interactions.

```javascript
function Sidebar({ items, onCopy, onDelete, onPin, onSearch }) {
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [currentFilter, setCurrentFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    const handleItemClick = (item, shiftKey) => {};
    const handleItemDoubleClick = (item) => {};
    const copySelectedItems = () => {};
    const deleteSelectedItems = () => {};
    
    return (
        <div className="sidebar">
            <SearchBar onChange={setSearchQuery} />
            <FilterTabs value={currentFilter} onChange={setCurrentFilter} />
            <ItemList items={filteredItems} />
        </div>
    );
}
```

**UI Layout**:
- Width: 400px (default, configurable 300-800px)
- Height: Full screen height
- Position: Right edge (configurable to left)
- Animation: CSS transition slide in/out with 0.2s ease-in-out
- Background: Backdrop blur effect

**Item Cell Design**:
```
┌────────────────────────────────────────┐
│ [Icon] Content Preview...              │
│        Timestamp          [Pin] [Del]  │
└────────────────────────────────────────┘
```

### 6. Preferences Manager

**Responsibility**: Manages user preferences with persistence.

```javascript
class PreferencesManager {
    constructor() {
        this.defaults = {
            globalHotkey: 'Command+L',
            copyWithFormatting: true,
            pasteWithFormatting: true,
            autoHideAfterCopy: true,
            sidebarPosition: 'right',
            sidebarWidth: 400,
            maxHistoryItems: 1000,
            retentionDays: 30,
            launchAtLogin: false,
            excludedApplications: [],
            ignorePasswords: false,
            enableSoundEffects: false
        };
        this.preferences = this.load();
    }
    
    updatePreferences(prefs) {}
    resetToDefaults() {}
    save() {}
    load() {}
}
```

### 7. Global Shortcut (Electron)

**Responsibility**: Registers and handles global keyboard shortcuts.

```javascript
const { globalShortcut } = require('electron');

function setupGlobalShortcut(accelerator, callback) {
    const ret = globalShortcut.register(accelerator, callback);
    if (!ret) {
        console.error('Global shortcut registration failed');
    }
    return ret;
}

function unregisterGlobalShortcut(accelerator) {
    globalShortcut.unregister(accelerator);
}
```

### 8. Tray (Electron)

**Responsibility**: Manages system tray icon and menu.

```javascript
const { Tray, Menu } = require('electron');

class TrayManager {
    constructor(iconPath) {
        this.tray = new Tray(iconPath);
        this.setupMenu();
    }
    
    setupMenu() {}
    updateIcon(active) {}
    showContextMenu() {}
}
```

### 9. Database (SQLite)

**Responsibility**: SQLite database management and operations.

```javascript
const Database = require('better-sqlite3');

class DatabaseManager {
    constructor(dbPath) {
        this.db = new Database(dbPath);
        this.initSchema();
    }
    
    initSchema() {}
    insert(table, data) {}
    query(sql, params) {}
    update(table, id, data) {}
    delete(table, id) {}
    close() {}
}
```

**SQLite Schema**:

```sql
CREATE TABLE clipboard_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    is_pinned INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    content_hash TEXT NOT NULL,
    plain_text TEXT,
    rich_text TEXT,
    image_data BLOB,
    thumbnail_data BLOB,
    file_paths TEXT,
    color_value TEXT,
    source_application TEXT,
    file_size INTEGER
);

CREATE INDEX idx_timestamp ON clipboard_items(timestamp);
CREATE INDEX idx_pinned ON clipboard_items(is_pinned);
CREATE INDEX idx_deleted ON clipboard_items(is_deleted);
CREATE INDEX idx_hash ON clipboard_items(content_hash);
```

## Data Models

### Storage Strategy

**Text Content**:
- Plain text: Stored directly in database
- Rich text: Converted to NSAttributedString archive (Data)
- Size limit: 10MB per item

**Image Content**:
- Original: Stored as PNG/JPEG data
- Thumbnail: Generated at 200x200px, stored separately
- Lazy loading: Only load full image when needed
- Size limit: 50MB per item

**File Content**:
- Store file paths as URL array
- Store file icons as thumbnail
- Do not copy actual files
- Validate file existence on access

**Color Content**:
- Store as NSColor archive
- Display as color swatch in UI

### Memory Management Strategy

1. **Lazy Loading**: Load full image data only when scrolled into view
2. **Thumbnail Cache**: Keep thumbnails in memory, purge on memory warning
3. **Pagination**: Load items in batches of 50
4. **Image Compression**: Compress thumbnails to reduce memory footprint
5. **Weak References**: Use weak references for delegates and observers
6. **Autorelease Pools**: Wrap heavy operations in autorelease pools

### Database Optimization

1. **Indexing**: Index on timestamp, isPinned, isDeleted, contentHash
2. **Batch Operations**: Use batch insert/delete for multiple items
3. **Background Context**: Perform writes on background context
4. **Fetch Limits**: Always use fetch limits and offsets
5. **Predicate Optimization**: Use compound predicates efficiently

## Error Handling

### Error Types

```javascript
class PasteBroError extends Error {
    constructor(type, message, details = null) {
        super(message);
        this.type = type;
        this.details = details;
        this.name = 'PasteBroError';
    }
}

const ErrorTypes = {
    CLIPBOARD_ACCESS_FAILED: 'clipboard_access_failed',
    STORAGE_QUOTA_EXCEEDED: 'storage_quota_exceeded',
    DATABASE_ERROR: 'database_error',
    HOTKEY_REGISTRATION_FAILED: 'hotkey_registration_failed',
    IMPORT_VALIDATION_FAILED: 'import_validation_failed',
    FILE_ACCESS_DENIED: 'file_access_denied'
};
```

### Error Handling Strategy

1. **Silent Failures**: Clipboard monitoring errors logged but don't alert user
2. **User Alerts**: Storage errors, import/export errors shown to user
3. **Retry Logic**: Clipboard access retried up to 3 times
4. **Graceful Degradation**: If hotkey fails, fallback to menu bar only
5. **Error Logging**: All errors logged to console for debugging

## Testing Strategy

### Unit Tests

- ClipboardMonitor: Test change detection, content extraction
- HistoryManager: Test CRUD operations, search, filtering
- PreferencesManager: Test persistence, defaults
- ClipboardItem: Test hashing, equality, serialization

### Integration Tests

- End-to-end clipboard capture and storage
- Search functionality with various content types
- Multi-selection and batch operations
- Import/export with data validation

### Performance Tests

- Memory usage with 10,000 items
- Sidebar rendering time with 1,000 items
- Search performance with large datasets
- CPU usage during clipboard monitoring

### Manual Testing Checklist

- Hotkey activation from various apps
- Copy/paste with and without formatting
- Multi-selection with Shift key
- Drag and drop operations
- Dark mode / Light mode switching
- Memory leaks with Instruments
- Accessibility with VoiceOver

## Performance Optimization

### CPU Optimization

1. **Efficient Polling**: 50ms interval balances responsiveness and CPU usage
2. **Change Detection**: Use changeCount before expensive content extraction
3. **Background Processing**: Move heavy operations off main thread
4. **Debouncing**: Debounce search input to reduce filtering operations
5. **Lazy Evaluation**: Defer expensive operations until needed

### Memory Optimization

1. **Image Downsampling**: Generate thumbnails at display size
2. **Pagination**: Load items on-demand as user scrolls
3. **Cache Eviction**: Implement LRU cache for thumbnails
4. **Data Compression**: Compress stored images
5. **Memory Warnings**: Respond to memory warnings by purging caches

### UI Optimization

1. **View Recycling**: Use NSTableView cell reuse
2. **Layer-Backed Views**: Enable layer backing for smooth animations
3. **Async Image Loading**: Load images asynchronously
4. **Throttled Scrolling**: Throttle scroll events to reduce redraws
5. **Metal Acceleration**: Use Metal for blur effects if available

## Security and Privacy

### Data Protection

1. **Local Storage Only**: All data stored locally, no cloud sync
2. **Sandboxing**: App runs in sandbox with minimal permissions
3. **Keychain Integration**: Store sensitive preferences in Keychain
4. **Password Detection**: Heuristic detection of password-like content
5. **App Exclusion**: Allow excluding specific apps from monitoring

### Permissions

Required macOS permissions:
- Accessibility API (for global hotkey)
- Screen Recording (for capturing screenshots if needed)
- File Access (for file clipboard items)

## Deployment Considerations

### Build Configuration

- Electron version: 28+
- Target platforms: macOS (primary), Windows/Linux (future)
- Architecture: x64, arm64
- Packaging: electron-builder
- Code signing: Required for macOS distribution

### Distribution

- Direct download from website
- macOS: DMG with code signing and notarization
- Auto-update mechanism using electron-updater
- Launch at login using electron app.setLoginItemSettings

### Migration Strategy

- Database schema versioning with migration scripts
- Preferences migration for version updates
- Backward compatibility for export format
