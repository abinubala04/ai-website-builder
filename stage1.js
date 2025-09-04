#!/usr/bin/env node

/**
 * Stage 1: Build a Web Chat Interface
 * 
 * This file helps you create a web interface for your LLM
 */

const fs = require('fs');
const { myLLM } = require('./build-llm.js');

console.log(`
📱 Stage 1: Web Chat Interface
==============================

Let's build a web interface for your LLM!

`);

// Step 1: Ask LLM for help
console.log("Step 1: Asking your LLM for HTML code...\n");
const htmlResponse = myLLM.respond("Help me build a web interface with HTML");
console.log("Your LLM says:", htmlResponse.substring(0, 200) + "...\n");

// Step 2: Extract or use default HTML
const defaultHTML = `<!DOCTYPE html>
<html>
<head>
    <title>Chat with My LLM</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            background: #f0f0f0;
        }
        h1 { color: #333; }
        #chat-container {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        #messages { 
            border: 1px solid #ddd; 
            height: 400px; 
            overflow-y: scroll; 
            padding: 15px; 
            margin-bottom: 15px;
            background: #fafafa;
            border-radius: 5px;
        }
        .message { 
            margin: 10px 0; 
            padding: 10px;
            border-radius: 5px;
            animation: fadeIn 0.3s;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .user { 
            background: #007bff; 
            color: white;
            margin-left: 20%;
            text-align: right;
        }
        .llm { 
            background: #f8f9fa;
            margin-right: 20%;
        }
        .input-area {
            display: flex;
            gap: 10px;
        }
        input { 
            flex: 1;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        button { 
            padding: 12px 30px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
        }
        button:hover {
            background: #0056b3;
        }
    </style>
</head>
<body>
    <div id="chat-container">
        <h1>🤖 Chat with Your LLM</h1>
        <div id="messages"></div>
        <div class="input-area">
            <input type="text" id="userInput" placeholder="Type a message..." autofocus>
            <button onclick="send()">Send</button>
        </div>
    </div>

    <script>
        document.getElementById('userInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') send();
        });

        async function send() {
            const input = document.getElementById('userInput');
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
                
                if (!response.ok) throw new Error('Server error');
                
                const data = await response.json();
                addMessage(data.response, 'llm');
            } catch (error) {
                addMessage('Error: ' + error.message + '. Is your server running?', 'llm');
            }
        }
        
        function addMessage(text, sender) {
            const messages = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message ' + sender;
            div.textContent = text;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        }
        
        // Welcome message
        addMessage("Hi! I'm the LLM you built. Ask me anything!", 'llm');
    </script>
</body>
</html>`;

// Step 3: Save HTML file
console.log("Step 2: Creating index.html...");
fs.writeFileSync('index.html', defaultHTML);
console.log("✅ Created index.html\n");

// Step 4: Create simple server
const serverCode = `const express = require('express');
const app = express();
const { myLLM } = require('./build-llm.js');

app.use(express.json());
app.use(express.static('.'));

app.post('/chat', (req, res) => {
    try {
        const { message } = req.body;
        const response = myLLM.respond(message);
        res.json({ response });
    } catch (error) {
        res.status(500).json({ response: 'Error: ' + error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\\n🚀 Your LLM is live at http://localhost:' + PORT);
    console.log('\\nOpen this URL in your browser to start chatting!');
});`;

console.log("Step 3: Creating server.js...");
fs.writeFileSync('server.js', serverCode);
console.log("✅ Created server.js\n");

// Step 5: Create package.json if needed
if (!fs.existsSync('package.json')) {
    console.log("Step 4: Creating package.json...");
    const packageJson = {
        name: "my-llm-chat",
        version: "1.0.0",
        description: "Chat with your own LLM",
        main: "server.js",
        scripts: {
            start: "node server.js"
        }
    };
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    console.log("✅ Created package.json\n");
}

// Instructions
console.log(`
✨ Stage 1 Complete! ✨

Your web interface is ready. Now:

1. Install Express:
   npm install express

2. Start your server:
   node server.js

3. Open your browser to:
   http://localhost:3000

4. Start chatting with your LLM!

🎯 Success = You can chat with your LLM in a browser

Need help? Just ask your LLM:
- "How do I install Express?"
- "I got an error about..."
- "How do I deploy this?"
`);

// Quick test
console.log("\n🧪 Quick Test - Asking your LLM about next steps:");
const nextSteps = myLLM.respond("What should I do after creating the web interface?");
console.log("\nYour LLM suggests:", nextSteps);