const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

class DatabaseManager {
    constructor(dbPath = null) {
        // Use app data directory if no path specified
        const userDataPath = app.getPath('userData');
        this.dbPath = dbPath || path.join(userDataPath, 'pastebro.db');

        // Ensure directory exists
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = null;
        this.currentVersion = 3;
    }

    /**
     * Initialize database connection and schema
     */
    init() {
        try {
            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL'); // Better performance
            this.initSchema();
            this.runMigrations();
            return true;
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw new Error(`Database initialization failed: ${error.message}`);
        }
    }

    /**
     * Create initial database schema
     */
    initSchema() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS clipboard_items (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                is_pinned INTEGER DEFAULT 0,
                is_deleted INTEGER DEFAULT 0,
                content_hash TEXT NOT NULL,
                plain_text TEXT,
                rich_text TEXT,
                image_data BLOB,
                thumbnail_data BLOB,
                image_path TEXT,
                thumbnail_path TEXT,
                file_paths TEXT,
                color_value TEXT,
                source_application TEXT,
                file_size INTEGER,
                file_count INTEGER DEFAULT 1,
                file_types TEXT,
                is_all_images INTEGER DEFAULT 0
            )
        `;

        const createIndexes = [
            'CREATE INDEX IF NOT EXISTS idx_timestamp ON clipboard_items(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_pinned ON clipboard_items(is_pinned)',
            'CREATE INDEX IF NOT EXISTS idx_deleted ON clipboard_items(is_deleted)',
            'CREATE INDEX IF NOT EXISTS idx_hash ON clipboard_items(content_hash)'
        ];

        const createMetaTable = `
            CREATE TABLE IF NOT EXISTS db_meta (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `;

        try {
            this.db.exec(createTableSQL);
            createIndexes.forEach(sql => this.db.exec(sql));
            this.db.exec(createMetaTable);

            // Set initial version if not exists
            const version = this.getVersion();
            if (version === null) {
                this.setVersion(this.currentVersion);
            }
        } catch (error) {
            console.error('Schema initialization failed:', error);
            throw error;
        }
    }

    /**
     * Get database version
     */
    getVersion() {
        try {
            const stmt = this.db.prepare('SELECT value FROM db_meta WHERE key = ?');
            const row = stmt.get('version');
            return row ? parseInt(row.value) : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Set database version
     */
    setVersion(version) {
        const stmt = this.db.prepare('INSERT OR REPLACE INTO db_meta (key, value) VALUES (?, ?)');
        stmt.run('version', version.toString());
    }

    /**
     * Run database migrations
     */
    runMigrations() {
        const currentVersion = this.getVersion() || 0;

        if (currentVersion < this.currentVersion) {
            console.log(`Migrating database from version ${currentVersion} to ${this.currentVersion}`);

            // Migration to version 2: Add multi-file support columns
            if (currentVersion < 2) {
                try {
                    this.db.exec('ALTER TABLE clipboard_items ADD COLUMN file_count INTEGER DEFAULT 1');
                    this.db.exec('ALTER TABLE clipboard_items ADD COLUMN file_types TEXT');
                    this.db.exec('ALTER TABLE clipboard_items ADD COLUMN is_all_images INTEGER DEFAULT 0');
                    console.log('Migration to version 2 complete');
                } catch (error) {
                    console.error('Migration to version 2 failed:', error);
                }
            }

            // Migration to version 3: Add file-based image storage columns
            if (currentVersion < 3) {
                try {
                    this.db.exec('ALTER TABLE clipboard_items ADD COLUMN image_path TEXT');
                    this.db.exec('ALTER TABLE clipboard_items ADD COLUMN thumbnail_path TEXT');
                    console.log('Migration to version 3 complete');
                } catch (error) {
                    console.error('Migration to version 3 failed:', error);
                }
            }

            this.setVersion(this.currentVersion);
        }
    }

    /**
     * Insert a new clipboard item
     */
    insert(item) {
        const sql = `
            INSERT INTO clipboard_items (
                id, type, timestamp, is_pinned, is_deleted, content_hash,
                plain_text, rich_text, image_data, thumbnail_data,
                file_paths, color_value, source_application, file_size,
                file_count, file_types, is_all_images,
                image_path, thumbnail_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        try {
            const stmt = this.db.prepare(sql);
            const result = stmt.run(
                item.id,
                item.type,
                item.timestamp,
                item.isPinned ? 1 : 0,
                item.isDeleted ? 1 : 0,
                item.contentHash,
                item.plainText,
                item.richText,
                item.imageData || null,
                item.thumbnailData || null,
                item.filePaths ? JSON.stringify(item.filePaths) : null,
                item.colorValue,
                item.sourceApplication,
                item.fileSize,
                item.fileCount,
                item.fileTypes,
                item.isAllImages,
                item.imagePath || null,
                item.thumbnailPath || null
            );
            return result.changes > 0;
        } catch (error) {
            console.error('Insert failed:', error);
            throw new Error(`Insert failed: ${error.message}`);
        }
    }

    /**
     * Query clipboard items with filters
     */
    query(options = {}) {
        const {
            limit = 50,
            offset = 0,
            isPinned = null,
            isDeleted = null,
            orderBy = 'timestamp',
            orderDirection = 'DESC'
        } = options;

        let sql = 'SELECT * FROM clipboard_items WHERE 1=1';
        const params = [];

        if (isPinned !== null) {
            sql += ' AND is_pinned = ?';
            params.push(isPinned ? 1 : 0);
        }

        if (isDeleted !== null) {
            sql += ' AND is_deleted = ?';
            params.push(isDeleted ? 1 : 0);
        }

        sql += ` ORDER BY ${orderBy} ${orderDirection}`;
        sql += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        try {
            const stmt = this.db.prepare(sql);
            const rows = stmt.all(...params);
            return rows.map(row => this.rowToItem(row));
        } catch (error) {
            console.error('Query failed:', error);
            throw new Error(`Query failed: ${error.message}`);
        }
    }

    /**
     * Get a single item by ID
     */
    getById(id) {
        try {
            const stmt = this.db.prepare('SELECT * FROM clipboard_items WHERE id = ?');
            const row = stmt.get(id);
            return row ? this.rowToItem(row) : null;
        } catch (error) {
            console.error('Get by ID failed:', error);
            throw new Error(`Get by ID failed: ${error.message}`);
        }
    }

    /**
     * Search items by text content
     */
    search(query, options = {}) {
        const { limit = 50, offset = 0, isDeleted = false } = options;

        const sql = `
            SELECT * FROM clipboard_items 
            WHERE is_deleted = ? 
            AND (plain_text LIKE ? OR file_paths LIKE ?)
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        `;

        try {
            const searchPattern = `%${query}%`;
            const stmt = this.db.prepare(sql);
            const rows = stmt.all(isDeleted ? 1 : 0, searchPattern, searchPattern, limit, offset);
            return rows.map(row => this.rowToItem(row));
        } catch (error) {
            console.error('Search failed:', error);
            throw new Error(`Search failed: ${error.message}`);
        }
    }

    /**
     * Update an existing item
     */
    update(id, updates) {
        const allowedFields = [
            'is_pinned', 'is_deleted', 'plain_text', 'rich_text',
            'image_data', 'thumbnail_data', 'file_paths', 'color_value'
        ];

        const fields = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            const dbKey = this.camelToSnake(key);
            if (allowedFields.includes(dbKey)) {
                fields.push(`${dbKey} = ?`);
                let value = updates[key];

                // Handle boolean to integer conversion
                if (typeof value === 'boolean') {
                    value = value ? 1 : 0;
                }
                // Handle array to JSON conversion
                if (Array.isArray(value)) {
                    value = JSON.stringify(value);
                }

                values.push(value);
            }
        });

        if (fields.length === 0) {
            return false;
        }

        const sql = `UPDATE clipboard_items SET ${fields.join(', ')} WHERE id = ?`;
        values.push(id);

        try {
            const stmt = this.db.prepare(sql);
            const result = stmt.run(...values);
            return result.changes > 0;
        } catch (error) {
            console.error('Update failed:', error);
            throw new Error(`Update failed: ${error.message}`);
        }
    }

    /**
     * Delete items permanently
     */
    delete(ids) {
        if (!Array.isArray(ids)) {
            ids = [ids];
        }

        const placeholders = ids.map(() => '?').join(',');
        const sql = `DELETE FROM clipboard_items WHERE id IN (${placeholders})`;

        try {
            const stmt = this.db.prepare(sql);
            const result = stmt.run(...ids);
            return result.changes;
        } catch (error) {
            console.error('Delete failed:', error);
            throw new Error(`Delete failed: ${error.message}`);
        }
    }

    /**
     * Get count of items
     */
    count(options = {}) {
        const { isPinned = null, isDeleted = null } = options;

        let sql = 'SELECT COUNT(*) as count FROM clipboard_items WHERE 1=1';
        const params = [];

        if (isPinned !== null) {
            sql += ' AND is_pinned = ?';
            params.push(isPinned ? 1 : 0);
        }

        if (isDeleted !== null) {
            sql += ' AND is_deleted = ?';
            params.push(isDeleted ? 1 : 0);
        }

        try {
            const stmt = this.db.prepare(sql);
            const result = stmt.get(...params);
            return result.count;
        } catch (error) {
            console.error('Count failed:', error);
            throw new Error(`Count failed: ${error.message}`);
        }
    }

    /**
     * Check if item exists by content hash
     */
    existsByHash(contentHash) {
        try {
            const stmt = this.db.prepare('SELECT id FROM clipboard_items WHERE content_hash = ? AND is_deleted = 0 LIMIT 1');
            const row = stmt.get(contentHash);
            return row ? row.id : null;
        } catch (error) {
            console.error('Exists by hash check failed:', error);
            return null;
        }
    }

    /**
     * Convert database row to ClipboardItem object
     */
    rowToItem(row) {
        return {
            id: row.id,
            type: row.type,
            timestamp: row.timestamp,
            isPinned: row.is_pinned === 1,
            isDeleted: row.is_deleted === 1,
            contentHash: row.content_hash,
            plainText: row.plain_text,
            richText: row.rich_text,
            imageData: row.image_data,
            thumbnailData: row.thumbnail_data,
            filePaths: row.file_paths ? JSON.parse(row.file_paths) : null,
            colorValue: row.color_value,
            sourceApplication: row.source_application,
            fileSize: row.file_size,
            fileCount: row.file_count,
            fileTypes: row.file_types,
            isAllImages: row.is_all_images,
            imagePath: row.image_path,
            thumbnailPath: row.thumbnail_path
        };
    }

    /**
     * Convert camelCase to snake_case
     */
    camelToSnake(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    /**
     * Execute raw SQL (for advanced operations)
     */
    exec(sql) {
        try {
            return this.db.exec(sql);
        } catch (error) {
            console.error('Exec failed:', error);
            throw new Error(`Exec failed: ${error.message}`);
        }
    }

    /**
     * Begin transaction
     */
    beginTransaction() {
        this.db.prepare('BEGIN').run();
    }

    /**
     * Commit transaction
     */
    commit() {
        this.db.prepare('COMMIT').run();
    }

    /**
     * Rollback transaction
     */
    rollback() {
        this.db.prepare('ROLLBACK').run();
    }
}

module.exports = DatabaseManager;
