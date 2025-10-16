# Requirements Document

## Introduction

PasteBro is a native macOS clipboard manager for Intel-based Macs that provides instant access to clipboard history through a sidebar interface. The system monitors all clipboard activity, stores history with support for multiple data types (text, images, files), and enables quick retrieval and management of clipboard items with keyboard shortcuts and mouse interactions.

## Glossary

- **PasteBro**: The macOS clipboard manager application
- **Clipboard Monitor**: Background service that detects and captures clipboard changes
- **History Store**: Local database that persists clipboard items
- **Sidebar Interface**: Slide-out panel displaying clipboard history
- **Clipboard Item**: Single entry in history containing data and metadata
- **Format Preservation**: Ability to maintain or strip rich text formatting
- **Hotkey**: Global keyboard shortcut that activates the application
- **Selection Mode**: Multi-select capability using Shift key
- **Trash**: Temporary storage for deleted items with restore capability

## Requirements

### Requirement 1: Global Hotkey Access

**User Story:** As a user, I want to press Cmd+L from any application to instantly open the clipboard history sidebar, so that I can quickly access my clipboard items without switching applications.

#### Acceptance Criteria

1. WHEN the user presses Cmd+L, THE PasteBro SHALL display the sidebar interface within 100 milliseconds
2. WHEN the sidebar is visible and the user presses Cmd+L, THE PasteBro SHALL hide the sidebar interface
3. WHEN the user presses Escape key while sidebar is visible, THE PasteBro SHALL hide the sidebar interface
4. WHEN the user clicks outside the sidebar area, THE PasteBro SHALL hide the sidebar interface
5. WHERE the user has configured a custom hotkey, THE PasteBro SHALL respond to the custom hotkey instead of Cmd+L

### Requirement 2: Clipboard Monitoring

**User Story:** As a user, I want the app to automatically capture everything I copy, so that I can access my complete clipboard history without manual intervention.

#### Acceptance Criteria

1. WHEN the system clipboard content changes, THE Clipboard Monitor SHALL capture the new content within 50 milliseconds
2. THE Clipboard Monitor SHALL detect and store text content with formatting metadata
3. THE Clipboard Monitor SHALL detect and store image content in original format
4. THE Clipboard Monitor SHALL detect and store file references with file paths
5. WHEN duplicate content is copied consecutively, THE History Store SHALL update the timestamp without creating a duplicate entry

### Requirement 3: History Display

**User Story:** As a user, I want to see all my clipboard history in a scrollable list with previews, so that I can quickly identify and select the item I need.

#### Acceptance Criteria

1. THE Sidebar Interface SHALL display clipboard items in reverse chronological order with newest items first
2. WHEN displaying text items, THE Sidebar Interface SHALL show the first 100 characters as preview
3. WHEN displaying image items, THE Sidebar Interface SHALL show a thumbnail preview scaled to fit the sidebar width
4. WHEN displaying file items, THE Sidebar Interface SHALL show the file icon and filename
5. THE Sidebar Interface SHALL display timestamp for each clipboard item in relative format

### Requirement 4: Item Selection and Copy

**User Story:** As a user, I want to click on any history item to copy it to my clipboard, so that I can quickly reuse previous clipboard content.

#### Acceptance Criteria

1. WHEN the user clicks a clipboard item, THE PasteBro SHALL copy the item content to system clipboard
2. WHERE user preference is set to "copy with formatting", THE PasteBro SHALL preserve all rich text formatting when copying text items
3. WHERE user preference is set to "copy without formatting", THE PasteBro SHALL strip all formatting and copy plain text only
4. WHEN an item is copied, THE Sidebar Interface SHALL provide visual feedback within 50 milliseconds
5. WHERE user preference is set to "auto-hide after copy", THE PasteBro SHALL hide the sidebar after copying an item

### Requirement 5: Multi-Selection

**User Story:** As a user, I want to select multiple items using Shift key, so that I can copy or delete multiple clipboard entries at once.

#### Acceptance Criteria

1. WHEN the user holds Shift and clicks items, THE Sidebar Interface SHALL add items to the selection set
2. THE Sidebar Interface SHALL highlight all selected items with distinct visual styling
3. WHEN multiple items are selected and user triggers copy, THE PasteBro SHALL concatenate selected items in order and copy to clipboard
4. WHEN the user clicks without Shift key, THE Sidebar Interface SHALL clear previous selection and select only the clicked item
5. WHEN the user presses Cmd+A, THE Sidebar Interface SHALL select all visible items

### Requirement 6: Paste with Formatting Control

**User Story:** As a user, I want to control whether pasted content includes formatting, so that I can paste content appropriately for different contexts.

#### Acceptance Criteria

1. WHERE user preference is set to "paste with formatting", WHEN the user pastes content, THE PasteBro SHALL preserve all rich text formatting
2. WHERE user preference is set to "paste without formatting", WHEN the user pastes content, THE PasteBro SHALL strip all formatting and paste plain text only
3. THE PasteBro SHALL provide a keyboard shortcut to toggle paste formatting mode temporarily
4. THE PasteBro SHALL provide visual indicator in sidebar showing current paste formatting mode
5. WHEN pasting images or files, THE PasteBro SHALL paste the original content regardless of formatting preference

### Requirement 7: Search and Filter

**User Story:** As a user, I want to search through my clipboard history, so that I can quickly find specific items from my past copies.

#### Acceptance Criteria

1. THE Sidebar Interface SHALL provide a search input field at the top of the sidebar
2. WHEN the user types in search field, THE Sidebar Interface SHALL filter items in real-time showing only matching items
3. THE PasteBro SHALL search within text content, filenames, and metadata
4. THE Sidebar Interface SHALL highlight matching text within search results
5. WHEN search field is empty, THE Sidebar Interface SHALL display all clipboard items

### Requirement 8: Item Management and Trash

**User Story:** As a user, I want to delete items and recover them from trash if needed, so that I can manage my clipboard history and recover accidentally deleted items.

#### Acceptance Criteria

1. WHEN the user presses Delete key on selected items, THE PasteBro SHALL move items to Trash
2. THE Sidebar Interface SHALL provide a Trash view accessible via navigation
3. WHEN viewing Trash, THE Sidebar Interface SHALL display all deleted items with deletion timestamp
4. WHEN the user selects "Restore" on trash items, THE PasteBro SHALL move items back to main history
5. WHEN the user selects "Empty Trash", THE PasteBro SHALL permanently delete all trash items and free storage space

### Requirement 9: Favorites and Pinning

**User Story:** As a user, I want to pin frequently used items to the top of my history, so that I can access important clipboard content quickly.

#### Acceptance Criteria

1. WHEN the user right-clicks an item and selects "Pin", THE PasteBro SHALL mark the item as pinned
2. THE Sidebar Interface SHALL display pinned items in a separate section at the top of the history
3. THE Sidebar Interface SHALL display a pin icon on pinned items
4. WHEN the user unpins an item, THE PasteBro SHALL move the item back to chronological position in history
5. THE History Store SHALL persist pinned status across application restarts

### Requirement 10: Data Type Support

**User Story:** As a user, I want the app to handle all types of clipboard content including text, images, files, and colors, so that I have complete clipboard history regardless of content type.

#### Acceptance Criteria

1. THE Clipboard Monitor SHALL capture and store plain text content
2. THE Clipboard Monitor SHALL capture and store rich text with HTML formatting
3. THE Clipboard Monitor SHALL capture and store images in PNG, JPEG, GIF, and TIFF formats
4. THE Clipboard Monitor SHALL capture and store file paths and file references
5. THE Clipboard Monitor SHALL capture and store color values in hex and RGB formats

### Requirement 11: History Limits and Storage

**User Story:** As a user, I want to configure how many items are stored and for how long, so that I can manage storage space and privacy.

#### Acceptance Criteria

1. THE PasteBro SHALL provide user preference to set maximum number of history items between 100 and 10000
2. WHEN history exceeds maximum limit, THE History Store SHALL remove oldest non-pinned items
3. THE PasteBro SHALL provide user preference to set history retention period in days
4. WHEN items exceed retention period, THE History Store SHALL automatically delete expired items
5. THE PasteBro SHALL display current storage usage in preferences

### Requirement 12: Performance and Memory Management

**User Story:** As a user on an Intel Mac, I want the app to use minimal CPU and memory resources, so that it runs smoothly without impacting other applications.

#### Acceptance Criteria

1. WHILE running in background, THE Clipboard Monitor SHALL consume less than 50MB of memory
2. WHILE sidebar is hidden, THE PasteBro SHALL consume less than 0.5% CPU on average
3. WHEN displaying sidebar with 1000 items, THE Sidebar Interface SHALL render within 200 milliseconds
4. THE PasteBro SHALL implement lazy loading for images to reduce memory footprint
5. THE PasteBro SHALL release memory for off-screen items in the scrollable list

### Requirement 13: Preferences and Customization

**User Story:** As a user, I want to customize the app's behavior and appearance, so that it works according to my workflow preferences.

#### Acceptance Criteria

1. THE PasteBro SHALL provide preferences window accessible via menu bar or keyboard shortcut
2. THE PasteBro SHALL allow user to configure global hotkey for sidebar activation
3. THE PasteBro SHALL allow user to configure default copy formatting preference
4. THE PasteBro SHALL allow user to configure default paste formatting preference
5. THE PasteBro SHALL allow user to configure sidebar position (left or right edge of screen)
6. THE PasteBro SHALL allow user to configure sidebar width between 300 and 800 pixels
7. THE PasteBro SHALL allow user to enable or disable launch at login
8. THE PasteBro SHALL persist all preferences across application restarts

### Requirement 14: Menu Bar Integration

**User Story:** As a user, I want to access the app from the menu bar, so that I can quickly access settings and controls without opening the main interface.

#### Acceptance Criteria

1. THE PasteBro SHALL display an icon in the macOS menu bar
2. WHEN the user clicks the menu bar icon, THE PasteBro SHALL display a dropdown menu
3. THE menu bar dropdown SHALL provide options to open sidebar, open preferences, and quit application
4. THE menu bar dropdown SHALL display current clipboard item preview
5. THE menu bar icon SHALL provide visual indication when clipboard monitoring is active

### Requirement 15: Native macOS Integration

**User Story:** As a user, I want the app to feel like a native macOS application, so that it integrates seamlessly with my system.

#### Acceptance Criteria

1. THE PasteBro SHALL use native macOS UI components and styling
2. THE PasteBro SHALL support macOS dark mode and light mode with automatic switching
3. THE PasteBro SHALL follow macOS Human Interface Guidelines for keyboard shortcuts
4. THE PasteBro SHALL integrate with macOS accessibility features
5. THE PasteBro SHALL use native macOS animations and transitions with 60fps performance

### Requirement 16: Quick Actions

**User Story:** As a user, I want to perform quick actions on clipboard items without opening menus, so that I can work more efficiently.

#### Acceptance Criteria

1. WHEN the user hovers over an item, THE Sidebar Interface SHALL display action buttons for copy, delete, and pin
2. WHEN the user right-clicks an item, THE Sidebar Interface SHALL display context menu with all available actions
3. THE PasteBro SHALL support keyboard shortcuts for common actions while sidebar is visible
4. WHEN the user double-clicks a text item, THE PasteBro SHALL open the item in a preview window with full content
5. THE PasteBro SHALL provide "Copy as Plain Text" action in context menu regardless of default preference

### Requirement 17: Data Privacy and Security

**User Story:** As a user, I want my clipboard data to be stored securely and privately, so that sensitive information remains protected.

#### Acceptance Criteria

1. THE History Store SHALL store all data locally on the user's machine
2. THE PasteBro SHALL provide option to exclude specific applications from clipboard monitoring
3. THE PasteBro SHALL provide option to pause clipboard monitoring temporarily
4. THE PasteBro SHALL provide option to clear all history immediately
5. WHEN the user enables "Ignore passwords" preference, THE Clipboard Monitor SHALL detect and skip password-like content

### Requirement 18: Import and Export

**User Story:** As a user, I want to export my clipboard history and import it on another machine, so that I can maintain my workflow across devices.

#### Acceptance Criteria

1. THE PasteBro SHALL provide export function that creates a backup file of all history items
2. THE PasteBro SHALL provide import function that restores history from backup file
3. THE export file SHALL include all clipboard items with metadata and formatting
4. THE PasteBro SHALL validate import files before restoring to prevent data corruption
5. THE PasteBro SHALL provide option to merge imported items with existing history or replace entirely
