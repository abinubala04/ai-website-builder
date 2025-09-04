const { v4: uuidv4 } = require('uuid');

/**
 * Agent Provisioner
 * Creates and configures personal AI agents for each user
 */
class AgentProvisioner {
    constructor(db, aiService) {
        this.db = db;
        this.aiService = aiService;
    }

    /**
     * Create a new AI agent for a user
     */
    async createAgent(config) {
        const agentId = uuidv4();
        
        // Define agent's core configuration
        const agentConfig = {
            id: agentId,
            userId: config.userId,
            name: config.name,
            personality: config.personality,
            capabilities: config.capabilities,
            systemPrompt: this.buildSystemPrompt(config),
            memory: {
                shortTerm: [],
                longTerm: {},
                preferences: {}
            },
            status: 'initializing'
        };

        // Store in database
        await this.saveAgent(agentConfig);

        // Initialize AI context
        await this.initializeAIContext(agentConfig, config.projectContext);

        return agentConfig;
    }

    /**
     * Build system prompt that defines agent behavior
     */
    buildSystemPrompt(config) {
        const { name, personality, capabilities, projectContext } = config;

        return `
You are ${name}, a personal AI assistant dedicated to helping your user build their project.

Your personality:
- Tone: ${personality.tone}
- Style: ${personality.style}
- Greeting: "${personality.greeting}"
- Encouragement: "${personality.encouragement}"

Your capabilities:
- Code Generation: ${capabilities.codeGeneration ? 'Yes' : 'No'}
- Deployment: ${capabilities.deployment ? 'Yes' : 'No'}
- Explanation Level: ${capabilities.explanation}
- Automation: ${capabilities.automation}
- Guidance: ${capabilities.guidance}
${capabilities.hideComplexity ? '- Hide technical complexity from user' : ''}
${capabilities.showCode ? '- Show code when requested' : ''}
${capabilities.allowCustomization ? '- Allow deep customization' : ''}

Project Context:
${projectContext}

Core Directives:
1. Always maintain your assigned personality
2. Build exactly what the user describes
3. Handle all technical implementation
4. Deploy working applications
5. Learn from user preferences
6. Never overwhelm with complexity unless requested
7. Celebrate progress and encourage the user

You have access to:
- Full code generation capabilities
- Deployment to production
- Database management
- UI/UX creation
- API integration
- Testing and debugging

Remember: Your goal is to make their idea real, not to teach them programming (unless they ask).
        `.trim();
    }

    /**
     * Save agent to database
     */
    async saveAgent(agentConfig) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO agents (id, user_id, name, personality, capabilities, system_prompt, memory, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                [
                    agentConfig.id,
                    agentConfig.userId,
                    agentConfig.name,
                    JSON.stringify(agentConfig.personality),
                    JSON.stringify(agentConfig.capabilities),
                    agentConfig.systemPrompt,
                    JSON.stringify(agentConfig.memory),
                    agentConfig.status
                ],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Initialize AI context with project understanding
     */
    async initializeAIContext(agent, projectContext) {
        // Use AI to analyze the project and prepare agent
        const analysis = await this.aiService.analyze({
            prompt: `Analyze this project idea and extract key requirements:\n\n${projectContext}`,
            model: 'claude-3-sonnet' // or local model
        });

        // Store initial understanding
        agent.memory.longTerm.projectAnalysis = analysis;
        agent.memory.longTerm.extractedFeatures = this.extractFeatures(analysis);
        
        // Update agent status
        await this.updateAgentStatus(agent.id, 'ready');
    }

    /**
     * Initialize agent with workspace
     */
    async initializeAgent(agentId, config) {
        const { workspaceId, initialPrompt, buildGoals } = config;

        // Load agent
        const agent = await this.getAgent(agentId);

        // Store workspace association
        agent.memory.longTerm.workspaceId = workspaceId;
        agent.memory.longTerm.buildGoals = buildGoals;

        // Create initial conversation
        const greeting = await this.generateGreeting(agent, initialPrompt);
        
        // Store greeting as first interaction
        agent.memory.shortTerm.push({
            role: 'assistant',
            content: greeting,
            timestamp: new Date().toISOString()
        });

        // Update memory in database
        await this.updateAgentMemory(agentId, agent.memory);

        return {
            greeting,
            ready: true
        };
    }

    /**
     * Generate personalized greeting
     */
    async generateGreeting(agent, context) {
        const prompt = `
${agent.systemPrompt}

Context: ${context}

Generate your first greeting to the user. Be true to your personality and acknowledge their project idea. 
Show enthusiasm and confirm you understand what they want to build.
Keep it concise but warm.
        `;

        const response = await this.aiService.generate({
            prompt,
            temperature: 0.7,
            maxTokens: 200
        });

        return response.content;
    }

    /**
     * Extract features from AI analysis
     */
    extractFeatures(analysis) {
        // Parse AI response to extract structured features
        // This is simplified - in production would use structured output
        return {
            core: ['user interface', 'data storage', 'authentication'],
            optional: ['ai integration', 'payment processing'],
            technical: ['responsive design', 'api endpoints']
        };
    }

    /**
     * Update agent status
     */
    async updateAgentStatus(agentId, status) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE agents SET status = ? WHERE id = ?',
                [status, agentId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Update agent memory
     */
    async updateAgentMemory(agentId, memory) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE agents SET memory = ? WHERE id = ?',
                [JSON.stringify(memory), agentId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Get agent by ID
     */
    async getAgent(agentId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM agents WHERE id = ?',
                [agentId],
                (err, row) => {
                    if (err) reject(err);
                    else if (!row) reject(new Error('Agent not found'));
                    else {
                        resolve({
                            ...row,
                            personality: JSON.parse(row.personality),
                            capabilities: JSON.parse(row.capabilities),
                            memory: JSON.parse(row.memory)
                        });
                    }
                }
            );
        });
    }

    /**
     * Process user message and generate response
     */
    async processMessage(agentId, message) {
        const agent = await this.getAgent(agentId);

        // Add to conversation history
        agent.memory.shortTerm.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });

        // Generate response with full context
        const prompt = `
${agent.systemPrompt}

Conversation History:
${agent.memory.shortTerm.map(m => `${m.role}: ${m.content}`).join('\n')}

User: ${message}

Respond according to your personality and help them build their project.
If they're asking about features, reference the project analysis.
If they want to see progress, describe what you're building.
Always be encouraging and helpful.
        `;

        const response = await this.aiService.generate({
            prompt,
            temperature: 0.7,
            maxTokens: 500
        });

        // Store assistant response
        agent.memory.shortTerm.push({
            role: 'assistant',
            content: response.content,
            timestamp: new Date().toISOString()
        });

        // Keep conversation history manageable
        if (agent.memory.shortTerm.length > 20) {
            // Archive older messages
            agent.memory.longTerm.archivedConversations = 
                agent.memory.longTerm.archivedConversations || [];
            agent.memory.longTerm.archivedConversations.push(
                agent.memory.shortTerm.slice(0, 10)
            );
            agent.memory.shortTerm = agent.memory.shortTerm.slice(10);
        }

        // Update memory
        await this.updateAgentMemory(agentId, agent.memory);

        return {
            response: response.content,
            action: this.detectAction(message, response.content)
        };
    }

    /**
     * Detect if response requires action
     */
    detectAction(userMessage, agentResponse) {
        const message = userMessage.toLowerCase();
        const response = agentResponse.toLowerCase();

        if (message.includes('deploy') || response.includes('deploy')) {
            return { type: 'deploy', status: 'pending' };
        }
        if (message.includes('show') || message.includes('preview')) {
            return { type: 'preview', status: 'pending' };
        }
        if (message.includes('code') && !response.includes('hide')) {
            return { type: 'show-code', status: 'pending' };
        }

        return null;
    }
}

module.exports = AgentProvisioner;