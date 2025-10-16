const crypto = require('crypto');

/**
 * Generate UUID v4
 */
function uuidv4() {
    return crypto.randomUUID();
}

/**
 * ClipboardItem types
 */
const ClipboardItemType = {
    TEXT: 'text',
    RICH_TEXT: 'richText',
    IMAGE: 'image',
    FILE: 'file',
    MULTI_FILE: 'multi-file',
    COLOR: 'color'
};

/**
 * ClipboardItem class representing a single clipboard entry
 */
class ClipboardItem {
    constructor({
        id = null,
        type,
        timestamp = null,
        isPinned = false,
        isDeleted = false,
        contentHash = null,
        plainText = null,
        richText = null,
        imageData = null,
        imageThumbnail = null,
        imagePath = null,
        thumbnailPath = null,
        filePaths = null,
        colorValue = null,
        sourceApplication = null,
        fileSize = null,
        fileCount = null,
        fileTypes = null,
        isAllImages = false,
        thumbnails = null
    }) {
        this.id = id || uuidv4();
        this.type = type;
        this.timestamp = timestamp || Date.now();
        this.isPinned = isPinned;
        this.isDeleted = isDeleted;
        this.contentHash = contentHash || this._generateContentHash();
        this.plainText = plainText;
        this.richText = richText;
        this.imageData = imageData;
        this.imageThumbnail = imageThumbnail;
        this.imagePath = imagePath;
        this.thumbnailPath = thumbnailPath;
        this.filePaths = filePaths;
        this.colorValue = colorValue;
        this.sourceApplication = sourceApplication;
        this.fileSize = fileSize;
        this.fileCount = fileCount;
        this.fileTypes = fileTypes;
        this.isAllImages = isAllImages;
        this.thumbnails = thumbnails;
    }

    /**
     * Generate content hash for duplicate detection
     */
    _generateContentHash() {
        let content = '';

        switch (this.type) {
            case ClipboardItemType.TEXT:
            case ClipboardItemType.RICH_TEXT:
                content = this.plainText || '';
                break;
            case ClipboardItemType.IMAGE:
                content = this.imageData ? this.imageData.toString('base64').substring(0, 1000) : '';
                break;
            case ClipboardItemType.FILE:
            case ClipboardItemType.MULTI_FILE:
                content = this.filePaths ? JSON.stringify(this.filePaths) : '';
                break;
            case ClipboardItemType.COLOR:
                content = this.colorValue || '';
                break;
            default:
                content = '';
        }

        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Generate content hash from raw content (static method)
     */
    static generateHash(content, type = ClipboardItemType.TEXT) {
        let hashContent = '';

        if (type === ClipboardItemType.IMAGE && Buffer.isBuffer(content)) {
            hashContent = content.toString('base64').substring(0, 1000);
        } else if (type === ClipboardItemType.FILE && Array.isArray(content)) {
            hashContent = JSON.stringify(content);
        } else {
            hashContent = String(content);
        }

        return crypto.createHash('sha256').update(hashContent).digest('hex');
    }

    /**
     * Get preview text for display
     */
    getPreview(maxLength = 100) {
        switch (this.type) {
            case ClipboardItemType.TEXT:
            case ClipboardItemType.RICH_TEXT:
                if (!this.plainText) return '';
                const text = this.plainText.replace(/\s+/g, ' ').trim();
                return text.length > maxLength 
                    ? text.substring(0, maxLength) + '...' 
                    : text;

            case ClipboardItemType.IMAGE:
                const size = this.fileSize 
                    ? ` (${this._formatFileSize(this.fileSize)})` 
                    : '';
                return `Image${size}`;

            case ClipboardItemType.FILE:
                if (!this.filePaths || this.filePaths.length === 0) return 'File';
                const fileName = this._getFileName(this.filePaths[0]);
                const count = this.filePaths.length > 1 
                    ? ` +${this.filePaths.length - 1} more` 
                    : '';
                return `${fileName}${count}`;

            case ClipboardItemType.MULTI_FILE:
                const fileCount = this.fileCount || (this.filePaths ? this.filePaths.length : 0);
                if (this.isAllImages) {
                    return `${fileCount} image${fileCount !== 1 ? 's' : ''}`;
                }
                return `${fileCount} file${fileCount !== 1 ? 's' : ''}`;

            case ClipboardItemType.COLOR:
                return this.colorValue || 'Color';

            default:
                return 'Unknown';
        }
    }

    /**
     * Get file name from path
     */
    _getFileName(filePath) {
        if (!filePath) return '';
        const parts = filePath.split('/');
        return parts[parts.length - 1] || filePath;
    }

    /**
     * Format file size for display
     */
    _formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Serialize to database format
     */
    toDatabase() {
        return {
            id: this.id,
            type: this.type,
            timestamp: this.timestamp,
            isPinned: this.isPinned,
            isDeleted: this.isDeleted,
            contentHash: this.contentHash,
            plainText: this.plainText,
            richText: this.richText,
            imageData: this.imageData,
            thumbnailData: this.imageThumbnail,
            imagePath: this.imagePath,
            thumbnailPath: this.thumbnailPath,
            filePaths: this.filePaths,
            colorValue: this.colorValue,
            sourceApplication: this.sourceApplication,
            fileSize: this.fileSize,
            fileCount: this.fileCount,
            fileTypes: this.fileTypes ? JSON.stringify(this.fileTypes) : null,
            isAllImages: this.isAllImages ? 1 : 0,
            thumbnails: this.thumbnails
        };
    }

    /**
     * Deserialize from database format
     */
    static fromDatabase(dbRow) {
        return new ClipboardItem({
            id: dbRow.id,
            type: dbRow.type,
            timestamp: dbRow.timestamp,
            isPinned: dbRow.isPinned,
            isDeleted: dbRow.isDeleted,
            contentHash: dbRow.contentHash,
            plainText: dbRow.plainText,
            richText: dbRow.richText,
            imageData: dbRow.imageData,
            imageThumbnail: dbRow.thumbnailData,
            imagePath: dbRow.imagePath,
            thumbnailPath: dbRow.thumbnailPath,
            filePaths: dbRow.filePaths,
            colorValue: dbRow.colorValue,
            sourceApplication: dbRow.sourceApplication,
            fileSize: dbRow.fileSize,
            fileCount: dbRow.fileCount,
            fileTypes: dbRow.fileTypes ? JSON.parse(dbRow.fileTypes) : null,
            isAllImages: dbRow.isAllImages === 1,
            thumbnails: dbRow.thumbnails
        });
    }

    /**
     * Create ClipboardItem from text content
     */
    static fromText(text, richText = null) {
        const plainText = String(text);
        const contentHash = ClipboardItem.generateHash(plainText, ClipboardItemType.TEXT);
        
        return new ClipboardItem({
            type: richText ? ClipboardItemType.RICH_TEXT : ClipboardItemType.TEXT,
            plainText,
            richText,
            contentHash,
            fileSize: Buffer.byteLength(plainText, 'utf8')
        });
    }

    /**
     * Create ClipboardItem from image data
     */
    static fromImage(imageBuffer, thumbnail = null) {
        if (!Buffer.isBuffer(imageBuffer)) {
            throw new Error('Image data must be a Buffer');
        }

        const contentHash = ClipboardItem.generateHash(imageBuffer, ClipboardItemType.IMAGE);
        
        return new ClipboardItem({
            type: ClipboardItemType.IMAGE,
            imageData: imageBuffer,
            imageThumbnail: thumbnail,
            contentHash,
            fileSize: imageBuffer.length
        });
    }

    /**
     * Create ClipboardItem from file paths
     */
    static fromFiles(filePaths) {
        if (!Array.isArray(filePaths) || filePaths.length === 0) {
            throw new Error('File paths must be a non-empty array');
        }

        const contentHash = ClipboardItem.generateHash(filePaths, ClipboardItemType.FILE);
        
        return new ClipboardItem({
            type: ClipboardItemType.FILE,
            filePaths,
            contentHash
        });
    }

    /**
     * Create ClipboardItem from color value
     */
    static fromColor(colorValue) {
        const contentHash = ClipboardItem.generateHash(colorValue, ClipboardItemType.COLOR);
        
        return new ClipboardItem({
            type: ClipboardItemType.COLOR,
            colorValue,
            contentHash
        });
    }

    /**
     * Get relative timestamp (e.g., "2 minutes ago")
     */
    getRelativeTime() {
        const now = Date.now();
        const diff = now - this.timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) {
            return 'Just now';
        } else if (minutes < 60) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else if (hours < 24) {
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else if (days < 7) {
            return `${days} day${days !== 1 ? 's' : ''} ago`;
        } else {
            return new Date(this.timestamp).toLocaleDateString();
        }
    }

    /**
     * Get absolute timestamp
     */
    getAbsoluteTime() {
        return new Date(this.timestamp).toLocaleString();
    }

    /**
     * Clone the item
     */
    clone() {
        return new ClipboardItem({
            id: this.id,
            type: this.type,
            timestamp: this.timestamp,
            isPinned: this.isPinned,
            isDeleted: this.isDeleted,
            contentHash: this.contentHash,
            plainText: this.plainText,
            richText: this.richText,
            imageData: this.imageData,
            imageThumbnail: this.imageThumbnail,
            filePaths: this.filePaths ? [...this.filePaths] : null,
            colorValue: this.colorValue,
            sourceApplication: this.sourceApplication,
            fileSize: this.fileSize
        });
    }

    /**
     * Check if item matches search query
     */
    matchesSearch(query) {
        if (!query) return true;
        
        const lowerQuery = query.toLowerCase();
        
        switch (this.type) {
            case ClipboardItemType.TEXT:
            case ClipboardItemType.RICH_TEXT:
                return this.plainText && this.plainText.toLowerCase().includes(lowerQuery);
            
            case ClipboardItemType.FILE:
            case ClipboardItemType.MULTI_FILE:
                return this.filePaths && this.filePaths.some(path => 
                    path.toLowerCase().includes(lowerQuery)
                );
            
            case ClipboardItemType.COLOR:
                return this.colorValue && this.colorValue.toLowerCase().includes(lowerQuery);
            
            default:
                return false;
        }
    }

    /**
     * Validate item data
     */
    isValid() {
        if (!this.id || !this.type || !this.timestamp) {
            return false;
        }

        switch (this.type) {
            case ClipboardItemType.TEXT:
            case ClipboardItemType.RICH_TEXT:
                return this.plainText !== null && this.plainText !== undefined;
            
            case ClipboardItemType.IMAGE:
                return this.imageData !== null;
            
            case ClipboardItemType.FILE:
            case ClipboardItemType.MULTI_FILE:
                return Array.isArray(this.filePaths) && this.filePaths.length > 0;
            
            case ClipboardItemType.COLOR:
                return this.colorValue !== null;
            
            default:
                return false;
        }
    }
}

module.exports = {
    ClipboardItem,
    ClipboardItemType
};
