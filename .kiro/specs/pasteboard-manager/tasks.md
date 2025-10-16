# Implementation Plan

- [x] 1. Set up Electron project and core infrastructure
  - Initialize Node.js project with package.json
  - Install Electron and core dependencies (better-sqlite3, sharp)
  - Create main process entry point (main.js)
  - Set up basic Electron app structure with BrowserWindow
  - Configure electron-builder for macOS packaging
  - _Requirements: 12.1, 12.2, 15.1_

- [x] 2. Implement SQLite persistence layer
  - Create DatabaseManager class with better-sqlite3
  - Define clipboard_items table schema with indexes
  - Implement insert, query, update, delete operations with error handling
  - Add database initialization and migration support
  - _Requirements: 2.5, 11.2, 11.4_

- [x] 3. Implement ClipboardItem model and data structures
  - Create ClipboardItem class with all properties
  - Define ClipboardItemType constants for different content types
  - Add content hashing using crypto module for duplicate detection
  - Create serialization/deserialization methods for database storage
  - Implement preview generation for different content types
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 4. Build clipboard monitoring system
  - Create ClipboardMonitor class with Electron clipboard API
  - Implement 50ms polling using setInterval
  - Add content hash tracking for efficient change detection
  - Implement content extraction for text and HTML
  - Add duplicate detection using content hash comparison
  - Implement pause/resume monitoring functionality
  - _Requirements: 2.1, 2.2, 2.5, 17.3_

- [x] 5. Implement HistoryManager for data operations
  - Create HistoryManager class coordinating DatabaseManager
  - Implement addItem with duplicate handling
  - Add getItems with pagination support
  - Implement searchItems using database search
  - Add pin/unpin functionality
  - Implement trash operations (move to trash, restore, empty)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.4_

- [x] 6. Create PreferencesManager
  - Define Preferences structure with all user settings
  - Create PreferencesManager with file-based persistence
  - Implement default values for all preferences
  - Add preference update and reset functionality
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

- [x] 7. Implement global hotkey system
  - Use Electron globalShortcut API for hotkey registration
  - Implement hotkey registration with CommandOrControl+L default
  - Add hotkey event handling and callback execution
  - Handle hotkey conflicts and registration failures
  - _Requirements: 1.1, 1.5, 13.2_

- [x] 8. Build sidebar UI with vanilla JavaScript
  - Design sidebar layout with CSS backdrop-filter blur
  - Build ItemList component for clipboard items
  - Implement slide-in/slide-out CSS animations (0.2s)
  - Add sidebar positioning (right edge)
  - Configure sidebar width (400px default)
  - _Requirements: 1.1, 3.1, 13.5, 13.6, 15.1, 15.5_

- [x] 9. Create UI components for different content types
  - Design ClipboardItemCard component with preview, timestamp, and action buttons
  - Implement TextItem preview (first 100 characters)
  - Implement hover state with action buttons (copy, delete, pin)
  - _Requirements: 3.2, 3.3, 3.4, 16.1_

- [ ] 10. Implement virtual scrolling and pagination
  - Implement lazy loading with pagination (50 items per batch)
  - Add scroll detection for loading more items using Intersection Observer
  - Optimize rendering for large datasets
  - _Requirements: 3.1, 12.3, 12.4_

- [x] 11. Add search functionality to sidebar
  - Create SearchBar component at top of sidebar
  - Implement real-time search filtering with debouncing
  - Handle empty search state to show all items
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 12. Implement item selection and multi-selection
  - Add single-click selection handling
  - Implement Shift+click for multi-selection
  - Add Cmd+A for select all functionality
  - Create visual highlighting for selected items
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 13. Implement copy to clipboard functionality
  - Add IPC handler to copy item content to system clipboard using Electron clipboard API
  - Support text, HTML, images, and files
  - Add visual feedback on copy action (background color flash)
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 14. Add pin/unpin functionality
  - Implement pin/unpin IPC handler to update database
  - Sort pinned items to top of list in UI
  - Update button text based on pin status
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 15. Build trash system
  - Implement delete action to mark items as deleted in database
  - Filter deleted items in trash view
  - Add restore from trash functionality
  - Implement empty trash with permanent deletion
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 16. Add image and file support to ClipboardMonitor
  - Detect and capture image data from clipboard
  - Detect and capture file paths from clipboard
  - Generate thumbnails for images using sharp
  - Store image data and thumbnails in database
  - _Requirements: 2.3, 2.4, 10.3, 10.4_

- [x] 17. Enhance UI for images and files
  - Display image thumbnails in clipboard items
  - Show file icons and names for file items
  - Add color swatch display for color items
  - _Requirements: 3.3, 3.4, 10.3, 10.4, 10.5_

- [x] 19. Add keyboard shortcuts for sidebar actions
  - Implement Escape key to hide sidebar
  - Add Delete key for item deletion
  - Handle Cmd+A for select all
  - _Requirements: 1.3, 5.5, 16.3_

- [x] 20. Build system tray integration
  - Create Tray with Electron Tray API
  - Build context menu with Open Sidebar, Preferences, Quit options
  - Handle tray click to toggle sidebar
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 18. Create PreferencesManager and preferences window
  - Create PreferencesManager class with default settings
  - Build preferences window UI with settings controls
  - Add hotkey configuration control
  - Add sidebar position and width controls
  - Implement history limits controls (max items, retention days)
  - Add launch at login checkbox
  - Persist preferences to file or database
  - _Requirements: 13.1, 13.2, 13.5, 13.6, 13.7, 13.8_

- [x] 19. Implement storage limits and cleanup
  - Enforce maximum history items limit in HistoryManager
  - Implement retention period cleanup (delete old items)
  - Add automatic cleanup on app start
  - Remove oldest non-pinned items when limit exceeded
  - _Requirements: 11.1, 11.2, 11.3_

- [x] 25. Add dark mode and light mode support
  - Configure CSS media queries for light/dark themes
  - Test all UI elements in both modes
  - Ensure proper contrast and readability
  - _Requirements: 15.2_

- [x] 26. Wire up Main Process with ClipboardMonitor and HistoryManager
  - Create ClipboardMonitor class with 50ms polling
  - Create HistoryManager class to coordinate database operations
  - Implement clipboard change detection and capture
  - Set up IPC handlers for renderer communication (get history, copy, delete, pin, search)
  - Connect clipboard monitoring to database storage
  - Handle duplicate detection using content hash
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 8.1, 9.1_

- [x] 20. Add context menu for clipboard items
  - Implement right-click context menu on items
  - Add Copy, Copy as Plain Text, Delete, Pin/Unpin options
  - Handle context menu actions
  - _Requirements: 16.2, 16.5_

- [x] 21. Implement double-click preview window
  - Create preview window for full content display
  - Handle double-click events on items
  - Display full text content in scrollable view
  - Show full-size images in preview
  - _Requirements: 16.4_

- [ ] 22. Add app exclusion functionality
  - Implement active application detection using Electron
  - Check excluded apps list before capturing clipboard
  - Add UI in preferences to manage excluded apps
  - _Requirements: 17.2_

- [ ] 23. Implement password detection heuristic
  - Create password detection algorithm (length, randomness, context)
  - Skip clipboard capture when password detected
  - Make detection optional via preferences
  - _Requirements: 17.5_

- [x] 24. Build import/export functionality
  - Create export format (JSON with base64 encoded data)
  - Implement export to file with all history items
  - Build import from file with validation
  - Add merge vs replace option for import
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [ ] 25. Implement clear all history functionality
  - Add clear all action in menu or preferences
  - Show confirmation dialog before clearing
  - Clear all non-pinned items from database
  - Update UI after clearing
  - _Requirements: 17.4_

- [ ] 26. Add error handling and logging
  - Add error logging for clipboard operations
  - Show user-facing dialogs for critical errors
  - Implement retry logic for clipboard access failures
  - Add graceful degradation for hotkey registration failures
  - _Requirements: Error handling across all features_

- [x] 35. Implement outside click detection for sidebar
  - Hide sidebar when window loses focus
  - _Requirements: 1.4_

- [x] 36. Build filter tabs for view filtering
  - Create filter tabs with All/Pinned/Trash segments
  - Implement filter switching logic
  - Update items display based on filter
  - _Requirements: 8.2, 9.2_

- [ ] 27. Add file existence validation
  - Check file paths validity before displaying
  - Show indicator for missing files
  - Handle file access errors gracefully
  - _Requirements: 10.4_

- [ ] 28. Implement storage quota management
  - Calculate total storage used by clipboard items
  - Show storage usage in preferences
  - Warn user when approaching limits
  - _Requirements: 11.5_

- [x] 39. Add relative timestamp formatting
  - Implement relative time display (e.g., "2 minutes ago")
  - _Requirements: 3.5_

- [x] 40. Create app icon and tray icon assets
  - Design app icon following macOS guidelines
  - Create tray icon (template image)
  - Export icons in all required sizes
  - Place icons in assets folder
  - _Requirements: 14.1, 14.5_

- [ ] 29. Add performance monitoring and optimization
  - Monitor memory usage during clipboard operations
  - Optimize image loading with lazy loading
  - Ensure smooth 60fps animations
  - Test with large datasets (1000+ items)
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 30. Configure code signing and notarization
  - Set up Apple Developer certificate
  - Configure electron-builder for code signing
  - Set up notarization with Apple
  - Create entitlements files
  - _Requirements: Deployment_

- [ ] 31. Final integration and testing
  - Test all features end-to-end
  - Fix any remaining bugs
  - Test on macOS Intel and Apple Silicon
  - Verify memory usage and performance
  - Polish UI and animations
  - _Requirements: All requirements - final integration_
