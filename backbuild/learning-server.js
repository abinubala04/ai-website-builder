#!/usr/bin/env node

/**
 * Real Learning Server - Shared AI Learning with Database
 * This proves the AI actually works with real persistence
 */

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

// Create/connect to SQLite database
const db = new sqlite3.Database('ai-learning.db');

// Initialize database
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS patterns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trigger TEXT NOT NULL,
            response TEXT NOT NULL,
            taught_by TEXT,
            taught_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            use_count INTEGER DEFAULT 0,
            UNIQUE(trigger)
        )
    `);
    
    // Add some default patterns if table is empty
    db.get("SELECT COUNT(*) as count FROM patterns", (err, row) => {
        if (row.count === 0) {
            const defaults = [
                ['hello', 'Hello! I can learn from everyone who teaches me!', 'system'],
                ['how do you learn', 'Anyone can teach me patterns, and I remember them for everyone!', 'system'],
                ['who taught you', 'I learn from everyone! Check the learning feed to see who taught me what.', 'system']
            ];
            
            const stmt = db.prepare("INSERT INTO patterns (trigger, response, taught_by) VALUES (?, ?, ?)");
            defaults.forEach(pattern => stmt.run(pattern));
            stmt.finalize();
            
            console.log('📚 Initialized with default patterns');
        }
    });
});

// API Endpoints

// Get all patterns
app.get('/api/patterns', (req, res) => {
    db.all("SELECT * FROM patterns ORDER BY taught_at DESC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Teach new pattern
app.post('/api/teach', (req, res) => {
    const { trigger, response, taughtBy = 'anonymous' } = req.body;
    
    if (!trigger || !response) {
        res.status(400).json({ error: 'Missing trigger or response' });
        return;
    }
    
    // Insert or update pattern
    db.run(
        `INSERT OR REPLACE INTO patterns (trigger, response, taught_by) 
         VALUES (?, ?, ?)`,
        [trigger.toLowerCase(), response, taughtBy],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Broadcast to all connected clients
            broadcast({
                type: 'new-pattern',
                pattern: { trigger, response, taughtBy }
            });
            
            res.json({ 
                success: true, 
                message: `Learned: "${trigger}" → "${response}"`,
                id: this.lastID
            });
        }
    );
});

// Get response for input
app.post('/api/respond', (req, res) => {
    const { message } = req.body;
    const lowerMessage = message.toLowerCase();
    
    // Find matching patterns
    db.all(
        "SELECT * FROM patterns ORDER BY LENGTH(trigger) DESC",
        (err, patterns) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Find first matching pattern
            let response = null;
            let matchedPattern = null;
            
            for (const pattern of patterns) {
                if (lowerMessage.includes(pattern.trigger)) {
                    response = pattern.response;
                    matchedPattern = pattern;
                    
                    // Update use count
                    db.run(
                        "UPDATE patterns SET use_count = use_count + 1 WHERE id = ?",
                        [pattern.id]
                    );
                    break;
                }
            }
            
            if (response) {
                res.json({ 
                    response,
                    matchedPattern: matchedPattern.trigger,
                    taughtBy: matchedPattern.taught_by
                });
            } else {
                res.json({ 
                    response: "I don't know how to respond to that. Teach me using the teaching panel!",
                    matchedPattern: null
                });
            }
        }
    );
});

// Get statistics
app.get('/api/stats', (req, res) => {
    db.get(
        `SELECT 
            COUNT(*) as total_patterns,
            COUNT(DISTINCT taught_by) as total_teachers,
            SUM(use_count) as total_uses
         FROM patterns`,
        (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(row);
        }
    );
});

// Delete pattern (for admin/testing)
app.delete('/api/patterns/:id', (req, res) => {
    db.run("DELETE FROM patterns WHERE id = ?", req.params.id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, deleted: this.changes });
    });
});

// Simple WebSocket-like broadcasting using Server-Sent Events
const clients = new Set();

app.get('/api/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    
    clients.add(res);
    
    // Send initial connection message
    res.write('data: {"type":"connected"}\n\n');
    
    // Remove client on disconnect
    req.on('close', () => {
        clients.delete(res);
    });
});

function broadcast(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    clients.forEach(client => client.write(message));
}

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🧠 Real AI Learning Server Started!                  ║
║                                                        ║
║   Database: ai-learning.db                             ║
║   API URL: http://localhost:${PORT}                        ║
║                                                        ║
║   Open multiple browsers and watch them share          ║
║   the same learned patterns!                           ║
║                                                        ║
╚════════════════════════════════════════════════════════╝

📝 API Endpoints:
- GET  /api/patterns     - Get all learned patterns
- POST /api/teach        - Teach new pattern
- POST /api/respond      - Get AI response
- GET  /api/stats        - Get learning statistics
- GET  /api/events       - Real-time updates

🚀 Next: Open learns-for-real.html in multiple browsers!
`);
});