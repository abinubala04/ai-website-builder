const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// Import our modules
const Database = require('./database');
const AuthRoutes = require('./auth-routes');
const AIAssistant = require('./ai-assistant');
const KnowledgeBase = require('./knowledge-base');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const db = new Database();
const aiAssistant = new AIAssistant();
const knowledgeBase = new KnowledgeBase();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Auth routes
app.use('/auth', AuthRoutes(db));

// Protected route middleware
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Please log in' });
    }
    next();
}

// API Routes

// Get user's AI chat history
app.get('/api/chat/history', requireAuth, async (req, res) => {
    try {
        const history = await db.getChatHistory(req.session.userId);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load history' });
    }
});

// Chat with personal AI assistant
app.post('/api/chat', requireAuth, async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.session.userId;

        if (!message) {
            return res.status(400).json({ error: 'Message required' });
        }

        // Get user's chat history for context
        const history = await db.getChatHistory(userId, 10); // Last 10 messages

        // Search knowledge base for relevant info
        const knowledge = await knowledgeBase.search(message);

        // Get AI response
        const response = await aiAssistant.chat({
            userId,
            message,
            history,
            knowledge
        });

        // Save to database
        await db.saveChatMessage(userId, 'user', message);
        await db.saveChatMessage(userId, 'assistant', response);

        res.json({ response });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

// Get current user info
app.get('/api/user', requireAuth, async (req, res) => {
    try {
        const user = await db.getUser(req.session.userId);
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            created_at: user.created_at
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// Search knowledge base (for testing)
app.get('/api/knowledge/search', requireAuth, async (req, res) => {
    try {
        const { q } = req.query;
        const results = await knowledgeBase.search(q || '');
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

// Serve pages
app.get('/chat', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║  🤖 AI Assistant Platform                              ║
║                                                        ║
║  Every user gets their own personal AI assistant      ║
║  that can query shared knowledge bases.               ║
║                                                        ║
║  Server running at: http://localhost:${PORT}              ║
║                                                        ║
║  Features:                                             ║
║  ✅ User accounts with secure auth                    ║
║  ✅ Personal AI assistant per user                    ║
║  ✅ Knowledge base integration                        ║
║  ✅ Chat history persistence                          ║
║  ✅ Simple deployment                                 ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
    `);
});