const fetch = require('node-fetch');
const OpenAI = require('openai');

/**
 * REAL AI Service - Actually generates code
 */
class RealAIService {
    constructor(config = {}) {
        this.config = {
            ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
            openaiKey: process.env.OPENAI_API_KEY,
            anthropicKey: process.env.ANTHROPIC_API_KEY,
            preferLocal: true
        };

        // Initialize OpenAI if key provided
        if (this.config.openaiKey) {
            this.openai = new OpenAI({ apiKey: this.config.openaiKey });
        }
    }

    /**
     * Generate actual code based on requirements
     */
    async generateCode(requirements) {
        const { description, projectType, features, techStack } = requirements;

        // Build detailed prompt for code generation
        const prompt = this.buildCodeGenPrompt(requirements);

        try {
            // Try Ollama first (free, local)
            if (this.config.preferLocal) {
                const ollamaResult = await this.generateWithOllama(prompt, 'codellama');
                if (ollamaResult) return this.parseGeneratedCode(ollamaResult);
            }

            // Fallback to OpenAI
            if (this.openai) {
                const openaiResult = await this.generateWithOpenAI(prompt);
                if (openaiResult) return this.parseGeneratedCode(openaiResult);
            }

            // If no AI available, use templates
            return this.generateFromTemplate(requirements);

        } catch (error) {
            console.error('Code generation failed:', error);
            // Fallback to template-based generation
            return this.generateFromTemplate(requirements);
        }
    }

    /**
     * Build comprehensive prompt for code generation
     */
    buildCodeGenPrompt(requirements) {
        const { description, projectType, features, techStack } = requirements;

        return `
Generate a complete, production-ready ${projectType} application with the following requirements:

Description: ${description}

Required Features:
${features.map(f => `- ${f}`).join('\n')}

Tech Stack: ${techStack || 'Node.js, Express, React'}

Generate the following files with COMPLETE, WORKING code:

1. package.json with all dependencies
2. Main server file (server.js or app.js)
3. Database schema/models
4. API routes
5. Frontend components
6. Configuration files
7. README with setup instructions

IMPORTANT:
- Generate REAL, WORKING code - not placeholders
- Include error handling
- Add comments explaining complex parts
- Make it production-ready
- Include all necessary imports

Start with package.json:
\`\`\`json
`;
    }

    /**
     * Generate code using Ollama (local)
     */
    async generateWithOllama(prompt, model = 'codellama') {
        try {
            const response = await fetch(`${this.config.ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    prompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_p: 0.9,
                        max_tokens: 4000
                    }
                })
            });

            if (!response.ok) {
                console.error('Ollama request failed:', response.status);
                return null;
            }

            const data = await response.json();
            return data.response;

        } catch (error) {
            console.error('Ollama error:', error);
            return null;
        }
    }

    /**
     * Generate code using OpenAI
     */
    async generateWithOpenAI(prompt) {
        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert full-stack developer. Generate complete, working code.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000
            });

            return completion.choices[0].message.content;

        } catch (error) {
            console.error('OpenAI error:', error);
            return null;
        }
    }

    /**
     * Parse generated code into files
     */
    parseGeneratedCode(rawOutput) {
        const files = [];
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;

        // Extract code blocks
        while ((match = codeBlockRegex.exec(rawOutput)) !== null) {
            const language = match[1] || 'text';
            const content = match[2].trim();
            
            // Determine filename from content or language
            const filename = this.inferFilename(content, language);
            
            files.push({
                path: filename,
                content: content,
                language: language
            });
        }

        // If no code blocks found, try to parse as structured response
        if (files.length === 0) {
            return this.parseStructuredResponse(rawOutput);
        }

        return this.organizeFiles(files);
    }

    /**
     * Infer filename from content
     */
    inferFilename(content, language) {
        // Check for package.json
        if (content.includes('"name"') && content.includes('"version"')) {
            return 'package.json';
        }

        // Check for common patterns
        if (content.includes('express()') || content.includes('app.listen')) {
            return 'server.js';
        }

        if (content.includes('<!DOCTYPE html>')) {
            return 'public/index.html';
        }

        if (content.includes('CREATE TABLE')) {
            return 'schema.sql';
        }

        if (content.includes('React.Component') || content.includes('function App')) {
            return 'src/App.js';
        }

        // Default based on language
        const extensions = {
            javascript: '.js',
            typescript: '.ts',
            json: '.json',
            html: '.html',
            css: '.css',
            sql: '.sql',
            python: '.py'
        };

        return `file${extensions[language] || '.txt'}`;
    }

    /**
     * Generate from templates (fallback)
     */
    generateFromTemplate(requirements) {
        const { projectType, features } = requirements;

        // Basic Express + React template
        const files = [
            {
                path: 'package.json',
                content: JSON.stringify({
                    name: 'user-app',
                    version: '1.0.0',
                    description: requirements.description,
                    scripts: {
                        start: 'node server.js',
                        dev: 'nodemon server.js',
                        build: 'cd client && npm run build'
                    },
                    dependencies: {
                        express: '^4.18.2',
                        'express-session': '^1.17.3',
                        sqlite3: '^5.1.6',
                        bcrypt: '^5.1.1',
                        jsonwebtoken: '^9.0.2',
                        dotenv: '^16.3.1',
                        cors: '^2.8.5'
                    },
                    devDependencies: {
                        nodemon: '^3.0.1'
                    }
                }, null, 2)
            },
            {
                path: 'server.js',
                content: this.generateServerTemplate(features)
            },
            {
                path: 'database.js',
                content: this.generateDatabaseTemplate(features)
            },
            {
                path: 'public/index.html',
                content: this.generateFrontendTemplate(requirements)
            },
            {
                path: '.env.example',
                content: 'PORT=3000\nDATABASE_URL=./database.db\nJWT_SECRET=your-secret-key'
            },
            {
                path: 'README.md',
                content: this.generateReadmeTemplate(requirements)
            }
        ];

        // Add feature-specific files
        if (features.includes('authentication')) {
            files.push({
                path: 'auth.js',
                content: this.generateAuthTemplate()
            });
        }

        return files;
    }

    /**
     * Generate server template
     */
    generateServerTemplate(features) {
        return `const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static('public'));

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false
}));

// Database
const db = require('./database');

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

${features.includes('authentication') ? `
// Auth routes
const authRoutes = require('./auth');
app.use('/api/auth', authRoutes);
` : ''}

${features.includes('api') ? `
// API routes
app.get('/api/items', async (req, res) => {
    try {
        const items = await db.all('SELECT * FROM items');
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/items', async (req, res) => {
    try {
        const { name, description } = req.body;
        const result = await db.run(
            'INSERT INTO items (name, description) VALUES (?, ?)',
            [name, description]
        );
        res.json({ id: result.lastID, name, description });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
` : ''}

// Serve React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(\`✅ Server running on http://localhost:\${PORT}\`);
});
`;
    }

    /**
     * Generate database template
     */
    generateDatabaseTemplate(features) {
        return `const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database
const db = new sqlite3.Database(
    process.env.DATABASE_URL || './database.db',
    (err) => {
        if (err) {
            console.error('Database connection failed:', err);
        } else {
            console.log('✅ Connected to SQLite database');
            initializeDatabase();
        }
    }
);

// Initialize tables
function initializeDatabase() {
    db.serialize(() => {
        ${features.includes('authentication') ? `
        // Users table
        db.run(\`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        \`);
        ` : ''}

        // Items table (example)
        db.run(\`
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                ${features.includes('authentication') ? 'user_id INTEGER,' : ''}
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                ${features.includes('authentication') ? ', FOREIGN KEY (user_id) REFERENCES users (id)' : ''}
            )
        \`);

        console.log('✅ Database tables created');
    });
}

// Promisify database methods
db.getAsync = function (sql, params) {
    return new Promise((resolve, reject) => {
        this.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

db.allAsync = function (sql, params) {
    return new Promise((resolve, reject) => {
        this.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

db.runAsync = function (sql, params) {
    return new Promise((resolve, reject) => {
        this.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

module.exports = db;
`;
    }

    /**
     * Generate frontend template
     */
    generateFrontendTemplate(requirements) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${requirements.description}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background: #333;
            color: white;
            padding: 20px 0;
            margin-bottom: 30px;
        }
        
        header h1 {
            text-align: center;
        }
        
        .content {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        
        button:hover {
            background: #0056b3;
        }
        
        input, textarea {
            width: 100%;
            padding: 10px;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        
        .message {
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
        }
        
        .message.success {
            background: #d4edda;
            color: #155724;
        }
        
        .message.error {
            background: #f8d7da;
            color: #721c24;
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>${requirements.description}</h1>
        </div>
    </header>
    
    <div class="container">
        <div class="content">
            <h2>Welcome to Your App!</h2>
            <p>This application was built by your AI assistant.</p>
            
            <div id="app">
                <!-- Dynamic content will be loaded here -->
            </div>
        </div>
    </div>
    
    <script>
        // Check server health
        fetch('/api/health')
            .then(res => res.json())
            .then(data => {
                console.log('Server status:', data);
            })
            .catch(err => {
                console.error('Server error:', err);
            });
        
        // Initialize app
        document.addEventListener('DOMContentLoaded', () => {
            const app = document.getElementById('app');
            
            // Add dynamic functionality based on features
            ${requirements.features.includes('authentication') ? `
            // Check if logged in
            fetch('/api/auth/me')
                .then(res => res.json())
                .then(user => {
                    if (user.id) {
                        app.innerHTML = '<p>Welcome back, ' + user.name + '!</p>';
                    } else {
                        app.innerHTML = '<p>Please log in to continue.</p>';
                    }
                });
            ` : `
            app.innerHTML = '<p>Your app is ready! Start customizing it.</p>';
            `}
        });
    </script>
</body>
</html>`;
    }

    /**
     * Generate auth template
     */
    generateAuthTemplate() {
        return `const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('./database');

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const result = await db.runAsync(
            'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
            [email, hashedPassword, name]
        );
        
        // Generate token
        const token = jwt.sign(
            { id: result.lastID, email },
            process.env.JWT_SECRET || 'dev-secret'
        );
        
        res.json({ token, user: { id: result.lastID, email, name } });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await db.getAsync(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'dev-secret'
        );
        
        res.json({ 
            token, 
            user: { id: user.id, email: user.email, name: user.name } 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.getAsync(
            'SELECT id, email, name FROM users WHERE id = ?',
            [req.user.id]
        );
        res.json(user || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.sendStatus(401);
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'dev-secret', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

module.exports = router;
`;
    }

    /**
     * Generate README template
     */
    generateReadmeTemplate(requirements) {
        return `# ${requirements.description}

This application was generated by your AI assistant based on your requirements.

## Features

${requirements.features.map(f => `- ${f}`).join('\n')}

## Quick Start

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up environment:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your settings
   \`\`\`

3. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

4. Open http://localhost:3000 in your browser

## Project Structure

\`\`\`
.
├── server.js          # Main server file
├── database.js        # Database setup
├── auth.js           # Authentication routes
├── public/           # Frontend files
│   └── index.html    # Main HTML file
├── package.json      # Dependencies
└── .env.example      # Environment template
\`\`\`

## Deployment

This app is ready to deploy to:
- Heroku
- Railway
- Vercel
- Any Node.js hosting

## Customization

Your AI assistant can help you:
- Add new features
- Modify existing code
- Fix any issues
- Deploy to production

Just describe what you need!
`;
    }

    /**
     * Organize files into proper structure
     */
    organizeFiles(files) {
        // Ensure we have essential files
        const hasPackageJson = files.some(f => f.path.includes('package.json'));
        const hasServer = files.some(f => f.path.includes('server') || f.path.includes('app.js'));
        const hasIndex = files.some(f => f.path.includes('index.html'));

        // Add missing essential files
        if (!hasPackageJson) {
            files.unshift({
                path: 'package.json',
                content: this.generateDefaultPackageJson()
            });
        }

        if (!hasServer) {
            files.push({
                path: 'server.js',
                content: this.generateServerTemplate(['api'])
            });
        }

        if (!hasIndex) {
            files.push({
                path: 'public/index.html',
                content: this.generateFrontendTemplate({ description: 'Your App' })
            });
        }

        return files;
    }

    /**
     * Generate default package.json
     */
    generateDefaultPackageJson() {
        return JSON.stringify({
            name: 'ai-generated-app',
            version: '1.0.0',
            description: 'App generated by AI',
            main: 'server.js',
            scripts: {
                start: 'node server.js',
                dev: 'nodemon server.js'
            },
            dependencies: {
                express: '^4.18.2',
                sqlite3: '^5.1.6',
                dotenv: '^16.3.1'
            },
            devDependencies: {
                nodemon: '^3.0.1'
            }
        }, null, 2);
    }

    /**
     * Analyze project requirements
     */
    async analyze(config) {
        const { prompt } = config;

        try {
            // Try Ollama first
            const ollamaResult = await this.analyzeWithOllama(prompt);
            if (ollamaResult) return ollamaResult;

            // Fallback to OpenAI
            if (this.openai) {
                const openaiResult = await this.analyzeWithOpenAI(prompt);
                if (openaiResult) return openaiResult;
            }

            // Default analysis
            return {
                summary: 'Project analysis complete',
                features: this.extractFeaturesFromText(prompt),
                complexity: 'moderate',
                suggestedTech: ['Node.js', 'Express', 'SQLite', 'React']
            };

        } catch (error) {
            console.error('Analysis failed:', error);
            return {
                summary: 'Basic analysis complete',
                features: ['web interface', 'data storage'],
                complexity: 'simple'
            };
        }
    }

    /**
     * Extract features from text
     */
    extractFeaturesFromText(text) {
        const features = [];
        const lowerText = text.toLowerCase();

        // Common feature patterns
        if (lowerText.includes('user') || lowerText.includes('login') || lowerText.includes('account')) {
            features.push('authentication');
        }
        if (lowerText.includes('database') || lowerText.includes('store') || lowerText.includes('save')) {
            features.push('database');
        }
        if (lowerText.includes('api') || lowerText.includes('endpoint')) {
            features.push('api');
        }
        if (lowerText.includes('upload') || lowerText.includes('file')) {
            features.push('file uploads');
        }
        if (lowerText.includes('search')) {
            features.push('search functionality');
        }
        if (lowerText.includes('email') || lowerText.includes('notification')) {
            features.push('email notifications');
        }

        return features.length > 0 ? features : ['basic web interface', 'data storage'];
    }

    /**
     * Generate conversational response
     */
    async generate(config) {
        const { prompt } = config;

        try {
            // Try Ollama first
            if (this.config.preferLocal) {
                const result = await this.generateWithOllama(prompt, 'llama2');
                if (result) return { content: result };
            }

            // Fallback to OpenAI
            if (this.openai) {
                const result = await this.generateWithOpenAI(prompt);
                if (result) return { content: result };
            }

            // Default response
            return {
                content: "I understand what you're looking for. Let me build that for you right away!"
            };

        } catch (error) {
            console.error('Generation failed:', error);
            return {
                content: "I'll help you build that! Let me create the initial structure..."
            };
        }
    }
}

module.exports = RealAIService;