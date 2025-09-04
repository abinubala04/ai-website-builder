#!/usr/bin/env node

/**
 * Stage 2: Add Database - Make conversations persist
 */

const fs = require('fs');
const { myLLM } = require('./build-llm.js');

console.log(`
💾 Stage 2: Add Database
========================

Let's make your conversations persist!

`);

// Simple file-based database (perfect for beginners)
const dbFile = 'conversations.json';

// Database code
const dbCode = `
// Simple database using JSON file
const fs = require('fs');
const dbFile = 'conversations.json';

class SimpleDB {
    constructor() {
        this.load();
    }
    
    load() {
        try {
            const data = fs.readFileSync(dbFile, 'utf8');
            this.conversations = JSON.parse(data);
        } catch (e) {
            this.conversations = [];
        }
    }
    
    save() {
        fs.writeFileSync(dbFile, JSON.stringify(this.conversations, null, 2));
    }
    
    addConversation(userMessage, llmResponse) {
        this.conversations.push({
            timestamp: new Date().toISOString(),
            user: userMessage,
            llm: llmResponse
        });
        this.save();
    }
    
    getAll() {
        return this.conversations;
    }
    
    clear() {
        this.conversations = [];
        this.save();
    }
}

module.exports = new SimpleDB();
`;

// Save database module
console.log("Creating database module...");
fs.writeFileSync('database.js', dbCode);
console.log("✅ Created database.js\n");

// Update server to use database
const updatedServer = `const express = require('express');
const app = express();
const { myLLM } = require('./build-llm.js');
const db = require('./database.js');

app.use(express.json());
app.use(express.static('.'));

// Get chat history
app.get('/history', (req, res) => {
    res.json(db.getAll());
});

// Chat endpoint with database
app.post('/chat', (req, res) => {
    try {
        const { message } = req.body;
        const response = myLLM.respond(message);
        
        // Save to database
        db.addConversation(message, response);
        
        res.json({ response });
    } catch (error) {
        res.status(500).json({ response: 'Error: ' + error.message });
    }
});

// Clear history
app.post('/clear', (req, res) => {
    db.clear();
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\\n🚀 Your LLM is live at http://localhost:' + PORT);
    console.log('💾 Now with persistent conversations!');
});`;

console.log("Updating server.js with database support...");
fs.writeFileSync('server.js', updatedServer);
console.log("✅ Updated server.js\n");

// Update HTML to load history
const updatedHTML = fs.readFileSync('index.html', 'utf8').replace(
    "// Welcome message",
    `// Load history on start
        async function loadHistory() {
            try {
                const response = await fetch('/history');
                const history = await response.json();
                
                history.forEach(conv => {
                    addMessage(conv.user, 'user', false);
                    addMessage(conv.llm, 'llm', false);
                });
                
                if (history.length > 0) {
                    addMessage("Welcome back! Your conversation history is loaded.", 'llm');
                } else {
                    addMessage("Hi! I'm the LLM you built. Ask me anything!", 'llm');
                }
            } catch (e) {
                addMessage("Hi! I'm the LLM you built. Ask me anything!", 'llm');
            }
        }
        
        // Update addMessage to not scroll on history load
        function addMessage(text, sender, shouldScroll = true) {
            const messages = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message ' + sender;
            div.textContent = text;
            messages.appendChild(div);
            if (shouldScroll) {
                messages.scrollTop = messages.scrollHeight;
            }
        }
        
        // Load history on start
        loadHistory();
        
        // Welcome message`
).replace(
    "</div>",
    `    <button onclick="if(confirm('Clear all history?')) { fetch('/clear', {method:'POST'}).then(() => location.reload()); }" style="margin-top: 10px; background: #dc3545;">Clear History</button>
    </div>`
);

console.log("Updating index.html with history support...");
fs.writeFileSync('index.html', updatedHTML);
console.log("✅ Updated index.html\n");

console.log(`
✨ Stage 2 Complete! ✨

Your chat now has memory! Features added:

✅ Conversations saved to database
✅ History loads when you refresh
✅ Clear history button
✅ Persistent across server restarts

Test it:
1. Start server: node server.js
2. Have a conversation
3. Refresh the page - your chat is still there!
4. Stop and restart server - still there!

🎯 Success = Your conversations persist

Next: Stage 3 will add multiple users!
`);

// Test database
console.log("\n🧪 Testing database...");
const db = require('./database.js');
db.addConversation("Test message", "Test response");
console.log("✅ Database working! Found", db.getAll().length, "conversations\n");