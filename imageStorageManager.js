const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * ImageStorageManager - Handles file-based image storage like PastePal
 * Stores images as files instead of BLOBs for better performance
 */
class ImageStorageManager {
  constructor(basePath) {
    this.basePath = basePath;
    this.imagesPath = path.join(basePath, 'images');
    this.thumbnailsPath = path.join(basePath, 'thumbnails');
  }

  /**
   * Initialize storage directories
   */
  async initialize() {
    try {
      await fs.mkdir(this.imagesPath, { recursive: true });
      await fs.mkdir(this.thumbnailsPath, { recursive: true });
      console.log('Image storage directories created');
    } catch (error) {
      console.error('Failed to create image directories:', error);
      throw error;
    }
  }

  /**
   * Save image to file with aggressive compression and generate thumbnail
   */
  async saveImage(imageBuffer, id = null) {
    try {
      const sharp = require('sharp');
      
      // Generate ID if not provided
      const imageId = id || crypto.randomUUID();

      // Compress image aggressively using WebP (better than PNG, smaller files)
      // WebP provides 25-35% better compression than PNG
      const compressedBuffer = await sharp(imageBuffer)
        .webp({ quality: 85, effort: 6 }) // High quality WebP with good compression
        .toBuffer();

      const imagePath = path.join(this.imagesPath, `${imageId}.webp`);
      await fs.writeFile(imagePath, compressedBuffer);

      // Generate and save thumbnail (200x200 JPEG at 70% quality)
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
        
      const thumbnailPath = path.join(this.thumbnailsPath, `${imageId}.jpg`);
      await fs.writeFile(thumbnailPath, thumbnailBuffer);

      return {
        id: imageId,
        imagePath,
        thumbnailPath,
        fileSize: imageBuffer.length
      };
    } catch (error) {
      console.error('Failed to save image:', error);
      throw error;
    }
  }

  /**
   * Generate 200x200 thumbnail with JPEG compression at 70% quality
   */
  async generateThumbnail(imageBuffer) {
    try {
      const sharp = require('sharp');
      
      const thumbnail = await sharp(imageBuffer)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 70 })
        .toBuffer();

      return thumbnail;
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      // Return original if thumbnail generation fails
      return imageBuffer;
    }
  }

  /**
   * Delete image and thumbnail files
   */
  async deleteImage(id) {
    // Validate ID to prevent path traversal
    if (typeof id !== 'string' || !id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      throw new Error('Invalid image ID');
    }
    
    try {
      const imagePath = path.join(this.imagesPath, `${id}.png`);
      const thumbnailPath = path.join(this.thumbnailsPath, `${id}.jpg`);

      // Delete both files (ignore errors if files don't exist)
      await Promise.allSettled([
        fs.unlink(imagePath),
        fs.unlink(thumbnailPath)
      ]);

      return true;
    } catch (error) {
      console.error('Failed to delete image:', error);
      return false;
    }
  }

  /**
   * Check if image file exists
   */
  async imageExists(id) {
    try {
      const imagePath = path.join(this.imagesPath, `${id}.png`);
      await fs.access(imagePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get image file path
   */
  getImagePath(id) {
    return path.join(this.imagesPath, `${id}.png`);
  }

  /**
   * Get thumbnail file path
   */
  getThumbnailPath(id) {
    return path.join(this.thumbnailsPath, `${id}.jpg`);
  }

  /**
   * Read image file
   */
  async readImage(id) {
    // Validate ID to prevent path traversal
    if (typeof id !== 'string' || !id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      throw new Error('Invalid image ID');
    }
    
    try {
      const imagePath = this.getImagePath(id);
      return await fs.readFile(imagePath);
    } catch (error) {
      console.error('Failed to read image:', error);
      return null;
    }
  }

  /**
   * Read thumbnail file
   */
  async readThumbnail(id) {
    // Validate ID to prevent path traversal
    if (typeof id !== 'string' || !id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      throw new Error('Invalid image ID');
    }
    
    try {
      const thumbnailPath = this.getThumbnailPath(id);
      return await fs.readFile(thumbnailPath);
    } catch (error) {
      console.error('Failed to read thumbnail:', error);
      return null;
    }
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    try {
      const imageFiles = await fs.readdir(this.imagesPath);
      const thumbnailFiles = await fs.readdir(this.thumbnailsPath);

      let totalImageSize = 0;
      let totalThumbnailSize = 0;

      for (const file of imageFiles) {
        const stats = await fs.stat(path.join(this.imagesPath, file));
        totalImageSize += stats.size;
      }

      for (const file of thumbnailFiles) {
        const stats = await fs.stat(path.join(this.thumbnailsPath, file));
        totalThumbnailSize += stats.size;
      }

      return {
        imageCount: imageFiles.length,
        thumbnailCount: thumbnailFiles.length,
        totalImageSize,
        totalThumbnailSize,
        totalSize: totalImageSize + totalThumbnailSize
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return null;
    }
  }
}

module.exports = ImageStorageManager;
