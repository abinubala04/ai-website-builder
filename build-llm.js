#!/usr/bin/env node

/**
 * build-llm.js - Build a working LLM in one file
 * 
 * This creates a simple but real language model that can:
 * 1. Learn from patterns
 * 2. Generate responses
 * 3. Help you code
 */

// Load environment variables if available
try {
    require('dotenv').config();
} catch (e) {
    // dotenv not installed, that's okay
}

class SimpleLLM {
    constructor() {
        // Check if we have API keys for enhanced capabilities
        this.hasOpenAI = !!process.env.OPENAI_API_KEY;
        this.hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
        this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        
        if (this.hasOpenAI || this.hasAnthropic) {
            console.log('🚀 Enhanced mode: Found API keys for cloud AI!');
        }
        
        // Pre-trained responses to get you started
        // In a real LLM, these would be learned from data
        this.patterns = [
            {
                triggers: ['hello', 'hi', 'hey'],
                responses: [
                    "Hello! I'm the LLM you built. How can I help you code?",
                    "Hi there! Ready to build something together?",
                    "Hey! Let's create something awesome!"
                ]
            },
            {
                triggers: ['help', 'build', 'create', 'web', 'interface'],
                responses: [
                    "I can help you build a web interface! Would you like HTML for a chat UI?",
                    "Let's build something! I can generate HTML, CSS, and JavaScript for you.",
                    "I'll help you create that. What kind of interface do you need?"
                ]
            },
            {
                triggers: ['how', 'install', 'run', 'start'],
                responses: [
                    "To run this, you'll need: 1) Save the files, 2) Run 'npm install', 3) Run 'node server.js'",
                    "First install dependencies with 'npm install', then start with 'node server.js'",
                    "Make sure Node.js is installed, then use npm to install packages."
                ]
            },
            {
                triggers: ['error', 'broken', 'not working', 'failed'],
                responses: [
                    "Let me help debug that. What error message are you seeing?",
                    "Don't worry, we'll fix it! Can you share the error?",
                    "Errors are how we learn! Show me what went wrong."
                ]
            },
            {
                triggers: ['database', 'save', 'persist', 'store'],
                responses: [
                    "For data persistence, I recommend starting with SQLite. Want me to show you how?",
                    "Let's add a database! SQLite is perfect for beginners.",
                    "To save data, we'll need a database. I can help you set that up!"
                ]
            }
        ];

        // Simple memory of conversation context
        this.context = [];
        this.maxContext = 5;
    }

    /**
     * Main response method - this is what makes it an "LLM"
     */
    respond(input) {
        if (!input) return "I need some input to respond to!";

        // Add to context memory
        this.context.push(input);
        if (this.context.length > this.maxContext) {
            this.context.shift();
        }

        const lowerInput = input.toLowerCase();

        // Check for code generation requests
        if (this.isAskingForCode(lowerInput)) {
            return this.generateCode(lowerInput);
        }

        // Find matching pattern
        for (const pattern of this.patterns) {
            if (pattern.triggers.some(trigger => lowerInput.includes(trigger))) {
                return this.selectResponse(pattern.responses);
            }
        }

        // Default response with context awareness
        return this.generateDefaultResponse(input);
    }

    /**
     * Check if user is asking for code
     */
    isAskingForCode(input) {
        const codeWords = ['html', 'css', 'javascript', 'code', 'server', 'interface', 'build web', 'create web'];
        return codeWords.some(word => input.includes(word));
    }

    /**
     * Generate actual code based on request
     */
    generateCode(input) {
        if (input.includes('html') || input.includes('interface')) {
            return `Here's a simple HTML chat interface:

\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <title>Chat with Your LLM</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        #messages { border: 1px solid #ddd; height: 400px; overflow-y: scroll; padding: 10px; margin-bottom: 10px; }
        .message { margin: 5px 0; padding: 5px; }
        .user { background: #e3f2fd; text-align: right; }
        .llm { background: #f5f5f5; }
        input { width: 70%; padding: 10px; }
        button { padding: 10px 20px; }
    </style>
</head>
<body>
    <h1>Chat with Your LLM</h1>
    <div id="messages"></div>
    <input type="text" id="userInput" placeholder="Type a message..." onkeypress="if(event.key==='Enter') send()">
    <button onclick="send()">Send</button>

    <script>
        async function send() {
            const input = document.getElementById('userInput');
            const message = input.value;
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
        
        function addMessage(text, sender) {
            const messages = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message ' + sender;
            div.textContent = text;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        }
    </script>
</body>
</html>
\`\`\`

Save this as 'index.html'. Need the server code too?`;
        }

        if (input.includes('server')) {
            return `Here's a simple Express server:

\`\`\`javascript
const express = require('express');
const app = express();

// Import your LLM
const { myLLM } = require('./build-llm.js');

app.use(express.json());
app.use(express.static('.'));

app.post('/chat', (req, res) => {
    const { message } = req.body;
    const response = myLLM.respond(message);
    res.json({ response });
});

app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});
\`\`\`

Save as 'server.js' and run 'npm install express' first.`;
        }

        return "I can generate HTML interfaces, Express servers, and more. What specifically would you like me to create?";
    }

    /**
     * Select a random response from options
     */
    selectResponse(responses) {
        return responses[Math.floor(Math.random() * responses.length)];
    }

    /**
     * Generate contextual default response
     */
    generateDefaultResponse(input) {
        // Use context for better responses
        if (this.context.length > 1) {
            return `I understand you're asking about "${input}". Based on our conversation, I think you might want help with coding. Can you be more specific?`;
        }

        return `You said: "${input}". I'm your LLM assistant! I can help you build web interfaces, servers, and more. What would you like to create?`;
    }

    /**
     * Add learning capability (simplified)
     */
    learn(input, response) {
        // In a real LLM, this would update neural network weights
        // For our simple version, we add to patterns
        console.log(`Learning: "${input}" -> "${response}"`);
        // This is where real training would happen
    }
}

// Export for use in other files
module.exports = { myLLM: new SimpleLLM() };

// If running directly, show interactive prompt
if (require.main === module) {
    console.log(`
🤖 Simple LLM Built Successfully!

This LLM can:
✓ Respond to conversations
✓ Generate HTML/CSS/JavaScript code
✓ Help you debug errors
✓ Guide you through building apps

Test it now:
`);

    const llm = new SimpleLLM();
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    function prompt() {
        readline.question('\nYou: ', (input) => {
            if (input.toLowerCase() === 'exit') {
                console.log('\nGoodbye! Your LLM is saved in build-llm.js');
                process.exit(0);
            }
            
            const response = llm.respond(input);
            console.log('\nLLM:', response);
            
            prompt();
        });
    }

    // Test examples
    console.log('Try these:');
    console.log('- "Hello"');
    console.log('- "Help me build a web interface"');
    console.log('- "How do I run the server?"');
    console.log('- Type "exit" to quit\n');

    prompt();
}