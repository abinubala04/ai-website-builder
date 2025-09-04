const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * Workspace Builder
 * Creates isolated development environments for each user
 */
class WorkspaceBuilder {
    constructor(db, config) {
        this.db = db;
        this.config = config || {
            workspacesPath: '/workspaces',
            templatesPath: '/templates',
            dockerRegistry: 'localhost:5000'
        };
    }

    /**
     * Create a new workspace for user
     */
    async createWorkspace(options) {
        const workspaceId = uuidv4();
        const { userId, agentId, projectType, resources } = options;

        console.log(`Creating workspace ${workspaceId} for user ${userId}`);

        try {
            // 1. Create workspace directory
            const workspacePath = await this.createWorkspaceDirectory(workspaceId);

            // 2. Initialize git repository
            await this.initializeGitRepo(workspacePath);

            // 3. Copy appropriate template
            await this.copyTemplate(projectType, workspacePath);

            // 4. Create Docker container (simplified for demo)
            const container = await this.createContainer(workspaceId, resources);

            // 5. Generate access URL
            const accessUrl = this.generateAccessUrl(workspaceId);

            // 6. Save to database
            const workspace = {
                id: workspaceId,
                userId,
                agentId,
                path: workspacePath,
                gitRepo: `${workspaceId}.git`,
                containerId: container.id,
                domain: `${workspaceId}.workspace.local`,
                accessUrl,
                resources,
                status: 'active'
            };

            await this.saveWorkspace(workspace);

            return workspace;

        } catch (error) {
            console.error('Workspace creation failed:', error);
            throw error;
        }
    }

    /**
     * Create workspace directory structure
     */
    async createWorkspaceDirectory(workspaceId) {
        const workspacePath = path.join(this.config.workspacesPath, workspaceId);
        
        // Create main directory
        await fs.mkdir(workspacePath, { recursive: true });

        // Create subdirectories
        const dirs = ['src', 'public', 'data', '.agent'];
        for (const dir of dirs) {
            await fs.mkdir(path.join(workspacePath, dir), { recursive: true });
        }

        // Create initial files
        await fs.writeFile(
            path.join(workspacePath, 'README.md'),
            `# Your Project Workspace\n\nWorkspace ID: ${workspaceId}\n`
        );

        await fs.writeFile(
            path.join(workspacePath, '.agent', 'config.json'),
            JSON.stringify({
                workspaceId,
                created: new Date().toISOString(),
                version: '1.0.0'
            }, null, 2)
        );

        return workspacePath;
    }

    /**
     * Initialize git repository
     */
    async initializeGitRepo(workspacePath) {
        return new Promise((resolve, reject) => {
            exec('git init', { cwd: workspacePath }, (error, stdout, stderr) => {
                if (error) reject(error);
                else resolve(stdout);
            });
        });
    }

    /**
     * Copy project template
     */
    async copyTemplate(projectType, workspacePath) {
        const templatePath = path.join(this.config.templatesPath, projectType);
        
        // Check if template exists, otherwise use default
        let selectedTemplate;
        try {
            await fs.access(templatePath);
            selectedTemplate = templatePath;
        } catch {
            selectedTemplate = path.join(this.config.templatesPath, 'default');
        }

        // For demo, create a simple template
        await this.createDefaultTemplate(workspacePath, projectType);
    }

    /**
     * Create default project template
     */
    async createDefaultTemplate(workspacePath, projectType) {
        // Simple Express.js template
        const packageJson = {
            name: 'user-project',
            version: '1.0.0',
            description: 'Your AI-built project',
            main: 'server.js',
            scripts: {
                start: 'node server.js',
                dev: 'nodemon server.js'
            },
            dependencies: {
                express: '^4.18.0',
                sqlite3: '^5.1.0',
                dotenv: '^16.0.0'
            },
            devDependencies: {
                nodemon: '^2.0.0'
            }
        };

        await fs.writeFile(
            path.join(workspacePath, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );

        // Basic server file
        const serverCode = `
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'ready',
        message: 'Your AI agent is building this for you!'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(\`Server running on port \${PORT}\`);
});
        `.trim();

        await fs.writeFile(
            path.join(workspacePath, 'server.js'),
            serverCode
        );

        // Basic HTML
        const indexHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Your Project</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            text-align: center;
        }
        .status {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>🚀 Your Project is Being Built!</h1>
    <div class="status">
        <p>Your AI agent is working on creating your ${projectType} project.</p>
        <p>This page will update as features are added.</p>
    </div>
    <script>
        // Check status
        fetch('/api/status')
            .then(res => res.json())
            .then(data => console.log('Status:', data));
    </script>
</body>
</html>
        `.trim();

        await fs.writeFile(
            path.join(workspacePath, 'public', 'index.html'),
            indexHtml
        );
    }

    /**
     * Create Docker container (simplified for demo)
     */
    async createContainer(workspaceId, resources) {
        // In production, this would create actual Docker container
        // For demo, we'll simulate it
        return {
            id: `container-${workspaceId}`,
            status: 'running',
            ports: {
                web: 3000 + Math.floor(Math.random() * 1000)
            }
        };
    }

    /**
     * Generate access URL for workspace
     */
    generateAccessUrl(workspaceId) {
        // In production, this would be a real URL
        // For demo, return localhost URL
        return `http://localhost:8080/workspace/${workspaceId}`;
    }

    /**
     * Save workspace to database
     */
    async saveWorkspace(workspace) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO workspaces (
                    id, user_id, agent_id, path, git_repo, 
                    container_id, domain, access_url, resources, 
                    status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                [
                    workspace.id,
                    workspace.userId,
                    workspace.agentId,
                    workspace.path,
                    workspace.gitRepo,
                    workspace.containerId,
                    workspace.domain,
                    workspace.accessUrl,
                    JSON.stringify(workspace.resources),
                    workspace.status
                ],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Get workspace by ID
     */
    async getWorkspace(workspaceId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM workspaces WHERE id = ?',
                [workspaceId],
                (err, row) => {
                    if (err) reject(err);
                    else if (!row) reject(new Error('Workspace not found'));
                    else {
                        resolve({
                            ...row,
                            resources: JSON.parse(row.resources)
                        });
                    }
                }
            );
        });
    }

    /**
     * Update workspace files based on agent actions
     */
    async updateWorkspaceFiles(workspaceId, files) {
        const workspace = await this.getWorkspace(workspaceId);
        
        for (const file of files) {
            const filePath = path.join(workspace.path, file.path);
            
            // Ensure directory exists
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            
            // Write file
            await fs.writeFile(filePath, file.content);
        }

        // Commit changes
        await this.commitChanges(workspace.path, 'AI Agent: Updated files');
    }

    /**
     * Commit changes to git
     */
    async commitChanges(workspacePath, message) {
        return new Promise((resolve, reject) => {
            exec(
                `git add . && git commit -m "${message}"`,
                { cwd: workspacePath },
                (error, stdout, stderr) => {
                    if (error && !error.message.includes('nothing to commit')) {
                        reject(error);
                    } else {
                        resolve(stdout);
                    }
                }
            );
        });
    }

    /**
     * Deploy workspace to production
     */
    async deployWorkspace(workspaceId) {
        const workspace = await this.getWorkspace(workspaceId);
        
        // In production, this would:
        // 1. Build the project
        // 2. Run tests
        // 3. Deploy to hosting platform
        // 4. Update DNS
        
        console.log(`Deploying workspace ${workspaceId}...`);
        
        // For demo, update status
        return {
            success: true,
            url: `https://${workspace.domain}`,
            deploymentId: uuidv4()
        };
    }
}

module.exports = WorkspaceBuilder;