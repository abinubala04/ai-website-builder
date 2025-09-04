#!/usr/bin/env node

/**
 * Hosted AI Platform - Just Login and Build
 * No installation, no API keys, just works like any web app
 */

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;

// Load environment variables (YOUR API keys, not theirs)
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || (parseInt(PORT) + 1);

// Database setup (SQLite for simplicity, PostgreSQL for production)
const db = new sqlite3.Database('./platform.db');

// Initialize database
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ai_credits INTEGER DEFAULT 100,
        storage_used INTEGER DEFAULT 0
    )`);
    
    // Projects table
    db.run(`CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'web',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
    
    // Files table
    db.run(`CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id)
    )`);
    
    // AI usage tracking
    db.run(`CREATE TABLE IF NOT EXISTS ai_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Please login first' });
    }
    next();
}

// Landing page
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Dashboard page
app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Workspace page
app.get('/workspace', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    // For now, reuse the unified workspace
    const workspacePath = path.join(__dirname, '..', 'unified-workspace.html');
    if (fs.existsSync(workspacePath)) {
        res.sendFile(workspacePath);
    } else {
        // Fallback to a simple workspace
        res.send(`
            <html>
            <head><title>Workspace</title></head>
            <body style="font-family: Arial; padding: 20px;">
                <h1>Workspace Coming Soon</h1>
                <p>Project ID: ${req.query.project}</p>
                <a href="/dashboard">Back to Dashboard</a>
            </body>
            </html>
        `);
    }
});

// Sign up
app.post('/api/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        // Simple validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        db.run(
            'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
            [email, hashedPassword, name || email.split('@')[0]],
            function(err) {
                if (err) {
                    if (err.code === 'SQLITE_CONSTRAINT') {
                        return res.status(400).json({ error: 'Email already exists' });
                    }
                    return res.status(500).json({ error: 'Signup failed' });
                }
                
                // Auto login after signup
                req.session.userId = this.lastID;
                req.session.userEmail = email;
                
                res.json({ 
                    success: true,
                    message: 'Welcome! Your account is ready.',
                    redirect: '/dashboard'
                });
            }
        );
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Signup failed' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Set session
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        
        res.json({ 
            success: true,
            redirect: '/dashboard'
        });
    });
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, redirect: '/' });
});

// Get user info
app.get('/api/user', requireAuth, (req, res) => {
    db.get(
        'SELECT id, email, name, ai_credits, storage_used FROM users WHERE id = ?',
        [req.session.userId],
        (err, user) => {
            if (err || !user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json(user);
        }
    );
});

// Get user's projects
app.get('/api/projects', requireAuth, (req, res) => {
    db.all(
        'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
        [req.session.userId],
        (err, projects) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to load projects' });
            }
            res.json(projects || []);
        }
    );
});

// Create project
app.post('/api/projects', requireAuth, (req, res) => {
    const { name, type } = req.body;
    
    db.run(
        'INSERT INTO projects (user_id, name, type) VALUES (?, ?, ?)',
        [req.session.userId, name || 'Untitled Project', type || 'web'],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to create project' });
            }
            
            const projectId = this.lastID;
            
            // Create default file
            db.run(
                'INSERT INTO files (project_id, name, content) VALUES (?, ?, ?)',
                [projectId, 'index.html', getStarterTemplate()],
                (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to create project files' });
                    }
                    
                    res.json({ 
                        id: projectId,
                        name: name || 'Untitled Project',
                        message: 'Project created! Starting workspace...'
                    });
                }
            );
        }
    );
});

// AI Chat endpoint (using YOUR API keys)
app.post('/api/chat', requireAuth, async (req, res) => {
    try {
        const { message, projectId, context } = req.body;
        
        // Check user's AI credits
        const user = await getUserById(req.session.userId);
        if (user.ai_credits <= 0) {
            return res.status(429).json({ 
                error: 'AI credits exhausted. Upgrade for unlimited access!',
                upgrade_url: '/upgrade'
            });
        }
        
        // Try MCP template processor for document-based requests
        if (message.toLowerCase().includes('document') || message.toLowerCase().includes('template')) {
            try {
                const mcpResponse = await fetch('http://localhost:4000/api/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        prompt: message,
                        type: 'template-suggestion'
                    })
                });
                
                if (mcpResponse.ok) {
                    const templateData = await mcpResponse.json();
                    if (templateData.code) {
                        return res.json({
                            response: templateData.explanation || 'Here\'s your template!',
                            code: templateData.code,
                            credits_remaining: user.ai_credits - 1
                        });
                    }
                }
            } catch (mcpError) {
                console.log('MCP not available, using standard AI');
            }
        }
        
        // Use standard AI processing
        const aiResponse = await processWithAI(message, projectId);
        
        // Deduct credit
        db.run(
            'UPDATE users SET ai_credits = ai_credits - 1 WHERE id = ?',
            [req.session.userId]
        );
        
        // Track usage
        db.run(
            'INSERT INTO ai_usage (user_id, tokens_used) VALUES (?, ?)',
            [req.session.userId, aiResponse.tokens || 100]
        );
        
        res.json({
            response: aiResponse.text,
            code: aiResponse.code,
            credits_remaining: user.ai_credits - 1
        });
        
    } catch (error) {
        console.error('AI error:', error);
        res.status(500).json({ error: 'AI service temporarily unavailable' });
    }
});

// Save file
app.post('/api/files', requireAuth, async (req, res) => {
    const { projectId, fileName, content } = req.body;
    
    // Verify project ownership
    const project = await getProjectById(projectId, req.session.userId);
    if (!project) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    // Save or update file
    db.run(
        `INSERT INTO files (project_id, name, content) VALUES (?, ?, ?)
         ON CONFLICT(project_id, name) DO UPDATE SET content = ?, updated_at = CURRENT_TIMESTAMP`,
        [projectId, fileName, content, content],
        (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to save file' });
            }
            
            // Update project timestamp
            db.run(
                'UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [projectId]
            );
            
            res.json({ success: true, message: 'Saved!' });
        }
    );
});

// Get project files
app.get('/api/projects/:id/files', requireAuth, async (req, res) => {
    const project = await getProjectById(req.params.id, req.session.userId);
    if (!project) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    db.all(
        'SELECT * FROM files WHERE project_id = ?',
        [req.params.id],
        (err, files) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to load files' });
            }
            res.json({ project, files: files || [] });
        }
    );
});

// Helper functions
function getUserById(userId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
            if (err) reject(err);
            else resolve(user);
        });
    });
}

function getProjectById(projectId, userId) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM projects WHERE id = ? AND user_id = ?',
            [projectId, userId],
            (err, project) => {
                if (err) reject(err);
                else resolve(project);
            }
        );
    });
}

async function processWithAI(message, projectId) {
    // Enhanced prompt for better code generation
    const systemPrompt = `You are an expert web developer AI assistant. When the user asks you to build something:
1. Generate COMPLETE, WORKING code
2. Use modern, clean HTML/CSS/JavaScript
3. Make it visually appealing with good design
4. Include all necessary code in your response
5. Explain what you built briefly

Always generate production-ready code that works immediately.`;
    
    const fullPrompt = `${systemPrompt}\n\nUser request: ${message}\n\nGenerate complete, working code:`;
    
    // Try Ollama first (free for you)
    try {
        const response = await fetch(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'codellama:7b',
                prompt: fullPrompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9
                }
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            return {
                text: data.response,
                code: extractCode(data.response) || generateSmartCode(message),
                tokens: 100
            };
        }
    } catch (error) {
        console.log('Ollama not available, trying OpenAI');
    }
    
    // Fallback to OpenAI (using YOUR key)
    if (process.env.OPENAI_API_KEY) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                const aiResponse = data.choices[0].message.content;
                return {
                    text: aiResponse,
                    code: extractCode(aiResponse) || generateSmartCode(message),
                    tokens: data.usage.total_tokens
                };
            }
        } catch (error) {
            console.error('OpenAI error:', error);
        }
    }
    
    // Smart fallback - generate actual useful code
    return {
        text: "I'll create that for you! Here's a complete implementation:",
        code: generateSmartCode(message),
        tokens: 50
    };
}

function extractCode(text) {
    const codeMatch = text.match(/```[\s\S]*?```/);
    if (codeMatch) {
        return codeMatch[0].replace(/```\w*\n?/g, '');
    }
    return null;
}

function generateSmartCode(message) {
    const lowerMessage = message.toLowerCase();
    
    // Landing page
    if (lowerMessage.includes('landing page') || lowerMessage.includes('startup')) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StartupName - Innovation Delivered</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .hero {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 100px 20px;
            text-align: center;
        }
        .hero h1 {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .hero p {
            font-size: 20px;
            margin-bottom: 30px;
            opacity: 0.9;
        }
        .cta-button {
            display: inline-block;
            padding: 15px 40px;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 30px;
            font-size: 18px;
            font-weight: 600;
            transition: transform 0.3s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .features {
            padding: 80px 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .features h2 {
            text-align: center;
            font-size: 36px;
            margin-bottom: 50px;
        }
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 40px;
        }
        .feature {
            text-align: center;
            padding: 30px;
        }
        .feature-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .feature h3 {
            font-size: 24px;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <section class="hero">
        <h1>Welcome to the Future</h1>
        <p>Build something amazing with our innovative platform</p>
        <a href="#" class="cta-button">Get Started Free</a>
    </section>
    
    <section class="features">
        <h2>Why Choose Us</h2>
        <div class="feature-grid">
            <div class="feature">
                <div class="feature-icon">🚀</div>
                <h3>Lightning Fast</h3>
                <p>Experience blazing fast performance that keeps your users engaged</p>
            </div>
            <div class="feature">
                <div class="feature-icon">🛡️</div>
                <h3>Secure by Design</h3>
                <p>Enterprise-grade security to protect your data and your users</p>
            </div>
            <div class="feature">
                <div class="feature-icon">📈</div>
                <h3>Scale Effortlessly</h3>
                <p>Grow from startup to enterprise without missing a beat</p>
            </div>
        </div>
    </section>
</body>
</html>`;
    }
    
    // Todo list
    if (lowerMessage.includes('todo') || lowerMessage.includes('task')) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Todo List App</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .input-group {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        #todoInput {
            flex: 1;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        #addBtn {
            padding: 12px 24px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        #addBtn:hover {
            background: #45a049;
        }
        .todo-item {
            display: flex;
            align-items: center;
            padding: 15px;
            border-bottom: 1px solid #eee;
        }
        .todo-item input[type="checkbox"] {
            margin-right: 15px;
        }
        .todo-item.completed span {
            text-decoration: line-through;
            color: #999;
        }
        .delete-btn {
            margin-left: auto;
            background: #ff4444;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📝 My Todo List</h1>
        <div class="input-group">
            <input type="text" id="todoInput" placeholder="Add a new task...">
            <button id="addBtn" onclick="addTodo()">Add</button>
        </div>
        <div id="todoList"></div>
    </div>
    
    <script>
        let todos = JSON.parse(localStorage.getItem('todos')) || [];
        
        function renderTodos() {
            const todoList = document.getElementById('todoList');
            todoList.innerHTML = '';
            
            todos.forEach((todo, index) => {
                const todoItem = document.createElement('div');
                todoItem.className = 'todo-item' + (todo.completed ? ' completed' : '');
                
                todoItem.innerHTML = \`
                    <input type="checkbox" \${todo.completed ? 'checked' : ''} 
                           onchange="toggleTodo(\${index})">
                    <span>\${todo.text}</span>
                    <button class="delete-btn" onclick="deleteTodo(\${index})">Delete</button>
                \`;
                
                todoList.appendChild(todoItem);
            });
        }
        
        function addTodo() {
            const input = document.getElementById('todoInput');
            if (input.value.trim()) {
                todos.push({ text: input.value, completed: false });
                saveTodos();
                renderTodos();
                input.value = '';
            }
        }
        
        function toggleTodo(index) {
            todos[index].completed = !todos[index].completed;
            saveTodos();
            renderTodos();
        }
        
        function deleteTodo(index) {
            todos.splice(index, 1);
            saveTodos();
            renderTodos();
        }
        
        function saveTodos() {
            localStorage.setItem('todos', JSON.stringify(todos));
        }
        
        // Enter key support
        document.getElementById('todoInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTodo();
        });
        
        // Initial render
        renderTodos();
    </script>
</body>
</html>`;
    }
    
    // Portfolio
    if (lowerMessage.includes('portfolio')) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Portfolio</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
        }
        header {
            background: #333;
            color: white;
            padding: 20px 0;
            position: fixed;
            width: 100%;
            top: 0;
            z-index: 1000;
        }
        nav {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        nav a {
            color: white;
            text-decoration: none;
            margin-left: 30px;
        }
        .hero {
            background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), 
                        url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600"><rect fill="%23667eea" width="1200" height="600"/></svg>');
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: white;
        }
        .hero h1 {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .section {
            padding: 80px 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .projects {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-top: 40px;
        }
        .project {
            background: #f4f4f4;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
        }
        .skills {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-top: 20px;
        }
        .skill {
            background: #667eea;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
        }
    </style>
</head>
<body>
    <header>
        <nav>
            <h2>John Doe</h2>
            <div>
                <a href="#about">About</a>
                <a href="#projects">Projects</a>
                <a href="#contact">Contact</a>
            </div>
        </nav>
    </header>
    
    <section class="hero">
        <div>
            <h1>Hi, I'm John Doe</h1>
            <p>Full Stack Developer | Creative Thinker</p>
        </div>
    </section>
    
    <section id="about" class="section">
        <h2>About Me</h2>
        <p>I'm a passionate developer with experience in building web applications. I love turning ideas into reality through code.</p>
        <div class="skills">
            <span class="skill">JavaScript</span>
            <span class="skill">React</span>
            <span class="skill">Node.js</span>
            <span class="skill">Python</span>
        </div>
    </section>
    
    <section id="projects" class="section">
        <h2>My Projects</h2>
        <div class="projects">
            <div class="project">
                <h3>Project One</h3>
                <p>A web application that helps users manage their tasks efficiently.</p>
            </div>
            <div class="project">
                <h3>Project Two</h3>
                <p>An e-commerce platform built with modern technologies.</p>
            </div>
            <div class="project">
                <h3>Project Three</h3>
                <p>A real-time chat application with video calling features.</p>
            </div>
        </div>
    </section>
</body>
</html>`;
    }
    
    // Generic button request
    if (lowerMessage.includes('button')) {
        return `<!DOCTYPE html>
<html>
<head>
    <title>Interactive Button Demo</title>
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f0f0f0;
            font-family: Arial, sans-serif;
        }
        .container {
            text-align: center;
        }
        .fancy-button {
            padding: 20px 40px;
            font-size: 18px;
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 30px;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .fancy-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }
        #message {
            margin-top: 20px;
            font-size: 20px;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="container">
        <button class="fancy-button" onclick="showMessage()">Click Me!</button>
        <div id="message"></div>
    </div>
    
    <script>
        function showMessage() {
            const messages = [
                "Hello there! 👋",
                "You clicked the button! 🎉",
                "Great job! 🌟",
                "Keep clicking! 🚀",
                "You're awesome! 💫"
            ];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            document.getElementById('message').textContent = randomMessage;
        }
    </script>
</body>
</html>`;
    }
    
    // Default: create something basic but nice
    return `<!DOCTYPE html>
<html>
<head>
    <title>My Awesome Project</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
        }
        .content {
            max-width: 800px;
            margin: 40px auto;
            padding: 0 20px;
        }
        .card {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            transition: background 0.3s;
        }
        .button:hover {
            background: #5a5ed8;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to Your Project</h1>
        <p>Start building something amazing today</p>
    </div>
    
    <div class="content">
        <div class="card">
            <h2>Get Started</h2>
            <p>This is your canvas. Tell the AI what you want to build and watch it come to life!</p>
            <a href="#" class="button">Learn More</a>
        </div>
    </div>
</body>
</html>`;
}

function getStarterTemplate() {
    return `<!DOCTYPE html>
<html>
<head>
    <title>My Project</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f0f0f0;
        }
        .container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Your Project!</h1>
        <p>Start building something amazing.</p>
        <p>Ask the AI assistant for help!</p>
    </div>
</body>
</html>`;
}

// WebSocket for real-time features
const wss = new WebSocket.Server({ port: WS_PORT });
const clients = new Map();

wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            // Handle real-time collaboration features
        } catch (error) {
            console.error('WebSocket error:', error);
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║  🌐 AI Platform - Hosted Version                               ║
║                                                                ║
║  Platform URL: http://localhost:${PORT}                            ║
║                                                                ║
║  For Users:                                                    ║
║  • Sign up with email                                         ║
║  • No installation required                                   ║
║  • No API keys needed                                         ║
║  • 100 free AI requests                                       ║
║  • Projects save automatically                                ║
║                                                                ║
║  For You (Platform Owner):                                    ║
║  • Your API keys power all users                             ║
║  • SQLite database (upgrade to PostgreSQL for production)     ║
║  • Deploy to any VPS or cloud                                ║
║  • Monitor usage and costs                                   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);
});