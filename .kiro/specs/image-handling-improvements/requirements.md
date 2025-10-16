# Requirements Document

## Introduction

This document outlines requirements for improving image handling in PasteBro to match PastePal's performance and functionality. The focus is on fixing shift-select for images, storing images as files instead of BLOBs, implementing efficient image previews, and supporting proper multi-image paste operations.

## Glossary

- **PasteBro**: The clipboard manager application
- **BLOB Storage**: Storing binary image data directly in SQLite database
- **File Storage**: Storing images as separate files with database references
- **Image Preview**: Thumbnail or compressed version of image for UI display
- **Multi-Image Paste**: Pasting multiple selected images in order
- **NSPasteboard**: macOS native clipboard API
- **UTI**: Uniform Type Identifier (macOS type system)

## Requirements

### Requirement 1: File-Based Image Storage (Like PastePal)

**User Story:** As a user, I want images to be stored efficiently without bloating the database, so that the app remains fast even with many images.

#### Acceptance Criteria

1. WHEN an image is copied, THE PasteBro SHALL store the image as a PNG/JPEG file in `~/Library/Application Support/pastebro/images/`
2. WHEN storing an image file, THE PasteBro SHALL generate a unique filename using UUID (e.g., `abc123.png`)
3. WHEN storing an image, THE PasteBro SHALL save ONLY the file path in the database, NOT the image BLOB data
4. WHEN the app starts, THE PasteBro SHALL create the images directory if it doesn't exist
5. WHEN an item is deleted permanently, THE PasteBro SHALL also delete the associated image file from disk
6. WHEN storing images, THE PasteBro SHALL NOT store any image binary data in SQLite

### Requirement 2: Efficient Image Thumbnails

**User Story:** As a user, I want to see image previews in the sidebar without lag, so that I can quickly browse my clipboard history.

#### Acceptance Criteria

1. WHEN an image is stored, THE PasteBro SHALL generate a 200x200 thumbnail in JPEG format at 70% quality
2. WHEN displaying images in the sidebar, THE PasteBro SHALL show thumbnails instead of full-resolution images
3. WHEN a thumbnail is generated, THE PasteBro SHALL store it in a separate thumbnails directory
4. WHEN loading the sidebar, THE PasteBro SHALL load thumbnails asynchronously to prevent UI blocking
5. WHEN displaying 100+ items, THE PasteBro SHALL maintain smooth scrolling performance

### Requirement 3: Fix Shift-Select for Images

**User Story:** As a user, I want shift-select to work correctly with images, so that I can select ranges of images just like text items.

#### Acceptance Criteria

1. WHEN shift-selecting a range that includes images, THE PasteBro SHALL add all items in the range to selection
2. WHEN shift-selecting from top to bottom, THE PasteBro SHALL preserve the top-to-bottom order
3. WHEN shift-selecting from bottom to top, THE PasteBro SHALL preserve the bottom-to-top order
4. WHEN pasting multiple selected images, THE PasteBro SHALL paste them in the exact selection order
5. WHEN mixing text and images in selection, THE PasteBro SHALL handle both types correctly

### Requirement 4: Multi-Image Paste Support

**User Story:** As a user, I want to paste multiple selected images at once, so that I can efficiently move groups of images between applications.

#### Acceptance Criteria

1. WHEN multiple images are selected and pasted, THE PasteBro SHALL write all images to the clipboard as separate pasteboard items
2. WHEN pasting multiple images, THE PasteBro SHALL preserve the selection order
3. WHEN pasting into apps that support multiple images, THE PasteBro SHALL paste all images at once
4. WHEN pasting multiple images, THE PasteBro SHALL use native macOS pasteboard APIs for compatibility
5. WHEN pasting fails, THE PasteBro SHALL fall back to pasting images as file URLs

### Requirement 5: Image Preview in UI

**User Story:** As a user, I want to see actual image previews in the sidebar, so that I can visually identify images without opening them.

#### Acceptance Criteria

1. WHEN displaying an image item, THE PasteBro SHALL show the thumbnail image in the sidebar
2. WHEN a thumbnail fails to load, THE PasteBro SHALL show a placeholder icon
3. WHEN hovering over an image item, THE PasteBro SHALL show a larger preview in a tooltip
4. WHEN displaying multi-image items, THE PasteBro SHALL show up to 4 thumbnails in a grid
5. WHEN scrolling through images, THE PasteBro SHALL lazy-load thumbnails to maintain performance

### Requirement 6: Database Migration

**User Story:** As a user with existing clipboard history, I want my data to be migrated automatically, so that I don't lose my clipboard history.

#### Acceptance Criteria

1. WHEN the app detects BLOB-stored images, THE PasteBro SHALL migrate them to file storage
2. WHEN migrating images, THE PasteBro SHALL generate thumbnails for existing images
3. WHEN migration is complete, THE PasteBro SHALL remove BLOB data from the database
4. WHEN migration fails for an item, THE PasteBro SHALL log the error and continue with other items
5. WHEN migration is complete, THE PasteBro SHALL update the database version number

### Requirement 7: Copy Button Functionality

**User Story:** As a user, I want the copy button to work reliably, so that I can quickly copy items to my clipboard.

#### Acceptance Criteria

1. WHEN the copy button is clicked, THE PasteBro SHALL copy the item to the clipboard
2. WHEN an item is double-clicked, THE PasteBro SHALL copy the item to the clipboard
3. WHEN an item is copied via button or double-click, THE PasteBro SHALL show visual feedback
4. WHEN copying is successful, THE PasteBro SHALL optionally hide the sidebar based on preferences
5. WHEN copying fails, THE PasteBro SHALL show an error message to the user

### Requirement 8: UI Visual Improvements

**User Story:** As a user, I want the UI to be beautiful and readable, so that I can easily see and interact with my clipboard items.

#### Acceptance Criteria

1. WHEN an item is selected, THE PasteBro SHALL use high-contrast text colors for readability
2. WHEN displaying tab labels (Pinned, Trash), THE PasteBro SHALL use appropriate colors that match the design
3. WHEN an item is selected, THE PasteBro SHALL apply a clear visual highlight with readable text
4. WHEN displaying the sidebar, THE PasteBro SHALL use a clean, Apple-inspired design aesthetic
5. WHEN hovering over buttons, THE PasteBro SHALL show clear hover states for better UX

### Requirement 9: Smooth Scrolling Performance

**User Story:** As a user, I want smooth scrolling through my clipboard history, so that I can quickly browse items without lag.

#### Acceptance Criteria

1. WHEN scrolling through items, THE PasteBro SHALL maintain 60fps scrolling performance
2. WHEN the sidebar contains 100+ items, THE PasteBro SHALL use virtual scrolling or lazy rendering
3. WHEN rendering items, THE PasteBro SHALL only render visible items plus a small buffer
4. WHEN scrolling quickly, THE PasteBro SHALL not block the UI thread with heavy operations
5. WHEN displaying images, THE PasteBro SHALL load them asynchronously without blocking scroll
