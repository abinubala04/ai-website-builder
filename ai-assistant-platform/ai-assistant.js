const fetch = require('node-fetch');
const OpenAI = require('openai');

class AIAssistant {
    constructor() {
        // Initialize OpenAI if API key provided
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({ 
                apiKey: process.env.OPENAI_API_KEY 
            });
        }

        // Ollama configuration
        this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        this.preferLocal = process.env.PREFER_LOCAL !== 'false';
    }

    /**
     * Chat with the AI assistant
     */
    async chat({ userId, message, history = [], knowledge = [] }) {
        // Build context from history and knowledge
        const context = this.buildContext(history, knowledge);
        
        // Create the prompt
        const prompt = this.createPrompt(userId, message, context);

        try {
            // Try local Ollama first if preferred
            if (this.preferLocal) {
                const response = await this.chatWithOllama(prompt);
                if (response) return response;
            }

            // Fallback to OpenAI if available
            if (this.openai) {
                const response = await this.chatWithOpenAI(prompt, history);
                if (response) return response;
            }

            // If no AI available, return helpful message
            return this.getFallbackResponse(message);

        } catch (error) {
            console.error('AI chat error:', error);
            return "I'm having trouble connecting to my AI brain. Please try again in a moment.";
        }
    }

    /**
     * Build context from history and knowledge base
     */
    buildContext(history, knowledge) {
        let context = '';

        // Add relevant knowledge if found
        if (knowledge && knowledge.length > 0) {
            context += 'Relevant information from knowledge base:\n';
            knowledge.forEach(item => {
                context += `- ${item.title}: ${item.content}\n`;
            });
            context += '\n';
        }

        // Add recent conversation history
        if (history && history.length > 0) {
            context += 'Recent conversation:\n';
            history.slice(-5).forEach(msg => {
                context += `${msg.role}: ${msg.content}\n`;
            });
        }

        return context;
    }

    /**
     * Create prompt for AI
     */
    createPrompt(userId, message, context) {
        return `You are a helpful personal AI assistant. You have access to a knowledge base and can help answer questions.

${context}

Current message from user: ${message}

Provide a helpful, conversational response. If you found relevant information in the knowledge base, reference it naturally in your answer.`;
    }

    /**
     * Chat using local Ollama
     */
    async chatWithOllama(prompt) {
        try {
            const response = await fetch(`${this.ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: process.env.OLLAMA_MODEL || 'llama2',
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_p: 0.9,
                        max_tokens: 500
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
     * Chat using OpenAI
     */
    async chatWithOpenAI(prompt, history) {
        try {
            // Convert history to OpenAI format
            const messages = [
                { 
                    role: 'system', 
                    content: 'You are a helpful personal AI assistant with access to a knowledge base.'
                }
            ];

            // Add recent history
            history.slice(-5).forEach(msg => {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            });

            // Add current message
            messages.push({ role: 'user', content: prompt });

            const completion = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
                messages: messages,
                temperature: 0.7,
                max_tokens: 500
            });

            return completion.choices[0].message.content;

        } catch (error) {
            console.error('OpenAI error:', error);
            return null;
        }
    }

    /**
     * Fallback responses when no AI is available
     */
    getFallbackResponse(message) {
        const lower = message.toLowerCase();

        // Basic pattern matching for common queries
        if (lower.includes('hello') || lower.includes('hi')) {
            return "Hello! I'm your personal AI assistant. I'm currently running in basic mode, but I'm still here to help. What can I do for you?";
        }

        if (lower.includes('help')) {
            return "I can help you with various tasks! Try asking me questions, and I'll do my best to assist. I can also search our knowledge base for relevant information.";
        }

        if (lower.includes('how are you')) {
            return "I'm doing well, thank you for asking! I'm here and ready to help you with whatever you need.";
        }

        // Default response
        return `I understand you're asking about "${message}". While I'm currently in basic mode without full AI capabilities, I'm still here to help. Could you provide more details about what you're looking for?`;
    }

    /**
     * Check if AI services are available
     */
    async checkHealth() {
        const health = {
            ollama: false,
            openai: false,
            fallback: true
        };

        // Check Ollama
        try {
            const response = await fetch(`${this.ollamaUrl}/api/tags`);
            health.ollama = response.ok;
        } catch (error) {
            // Ollama not available
        }

        // Check OpenAI
        if (this.openai) {
            health.openai = true;
        }

        return health;
    }
}

module.exports = AIAssistant;