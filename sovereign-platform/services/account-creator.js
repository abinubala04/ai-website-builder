const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Sovereign Account Creator
 * Creates isolated accounts with personal AI agents for non-technical users
 */
class SovereignAccountCreator {
    constructor(db, agentProvisioner, workspaceBuilder) {
        this.db = db;
        this.agentProvisioner = agentProvisioner;
        this.workspaceBuilder = workspaceBuilder;
    }

    /**
     * Create a complete sovereign account from intake form data
     */
    async createAccount(intakeData) {
        console.log('Creating sovereign account for:', intakeData.email);

        try {
            // 1. Create user account
            const user = await this.createUser(intakeData);
            
            // 2. Create personal AI agent
            const agent = await this.agentProvisioner.createAgent({
                userId: user.id,
                name: this.generateAgentName(intakeData),
                personality: this.buildAgentPersonality(intakeData),
                capabilities: this.determineCapabilities(intakeData.techLevel),
                projectContext: intakeData.projectIdea
            });
            
            // 3. Create isolated workspace
            const workspace = await this.workspaceBuilder.createWorkspace({
                userId: user.id,
                agentId: agent.id,
                projectType: this.detectProjectType(intakeData.projectIdea),
                resources: this.allocateResources(intakeData)
            });
            
            // 4. Initialize agent with workspace
            await this.agentProvisioner.initializeAgent(agent.id, {
                workspaceId: workspace.id,
                initialPrompt: this.createInitialPrompt(intakeData),
                buildGoals: this.extractBuildGoals(intakeData)
            });
            
            // 5. Send welcome email with access info
            await this.sendWelcomeEmail(user, agent, workspace);
            
            return {
                success: true,
                userId: user.id,
                agentId: agent.id,
                workspaceId: workspace.id,
                accessUrl: workspace.accessUrl
            };
            
        } catch (error) {
            console.error('Account creation failed:', error);
            throw error;
        }
    }

    /**
     * Create user in database
     */
    async createUser(intakeData) {
        const userId = uuidv4();
        
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO users (id, email, name, tech_level, business_goal, communication_style, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
                [
                    userId,
                    intakeData.email,
                    intakeData.name,
                    intakeData.techLevel,
                    intakeData.businessGoal,
                    intakeData.communicationStyle
                ],
                function(err) {
                    if (err) {
                        if (err.message.includes('UNIQUE constraint failed')) {
                            reject(new Error('Email already registered'));
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve({
                            id: userId,
                            email: intakeData.email,
                            name: intakeData.name
                        });
                    }
                }
            );
        });
    }

    /**
     * Generate a friendly agent name based on project
     */
    generateAgentName(intakeData) {
        const projectKeywords = intakeData.projectIdea.toLowerCase();
        
        // Match keywords to agent names
        if (projectKeywords.includes('recipe') || projectKeywords.includes('food')) {
            return 'Chef';
        } else if (projectKeywords.includes('blog') || projectKeywords.includes('write')) {
            return 'Scribe';
        } else if (projectKeywords.includes('shop') || projectKeywords.includes('store')) {
            return 'Merchant';
        } else if (projectKeywords.includes('learn') || projectKeywords.includes('teach')) {
            return 'Mentor';
        } else if (projectKeywords.includes('art') || projectKeywords.includes('design')) {
            return 'Artist';
        } else {
            // Default creative names
            const names = ['Builder', 'Creator', 'Architect', 'Maker', 'Forge'];
            return names[Math.floor(Math.random() * names.length)];
        }
    }

    /**
     * Build agent personality based on communication style
     */
    buildAgentPersonality(intakeData) {
        const personalities = {
            friendly: {
                tone: 'warm and encouraging',
                greeting: 'Hey there! I\'m excited to help you build',
                encouragement: 'You\'re doing great! Let\'s keep going.',
                style: 'uses emoji, casual language, lots of encouragement'
            },
            professional: {
                tone: 'clear and direct',
                greeting: 'Hello. I\'m ready to help you build',
                encouragement: 'Good progress. Let\'s continue.',
                style: 'formal, precise, focuses on efficiency'
            },
            teacher: {
                tone: 'patient and educational',
                greeting: 'Welcome! I\'m here to guide you through building',
                encouragement: 'Excellent question! Let me explain...',
                style: 'explanatory, provides context, teaches concepts'
            },
            concise: {
                tone: 'brief and factual',
                greeting: 'Ready to build',
                encouragement: 'Done. Next step:',
                style: 'minimal words, bullet points, just facts'
            },
            creative: {
                tone: 'playful and imaginative',
                greeting: 'Ooh, what an adventure we\'re about to embark on!',
                encouragement: 'This is shaping up beautifully!',
                style: 'metaphors, creative language, enthusiastic'
            }
        };

        return personalities[intakeData.communicationStyle] || personalities.friendly;
    }

    /**
     * Determine agent capabilities based on user's tech level
     */
    determineCapabilities(techLevel) {
        const capabilities = {
            none: {
                codeGeneration: true,
                deployment: true,
                explanation: 'simple',
                automation: 'full',
                guidance: 'step-by-step',
                hideComplexity: true
            },
            beginner: {
                codeGeneration: true,
                deployment: true,
                explanation: 'moderate',
                automation: 'assisted',
                guidance: 'explanatory',
                hideComplexity: false,
                showCode: true
            },
            intermediate: {
                codeGeneration: true,
                deployment: true,
                explanation: 'technical',
                automation: 'optional',
                guidance: 'collaborative',
                hideComplexity: false,
                showCode: true,
                allowCustomization: true
            }
        };

        return capabilities[techLevel] || capabilities.none;
    }

    /**
     * Detect project type from description
     */
    detectProjectType(projectIdea) {
        const idea = projectIdea.toLowerCase();
        
        if (idea.includes('blog') || idea.includes('write')) return 'blog';
        if (idea.includes('shop') || idea.includes('store') || idea.includes('sell')) return 'ecommerce';
        if (idea.includes('learn') || idea.includes('course') || idea.includes('teach')) return 'education';
        if (idea.includes('recipe') || idea.includes('food')) return 'recipe-app';
        if (idea.includes('todo') || idea.includes('task')) return 'productivity';
        if (idea.includes('chat') || idea.includes('message')) return 'communication';
        if (idea.includes('game')) return 'game';
        
        return 'custom';
    }

    /**
     * Allocate resources based on project type and goals
     */
    allocateResources(intakeData) {
        const baseResources = {
            cpu: '0.5',
            memory: '512MB',
            storage: '1GB',
            bandwidth: '10GB/month'
        };

        // Increase for business users
        if (intakeData.businessGoal === 'business' || intakeData.businessGoal === 'client') {
            return {
                cpu: '1.0',
                memory: '1GB',
                storage: '5GB',
                bandwidth: '50GB/month'
            };
        }

        return baseResources;
    }

    /**
     * Create initial prompt for agent
     */
    createInitialPrompt(intakeData) {
        return `
User Profile:
- Name: ${intakeData.name}
- Technical Level: ${intakeData.techLevel}
- Goal: ${intakeData.businessGoal}
- Communication Preference: ${intakeData.communicationStyle}

Project Description:
${intakeData.projectIdea}

Your Mission:
1. Understand exactly what ${intakeData.name} wants to build
2. Create a working application that matches their vision
3. Guide them using their preferred communication style
4. Handle all technical complexity for them
5. Deploy to production when ready

Start by greeting them and confirming you understand their project.
        `.trim();
    }

    /**
     * Extract specific build goals from project idea
     */
    extractBuildGoals(intakeData) {
        // This would use AI to extract specific features
        // For now, return structured goals
        return {
            primary: 'Create a working ' + this.detectProjectType(intakeData.projectIdea),
            features: this.extractFeatures(intakeData.projectIdea),
            mustHave: ['user-friendly', 'works immediately', 'looks professional'],
            timeline: 'ASAP'
        };
    }

    /**
     * Simple feature extraction (would use AI in production)
     */
    extractFeatures(projectIdea) {
        const features = [];
        const idea = projectIdea.toLowerCase();

        // Common feature patterns
        if (idea.includes('user') || idea.includes('account')) features.push('user accounts');
        if (idea.includes('search')) features.push('search functionality');
        if (idea.includes('save') || idea.includes('favorite')) features.push('save/favorite items');
        if (idea.includes('share')) features.push('sharing features');
        if (idea.includes('rate') || idea.includes('review')) features.push('ratings/reviews');
        if (idea.includes('ai') || idea.includes('smart')) features.push('AI features');

        return features;
    }

    /**
     * Send welcome email (or console message for now)
     */
    async sendWelcomeEmail(user, agent, workspace) {
        console.log('\n' + '='.repeat(60));
        console.log('🎉 SOVEREIGN ACCOUNT CREATED!');
        console.log('='.repeat(60));
        console.log(`User: ${user.name} (${user.email})`);
        console.log(`Agent Name: ${agent.name}`);
        console.log(`Workspace ID: ${workspace.id}`);
        console.log(`Access URL: ${workspace.accessUrl}`);
        console.log('='.repeat(60) + '\n');

        // In production, send actual email
        // For now, we'll use magic link style console output
    }
}

module.exports = SovereignAccountCreator;