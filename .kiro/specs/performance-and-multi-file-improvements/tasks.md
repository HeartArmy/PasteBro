# Implementation Plan

- [x] 1. Optimize app startup for instant tray icon display
  - Refactor main.js initialize() method to create tray icon first before any other initialization
  - Move manager initialization to async background tasks after tray appears
  - Defer window creation until after tray is visible
  - Add timing logs to measure startup performance
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Configure sidebar window to appear above fullscreen apps
  - Set sidebar window level to 'screen-saver' using setAlwaysOnTop(true, 'screen-saver')
  - Test that sidebar appears above fullscreen Safari and video players
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Implement Full Disk Access permission detection and notification
  - Create PermissionManager class to check Full Disk Access by attempting to read protected file
  - Add preference flag to track if user has dismissed permission notification
  - Show native macOS notification on first launch if permission not granted
  - Add button in notification to open System Preferences to Full Disk Access panel
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Add multi-file clipboard detection in ClipboardMonitor
  - Update captureClipboardContent() to check for 'public.file-url-list' format
  - Parse multiple file URLs from clipboard when format is detected
  - Return array of file paths when multiple files are present
  - _Requirements: 4.1, 4.2_

- [x] 5. Extend ClipboardItem model for multi-file support
  - Add MULTI_FILE type to ClipboardItemType enum
  - Add fileCount, filePaths, fileTypes, isAllImages fields to ClipboardItem class
  - Update toDatabase() and fromDatabase() methods to handle multi-file data
  - Update database schema to add file_count, file_types, is_all_images columns
  - _Requirements: 4.2, 4.3_

- [x] 6. Implement multi-file item creation logic
  - Update createClipboardItem() in ClipboardMonitor to detect when multiple files are present
  - Determine file types by extension for each file
  - Check if all files are images (isAllImages flag)
  - Generate thumbnails for first 4 images only
  - Create ClipboardItem with MULTI_FILE type and all file metadata
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 7. Build UI components for multi-file display
  - Create CSS grid layout for 2x2 thumbnail display
  - Add multi-file item template with file count header
  - Display "X images" or "X files" based on isAllImages flag
  - Show "+X more" indicator when more than 4 files
  - _Requirements: 4.3, 4.4, 5.1, 5.2, 5.3_

- [x] 8. Implement multi-file paste functionality
  - Update copy-to-clipboard IPC handler to detect multi-file items
  - Write all file URLs back to clipboard in 'public.file-url-list' format
  - Preserve original clipboard format so all files paste together
  - Test pasting 8 images into Finder and other apps
  - _Requirements: 4.5, 5.4_

- [x] 9. Preserve selection order when copying multiple items
  - Track the order in which items are selected (Shift or Cmd+click)
  - Store selection order in an array as items are selected
  - When copying multiple items, paste them in the exact selection order
  - Update multi-item copy logic to respect user's selection sequence
  - _Requirements: 4.5, 5.4_

- [x] 10. Add performance monitoring and optimization
  - Add timing measurements for startup phases
  - Log time to tray icon, time to monitoring start
  - Optimize thumbnail generation to use JPEG compression at 70% quality
  - Limit thumbnail size to 100x100px for memory efficiency
  - _Requirements: 1.1, 1.2, 1.3_
