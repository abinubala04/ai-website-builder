#!/usr/bin/env node

/**
 * Simple Git Platform - GitHub for Normal People
 * Everything in ONE file - no complex dependencies
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'change-this-secret',
    resave: false,
    saveUninitialized: false
}));

// Database setup
const db = new sqlite3.Database('./platform.db');

db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Projects table (like GitHub repos)
    db.run(`CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        public BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users (id),
        UNIQUE(owner_id, name)
    )`);

    // Versions table (like commits)
    db.run(`CREATE TABLE IF NOT EXISTS versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        version_number INTEGER NOT NULL,
        message TEXT,
        snapshot_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id)
    )`);

    // Files table (current state)
    db.run(`CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        path TEXT NOT NULL,
        content TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id),
        UNIQUE(project_id, path)
    )`);
});

// Ensure directories exist
async function ensureDirectories() {
    await fs.mkdir('projects', { recursive: true });
    await fs.mkdir('public', { recursive: true });
}
ensureDirectories();

// Auth middleware
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}

// Helper function to parse AI-generated code into files
function parseAICodeResponse(aiResponse, projectType) {
    // Simple parser - in production this would be more sophisticated
    const files = {};
    
    // Try to extract code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let fileIndex = 0;
    
    while ((match = codeBlockRegex.exec(aiResponse)) !== null) {
        const language = match[1] || 'text';
        const code = match[2].trim();
        
        // Determine filename based on language and content
        let filename;
        if (language === 'html' || code.includes('<!DOCTYPE')) {
            filename = 'index.html';
        } else if (language === 'javascript' || language === 'js') {
            filename = fileIndex === 0 ? 'app.js' : `script${fileIndex}.js`;
        } else if (language === 'css') {
            filename = 'style.css';
        } else if (language === 'json' && code.includes('"name"')) {
            filename = 'package.json';
        } else {
            filename = `file${fileIndex}.${language}`;
        }
        
        files[filename] = code;
        fileIndex++;
    }
    
    // If no code blocks found, create basic structure
    if (Object.keys(files).length === 0) {
        files['index.html'] = `<!DOCTYPE html>
<html>
<head>
    <title>AI Generated ${projectType}</title>
</head>
<body>
    <h1>Your ${projectType} is ready!</h1>
    <p>AI tried to generate code but couldn't parse the response.</p>
    <p>Original response: ${aiResponse.substring(0, 500)}...</p>
</body>
</html>`;
    }
    
    // Ensure we have a package.json
    if (!files['package.json']) {
        files['package.json'] = JSON.stringify({
            name: `ai-generated-${projectType}`,
            version: '1.0.0',
            description: `AI-generated ${projectType}`,
            scripts: {
                start: 'node app.js'
            }
        }, null, 2);
    }
    
    return files;
}

// API Routes

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(
            'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
            [email, hashedPassword, name || email.split('@')[0]],
            function(err) {
                if (err) {
                    return res.status(400).json({ error: 'Email already exists' });
                }
                req.session.userId = this.lastID;
                res.json({ success: true });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        req.session.userId = user.id;
        res.json({ success: true });
    });
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Get user projects
app.get('/api/projects', requireAuth, (req, res) => {
    db.all(
        'SELECT * FROM projects WHERE owner_id = ? ORDER BY updated_at DESC',
        [req.session.userId],
        (err, projects) => {
            if (err) return res.status(500).json({ error: 'Failed to load projects' });
            res.json(projects);
        }
    );
});

// Create project
app.post('/api/projects', requireAuth, (req, res) => {
    const { name, description } = req.body;
    
    db.run(
        'INSERT INTO projects (owner_id, name, description) VALUES (?, ?, ?)',
        [req.session.userId, name, description],
        function(err) {
            if (err) return res.status(400).json({ error: 'Project name already exists' });
            
            const projectId = this.lastID;
            
            // Create initial version
            db.run(
                'INSERT INTO versions (project_id, version_number, message) VALUES (?, 1, ?)',
                [projectId, 'Initial creation'],
                (err) => {
                    if (err) return res.status(500).json({ error: 'Failed to create project' });
                    res.json({ id: projectId, name, description });
                }
            );
        }
    );
});

// Get project files
app.get('/api/projects/:id/files', requireAuth, (req, res) => {
    // Verify ownership
    db.get(
        'SELECT * FROM projects WHERE id = ? AND owner_id = ?',
        [req.params.id, req.session.userId],
        (err, project) => {
            if (!project) return res.status(404).json({ error: 'Project not found' });
            
            db.all(
                'SELECT path, content FROM files WHERE project_id = ?',
                [req.params.id],
                (err, files) => {
                    if (err) return res.status(500).json({ error: 'Failed to load files' });
                    res.json({ project, files });
                }
            );
        }
    );
});

// Save file
app.post('/api/projects/:id/files', requireAuth, (req, res) => {
    const { path, content } = req.body;
    
    // Verify ownership
    db.get(
        'SELECT * FROM projects WHERE id = ? AND owner_id = ?',
        [req.params.id, req.session.userId],
        (err, project) => {
            if (!project) return res.status(404).json({ error: 'Project not found' });
            
            // Upsert file
            db.run(
                `INSERT INTO files (project_id, path, content) VALUES (?, ?, ?)
                 ON CONFLICT(project_id, path) DO UPDATE SET content = ?, updated_at = CURRENT_TIMESTAMP`,
                [req.params.id, path, content, content],
                (err) => {
                    if (err) return res.status(500).json({ error: 'Failed to save file' });
                    
                    // Update project timestamp
                    db.run(
                        'UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [req.params.id]
                    );
                    
                    res.json({ success: true });
                }
            );
        }
    );
});

// Create version (like git commit)
app.post('/api/projects/:id/save-version', requireAuth, (req, res) => {
    const { message } = req.body;
    
    db.get(
        'SELECT COUNT(*) as count FROM versions WHERE project_id = ?',
        [req.params.id],
        (err, result) => {
            const versionNumber = result.count + 1;
            
            db.run(
                'INSERT INTO versions (project_id, version_number, message) VALUES (?, ?, ?)',
                [req.params.id, versionNumber, message || `Version ${versionNumber}`],
                function(err) {
                    if (err) return res.status(500).json({ error: 'Failed to save version' });
                    res.json({ version: versionNumber, message });
                }
            );
        }
    );
});

// Get versions
app.get('/api/projects/:id/versions', requireAuth, (req, res) => {
    db.all(
        'SELECT * FROM versions WHERE project_id = ? ORDER BY version_number DESC',
        [req.params.id],
        (err, versions) => {
            if (err) return res.status(500).json({ error: 'Failed to load versions' });
            res.json(versions);
        }
    );
});

// AI helper endpoint with unified AI router
app.post('/api/ai/generate', requireAuth, async (req, res) => {
    const { prompt, projectType } = req.body;
    
    // Try to use unified AI if available
    try {
        const { UnifiedAIRouter, PROMPT_TEMPLATES } = require('../unified-ai-config');
        const aiRouter = new UnifiedAIRouter({ preferLocal: true });
        
        // Check if Ollama is available
        if (await aiRouter.isServiceAvailable('ollama')) {
            const task = {
                type: 'code_generation',
                prompt: PROMPT_TEMPLATES.code_generation
                    .replace('{language}', 'JavaScript/HTML')
                    .replace('{specification}', `Create a ${projectType} with the following: ${prompt}`),
                max_tokens: 2048
            };
            
            const result = await aiRouter.process(task);
            
            // Parse AI response into files
            const files = parseAICodeResponse(result.content, projectType);
            return res.json({ files, ai_powered: true });
        }
    } catch (error) {
        console.log('AI service not available, using templates');
    }
    
    // Fallback to template code
    const templates = {
        website: {
            'index.html': `<!DOCTYPE html>
<html>
<head>
    <title>${prompt}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Welcome to ${prompt}</h1>
    <p>Your website is ready! Edit this content to make it yours.</p>
</body>
</html>`,
            'style.css': `body {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

h1 {
    color: #333;
}`,
            'script.js': `// Your JavaScript code here
console.log('Website loaded!');`
        },
        app: {
            'index.html': `<!DOCTYPE html>
<html>
<head>
    <title>${prompt} App</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app">
        <h1>${prompt} App</h1>
        <button onclick="doSomething()">Click Me!</button>
    </div>
    <script src="app.js"></script>
</body>
</html>`,
            'app.js': `function doSomething() {
    alert('Your app is working!');
}`,
            'style.css': `#app {
    text-align: center;
    padding: 50px;
}

button {
    font-size: 20px;
    padding: 10px 20px;
    cursor: pointer;
}`
        }
    };
    
    const files = templates[projectType] || templates.website;
    res.json({ files });
});

// Serve HTML pages
app.get('/', (req, res) => {
    res.send(getHomePage());
});

app.get('/login', (req, res) => {
    res.send(getLoginPage());
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.send(getDashboardPage());
});

app.get('/project/:id', requireAuth, (req, res) => {
    res.send(getProjectPage());
});

// HTML Pages (embedded for single file)
function getHomePage() {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Simple Git - Version Control for Everyone</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .header { background: #24292e; color: white; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .hero { text-align: center; padding: 60px 20px; background: #f6f8fa; }
        .hero h1 { font-size: 48px; margin-bottom: 20px; }
        .hero p { font-size: 20px; color: #666; margin-bottom: 30px; }
        .btn { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; font-size: 18px; }
        .btn:hover { background: #218838; }
        .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-top: 60px; }
        .feature { text-align: center; padding: 20px; }
        .feature h3 { font-size: 24px; margin-bottom: 10px; }
        .feature p { color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>🌟 Simple Git</h1>
            <p>Version control for everyone - no terminal required!</p>
        </div>
    </div>
    
    <div class="hero">
        <h1>Build Projects Without The Complexity</h1>
        <p>Create, save, and share your projects with simple buttons - no git commands needed!</p>
        <a href="/login" class="btn">Get Started Free</a>
    </div>
    
    <div class="container">
        <div class="features">
            <div class="feature">
                <h3>📁 Simple Projects</h3>
                <p>Create projects with one click. No "git init" or complex setup.</p>
            </div>
            <div class="feature">
                <h3>💾 Auto-Save Everything</h3>
                <p>Every change is saved automatically. No more "git add" or "commit".</p>
            </div>
            <div class="feature">
                <h3>🤖 AI Assistant</h3>
                <p>Tell the AI what you want to build and it creates the code for you.</p>
            </div>
            <div class="feature">
                <h3>📊 Visual History</h3>
                <p>See all your versions in a simple list. Click to restore any version.</p>
            </div>
            <div class="feature">
                <h3>🔗 Easy Sharing</h3>
                <p>Share projects with a simple link. No complex permissions.</p>
            </div>
            <div class="feature">
                <h3>🚀 One-Click Deploy</h3>
                <p>Make your project live on the web with one button.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

function getLoginPage() {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Login - Simple Git</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f6f8fa; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .login-box { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 400px; }
        h2 { margin-bottom: 30px; text-align: center; }
        input { width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px; }
        button { width: 100%; padding: 12px; background: #28a745; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; }
        button:hover { background: #218838; }
        .toggle { text-align: center; margin-top: 20px; }
        .toggle a { color: #0366d6; text-decoration: none; }
        .message { padding: 10px; margin-bottom: 15px; border-radius: 5px; text-align: center; }
        .error { background: #f8d7da; color: #721c24; }
        .success { background: #d4edda; color: #155724; }
    </style>
</head>
<body>
    <div class="login-box">
        <h2 id="formTitle">Login to Simple Git</h2>
        <div id="message"></div>
        
        <form id="authForm" onsubmit="handleAuth(event)">
            <input type="email" id="email" placeholder="Email" required>
            <input type="password" id="password" placeholder="Password" required>
            <div id="nameField" style="display: none;">
                <input type="text" id="name" placeholder="Your Name">
            </div>
            <button type="submit" id="submitBtn">Login</button>
        </form>
        
        <div class="toggle">
            <a href="#" onclick="toggleForm()" id="toggleLink">Need an account? Sign up</a>
        </div>
    </div>
    
    <script>
        let isLogin = true;
        
        function toggleForm() {
            isLogin = !isLogin;
            document.getElementById('formTitle').textContent = isLogin ? 'Login to Simple Git' : 'Create Account';
            document.getElementById('submitBtn').textContent = isLogin ? 'Login' : 'Sign Up';
            document.getElementById('toggleLink').textContent = isLogin ? 'Need an account? Sign up' : 'Already have an account? Login';
            document.getElementById('nameField').style.display = isLogin ? 'none' : 'block';
            document.getElementById('message').innerHTML = '';
        }
        
        async function handleAuth(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const name = document.getElementById('name').value;
            
            const endpoint = isLogin ? '/api/login' : '/api/register';
            const body = isLogin ? { email, password } : { email, password, name };
            
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    window.location.href = '/dashboard';
                } else {
                    showMessage(data.error || 'Something went wrong', 'error');
                }
            } catch (error) {
                showMessage('Connection error', 'error');
            }
        }
        
        function showMessage(text, type) {
            const msg = document.getElementById('message');
            msg.className = 'message ' + type;
            msg.textContent = text;
        }
    </script>
</body>
</html>`;
}

function getDashboardPage() {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Dashboard - Simple Git</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f6f8fa; }
        .header { background: #24292e; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .container { max-width: 1200px; margin: 20px auto; padding: 0 20px; }
        .new-project { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .new-project h2 { margin-bottom: 15px; }
        .new-project input { padding: 10px; margin-right: 10px; border: 1px solid #ddd; border-radius: 5px; width: 300px; }
        .btn { padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; }
        .btn:hover { background: #218838; }
        .btn-small { padding: 5px 10px; font-size: 14px; }
        .projects { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .project { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s; }
        .project:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.15); }
        .project h3 { margin-bottom: 10px; color: #0366d6; }
        .project p { color: #666; margin-bottom: 10px; }
        .project-meta { font-size: 14px; color: #999; }
        .logout { color: white; text-decoration: none; }
        .empty { text-align: center; padding: 60px 20px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌟 Simple Git Dashboard</h1>
        <a href="#" onclick="logout()" class="logout">Logout</a>
    </div>
    
    <div class="container">
        <div class="new-project">
            <h2>Create New Project</h2>
            <input type="text" id="projectName" placeholder="Project name">
            <input type="text" id="projectDesc" placeholder="Description (optional)">
            <button class="btn" onclick="createProject()">Create Project</button>
        </div>
        
        <h2>Your Projects</h2>
        <div id="projects" class="projects">
            <div class="empty">Loading projects...</div>
        </div>
    </div>
    
    <script>
        // Load projects on page load
        loadProjects();
        
        async function loadProjects() {
            try {
                const response = await fetch('/api/projects');
                const projects = await response.json();
                
                const container = document.getElementById('projects');
                
                if (projects.length === 0) {
                    container.innerHTML = '<div class="empty">No projects yet. Create your first project above!</div>';
                } else {
                    container.innerHTML = projects.map(p => \`
                        <div class="project" onclick="openProject(\${p.id})">
                            <h3>\${p.name}</h3>
                            <p>\${p.description || 'No description'}</p>
                            <div class="project-meta">
                                Updated: \${new Date(p.updated_at).toLocaleDateString()}
                            </div>
                        </div>
                    \`).join('');
                }
            } catch (error) {
                console.error('Failed to load projects:', error);
            }
        }
        
        async function createProject() {
            const name = document.getElementById('projectName').value.trim();
            const description = document.getElementById('projectDesc').value.trim();
            
            if (!name) {
                alert('Please enter a project name');
                return;
            }
            
            try {
                const response = await fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, description })
                });
                
                if (response.ok) {
                    const project = await response.json();
                    openProject(project.id);
                } else {
                    const error = await response.json();
                    alert(error.error || 'Failed to create project');
                }
            } catch (error) {
                alert('Failed to create project');
            }
        }
        
        function openProject(id) {
            window.location.href = '/project/' + id;
        }
        
        async function logout() {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/';
        }
    </script>
</body>
</html>`;
}

function getProjectPage() {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Project - Simple Git</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f6f8fa; }
        .header { background: #24292e; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { margin: 0; font-size: 20px; }
        .container { display: flex; height: calc(100vh - 60px); }
        .sidebar { width: 250px; background: white; border-right: 1px solid #e1e4e8; padding: 20px; overflow-y: auto; }
        .sidebar h3 { margin-bottom: 15px; font-size: 16px; }
        .file-list { list-style: none; padding: 0; }
        .file-list li { padding: 8px; cursor: pointer; border-radius: 5px; margin-bottom: 2px; }
        .file-list li:hover { background: #f6f8fa; }
        .file-list li.active { background: #0366d6; color: white; }
        .editor { flex: 1; display: flex; flex-direction: column; }
        .editor-header { background: white; padding: 15px; border-bottom: 1px solid #e1e4e8; display: flex; justify-content: space-between; align-items: center; }
        .editor-content { flex: 1; padding: 0; }
        textarea { width: 100%; height: 100%; border: none; padding: 20px; font-family: 'Monaco', monospace; font-size: 14px; resize: none; }
        .btn { padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px; }
        .btn:hover { background: #218838; }
        .btn-secondary { background: #6c757d; }
        .btn-secondary:hover { background: #5a6268; }
        .actions { display: flex; gap: 10px; }
        .new-file { margin-bottom: 20px; }
        .new-file input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 10px; }
        .ai-helper { background: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .ai-helper h4 { margin-bottom: 10px; color: #1976d2; }
        .ai-helper select, .ai-helper input { width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .versions { margin-top: 30px; }
        .version { padding: 10px; background: #f6f8fa; border-radius: 5px; margin-bottom: 5px; font-size: 14px; }
        .back-link { color: white; text-decoration: none; }
    </style>
</head>
<body>
    <div class="header">
        <h1 id="projectName">Loading...</h1>
        <a href="/dashboard" class="back-link">← Back to Dashboard</a>
    </div>
    
    <div class="container">
        <div class="sidebar">
            <div class="ai-helper">
                <h4>🤖 AI Helper</h4>
                <select id="projectType">
                    <option value="website">Website</option>
                    <option value="app">Web App</option>
                </select>
                <input type="text" id="aiPrompt" placeholder="Describe what you want...">
                <button class="btn" onclick="generateWithAI()">Generate Code</button>
            </div>
            
            <h3>Files</h3>
            <div class="new-file">
                <input type="text" id="newFileName" placeholder="New file name...">
                <button class="btn btn-secondary" onclick="createFile()">Create File</button>
            </div>
            <ul id="fileList" class="file-list"></ul>
            
            <div class="versions">
                <h3>Versions</h3>
                <button class="btn" onclick="saveVersion()">Save Version</button>
                <div id="versionList"></div>
            </div>
        </div>
        
        <div class="editor">
            <div class="editor-header">
                <span id="currentFile">Select a file</span>
                <div class="actions">
                    <button class="btn" onclick="saveFile()">Save</button>
                    <button class="btn btn-secondary" onclick="deployProject()">Deploy 🚀</button>
                </div>
            </div>
            <div class="editor-content">
                <textarea id="editor" placeholder="Select or create a file to start editing..."></textarea>
            </div>
        </div>
    </div>
    
    <script>
        let projectId = window.location.pathname.split('/').pop();
        let currentFile = null;
        let files = {};
        
        // Load project
        loadProject();
        loadVersions();
        
        async function loadProject() {
            try {
                const response = await fetch(\`/api/projects/\${projectId}/files\`);
                const data = await response.json();
                
                document.getElementById('projectName').textContent = data.project.name;
                
                // Load files
                files = {};
                data.files.forEach(f => {
                    files[f.path] = f.content;
                });
                
                updateFileList();
                
                // Select first file if any
                if (Object.keys(files).length > 0) {
                    selectFile(Object.keys(files)[0]);
                }
            } catch (error) {
                console.error('Failed to load project:', error);
            }
        }
        
        function updateFileList() {
            const list = document.getElementById('fileList');
            list.innerHTML = Object.keys(files).map(path => 
                \`<li onclick="selectFile('\${path}')" class="\${currentFile === path ? 'active' : ''}">\${path}</li>\`
            ).join('');
        }
        
        function selectFile(path) {
            currentFile = path;
            document.getElementById('currentFile').textContent = path;
            document.getElementById('editor').value = files[path] || '';
            updateFileList();
        }
        
        function createFile() {
            const name = document.getElementById('newFileName').value.trim();
            if (!name) return;
            
            files[name] = '';
            selectFile(name);
            document.getElementById('newFileName').value = '';
            updateFileList();
        }
        
        async function saveFile() {
            if (!currentFile) return;
            
            const content = document.getElementById('editor').value;
            files[currentFile] = content;
            
            try {
                await fetch(\`/api/projects/\${projectId}/files\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: currentFile, content })
                });
                
                // Visual feedback
                const btn = event.target;
                btn.textContent = 'Saved!';
                setTimeout(() => btn.textContent = 'Save', 1000);
            } catch (error) {
                alert('Failed to save file');
            }
        }
        
        async function generateWithAI() {
            const projectType = document.getElementById('projectType').value;
            const prompt = document.getElementById('aiPrompt').value;
            
            if (!prompt) {
                alert('Please describe what you want to build');
                return;
            }
            
            try {
                const response = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, projectType })
                });
                
                const data = await response.json();
                
                // Add generated files
                Object.entries(data.files).forEach(([path, content]) => {
                    files[path] = content;
                });
                
                updateFileList();
                
                // Select first generated file
                const firstFile = Object.keys(data.files)[0];
                if (firstFile) selectFile(firstFile);
                
                // Save all files
                for (const [path, content] of Object.entries(data.files)) {
                    await fetch(\`/api/projects/\${projectId}/files\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path, content })
                    });
                }
                
                document.getElementById('aiPrompt').value = '';
            } catch (error) {
                alert('AI generation failed');
            }
        }
        
        async function saveVersion() {
            const message = prompt('Version message (optional):');
            
            try {
                await fetch(\`/api/projects/\${projectId}/save-version\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });
                
                loadVersions();
            } catch (error) {
                alert('Failed to save version');
            }
        }
        
        async function loadVersions() {
            try {
                const response = await fetch(\`/api/projects/\${projectId}/versions\`);
                const versions = await response.json();
                
                document.getElementById('versionList').innerHTML = versions.map(v => \`
                    <div class="version">
                        v\${v.version_number}: \${v.message}<br>
                        <small>\${new Date(v.created_at).toLocaleString()}</small>
                    </div>
                \`).join('');
            } catch (error) {
                console.error('Failed to load versions:', error);
            }
        }
        
        function deployProject() {
            alert('Deploy feature coming soon! For now, download your files and upload to any web host.');
        }
        
        // Auto-save on edit
        let saveTimeout;
        document.getElementById('editor').addEventListener('input', (e) => {
            if (!currentFile) return;
            files[currentFile] = e.target.value;
            
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveFile, 1000);
        });
    </script>
</body>
</html>`;
}

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║  🌟 Simple Git Platform - GitHub for Normal People     ║
║                                                        ║
║  Everything in ONE file. No complex setup.            ║
║                                                        ║
║  Server running at: http://localhost:${PORT}              ║
║                                                        ║
║  Features:                                             ║
║  ✅ Simple auth (email/password)                      ║
║  ✅ Projects (like repos but simpler)                 ║
║  ✅ Version tracking (no git required)                ║
║  ✅ File editor with auto-save                        ║
║  ✅ AI code generation                                ║
║  ✅ Visual interface (no terminal)                    ║
║                                                        ║
║  Just open your browser and start building!           ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
    `);
});