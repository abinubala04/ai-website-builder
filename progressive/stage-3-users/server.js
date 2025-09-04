const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Database setup
const db = new sqlite3.Database('user-ai.db');

// Initialize database with user support
db.serialize(() => {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Patterns now belong to users!
    db.run(`
        CREATE TABLE IF NOT EXISTS patterns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            trigger TEXT NOT NULL,
            response TEXT NOT NULL,
            is_public BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            use_count INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, trigger)
        )
    `);
    
    // Chat history with user tracking
    db.run(`
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            message TEXT NOT NULL,
            response TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Auth Routes

// Register new user
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            [username, hashedPassword],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Username already exists' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                
                const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET);
                res.json({ 
                    success: true, 
                    token,
                    user: { id: this.lastID, username }
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    db.get(
        "SELECT * FROM users WHERE username = ?",
        [username],
        async (err, user) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!user) return res.status(401).json({ error: 'Invalid credentials' });
            
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
            res.json({ 
                success: true, 
                token,
                user: { id: user.id, username: user.username }
            });
        }
    );
});

// Protected Routes (require authentication)

// Get user's patterns
app.get('/api/patterns', authenticateToken, (req, res) => {
    // Get user's own patterns AND public patterns from others
    db.all(
        `SELECT p.*, u.username as author 
         FROM patterns p 
         JOIN users u ON p.user_id = u.id 
         WHERE p.user_id = ? OR p.is_public = 1 
         ORDER BY p.created_at DESC`,
        [req.user.id],
        (err, patterns) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(patterns);
        }
    );
});

// Teach new pattern (user's own)
app.post('/api/teach', authenticateToken, (req, res) => {
    const { trigger, response, isPublic = false } = req.body;
    
    if (!trigger || !response) {
        return res.status(400).json({ error: 'Missing trigger or response' });
    }
    
    db.run(
        `INSERT OR REPLACE INTO patterns (user_id, trigger, response, is_public) 
         VALUES (?, ?, ?, ?)`,
        [req.user.id, trigger.toLowerCase(), response, isPublic ? 1 : 0],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ 
                success: true, 
                message: `Learned: "${trigger}" → "${response}"`,
                id: this.lastID,
                isPublic
            });
        }
    );
});

// Chat with personalized AI
app.post('/api/chat', authenticateToken, (req, res) => {
    const { message } = req.body;
    const lowerMessage = message.toLowerCase();
    
    // Get patterns (user's own + public ones)
    db.all(
        `SELECT * FROM patterns 
         WHERE user_id = ? OR is_public = 1 
         ORDER BY user_id = ? DESC, use_count DESC`,
        [req.user.id, req.user.id],
        (err, patterns) => {
            if (err) return res.status(500).json({ error: err.message });
            
            let matchedPattern = null;
            let response = "I don't know how to respond to that. Teach me!";
            
            // Find matching pattern (prioritize user's own patterns)
            for (const pattern of patterns) {
                if (lowerMessage.includes(pattern.trigger)) {
                    matchedPattern = pattern;
                    response = pattern.response;
                    
                    // Update use count
                    db.run("UPDATE patterns SET use_count = use_count + 1 WHERE id = ?", [pattern.id]);
                    break;
                }
            }
            
            // Log chat
            db.run(
                "INSERT INTO chat_history (user_id, message, response) VALUES (?, ?, ?)",
                [req.user.id, message, response]
            );
            
            res.json({ 
                response, 
                matchedPattern,
                isOwnPattern: matchedPattern && matchedPattern.user_id === req.user.id
            });
        }
    );
});

// Delete pattern (only your own!)
app.delete('/api/patterns/:id', authenticateToken, (req, res) => {
    // Can only delete your own patterns
    db.run(
        "DELETE FROM patterns WHERE id = ? AND user_id = ?",
        [req.params.id, req.user.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) {
                return res.status(403).json({ error: 'Cannot delete this pattern' });
            }
            res.json({ success: true, deleted: this.changes });
        }
    );
});

// Get user stats
app.get('/api/stats', authenticateToken, (req, res) => {
    db.get(`
        SELECT 
            (SELECT COUNT(*) FROM patterns WHERE user_id = ?) as my_patterns,
            (SELECT COUNT(*) FROM patterns WHERE is_public = 1) as public_patterns,
            (SELECT COUNT(*) FROM chat_history WHERE user_id = ?) as my_chats,
            (SELECT COUNT(DISTINCT username) FROM users) as total_users
    `, [req.user.id, req.user.id], (err, stats) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(stats);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   👤 Stage 3: Multi-User AI with Auth                 ║
║                                                        ║
║   ✅ User accounts with secure passwords              ║
║   ✅ Personal AI patterns                             ║
║   ✅ Can only delete your own patterns               ║
║   ✅ Option to share patterns publicly                ║
║   ✅ Personalized AI for each user                    ║
║                                                        ║
║   ❌ Still single organization                        ║
║   ❌ No teams or collaboration                        ║
║   ❌ No billing or subscriptions                      ║
║                                                        ║
║   http://localhost:${PORT}                            ║
║                                                        ║
╚════════════════════════════════════════════════════════╝

Now users have their own AI space!
But what if you want to sell this as a service?
`);
});