const fs = require('fs').promises;
const path = require('path');

class KnowledgeBase {
    constructor() {
        this.dataPath = path.join(__dirname, 'knowledge');
        this.documents = [];
        this.initialized = false;
        this.init();
    }

    /**
     * Initialize knowledge base
     */
    async init() {
        try {
            // Create knowledge directory if it doesn't exist
            await fs.mkdir(this.dataPath, { recursive: true });
            
            // Load all documents
            await this.loadDocuments();
            
            // Create default documents if empty
            if (this.documents.length === 0) {
                await this.createDefaultDocuments();
            }
            
            this.initialized = true;
            console.log(`✅ Knowledge base loaded with ${this.documents.length} documents`);
            
        } catch (error) {
            console.error('Failed to initialize knowledge base:', error);
        }
    }

    /**
     * Load documents from files
     */
    async loadDocuments() {
        try {
            const files = await fs.readdir(this.dataPath);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const content = await fs.readFile(
                        path.join(this.dataPath, file), 
                        'utf8'
                    );
                    const doc = JSON.parse(content);
                    this.documents.push(doc);
                }
            }
        } catch (error) {
            console.error('Error loading documents:', error);
        }
    }

    /**
     * Create default knowledge base documents
     */
    async createDefaultDocuments() {
        const defaults = [
            {
                id: 'welcome',
                title: 'Welcome to AI Assistant Platform',
                content: 'This platform provides each user with a personal AI assistant that can help answer questions and access shared knowledge.',
                tags: ['platform', 'introduction', 'welcome'],
                category: 'general'
            },
            {
                id: 'features',
                title: 'Platform Features',
                content: 'Key features include: Personal AI assistant for each user, Persistent chat history, Knowledge base access, Secure authentication, Password recovery, and Easy deployment.',
                tags: ['features', 'capabilities', 'platform'],
                category: 'general'
            },
            {
                id: 'ai-capabilities',
                title: 'AI Assistant Capabilities',
                content: 'Your AI assistant can: Answer questions, Search the knowledge base, Remember conversation context, Provide helpful suggestions, and Learn from interactions.',
                tags: ['ai', 'assistant', 'capabilities'],
                category: 'technical'
            },
            {
                id: 'getting-started',
                title: 'Getting Started Guide',
                content: 'To get started: 1) Register for an account, 2) Log in to access your personal assistant, 3) Start chatting with your AI, 4) Your conversations are saved automatically.',
                tags: ['guide', 'tutorial', 'getting-started'],
                category: 'help'
            },
            {
                id: 'security',
                title: 'Security & Privacy',
                content: 'We take security seriously: Passwords are encrypted, Sessions expire after 24 hours, Each user has isolated data, Password reset via email, No data sharing between users.',
                tags: ['security', 'privacy', 'authentication'],
                category: 'technical'
            }
        ];

        // Save default documents
        for (const doc of defaults) {
            await this.saveDocument(doc);
        }
        
        this.documents = defaults;
    }

    /**
     * Search knowledge base
     */
    async search(query, limit = 5) {
        if (!query || query.trim() === '') {
            return [];
        }

        const queryLower = query.toLowerCase();
        const words = queryLower.split(/\s+/);

        // Score each document based on relevance
        const scored = this.documents.map(doc => {
            let score = 0;

            // Title match (highest weight)
            if (doc.title.toLowerCase().includes(queryLower)) {
                score += 10;
            }

            // Content match
            const contentLower = doc.content.toLowerCase();
            words.forEach(word => {
                if (contentLower.includes(word)) {
                    score += 2;
                }
            });

            // Tag match
            if (doc.tags) {
                doc.tags.forEach(tag => {
                    if (tag.toLowerCase().includes(queryLower) || 
                        queryLower.includes(tag.toLowerCase())) {
                        score += 5;
                    }
                });
            }

            return { ...doc, score };
        });

        // Sort by score and return top results
        return scored
            .filter(doc => doc.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(({ score, ...doc }) => doc);
    }

    /**
     * Get document by ID
     */
    async getDocument(id) {
        return this.documents.find(doc => doc.id === id);
    }

    /**
     * Add new document
     */
    async addDocument(doc) {
        // Ensure document has required fields
        if (!doc.id || !doc.title || !doc.content) {
            throw new Error('Document must have id, title, and content');
        }

        // Add to memory
        this.documents.push(doc);

        // Save to file
        await this.saveDocument(doc);

        return doc;
    }

    /**
     * Update document
     */
    async updateDocument(id, updates) {
        const index = this.documents.findIndex(doc => doc.id === id);
        if (index === -1) {
            throw new Error('Document not found');
        }

        // Update in memory
        this.documents[index] = { ...this.documents[index], ...updates };

        // Save to file
        await this.saveDocument(this.documents[index]);

        return this.documents[index];
    }

    /**
     * Delete document
     */
    async deleteDocument(id) {
        const index = this.documents.findIndex(doc => doc.id === id);
        if (index === -1) {
            throw new Error('Document not found');
        }

        // Remove from memory
        this.documents.splice(index, 1);

        // Delete file
        try {
            await fs.unlink(path.join(this.dataPath, `${id}.json`));
        } catch (error) {
            console.error('Failed to delete document file:', error);
        }

        return true;
    }

    /**
     * Save document to file
     */
    async saveDocument(doc) {
        const filePath = path.join(this.dataPath, `${doc.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(doc, null, 2));
    }

    /**
     * Get all documents (for admin)
     */
    async getAllDocuments() {
        return this.documents;
    }

    /**
     * Get categories
     */
    getCategories() {
        const categories = new Set();
        this.documents.forEach(doc => {
            if (doc.category) {
                categories.add(doc.category);
            }
        });
        return Array.from(categories);
    }

    /**
     * Get documents by category
     */
    getByCategory(category) {
        return this.documents.filter(doc => doc.category === category);
    }
}

module.exports = KnowledgeBase;