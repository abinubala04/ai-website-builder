const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Database setup
const db = new sqlite3.Database('shared-ai.db');

// Initialize database
db.serialize(() => {
    // Patterns table - shared by EVERYONE
    db.run(`
        CREATE TABLE IF NOT EXISTS patterns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trigger TEXT NOT NULL,
            response TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            use_count INTEGER DEFAULT 0,
            UNIQUE(trigger)
        )
    `);
    
    // Chat history - for analytics
    db.run(`
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            response TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Add default patterns if empty
    db.get("SELECT COUNT(*) as count FROM patterns", (err, row) => {
        if (row.count === 0) {
            const defaults = [
                ['hello', 'Hi! I\'m a shared AI that everyone can teach!'],
                ['what are you', 'I\'m an AI that learns from everyone who uses me. Try teaching me something!'],
                ['how do you work', 'I store patterns in a database that everyone shares. No user accounts yet though!']
            ];
            
            const stmt = db.prepare("INSERT INTO patterns (trigger, response) VALUES (?, ?)");
            defaults.forEach(p => stmt.run(p));
            stmt.finalize();
        }
    });
});

// API Routes

// Get all patterns
app.get('/api/patterns', (req, res) => {
    db.all("SELECT * FROM patterns ORDER BY use_count DESC, created_at DESC", (err, patterns) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(patterns);
    });
});

// Teach new pattern (anyone can do this!)
app.post('/api/teach', (req, res) => {
    const { trigger, response } = req.body;
    
    if (!trigger || !response) {
        return res.status(400).json({ error: 'Missing trigger or response' });
    }
    
    db.run(
        "INSERT OR REPLACE INTO patterns (trigger, response) VALUES (?, ?)",
        [trigger.toLowerCase(), response],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ 
                success: true, 
                message: `Learned: "${trigger}" → "${response}"`,
                id: this.lastID
            });
        }
    );
});

// Get AI response
app.post('/api/chat', (req, res) => {
    const { message } = req.body;
    const lowerMessage = message.toLowerCase();
    
    // Find matching pattern
    db.all("SELECT * FROM patterns", (err, patterns) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let matchedPattern = null;
        let response = "I don't know how to respond to that. Anyone can teach me though!";
        
        // Simple pattern matching
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
            "INSERT INTO chat_history (message, response) VALUES (?, ?)",
            [message, response]
        );
        
        res.json({ response, matchedPattern });
    });
});

// Get statistics
app.get('/api/stats', (req, res) => {
    db.get(`
        SELECT 
            (SELECT COUNT(*) FROM patterns) as total_patterns,
            (SELECT COUNT(*) FROM chat_history) as total_chats,
            (SELECT SUM(use_count) FROM patterns) as total_uses
    `, (err, stats) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(stats);
    });
});

// Delete pattern (anyone can do this - that's the problem!)
app.delete('/api/patterns/:id', (req, res) => {
    db.run("DELETE FROM patterns WHERE id = ?", req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, deleted: this.changes });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🌍 Stage 2: Shared AI Server                        ║
║                                                        ║
║   ✅ Database persistence                              ║
║   ✅ Shared across all users                          ║
║   ❌ No user accounts                                 ║
║   ❌ Anyone can delete patterns                       ║
║   ❌ No privacy                                       ║
║                                                        ║
║   http://localhost:${PORT}                            ║
║                                                        ║
╚════════════════════════════════════════════════════════╝

Try this:
1. Open multiple browsers
2. Teach in one, test in another
3. But also... anyone can mess with it!
`);
});