# Implementation Plan

- [x] 1. Create ImageStorageManager for file-based storage
  - Create ImageStorageManager class to handle image file operations
  - Add methods to save images as PNG/JPEG files with UUID filenames
  - Add method to generate 200x200 JPEG thumbnails at 70% quality
  - Create images and thumbnails directories on app startup
  - Add method to delete image files when items are permanently deleted
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.3_

- [x] 2. Update ClipboardMonitor to use file storage
  - Modify createClipboardItem to save images as files instead of BLOBs
  - Store file paths (imagePath, thumbnailPath) instead of imageData
  - Remove imageData and imageThumbnail from ClipboardItem for new images
  - Ensure image files are saved before database insert
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Update database schema for file-based storage
  - Add image_path and thumbnail_path columns to clipboard_items table
  - Create migration v3 to add new columns
  - Update insert method to save file paths instead of BLOB data
  - Update rowToItem to read file paths
  - _Requirements: 1.3, 6.5_

- [x] 4. Implement database migration from BLOB to files
  - Detect items with image_data BLOB in database
  - For each BLOB image, save to file and generate thumbnail
  - Update database records with file paths
  - Clear image_data BLOB after successful migration
  - Log migration progress and errors
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5. Fix copy button and double-click functionality
  - Verify copy button click handler is properly attached
  - Ensure double-click handler calls copyItem function
  - Add visual feedback (green flash) when copy succeeds
  - Test with text, images, and multi-file items
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 6. Implement virtual scrolling for performance
  - Create VirtualList component with fixed item height
  - Calculate visible items based on scroll position
  - Render only visible items plus small buffer
  - Update DOM efficiently on scroll
  - Test with 1000+ items for smooth 60fps scrolling
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 7. Add lazy image loading with thumbnails
  - Update UI to display thumbnail images from file paths
  - Use Intersection Observer for lazy loading thumbnails
  - Add loading="lazy" attribute to img tags
  - Show placeholder icon while thumbnail loads
  - Handle missing thumbnail files gracefully
  - _Requirements: 2.2, 2.4, 5.1, 5.2, 9.5_

- [ ] 8. Fix shift-select for images
  - Debug why shift-select doesn't work properly with images
  - Ensure selection order is preserved for image items
  - Test shift-select with mixed text and image items
  - Verify paste order matches selection order
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 9. Implement proper multi-image paste
  - Update copy-to-clipboard handler to support multiple images
  - Load image files and create nativeImage objects
  - Write multiple images to clipboard using proper macOS APIs
  - Test pasting into Notes, Mail, Messages
  - Add fallback to file URLs if native paste fails
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 10. Improve UI styling for readability
  - Update selected item background to Apple blue (#007AFF)
  - Change selected item text color to white for contrast
  - Update tab colors (active tab blue, inactive gray)
  - Add proper hover states for buttons
  - Ensure all text is readable in both selected and unselected states
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 11. Add image preview in sidebar
  - Display thumbnail images in clipboard items
  - Create 2x2 grid for multi-image items
  - Add hover tooltip with larger preview
  - Lazy load images as user scrolls
  - Show placeholder for failed image loads
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 12. Optimize memory and performance
  - Limit number of loaded images to 50 at a time
  - Unload images outside viewport
  - Use requestAnimationFrame for rendering
  - Debounce scroll events
  - Test with large images (10MB+) to ensure no UI blocking
  - _Requirements: 2.5, 9.1, 9.4, 9.5_
