/**
 * Document Parser Module
 * Converts various document formats into structured data for MVP generation
 */

const fs = require('fs').promises;
const path = require('path');

class DocumentParser {
    constructor() {
        this.parsers = {
            '.md': this.parseMarkdown,
            '.txt': this.parseText,
            '.json': this.parseJSON,
            '.html': this.parseHTML
        };
    }

    async parseDocument(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const content = await fs.readFile(filePath, 'utf-8');
        
        const parser = this.parsers[ext] || this.parseText;
        return parser.call(this, content);
    }

    async parseFromString(content, type = 'text') {
        switch (type) {
            case 'markdown':
                return this.parseMarkdown(content);
            case 'json':
                return this.parseJSON(content);
            case 'html':
                return this.parseHTML(content);
            default:
                return this.parseText(content);
        }
    }

    parseMarkdown(content) {
        const lines = content.split('\n');
        const result = {
            title: '',
            sections: [],
            features: [],
            requirements: [],
            metadata: {}
        };

        let currentSection = null;
        
        for (const line of lines) {
            // Extract title
            if (line.startsWith('# ') && !result.title) {
                result.title = line.substring(2).trim();
            }
            // Extract sections
            else if (line.startsWith('## ')) {
                currentSection = {
                    title: line.substring(3).trim(),
                    content: []
                };
                result.sections.push(currentSection);
            }
            // Extract bullet points as potential features
            else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                const item = line.trim().substring(2);
                if (currentSection && currentSection.title.toLowerCase().includes('feature')) {
                    result.features.push(item);
                } else if (currentSection && currentSection.title.toLowerCase().includes('requirement')) {
                    result.requirements.push(item);
                }
            }
            // Add content to current section
            else if (currentSection && line.trim()) {
                currentSection.content.push(line);
            }
        }

        return result;
    }

    parseText(content) {
        // Simple text parsing - look for patterns
        const lines = content.split('\n').filter(l => l.trim());
        
        return {
            title: lines[0] || 'Untitled',
            content: content,
            sections: this.extractSections(lines),
            features: this.extractFeatures(content),
            requirements: this.extractRequirements(content)
        };
    }

    parseJSON(content) {
        try {
            const data = JSON.parse(content);
            
            // Handle chat logs
            if (Array.isArray(data) && data[0]?.message) {
                return this.parseChatLog(data);
            }
            
            // Handle structured project data
            return {
                title: data.title || data.name || 'Untitled Project',
                description: data.description || '',
                features: data.features || [],
                requirements: data.requirements || [],
                metadata: data
            };
        } catch (e) {
            return this.parseText(content);
        }
    }

    parseHTML(content) {
        // Simple HTML text extraction
        const textContent = content
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        return this.parseText(textContent);
    }

    parseChatLog(messages) {
        const result = {
            title: 'Chat Conversation',
            type: 'chat',
            messages: messages,
            extractedIdeas: [],
            features: [],
            requirements: []
        };

        // Extract ideas and features from conversation
        messages.forEach(msg => {
            const text = msg.message || msg.content || '';
            
            // Look for "I want", "I need", "build", "create", etc.
            if (text.match(/i (want|need|would like)/i)) {
                result.extractedIdeas.push(text);
            }
            
            // Extract features mentioned
            const features = this.extractFeatures(text);
            result.features.push(...features);
        });

        return result;
    }

    extractSections(lines) {
        const sections = [];
        let currentSection = null;

        lines.forEach(line => {
            // Detect section headers (all caps, followed by colon, etc.)
            if (line.match(/^[A-Z\s]+:?$/) || line.endsWith(':')) {
                currentSection = {
                    title: line.replace(':', '').trim(),
                    content: []
                };
                sections.push(currentSection);
            } else if (currentSection) {
                currentSection.content.push(line);
            }
        });

        return sections;
    }

    extractFeatures(text) {
        const features = [];
        const featurePatterns = [
            /(?:feature|functionality|ability to|can|should|must)\s+(.+?)(?:\.|,|$)/gi,
            /(?:user can|users can|allow|enable)\s+(.+?)(?:\.|,|$)/gi,
            /(?:build|create|add|implement)\s+(.+?)(?:\.|,|$)/gi
        ];

        featurePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                features.push(match[1].trim());
            }
        });

        return features;
    }

    extractRequirements(text) {
        const requirements = [];
        const reqPatterns = [
            /(?:require|need|must have|should have)\s+(.+?)(?:\.|,|$)/gi,
            /(?:built with|using|based on)\s+(.+?)(?:\.|,|$)/gi
        ];

        reqPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                requirements.push(match[1].trim());
            }
        });

        return requirements;
    }

    // Analyze document and suggest project type
    async analyzeDocument(parsedDoc) {
        const analysis = {
            suggestedType: 'website',
            complexity: 'medium',
            estimatedComponents: [],
            suggestedTech: []
        };

        // Determine project type
        const content = JSON.stringify(parsedDoc).toLowerCase();
        
        if (content.includes('app') || content.includes('mobile')) {
            analysis.suggestedType = 'webapp';
        } else if (content.includes('game')) {
            analysis.suggestedType = 'game';
        } else if (content.includes('api') || content.includes('backend')) {
            analysis.suggestedType = 'api';
        } else if (content.includes('landing') || content.includes('marketing')) {
            analysis.suggestedType = 'landing';
        }

        // Estimate complexity
        if (parsedDoc.features.length > 10) {
            analysis.complexity = 'high';
        } else if (parsedDoc.features.length < 3) {
            analysis.complexity = 'low';
        }

        // Suggest components
        if (content.includes('user') || content.includes('login')) {
            analysis.estimatedComponents.push('authentication');
        }
        if (content.includes('data') || content.includes('database')) {
            analysis.estimatedComponents.push('database');
        }
        if (content.includes('payment') || content.includes('stripe')) {
            analysis.estimatedComponents.push('payments');
        }

        return analysis;
    }
}

module.exports = DocumentParser;