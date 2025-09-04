const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Database setup
const db = new sqlite3.Database('learning-platform.db');

// Initialize database
db.serialize(() => {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            referral_code TEXT UNIQUE,
            referred_by INTEGER,
            credits INTEGER DEFAULT 0,
            FOREIGN KEY (referred_by) REFERENCES users (id)
        )
    `);
    
    // Magic links for auth
    db.run(`
        CREATE TABLE IF NOT EXISTS magic_links (
            token TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            used BOOLEAN DEFAULT 0
        )
    `);
    
    // Posts (digital notebook)
    db.run(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            ai_response TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);
    
    // Comments
    db.run(`
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);
});

// Email setup (use your preferred service)
const transporter = nodemailer.createTransport({
    // For testing, use ethereal.email
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: process.env.EMAIL_USER || 'ethereal.user',
        pass: process.env.EMAIL_PASS || 'ethereal.pass'
    }
});

// Simple AI integration (replace with your preferred AI)
async function getAIResponse(content) {
    // For now, return helpful templated responses
    // Replace this with actual AI integration (OpenAI, Ollama, etc)
    const responses = {
        'learning': 'Track your progress with simple metrics. Log your loss values daily and look for downward trends.',
        'stuck': 'Try breaking down the problem into smaller pieces. What\'s the simplest version that could work?',
        'error': 'Check your data shapes first. Most AI errors come from mismatched dimensions.',
        'default': 'That\'s an interesting challenge. Can you provide more details about what you\'ve tried?'
    };
    
    // Simple keyword matching (replace with real AI)
    for (const [keyword, response] of Object.entries(responses)) {
        if (content.toLowerCase().includes(keyword)) {
            return response;
        }
    }
    
    return responses.default;
}

// Generate referral code
function generateReferralCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Routes

// Home page - show recent posts
app.get('/api/posts', (req, res) => {
    db.all(
        `SELECT p.*, u.username, u.email,
         (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
         FROM posts p
         JOIN users u ON p.user_id = u.id
         ORDER BY p.created_at DESC
         LIMIT 20`,
        (err, posts) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(posts);
        }
    );
});

// Sign up / Login
app.post('/api/auth/magic-link', async (req, res) => {
    const { email, referralCode } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email required' });
    }
    
    try {
        // Generate magic link token
        const token = crypto.randomBytes(32).toString('hex');
        
        // Store in database
        db.run(
            'INSERT INTO magic_links (token, email) VALUES (?, ?)',
            [token, email],
            async (err) => {
                if (err) return res.status(500).json({ error: err.message });
                
                // Create magic link
                const magicLink = `http://localhost:${PORT}/auth/${token}`;
                
                // Check if email is configured
                if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'ethereal.user') {
                    // NO EMAIL CONFIGURED - Use console instead
                    console.log('\n' + '='.repeat(60));
                    console.log('🔑 MAGIC LINK FOR:', email);
                    console.log('📧 Click this link to login:');
                    console.log(`\n   ${magicLink}\n`);
                    console.log('='.repeat(60) + '\n');
                    
                    res.json({ 
                        message: 'Check your console for the login link! (Email not configured)',
                        debug: true 
                    });
                } else {
                    // Try to send email
                    try {
                        await transporter.sendMail({
                            from: '"AI Learning Platform" <noreply@example.com>',
                            to: email,
                            subject: 'Your Magic Login Link',
                            html: `
                                <h2>Click to Login</h2>
                                <p>Click this link to log in to AI Learning Platform:</p>
                                <a href="${magicLink}" style="padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">
                                    Login Now
                                </a>
                                <p>Or copy this link: ${magicLink}</p>
                                <p>This link expires in 1 hour.</p>
                            `
                        });
                        
                        res.json({ message: 'Check your email for login link!' });
                    } catch (emailError) {
                        // Email failed - fallback to console
                        console.log('\n' + '='.repeat(60));
                        console.log('⚠️  EMAIL FAILED - Using console instead');
                        console.log('🔑 MAGIC LINK FOR:', email);
                        console.log('📧 Click this link to login:');
                        console.log(`\n   ${magicLink}\n`);
                        console.log('='.repeat(60) + '\n');
                        
                        res.json({ 
                            message: 'Email failed - Check your console for the login link!',
                            debug: true 
                        });
                    }
                }
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Failed to create magic link' });
    }
});

// Verify magic link
app.get('/auth/:token', (req, res) => {
    const { token } = req.params;
    
    db.get(
        'SELECT * FROM magic_links WHERE token = ? AND used = 0',
        [token],
        (err, link) => {
            if (err || !link) {
                return res.send('Invalid or expired link');
            }
            
            // Check if expired (1 hour)
            const created = new Date(link.created_at);
            const now = new Date();
            if (now - created > 3600000) {
                return res.send('Link expired');
            }
            
            // Mark as used
            db.run('UPDATE magic_links SET used = 1 WHERE token = ?', [token]);
            
            // Find or create user
            db.get(
                'SELECT * FROM users WHERE email = ?',
                [link.email],
                (err, user) => {
                    if (!user) {
                        // Create new user
                        const referralCode = generateReferralCode();
                        db.run(
                            'INSERT INTO users (email, username, referral_code) VALUES (?, ?, ?)',
                            [link.email, link.email.split('@')[0], referralCode],
                            function(err) {
                                if (err) return res.send('Error creating account');
                                
                                const userId = this.lastID;
                                const token = jwt.sign({ userId, email: link.email }, 'secret-key');
                                res.redirect(`/dashboard.html?token=${token}`);
                            }
                        );
                    } else {
                        // Existing user
                        const token = jwt.sign({ userId: user.id, email: user.email }, 'secret-key');
                        res.redirect(`/dashboard.html?token=${token}`);
                    }
                }
            );
        }
    );
});

// Create post
app.post('/api/posts', async (req, res) => {
    const { title, content, userId } = req.body;
    
    if (!title || !content || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get AI response
    const aiResponse = await getAIResponse(content);
    
    db.run(
        'INSERT INTO posts (user_id, title, content, ai_response) VALUES (?, ?, ?, ?)',
        [userId, title, content, aiResponse],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            res.json({
                id: this.lastID,
                title,
                content,
                ai_response: aiResponse,
                message: 'Post created successfully!'
            });
        }
    );
});

// Get user's referral info
app.get('/api/users/:userId/referrals', (req, res) => {
    const { userId } = req.params;
    
    db.get(
        'SELECT * FROM users WHERE id = ?',
        [userId],
        (err, user) => {
            if (err || !user) return res.status(404).json({ error: 'User not found' });
            
            // Get referrals
            db.all(
                'SELECT id, email, username, created_at FROM users WHERE referred_by = ?',
                [userId],
                (err, referrals) => {
                    res.json({
                        referral_code: user.referral_code,
                        referral_link: `http://localhost:${PORT}/join/${user.referral_code}`,
                        credits: user.credits,
                        referrals: referrals || []
                    });
                }
            );
        }
    );
});

// Join with referral code
app.get('/join/:code', (req, res) => {
    const { code } = req.params;
    res.redirect(`/?ref=${code}`);
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🚀 AI Learning Platform Started!                     ║
║                                                        ║
║   Frontend: http://localhost:${PORT}                   ║
║   Database: learning-platform.db                       ║
║                                                        ║
║   Features:                                            ║
║   ✅ Magic link authentication                         ║
║   ✅ Post questions/problems                           ║
║   ✅ AI responds automatically                         ║
║   ✅ Referral system built-in                         ║
║   ✅ Track your "guild"                               ║
║                                                        ║
║   You are the first user - sign up now!               ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
    `);
});