# Contributing to AI Website Builder

First off, thank you for considering contributing to AI Website Builder! It's people like you that make this tool better for everyone.

## 🤝 Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences

## 🚀 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**To report a bug:**
1. Use the issue template
2. Include detailed steps to reproduce
3. Include your environment (OS, Node version, etc.)
4. Add screenshots if applicable

### Suggesting Enhancements

We love feature suggestions! Please:
1. Check if it's already suggested
2. Clearly describe the feature
3. Explain why it would be useful
4. Include mockups/examples if possible

### Pull Requests

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Write/update tests if needed
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
7. Push to the branch (`git push origin feature/AmazingFeature`)
8. Open a Pull Request

## 💻 Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/ai-website-builder.git
cd ai-website-builder/llm-course/llm-course-simple

# Install dependencies
cd hosted-platform
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Run in development
npm run dev
```

## 📝 Style Guidelines

### JavaScript Style
- Use ES6+ features
- Async/await over callbacks
- Meaningful variable names
- Comment complex logic

### Commit Messages
- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters
- Reference issues and pull requests

Example:
```
Add landing page template generator

- Implement template matching algorithm
- Add tests for template selection
- Update documentation

Fixes #123
```

### Code Example
```javascript
// Good
async function generateWebsite(userPrompt) {
    // Extract requirements from user input
    const requirements = await extractRequirements(userPrompt);
    
    // Generate appropriate code
    const code = await generateCode(requirements);
    
    return code;
}

// Avoid
function genSite(p) {
    return new Promise((res, rej) => {
        // ...
    });
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test
npm test -- --grep "AI integration"

# Run with coverage
npm run test:coverage
```

### Writing Tests
- Test files should be in `__tests__` or end with `.test.js`
- Write descriptive test names
- Test edge cases
- Mock external services

## 📦 Project Structure

Understanding the structure helps you contribute effectively:

```
hosted-platform/
├── server.js          # Main backend - auth, API, database
├── public/
│   ├── index.html     # Landing page - marketing/signup
│   ├── dashboard.html # User dashboard - project management
│   └── workspace.html # AI workspace - where the magic happens
├── just-work-dammit.sh # Quick start script
└── tests/             # Test files

Key areas for contribution:
- AI Integration: Improve prompts, add new AI providers
- Templates: Add new website templates
- UI/UX: Enhance the workspace experience
- Documentation: Help others understand and use the tool
```

## 🎯 Areas We Need Help

- **More Templates**: Add templates for different website types
- **Better AI Prompts**: Improve code generation quality
- **UI Improvements**: Make the interface more intuitive
- **Documentation**: Tutorials, videos, examples
- **Testing**: Increase test coverage
- **Accessibility**: Make it usable for everyone
- **Internationalization**: Add language support

## 🔍 Review Process

1. Automated tests run on all PRs
2. Code review by maintainers
3. Testing in development environment
4. Merge to main branch

## 📚 Resources

- [Project Documentation](./README.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Development Guide](./docs/development.md)
- [Discord Community](https://discord.gg/ai-website-builder)

## 🙏 Recognition

Contributors will be:
- Listed in our README
- Given credit in release notes
- Invited to our contributors Discord channel

## Questions?

Feel free to:
- Open an issue
- Join our Discord
- Email maintainers

Thank you for making AI Website Builder better! 🚀