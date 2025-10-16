const { clipboard } = require('electron');
const crypto = require('crypto');
const { ClipboardItem, ClipboardItemType } = require('./clipboardItem');
const ImageStorageManager = require('./imageStorageManager');

/**
 * ClipboardMonitor - Monitors system clipboard for changes
 * Polls clipboard every 50ms and detects changes via content hashing
 */
class ClipboardMonitor {
    constructor(onClipboardChange, imageStorageManager = null) {
        this.onClipboardChange = onClipboardChange;
        this.imageStorageManager = imageStorageManager;
        this.lastHash = null;
        this.interval = null;
        this.pollInterval = 50; // 50ms as per requirements
        this.isMonitoring = false;
        this.isPaused = false;
    }

    /**
     * Start monitoring clipboard
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('Clipboard monitoring already active');
            return;
        }

        this.isMonitoring = true;
        this.isPaused = false;

        // Initial check
        this.checkClipboard();

        // Start polling
        this.interval = setInterval(() => {
            if (!this.isPaused) {
                this.checkClipboard();
            }
        }, this.pollInterval);

        console.log('Clipboard monitoring started');
    }

    /**
     * Stop monitoring clipboard
     */
    stopMonitoring() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        this.isMonitoring = false;
        this.isPaused = false;
        console.log('Clipboard monitoring stopped');
    }

    /**
     * Pause monitoring temporarily
     */
    pauseMonitoring() {
        this.isPaused = true;
    }

    /**
     * Resume monitoring
     */
    resumeMonitoring() {
        this.isPaused = false;
    }

    /**
     * Check clipboard for changes
     */
    async checkClipboard() {
        try {
            const content = this.captureClipboardContent();

            if (!content) {
                return;
            }

            // Generate hash for change detection
            const currentHash = this.generateContentHash(content);

            // Check if content changed
            if (currentHash !== this.lastHash) {
                this.lastHash = currentHash;

                // Create ClipboardItem (now async for file storage)
                const result = await this.createClipboardItem(content, currentHash);

                if (result && this.onClipboardChange) {
                    // Handle both single item and array of items
                    if (Array.isArray(result)) {
                        // Multiple items - call handler for each
                        for (const item of result) {
                            this.onClipboardChange(item);
                        }
                    } else {
                        // Single item
                        this.onClipboardChange(result);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking clipboard:', error);
        }
    }

    /**
     * Capture current clipboard content
     */
    captureClipboardContent() {
        try {
            const formats = clipboard.availableFormats();

            if (formats.length === 0) {
                return null;
            }

            const content = {
                formats: formats,
                text: null,
                html: null,
                image: null,
                rtf: null,
                files: null,
                fileUrl: null
            };

            // Check for file paths FIRST (macOS specific) - Priority for multiple files
            if (process.platform === 'darwin') {
                // First check for multiple files (text/uri-list)
                if (formats.includes('text/uri-list')) {
                    const uriList = clipboard.read('text/uri-list');
                    if (uriList) {
                        const files = uriList.split('\n')
                            .filter(uri => uri.trim().startsWith('file://'))
                            .map(uri => decodeURIComponent(uri.replace('file://', '').trim()));

                        if (files.length > 0) {
                            content.files = files;
                            content.fileUrl = files[0]; // Keep first for backward compatibility
                            return content;
                        }
                    }
                }
            }

            // Capture image (only if no files detected)
            if (formats.some(f => f.startsWith('image/'))) {
                const image = clipboard.readImage();
                if (!image.isEmpty()) {
                    content.image = image.toPNG();
                    // If we have an image, return early to avoid text capture
                    return content;
                }
            }

            // Capture text
            if (formats.includes('text/plain')) {
                content.text = clipboard.readText();
            }

            // Capture HTML
            if (formats.includes('text/html')) {
                content.html = clipboard.readHTML();
            }

            // Capture RTF
            if (formats.includes('text/rtf')) {
                content.rtf = clipboard.readRTF();
            }

            return content;
        } catch (error) {
            console.error('Error capturing clipboard content:', error);
            return null;
        }
    }

    /**
     * Get file size
     */
    getFileSize(filePath) {
        try {
            const fs = require('fs');
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                return stats.size;
            }
        } catch (error) {
            return 0;
        }
        return 0;
    }

    /**
     * Generate thumbnail from image data (synchronous)
     */
    generateThumbnail(imageBuffer) {
        try {
            const sharp = require('sharp');
            // Generate small thumbnail - toBufferSync doesn't exist, so we skip for now
            // Thumbnails will be generated on-demand in the UI or we store full image
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Generate hash from clipboard content for change detection
     */
    generateContentHash(content) {
        let hashContent = '';

        if (content.fileUrl) {
            // For file URLs, use the file path + file size for uniqueness
            const fileSize = this.getFileSize(content.fileUrl);
            hashContent = content.fileUrl + '|' + fileSize;
        } else if (content.image) {
            // For images, use first 1000 bytes of PNG data
            hashContent = content.image.toString('base64').substring(0, 1000);
        } else if (content.html) {
            // For HTML, use the HTML content
            hashContent = content.html;
        } else if (content.text) {
            // For plain text
            hashContent = content.text;
        } else if (content.rtf) {
            // For RTF
            hashContent = content.rtf;
        }

        return crypto.createHash('sha256').update(hashContent).digest('hex');
    }

    /**
     * Get active application name (macOS)
     */
    getActiveApplication() {
        try {
            if (process.platform === 'darwin') {
                const { execSync } = require('child_process');
                const result = execSync('osascript -e \'tell application "System Events" to get name of first application process whose frontmost is true\'', { encoding: 'utf8' });
                return result.trim();
            }
        } catch (error) {
            console.error('Error getting active application:', error);
        }
        return null;
    }



    /**
     * Check if file is an image
     */
    isImageFile(filePath) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp', '.svg', '.ico'];
        const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
        return imageExtensions.includes(ext);
    }

    /**
     * Load image from file path
     */
    loadImageFromFile(filePath) {
        try {
            const fs = require('fs');
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath);
            }
        } catch (error) {
            console.error('Error loading image from file:', error);
        }
        return null;
    }

    /**
     * Create ClipboardItem from captured content
     */
    async createClipboardItem(content, contentHash) {
        try {
            const sourceApp = this.getActiveApplication();

            // Direct image from clipboard (highest priority)
            if (content.image && this.imageStorageManager) {
                // Save image to file storage
                const { id, imagePath, thumbnailPath, fileSize } = await this.imageStorageManager.saveImage(content.image);

                return new ClipboardItem({
                    id: id,
                    type: ClipboardItemType.IMAGE,
                    imagePath: imagePath,
                    thumbnailPath: thumbnailPath,
                    imageData: null, // Don't store in DB
                    imageThumbnail: null,
                    contentHash: contentHash,
                    fileSize: fileSize,
                    sourceApplication: sourceApp
                });
            } else if (content.image) {
                // Fallback if no storage manager
                return new ClipboardItem({
                    type: ClipboardItemType.IMAGE,
                    imageData: content.image,
                    imageThumbnail: null,
                    contentHash: contentHash,
                    fileSize: content.image.length,
                    sourceApplication: sourceApp
                });
            }

            // Check if we have files (single or multiple) - create separate items for each
            if (content.files && content.files.length > 0) {
                // Return array of items (one per file)
                const items = [];
                for (const filePath of content.files) {
                    if (this.isImageFile(filePath)) {
                        const imageData = this.loadImageFromFile(filePath);
                        if (imageData && this.imageStorageManager) {
                            const { id, imagePath, thumbnailPath, fileSize } = await this.imageStorageManager.saveImage(imageData);
                            items.push(new ClipboardItem({
                                id: id,
                                type: ClipboardItemType.IMAGE,
                                imagePath: imagePath,
                                thumbnailPath: thumbnailPath,
                                imageData: null,
                                imageThumbnail: null,
                                contentHash: this.generateContentHash({ image: imageData }),
                                fileSize: fileSize,
                                sourceApplication: sourceApp
                            }));
                        }
                    } else {
                        items.push(new ClipboardItem({
                            type: ClipboardItemType.FILE,
                            filePaths: [filePath],
                            contentHash: this.generateContentHash({ fileUrl: filePath }),
                            sourceApplication: sourceApp
                        }));
                    }
                }
                return items.length === 1 ? items[0] : items; // Return single item or array
            }

            // Fallback for old code path
            if (content.fileUrl) {
                // If it's an image file, load the image data
                if (this.isImageFile(content.fileUrl)) {
                    const imageData = this.loadImageFromFile(content.fileUrl);
                    if (imageData) {
                        return new ClipboardItem({
                            type: ClipboardItemType.IMAGE,
                            imageData: imageData,
                            imageThumbnail: null,
                            contentHash: contentHash,
                            fileSize: imageData.length,
                            sourceApplication: sourceApp,
                            plainText: content.fileUrl
                        });
                    }
                }

                // Otherwise treat as file
                return new ClipboardItem({
                    type: ClipboardItemType.FILE,
                    filePaths: [content.fileUrl],
                    contentHash: contentHash,
                    sourceApplication: sourceApp
                });
            }

            // Fallback to text content
            if (content.text) {
                if (content.html) {
                    return new ClipboardItem({
                        type: ClipboardItemType.RICH_TEXT,
                        plainText: content.text,
                        richText: content.html,
                        contentHash: contentHash,
                        fileSize: Buffer.byteLength(content.text, 'utf8'),
                        sourceApplication: sourceApp
                    });
                } else {
                    return new ClipboardItem({
                        type: ClipboardItemType.TEXT,
                        plainText: content.text,
                        contentHash: contentHash,
                        fileSize: Buffer.byteLength(content.text, 'utf8'),
                        sourceApplication: sourceApp
                    });
                }
            }

            return null;
        } catch (error) {
            console.error('Error creating clipboard item:', error);
            return null;
        }
    }

    /**
     * Create multi-file clipboard item
     */
    createMultiFileItem(filePaths, contentHash, sourceApp) {
        const fileTypes = filePaths.map(path => {
            if (this.isImageFile(path)) return 'image';
            return 'file';
        });

        const isAllImages = fileTypes.every(type => type === 'image');

        // Don't load thumbnails immediately to avoid blocking
        // Thumbnails will be generated on-demand in the UI
        return new ClipboardItem({
            type: ClipboardItemType.MULTI_FILE,
            filePaths: filePaths,
            fileCount: filePaths.length,
            fileTypes: fileTypes,
            isAllImages: isAllImages,
            thumbnails: null, // Load on-demand
            contentHash: contentHash,
            sourceApplication: sourceApp
        });
    }

    /**
     * Generate thumbnail with optimization for Intel Macs
     */
    async generateThumbnail(imageBuffer) {
        try {
            const sharp = require('sharp');
            // Generate 100x100 thumbnail with JPEG compression at 70% quality
            const thumbnail = await sharp(imageBuffer)
                .resize(100, 100, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality: 70 })
                .toBuffer();
            return thumbnail;
        } catch (error) {
            // If sharp fails, return null (UI will handle)
            return null;
        }
    }

    /**
     * Get monitoring status
     */
    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            isPaused: this.isPaused,
            pollInterval: this.pollInterval
        };
    }
}

module.exports = ClipboardMonitor;
