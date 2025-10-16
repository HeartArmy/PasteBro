# Design Document

## Overview

This design transforms PasteBro's image handling from BLOB-based storage to file-based storage with efficient thumbnails, fixing performance issues and enabling smooth scrolling with proper multi-image paste support.

## Architecture

### Current vs New Storage Model

**Current (Slow):**
```
Clipboard → Image Data → SQLite BLOB → UI (loads full image)
Problem: 5MB image = 5MB in DB + 5MB loaded in UI = lag
```

**New (Fast like PastePal):**
```
Clipboard → Image File → Disk Storage → Thumbnail → UI
Database: Only stores file path reference
UI: Only loads 20KB thumbnail
```

### Directory Structure

```
~/Library/Application Support/pastebro/
├── pastebro.db (metadata only)
├── images/
│   ├── abc123-uuid.png (full resolution)
│   ├── def456-uuid.jpg
│   └── ...
└── thumbnails/
    ├── abc123-uuid.jpg (200x200, 70% quality)
    ├── def456-uuid.jpg
    └── ...
```

## Components

### 1. ImageStorageManager

**Purpose:** Handle file-based image storage

```javascript
class ImageStorageManager {
  constructor(basePath) {
    this.imagesPath = path.join(basePath, 'images');
    this.thumbnailsPath = path.join(basePath, 'thumbnails');
  }
  
  async saveImage(imageBuffer, id) {
    // Save full image
    const imagePath = path.join(this.imagesPath, `${id}.png`);
    await fs.writeFile(imagePath, imageBuffer);
    
    // Generate thumbnail
    const thumbnail = await this.generateThumbnail(imageBuffer);
    const thumbPath = path.join(this.thumbnailsPath, `${id}.jpg`);
    await fs.writeFile(thumbPath, thumbnail);
    
    return { imagePath, thumbPath };
  }
  
  async generateThumbnail(imageBuffer) {
    const sharp = require('sharp');
    return await sharp(imageBuffer)
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer();
  }
  
  async deleteImage(id) {
    // Delete both full image and thumbnail
  }
}
```

### 2. Virtual Scrolling

**Purpose:** Render only visible items for smooth scrolling

```javascript
class VirtualList {
  constructor(container, items, renderItem) {
    this.container = container;
    this.items = items;
    this.renderItem = renderItem;
    this.itemHeight = 80; // Fixed height per item
    this.visibleCount = Math.ceil(container.clientHeight / this.itemHeight);
    this.buffer = 5; // Extra items above/below
  }
  
  render(scrollTop) {
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = startIndex + this.visibleCount + this.buffer;
    
    // Only render visible items
    const visibleItems = this.items.slice(
      Math.max(0, startIndex - this.buffer),
      Math.min(this.items.length, endIndex)
    );
    
    // Update DOM efficiently
    this.updateDOM(visibleItems, startIndex);
  }
}
```

### 3. Multi-Image Paste Handler

**Purpose:** Write multiple images to clipboard in order

```javascript
class MultiImagePaster {
  async pasteImages(imagePaths) {
    const { clipboard, nativeImage } = require('electron');
    
    // Load all images
    const images = await Promise.all(
      imagePaths.map(async path => {
        const buffer = await fs.readFile(path);
        return nativeImage.createFromBuffer(buffer);
      })
    );
    
    // Write to clipboard as multiple items
    clipboard.write({
      image: images[0], // Primary image
      // Additional images as file URLs for compatibility
      bookmark: imagePaths.map(p => `file://${p}`).join('\n')
    });
  }
}
```

## Data Models

### Updated ClipboardItem

```javascript
{
  id: 'uuid',
  type: 'image',
  timestamp: 1234567890,
  imagePath: '/path/to/images/uuid.png',      // Full image
  thumbnailPath: '/path/to/thumbnails/uuid.jpg', // Thumbnail
  imageData: null, // NO LONGER USED
  fileSize: 5242880 // Original size
}
```

### Database Schema Changes

```sql
-- Migration v3
ALTER TABLE clipboard_items ADD COLUMN image_path TEXT;
ALTER TABLE clipboard_items ADD COLUMN thumbnail_path TEXT;

-- Remove BLOB columns (after migration)
-- ALTER TABLE clipboard_items DROP COLUMN image_data;
-- ALTER TABLE clipboard_items DROP COLUMN thumbnail_data;
```

## UI Improvements

### Selected Item Styling

```css
.clipboard-item.selected {
  background: #007AFF; /* Apple blue */
  color: white; /* High contrast */
}

.clipboard-item.selected .timestamp,
.clipboard-item.selected .source-app {
  color: rgba(255, 255, 255, 0.8);
}

.clipboard-item.selected .action-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}
```

### Tab Styling

```css
.tab {
  color: #666;
  background: transparent;
}

.tab.active {
  color: #007AFF;
  background: rgba(0, 122, 255, 0.1);
}
```

### Image Preview

```html
<div class="clipboard-item">
  <img 
    src="file:///path/to/thumbnail.jpg" 
    loading="lazy"
    class="item-thumbnail"
  />
  <div class="item-content">...</div>
</div>
```

## Performance Optimizations

### 1. Lazy Image Loading

```javascript
// Use Intersection Observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src; // Load thumbnail
      observer.unobserve(img);
    }
  });
});
```

### 2. Debounced Rendering

```javascript
let renderTimeout;
function scheduleRender() {
  if (renderTimeout) return;
  renderTimeout = requestAnimationFrame(() => {
    renderItems();
    renderTimeout = null;
  });
}
```

### 3. Memory Management

- Limit loaded images to 50 at a time
- Unload images outside viewport
- Use WeakMap for image cache
- Clear cache on memory pressure

## Migration Strategy

### Phase 1: Detect Old Format

```javascript
const hasOldImages = await db.query(
  'SELECT COUNT(*) FROM clipboard_items WHERE image_data IS NOT NULL'
);
```

### Phase 2: Migrate Images

```javascript
async function migrateImages() {
  const items = await db.query('SELECT * FROM clipboard_items WHERE image_data IS NOT NULL');
  
  for (const item of items) {
    try {
      // Save to file
      const { imagePath, thumbPath } = await imageStorage.saveImage(
        item.image_data,
        item.id
      );
      
      // Update database
      await db.update(item.id, {
        image_path: imagePath,
        thumbnail_path: thumbPath,
        image_data: null // Clear BLOB
      });
    } catch (error) {
      console.error(`Failed to migrate ${item.id}:`, error);
    }
  }
}
```

## Testing Strategy

### Performance Tests

1. Load 1000 items - should render in < 100ms
2. Scroll through 1000 items - should maintain 60fps
3. Select 50 images - should paste in < 500ms
4. Load 10MB image - should not block UI

### Functional Tests

1. Copy image → verify file created
2. Delete item → verify file deleted
3. Shift-select images → verify order preserved
4. Paste multiple images → verify all paste correctly
5. Double-click item → verify copy works

### Visual Tests

1. Selected item text is readable
2. Tabs have proper colors
3. Image thumbnails load smoothly
4. Hover states work correctly
