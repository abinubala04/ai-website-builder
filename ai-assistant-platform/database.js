const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

class Database {
    constructor() {
        this.db = new sqlite3.Database('./assistant-platform.db');
        this.init();
    }

    init() {
        this.db.serialize(() => {
            // Users table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    name TEXT,
                    reset_token TEXT,
                    reset_expires INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Chat history table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS chat_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            `);

            // Create indexes
            this.db.run('CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history(user_id)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat_history(timestamp)');
        });
    }

    // User management
    async createUser(email, password, name) {
        const userId = uuidv4();
        const hashedPassword = await bcrypt.hash(password, 10);

        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)',
                [userId, email, hashedPassword, name],
                function(err) {
                    if (err) {
                        if (err.message.includes('UNIQUE constraint')) {
                            reject(new Error('Email already exists'));
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve({ id: userId, email, name });
                    }
                }
            );
        });
    }

    async findUserByEmail(email) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE email = ?',
                [email],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async getUser(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT id, email, name, created_at FROM users WHERE id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async verifyPassword(email, password) {
        const user = await this.findUserByEmail(email);
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return {
            id: user.id,
            email: user.email,
            name: user.name
        };
    }

    // Password reset
    async createResetToken(email) {
        const token = uuidv4();
        const expires = Date.now() + 3600000; // 1 hour

        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?',
                [token, expires, email],
                function(err) {
                    if (err) reject(err);
                    else if (this.changes === 0) reject(new Error('Email not found'));
                    else resolve(token);
                }
            );
        });
    }

    async resetPassword(token, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE users 
                 SET password = ?, reset_token = NULL, reset_expires = NULL 
                 WHERE reset_token = ? AND reset_expires > ?`,
                [hashedPassword, token, Date.now()],
                function(err) {
                    if (err) reject(err);
                    else if (this.changes === 0) reject(new Error('Invalid or expired token'));
                    else resolve(true);
                }
            );
        });
    }

    // Chat history
    async saveChatMessage(userId, role, content) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)',
                [userId, role, content],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getChatHistory(userId, limit = 50) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT role, content, timestamp 
                 FROM chat_history 
                 WHERE user_id = ? 
                 ORDER BY timestamp DESC 
                 LIMIT ?`,
                [userId, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.reverse()); // Return in chronological order
                }
            );
        });
    }

    async clearChatHistory(userId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM chat_history WHERE user_id = ?',
                [userId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }
}

module.exports = Database;