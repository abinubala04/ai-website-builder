/**
 * bootstrap-llm.js - The LLM that helps you build
 * 
 * This is a more advanced LLM specifically designed to help
 * beginners build web applications
 */

class BootstrapLLM {
    constructor() {
        this.name = "Bootstrap";
    }

    respond(input) {
        const query = input.toLowerCase();

        // Building web interfaces
        if (query.includes('build') && (query.includes('interface') || query.includes('web'))) {
            return this.generateWebInterface();
        }

        // Creating servers
        if (query.includes('server') || query.includes('backend')) {
            return this.generateServer();
        }

        // Database help
        if (query.includes('database') || query.includes('save') || query.includes('persist')) {
            return this.generateDatabase();
        }

        // Deployment help
        if (query.includes('deploy') || query.includes('online') || query.includes('share')) {
            return this.generateDeploymentGuide();
        }

        // Error help
        if (query.includes('error') || query.includes('broken') || query.includes('fix')) {
            return this.helpWithError(input);
        }

        // Installation help
        if (query.includes('install') || query.includes('npm')) {
            return this.installationHelp();
        }

        // Default helpful response
        return `I'm Bootstrap, your coding assistant! I can help you:
• Build web interfaces - "Help me build a chat interface"
• Create servers - "I need a backend server"
• Add databases - "How do I save conversations?"
• Deploy online - "How do I deploy this?"
• Fix errors - "I got this error: [paste error]"

What would you like to build?`;
    }

    generateWebInterface() {
        return `I'll help you build a web interface! Here's a complete chat interface:

\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <title>LLM Chat Interface</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, Arial, sans-serif; 
            background: #f5f5f5;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .chat-container {
            width: 90%;
            max-width: 600px;
            height: 80vh;
            background: white;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
        }
        .chat-header {
            padding: 20px;
            border-bottom: 1px solid #eee;
            background: #007bff;
            color: white;
            border-radius: 10px 10px 0 0;
        }
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }
        .message {
            margin: 10px 0;
            padding: 10px 15px;
            border-radius: 10px;
            max-width: 80%;
        }
        .user {
            background: #007bff;
            color: white;
            margin-left: auto;
        }
        .llm {
            background: #f1f3f5;
        }
        .input-area {
            padding: 20px;
            border-top: 1px solid #eee;
            display: flex;
            gap: 10px;
        }
        input {
            flex: 1;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        button {
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        button:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <h2>Chat with Your LLM</h2>
        </div>
        <div class="messages" id="messages"></div>
        <div class="input-area">
            <input type="text" id="input" placeholder="Type a message..." autofocus>
            <button onclick="sendMessage()">Send</button>
        </div>
    </div>
    
    <script>
        document.getElementById('input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        async function sendMessage() {
            const input = document.getElementById('input');
            const message = input.value.trim();
            if (!message) return;
            
            addMessage(message, 'user');
            input.value = '';
            
            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });
                const data = await response.json();
                addMessage(data.response, 'llm');
            } catch (error) {
                addMessage('Error: ' + error.message, 'llm');
            }
        }
        
        function addMessage(text, type) {
            const messages = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message ' + type;
            div.textContent = text;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        }
        
        addMessage('Hello! I am ready to help you build amazing things!', 'llm');
    </script>
</body>
</html>
\`\`\`

Save this as \`index.html\` and then ask me to create the server!`;
    }

    generateServer() {
        return `Here's a complete Express server for your LLM:

\`\`\`javascript
const express = require('express');
const path = require('path');
const app = express();

// Import your LLM - adjust path if needed
const { myLLM } = require('./build-llm.js');

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Chat endpoint
app.post('/chat', (req, res) => {
    try {
        const { message } = req.body;
        console.log('Received:', message);
        
        const response = myLLM.respond(message);
        console.log('Responding:', response);
        
        res.json({ response });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            response: 'Sorry, I encountered an error: ' + error.message 
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'LLM server is running!'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 LLM Server Started!');
    console.log('📍 Local URL: http://localhost:' + PORT);
    console.log('');
    console.log('Next steps:');
    console.log('1. Open your browser to the URL above');
    console.log('2. Start chatting with your LLM!');
    console.log('');
});
\`\`\`

Save this as \`server.js\`, then:
1. Run: \`npm install express\`
2. Run: \`node server.js\`
3. Open: http://localhost:3000`;
    }

    generateDatabase() {
        return `Let's add persistence to save your conversations!

For beginners, I recommend starting with a simple JSON file database:

\`\`\`javascript
// database.js - Simple file-based database
const fs = require('fs');
const path = require('path');

class Database {
    constructor(filename = 'conversations.json') {
        this.file = filename;
        this.data = this.load();
    }
    
    load() {
        try {
            const data = fs.readFileSync(this.file, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            // File doesn't exist yet
            return { conversations: [] };
        }
    }
    
    save() {
        fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    }
    
    addConversation(userId, message, response) {
        this.data.conversations.push({
            id: Date.now(),
            userId: userId || 'anonymous',
            timestamp: new Date().toISOString(),
            message,
            response
        });
        this.save();
    }
    
    getConversations(userId) {
        return this.data.conversations.filter(c => 
            !userId || c.userId === userId
        );
    }
    
    clear(userId) {
        if (userId) {
            this.data.conversations = this.data.conversations.filter(
                c => c.userId !== userId
            );
        } else {
            this.data.conversations = [];
        }
        this.save();
    }
}

module.exports = new Database();
\`\`\`

Then update your server.js to use it:

\`\`\`javascript
const db = require('./database.js');

// In your /chat endpoint, add:
db.addConversation(userId, message, response);

// Add endpoint to get history:
app.get('/history', (req, res) => {
    const history = db.getConversations(req.query.userId);
    res.json(history);
});
\`\`\`

This gives you persistent chat history!`;
    }

    generateDeploymentGuide() {
        return `Let's deploy your LLM to the internet! Here are the easiest options:

## Option 1: Deploy to Render (Recommended for beginners)

1. **Prepare your code:**
   - Make sure you have \`package.json\`
   - Add this start script:
   \`\`\`json
   "scripts": {
     "start": "node server.js"
   }
   \`\`\`

2. **Push to GitHub:**
   \`\`\`bash
   git init
   git add .
   git commit -m "My LLM platform"
   gh repo create my-llm --public --push
   \`\`\`

3. **Deploy on Render:**
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Click "Deploy"
   - You'll get a URL like: https://my-llm.onrender.com

## Option 2: Deploy to Vercel

1. **Install Vercel CLI:**
   \`\`\`bash
   npm install -g vercel
   \`\`\`

2. **Deploy:**
   \`\`\`bash
   vercel
   \`\`\`
   
3. **Follow prompts and get your URL!**

## Option 3: Deploy to Heroku

1. **Install Heroku CLI and deploy:**
   \`\`\`bash
   heroku create my-llm-app
   git push heroku main
   \`\`\`

That's it! Your LLM is now live on the internet. Share the URL with friends!`;
    }

    helpWithError(input) {
        const error = input.toLowerCase();

        if (error.includes('cannot find module')) {
            return `That error means a package isn't installed. Try:

1. If it's 'express':
   \`npm install express\`

2. If it's your LLM file:
   - Check the path in require()
   - Make sure the file exists
   - Use './build-llm.js' (with ./)

3. General fix:
   \`npm install\`

Still stuck? Show me the exact error message!`;
        }

        if (error.includes('port') || error.includes('eaddrinuse')) {
            return `Port already in use! Solutions:

1. Kill the other process:
   \`\`\`bash
   # Find what's using port 3000
   lsof -i :3000
   # Kill it
   kill -9 [PID]
   \`\`\`

2. Or use a different port:
   \`\`\`javascript
   const PORT = process.env.PORT || 3001;
   \`\`\`

3. Or just restart your computer (works every time!)`;
        }

        return `Let me help debug that! For the error:
"${input}"

Common fixes:
1. Check if all files are saved
2. Make sure server is running: \`node server.js\`
3. Check browser console (F12) for errors
4. Try restarting the server

Can you share:
- The exact error message
- What you were trying to do
- Which file has the error

I'll help you fix it!`;
    }

    installationHelp() {
        return `Here's how to install dependencies:

**First, check if you have Node.js:**
\`\`\`bash
node --version
\`\`\`

If not, install from: https://nodejs.org

**Then install packages:**
\`\`\`bash
# If you have package.json:
npm install

# For specific packages:
npm install express

# If npm doesn't work, try:
sudo npm install express
\`\`\`

**Common issues:**
- "Permission denied" → Use \`sudo\` (Mac/Linux)
- "npm not found" → Install Node.js first
- "Package not found" → Check spelling

**Starting fresh:**
\`\`\`bash
rm -rf node_modules package-lock.json
npm install
\`\`\`

Still having issues? Tell me the exact error!`;
    }
}

// Export for use
module.exports = { myLLM: new BootstrapLLM() };

// Test if run directly
if (require.main === module) {
    const llm = new BootstrapLLM();
    console.log("Bootstrap LLM ready! I specialize in helping you build web apps.\n");
    console.log("Try asking me:");
    console.log("- Help me build a web interface");
    console.log("- How do I create a server?");
    console.log("- How do I deploy this online?");
}