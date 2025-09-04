const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Import services
const SovereignAccountCreator = require('./services/account-creator');
const AgentProvisioner = require('./services/agent-provisioner');
const WorkspaceBuilder = require('./services/workspace-builder');
const RealAIService = require('./services/real-ai-service');
const CodeGenerator = require('./services/code-generator');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize database
const db = new sqlite3.Database('sovereign-platform.db');

// Create tables
db.serialize(() => {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            tech_level TEXT,
            business_goal TEXT,
            communication_style TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Agents table
    db.run(`
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            personality TEXT,
            capabilities TEXT,
            system_prompt TEXT,
            memory TEXT,
            status TEXT DEFAULT 'initializing',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);

    // Workspaces table
    db.run(`
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            agent_id TEXT NOT NULL,
            path TEXT,
            git_repo TEXT,
            container_id TEXT,
            domain TEXT,
            access_url TEXT,
            resources TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (agent_id) REFERENCES agents (id)
        )
    `);

    // Conversations table
    db.run(`
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents (id)
        )
    `);
});

// Initialize REAL AI service
const aiService = new RealAIService();

// Initialize services
const agentProvisioner = new AgentProvisioner(db, aiService);
const workspaceBuilder = new WorkspaceBuilder(db);
const codeGenerator = new CodeGenerator(aiService, workspaceBuilder);
const accountCreator = new SovereignAccountCreator(db, agentProvisioner, workspaceBuilder);

// Routes

// Serve intake form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'intake.html'));
});

// Create sovereign account
app.post('/api/sovereign/create-account', async (req, res) => {
    try {
        const result = await accountCreator.createAccount(req.body);
        res.json(result);
    } catch (error) {
        console.error('Account creation error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to create account' 
        });
    }
});

// Get workspace page
app.get('/workspace/:workspaceId', async (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'workspace.html'));
});

// Get workspace info
app.get('/api/workspace/:workspaceId', async (req, res) => {
    try {
        const workspace = await workspaceBuilder.getWorkspace(req.params.workspaceId);
        const agent = await agentProvisioner.getAgent(workspace.agent_id);
        
        res.json({
            workspace,
            agent: {
                id: agent.id,
                name: agent.name,
                status: agent.status
            }
        });
    } catch (error) {
        res.status(404).json({ error: 'Workspace not found' });
    }
});

// Chat with agent
app.post('/api/agent/:agentId/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const result = await agentProvisioner.processMessage(req.params.agentId, message);
        
        // Check if user wants to build something
        if (message.toLowerCase().includes('build') || 
            message.toLowerCase().includes('create') ||
            message.toLowerCase().includes('make')) {
            
            // Get agent's workspace
            const agent = await agentProvisioner.getAgent(req.params.agentId);
            const workspace = await workspaceBuilder.getWorkspace(
                agent.memory.longTerm.workspaceId
            );
            
            // Trigger code generation
            setTimeout(async () => {
                try {
                    await codeGenerator.generateApplication(workspace.id, {
                        description: message,
                        agentContext: agent.memory.longTerm.projectAnalysis
                    });
                } catch (error) {
                    console.error('Background generation failed:', error);
                }
            }, 1000);
        }
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to process message' });
    }
});

// Get agent conversations
app.get('/api/agent/:agentId/conversations', (req, res) => {
    db.all(
        'SELECT * FROM conversations WHERE agent_id = ? ORDER BY timestamp DESC LIMIT 50',
        [req.params.agentId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Deploy workspace
app.post('/api/workspace/:workspaceId/deploy', async (req, res) => {
    try {
        const result = await workspaceBuilder.deployWorkspace(req.params.workspaceId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Deployment failed' });
    }
});

// Update workspace files (for agent to use)
app.post('/api/workspace/:workspaceId/files', async (req, res) => {
    try {
        const { files } = req.body;
        await workspaceBuilder.updateWorkspaceFiles(req.params.workspaceId, files);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update files' });
    }
});

// Generate application
app.post('/api/workspace/:workspaceId/generate', async (req, res) => {
    try {
        const { description, features } = req.body;
        const result = await codeGenerator.generateApplication(
            req.params.workspaceId,
            { description, features }
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate application' });
    }
});

// Add feature to existing app
app.post('/api/workspace/:workspaceId/add-feature', async (req, res) => {
    try {
        const { feature } = req.body;
        const result = await codeGenerator.addFeature(
            req.params.workspaceId,
            feature
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add feature' });
    }
});

// Get application status
app.get('/api/workspace/:workspaceId/status', async (req, res) => {
    try {
        const status = await codeGenerator.getApplicationStatus(
            req.params.workspaceId
        );
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get status' });
    }
});

// List workspace files
app.get('/api/workspace/:workspaceId/files', async (req, res) => {
    try {
        const workspace = await workspaceBuilder.getWorkspace(req.params.workspaceId);
        const fs = require('fs').promises;
        const path = require('path');
        
        async function getFiles(dir, baseDir = '') {
            const files = [];
            const items = await fs.readdir(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const relativePath = path.join(baseDir, item);
                const stats = await fs.stat(fullPath);
                
                if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                    files.push({
                        name: item,
                        path: relativePath,
                        type: 'directory',
                        children: await getFiles(fullPath, relativePath)
                    });
                } else if (stats.isFile()) {
                    files.push({
                        name: item,
                        path: relativePath,
                        type: 'file',
                        size: stats.size
                    });
                }
            }
            
            return files;
        }
        
        const files = await getFiles(workspace.path);
        res.json({ files });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// Read file content
app.get('/api/workspace/:workspaceId/file', async (req, res) => {
    try {
        const { path: filePath } = req.query;
        if (!filePath) {
            return res.status(400).json({ error: 'File path required' });
        }
        
        const workspace = await workspaceBuilder.getWorkspace(req.params.workspaceId);
        const fs = require('fs').promises;
        const path = require('path');
        
        const fullPath = path.join(workspace.path, filePath);
        const content = await fs.readFile(fullPath, 'utf8');
        
        res.json({ content, path: filePath });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read file' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        services: {
            database: 'connected',
            ai: 'ready',
            workspaces: 'active'
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🌟 Sovereign Platform Started!                       ║
║                                                        ║
║   Non-technical users can now:                         ║
║   1. Fill out the intake form                          ║
║   2. Get their own AI agent                            ║
║   3. Watch as their platform is built                  ║
║   4. Deploy to production with one click               ║
║                                                        ║
║   Access at: http://localhost:${PORT}                     ║
║                                                        ║
║   No technical knowledge required! 🎉                  ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
    `);
});