# Design Document

## Overview

This design addresses four critical improvements to PasteBro: instant startup, sidebar visibility above fullscreen apps, Full Disk Access permission handling, and multi-file clipboard support. The design prioritizes minimal code changes while maximizing performance and user experience.

## Architecture

### Startup Optimization

**Current Flow:**
```
app.whenReady() → initializeManagers() → setupIpcHandlers() → createTray() → createMainWindow() → registerGlobalShortcuts() → startMonitoring()
```

**Optimized Flow:**
```
app.whenReady() → createTray() (immediate) → initializeManagers() (async) → createMainWindow() (background) → setupIpcHandlers() → registerGlobalShortcuts() → startMonitoring()
```

**Key Changes:**
- Tray icon creation happens first (synchronous, fast)
- Manager initialization happens asynchronously
- Window creation is deferred and non-blocking
- Database operations are lazy-loaded

### Window Level Configuration

macOS provides window levels that control z-order:
- `normal` (0) - Regular windows
- `floating` (3) - Above normal windows
- `torn-off-menu` (3) - Same as floating
- `modal-panel` (8) - Above floating
- `main-menu` (24) - Menu bar level
- `status` (25) - Above menu bar
- `pop-up-menu` (101) - Highest level
- `screen-saver` (1000) - Screen saver level

**Solution:** Set sidebar to `screen-saver` level (1000) to appear above fullscreen apps.

### Full Disk Access Detection

macOS doesn't provide a direct API to check Full Disk Access. We use a workaround:
- Attempt to read a protected file (e.g., `~/Library/Safari/History.db`)
- If successful, permission is granted
- If fails with EPERM, permission is denied

**Notification Strategy:**
- Check on first launch only (use preferences flag)
- Show native macOS notification with action button
- Provide "Don't show again" option

### Multi-File Clipboard Detection

**macOS Clipboard Formats:**
- `public.file-url` - Single file URL
- `NSFilenamesPboardType` - Multiple file paths (legacy)
- `public.file-url-list` - Multiple file URLs (modern)

**Detection Strategy:**
1. Check for `public.file-url-list` format first (multiple files)
2. Parse all file URLs from the list
3. Determine if files are images by extension
4. Create single ClipboardItem with file array

**Data Structure:**
```javascript
{
  type: 'multi-file',
  fileCount: 8,
  filePaths: ['/path/1.jpg', '/path/2.jpg', ...],
  fileTypes: ['image', 'image', ...],
  isAllImages: true,
  thumbnails: [Buffer, Buffer, Buffer, Buffer] // First 4 only
}
```

## Components and Interfaces

### 1. Startup Manager

**Purpose:** Orchestrate fast, non-blocking startup

```javascript
class StartupManager {
  async quickStart() {
    // Phase 1: Immediate (< 100ms)
    this.createTray();
    
    // Phase 2: Background (< 500ms)
    await Promise.all([
      this.initializePreferences(),
      this.createMainWindow()
    ]);
    
    // Phase 3: Deferred (< 1000ms)
    await this.initializeDatabase();
    await this.startClipboardMonitoring();
  }
}
```

### 2. Permission Manager

**Purpose:** Check and request Full Disk Access

```javascript
class PermissionManager {
  checkFullDiskAccess() {
    // Try to access protected file
    // Return true/false
  }
  
  shouldShowPermissionNotification() {
    // Check if first launch or user hasn't dismissed
  }
  
  showPermissionNotification() {
    // Show native notification with action
  }
  
  openSystemPreferences() {
    // Open to Full Disk Access panel
  }
}
```

### 3. Multi-File Clipboard Handler

**Purpose:** Detect and handle multiple files in clipboard

```javascript
class MultiFileClipboardHandler {
  detectMultipleFiles(clipboard) {
    // Check for file-url-list format
    // Parse all file URLs
    // Return array of file paths or null
  }
  
  createMultiFileItem(filePaths) {
    // Determine file types
    // Load thumbnails for images (first 4)
    // Create ClipboardItem with multi-file type
  }
  
  restoreMultiFileToClipboard(item) {
    // Write all file URLs back to clipboard
    // Preserve original format
  }
}
```

### 4. UI Components for Multi-File Display

**Multi-File Item Template:**
```html
<div class="clipboard-item multi-file">
  <div class="multi-file-header">
    <span class="file-count">8 images</span>
  </div>
  <div class="thumbnail-grid">
    <img src="thumb1" />
    <img src="thumb2" />
    <img src="thumb3" />
    <img src="thumb4" />
  </div>
  <div class="more-indicator">+4 more</div>
</div>
```

**CSS Grid Layout:**
```css
.thumbnail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 4px;
  max-height: 120px;
}
```

## Data Models

### ClipboardItem Extension

Add new type and fields:

```javascript
ClipboardItemType.MULTI_FILE = 'multi-file';

class ClipboardItem {
  constructor({
    // Existing fields...
    fileCount,      // Number of files
    filePaths,      // Array of file paths
    fileTypes,      // Array of file types
    isAllImages,    // Boolean
    thumbnails      // Array of thumbnail buffers (first 4)
  }) {
    // ...
  }
}
```

### Database Schema Extension

```sql
-- Add columns to clipboard_items table
ALTER TABLE clipboard_items ADD COLUMN file_count INTEGER DEFAULT 1;
ALTER TABLE clipboard_items ADD COLUMN file_types TEXT; -- JSON array
ALTER TABLE clipboard_items ADD COLUMN is_all_images INTEGER DEFAULT 0;
```

## Error Handling

### Startup Errors

- If tray creation fails, show error dialog and exit
- If database initialization fails, continue with in-memory mode
- If clipboard monitoring fails, retry every 5 seconds

### Permission Errors

- If Full Disk Access check fails, assume permission is granted (fail open)
- If notification fails, log error but continue

### Multi-File Errors

- If file URL parsing fails, fall back to single file mode
- If thumbnail generation fails, show file icon instead
- If file doesn't exist, show placeholder

## Testing Strategy

### Performance Testing

1. Measure time from app launch to tray icon appearance (target: < 500ms)
2. Measure time from app launch to clipboard monitoring start (target: < 1s)
3. Test with large database (10,000+ items) to ensure no blocking

### Window Level Testing

1. Test sidebar visibility in fullscreen Safari
2. Test sidebar visibility in fullscreen video player
3. Test sidebar visibility with Mission Control active

### Multi-File Testing

1. Copy 1 file - should create single file item
2. Copy 8 images from Finder - should create multi-file item with "8 images"
3. Copy mixed files (images + documents) - should create multi-file item with "8 files"
4. Paste multi-file item - should paste all files
5. Test with 100+ files to ensure performance

### Permission Testing

1. Test with Full Disk Access granted - no notification
2. Test with Full Disk Access denied - notification appears
3. Test "Don't show again" - notification doesn't reappear
4. Test "Open System Preferences" button - opens correct panel

## Implementation Notes

### macOS-Specific APIs

```javascript
// Set window level
mainWindow.setAlwaysOnTop(true, 'screen-saver');

// Read multiple file URLs
const fileUrls = clipboard.read('public.file-url-list');

// Open System Preferences
const { shell } = require('electron');
shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles');
```

### Performance Optimizations

1. **Lazy Database Loading:** Don't open database until first clipboard event
2. **Thumbnail Caching:** Generate thumbnails once and cache in database
3. **Async Everything:** Use async/await for all I/O operations
4. **Debounce UI Updates:** Batch clipboard updates to reduce IPC overhead

### Memory Considerations

For Intel Macs with limited resources:
- Limit thumbnail size to 100x100px
- Store only 4 thumbnails per multi-file item
- Use JPEG compression for thumbnails (quality: 70)
- Clear thumbnail cache when memory pressure is high
