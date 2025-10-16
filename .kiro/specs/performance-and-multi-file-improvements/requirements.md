# Requirements Document

## Introduction

This document outlines requirements for improving PasteBro's startup performance, window behavior, permissions handling, and multi-file clipboard support. The focus is on making the app feel instant, work seamlessly across all window modes, and properly handle multiple files copied together.

## Glossary

- **PasteBro**: The clipboard manager application
- **Sidebar**: The main UI window that displays clipboard history
- **Tray Menu**: The menu bar icon and dropdown menu
- **Full Disk Access**: macOS permission required for accessing file metadata and images from all applications
- **Multi-File Clipboard**: When multiple files are copied together as a single clipboard operation
- **Window Level**: The z-order priority that determines if a window appears above others

## Requirements

### Requirement 1: Fast Startup

**User Story:** As a user, I want PasteBro to start instantly when I log in, so that I don't have to wait for the app to be ready.

#### Acceptance Criteria

1. WHEN the application launches, THE PasteBro SHALL display the tray menu icon within 500 milliseconds
2. WHEN the application launches, THE PasteBro SHALL defer non-critical initialization tasks until after the tray icon appears
3. WHEN the application launches, THE PasteBro SHALL start clipboard monitoring within 1 second of app start
4. WHEN the application launches, THE PasteBro SHALL load the sidebar window in the background without blocking tray icon display

### Requirement 2: Sidebar Above All Windows

**User Story:** As a user, I want the sidebar to appear in front of all applications including fullscreen apps, so that I can access my clipboard history without switching contexts.

#### Acceptance Criteria

1. WHEN the sidebar is shown, THE PasteBro SHALL display the sidebar above all other windows including fullscreen applications
2. WHEN a user is in fullscreen mode, THE PasteBro SHALL display the sidebar without exiting fullscreen mode
3. WHEN the sidebar is visible, THE PasteBro SHALL maintain the sidebar's position at the floating window level

### Requirement 3: Full Disk Access Notification

**User Story:** As a user, I want to be informed about Full Disk Access requirements, so that I understand why the app needs this permission and can enable it.

#### Acceptance Criteria

1. WHEN the application first launches, THE PasteBro SHALL check if Full Disk Access permission is granted
2. IF Full Disk Access is not granted, THEN THE PasteBro SHALL display a notification explaining the permission requirement
3. WHEN the notification is displayed, THE PasteBro SHALL provide a button to open System Preferences to the correct permission panel
4. WHEN Full Disk Access is granted, THE PasteBro SHALL not display the permission notification

### Requirement 4: Multi-File Clipboard Detection

**User Story:** As a user, I want to see all files I copied together as a single clipboard item, so that I can paste them all at once.

#### Acceptance Criteria

1. WHEN multiple files are copied together, THE PasteBro SHALL detect all files in the clipboard operation
2. WHEN multiple files are detected, THE PasteBro SHALL create a single clipboard item containing all file references
3. WHEN a multi-file clipboard item is displayed, THE PasteBro SHALL show the count of files (e.g., "8 images")
4. WHEN a multi-file clipboard item contains images, THE PasteBro SHALL display thumbnails for up to 4 images in a grid layout
5. WHEN a user pastes a multi-file clipboard item, THE PasteBro SHALL restore all files to the clipboard so they paste together

### Requirement 5: Multi-Image Display

**User Story:** As a user, I want to see previews of multiple images when I copy them together, so that I can identify the group of images I want to paste.

#### Acceptance Criteria

1. WHEN a multi-file clipboard item contains only image files, THE PasteBro SHALL label the item as "X images"
2. WHEN displaying a multi-image item, THE PasteBro SHALL show up to 4 image thumbnails in a 2x2 grid
3. IF a multi-image item contains more than 4 images, THEN THE PasteBro SHALL display a "+X more" indicator
4. WHEN a user clicks on a multi-image item, THE PasteBro SHALL copy all image files to the clipboard for pasting
