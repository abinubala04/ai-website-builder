#!/usr/bin/env node

/**
 * Orchestration Server - Connects everything in real-time
 * - Chat with LLM
 * - Live code updates
 * - Preview synchronization
 * - Drawing/image analysis
 * - Simple Git integration
 */

const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;

// Load environment variables
require('dotenv').config();

// Import our LLM
const { myLLM } = require('./build-llm.js');

// Import unified AI if available
let aiRouter = null;
try {
    const { UnifiedAIRouter } = require('./unified-ai-config.js');
    aiRouter = new UnifiedAIRouter({ preferLocal: true });
    console.log('✅ Enhanced AI mode enabled');
} catch (e) {
    console.log('ℹ️  Using basic LLM');
}

const app = express();
const PORT = process.env.PORT || 8080;
const WS_PORT = process.env.WS_PORT || 8081;

// Middleware
app.use(express.json({ limit: '10mb' })); // For image data
app.use(express.static('.'));

// Serve the unified workspace
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'unified-workspace.html'));
});

// AI Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        
        // Try enhanced AI first
        if (aiRouter) {
            try {
                const task = {
                    type: 'code_generation',
                    prompt: buildEnhancedPrompt(message, context),
                    max_tokens: 2048
                };
                
                const result = await aiRouter.process(task);
                const { response, code } = parseAIResponse(result.content);
                
                return res.json({ 
                    response, 
                    code,
                    model: result.model 
                });
            } catch (error) {
                console.log('Enhanced AI failed, falling back to basic LLM');
            }
        }
        
        // Fallback to basic LLM
        const response = myLLM.respond(message);
        const { text, code } = extractCodeFromResponse(response);
        
        res.json({ 
            response: text || response,
            code,
            model: 'basic-llm'
        });
        
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ 
            response: 'Sorry, I encountered an error. Please try again.',
            error: error.message 
        });
    }
});

// AI Status endpoint
app.get('/api/ai/status', async (req, res) => {
    const status = {
        available: true,
        models: []
    };
    
    // Check Ollama
    try {
        const ollamaResponse = await fetch('http://localhost:11434/api/tags');
        if (ollamaResponse.ok) {
            const data = await ollamaResponse.json();
            status.models.push({
                service: 'ollama',
                models: data.models?.map(m => m.name) || [],
                status: 'online'
            });
        }
    } catch (e) {
        status.models.push({
            service: 'ollama',
            status: 'offline'
        });
    }
    
    // Check API keys
    if (process.env.OPENAI_API_KEY) {
        status.models.push({
            service: 'openai',
            status: 'configured'
        });
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
        status.models.push({
            service: 'anthropic',
            status: 'configured'
        });
    }
    
    // Set primary model
    if (status.models.some(m => m.status === 'online' || m.status === 'configured')) {
        status.model = status.models[0].service;
    } else {
        status.model = 'basic-llm';
    }
    
    res.json(status);
});

// Image analysis endpoint
app.post('/api/analyze-drawing', async (req, res) => {
    try {
        const { imageData } = req.body;
        
        // For now, return a helpful response
        // In production, this would use vision AI
        const response = "I can see your drawing! To implement this visually, I would suggest creating HTML elements that match the shapes and layout you've drawn. What specific functionality would you like me to add to these elements?";
        
        res.json({ response });
        
    } catch (error) {
        res.status(500).json({ 
            response: 'Unable to analyze drawing',
            error: error.message 
        });
    }
});

// Save to Simple Git
app.post('/api/save', async (req, res) => {
    try {
        const { file, content } = req.body;
        
        // Save locally
        const filePath = path.join(__dirname, 'workspace', file);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content);
        
        // If Simple Git is running, save there too
        // This would integrate with Simple Git Platform
        
        res.json({ success: true, message: 'Saved successfully' });
        
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ port: WS_PORT });
const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected, total:', clients.size);
    
    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to orchestration server'
    }));
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'code-change':
                    // Broadcast to all clients
                    broadcast({
                        type: 'code-update',
                        code: data.code
                    }, ws);
                    break;
                    
                case 'save':
                    // Save and notify
                    await saveFile(data.file, data.content);
                    ws.send(JSON.stringify({
                        type: 'save-complete',
                        file: data.file
                    }));
                    break;
            }
            
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });
    
    ws.on('close', () => {
        clients.delete(ws);
        console.log('Client disconnected, remaining:', clients.size);
    });
});

// Helper functions
function buildEnhancedPrompt(message, context) {
    let prompt = message;
    
    if (context?.currentCode) {
        prompt = `
Current code:
\`\`\`html
${context.currentCode}
\`\`\`

User request: ${message}

Please provide the updated code that implements the user's request. Return the complete HTML file.`;
    }
    
    return prompt;
}

function parseAIResponse(content) {
    // Try to extract code blocks
    const codeMatch = content.match(/```(?:html|javascript|css)?\n([\s\S]*?)```/);
    
    if (codeMatch) {
        const code = codeMatch[1].trim();
        const response = content.replace(codeMatch[0], '').trim();
        return { response, code };
    }
    
    return { response: content, code: null };
}

function extractCodeFromResponse(response) {
    // Check if response contains code blocks
    if (response.includes('```')) {
        const codeMatch = response.match(/```(?:\w+)?\n([\s\S]*?)```/);
        if (codeMatch) {
            return {
                text: response.split('```')[0].trim(),
                code: codeMatch[1].trim()
            };
        }
    }
    
    return { text: response, code: null };
}

function broadcast(data, sender) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

async function saveFile(filename, content) {
    const filePath = path.join(__dirname, 'workspace', filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
}

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║  🚀 Orchestration Server Running                               ║
║                                                                ║
║  Main Interface: http://localhost:${PORT}                          ║
║  WebSocket:      ws://localhost:${WS_PORT}                          ║
║                                                                ║
║  Features:                                                     ║
║  ✓ Real-time chat with AI                                    ║
║  ✓ Live code updates                                         ║
║  ✓ Instant preview                                           ║
║  ✓ Drawing/annotation support                                ║
║  ✓ Automatic saving                                          ║
║                                                                ║
║  AI Models:                                                   ║`);
    
    if (process.env.OLLAMA_URL) {
        console.log(`║  ✓ Ollama (Local)                                            ║`);
    }
    if (process.env.OPENAI_API_KEY) {
        console.log(`║  ✓ OpenAI (Cloud)                                            ║`);
    }
    if (process.env.ANTHROPIC_API_KEY) {
        console.log(`║  ✓ Anthropic (Cloud)                                         ║`);
    }
    if (!aiRouter) {
        console.log(`║  ✓ Basic LLM (Built-in)                                      ║`);
    }
    
    console.log(`║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);
});

// Also start WebSocket server
console.log(`WebSocket server listening on port ${WS_PORT}`);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    wss.close(() => {
        process.exit(0);
    });
});