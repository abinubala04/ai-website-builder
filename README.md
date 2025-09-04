# 🚀 AI Website Builder - Build Apps with Natural Language

Transform your ideas into working websites using just natural language. No coding required.

![Demo](https://img.shields.io/badge/Demo-Live-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![AI](https://img.shields.io/badge/AI-Powered-purple)

## 🎯 What is this?

An open-source platform that lets anyone build real, working websites by simply describing what they want. Think "ChatGPT but it actually builds the website for you."

### Features

- 💬 **Natural Language Interface** - Just describe what you want
- 🎨 **Real-time Preview** - See your website as it's being built
- 🤖 **Multiple AI Models** - Uses Ollama (free), OpenAI, or Anthropic
- 📄 **Document Processing** - Upload specs, chat logs, or business plans
- 🚀 **Instant Export** - Download your website when done
- 👥 **Multi-user Platform** - Host for yourself or others
- 🔒 **No Technical Setup** - Users don't need API keys

## 🚀 Quick Start

### Option 1: Run Locally (5 minutes)

```bash
# Clone the repo
git clone https://github.com/yourusername/ai-website-builder.git
cd ai-website-builder/llm-course/llm-course-simple

# Go to the platform directory
cd hosted-platform

# Install and run
npm install
./just-work-dammit.sh
```

Visit http://localhost:3000 and start building!

### Option 2: Original LLM Course

This project includes the original "Build an LLM" course:

```bash
# Build your own LLM
node build-llm.js

# Test it works
./prove-it-works.sh

# Build web interface
node stage1.js
```

## 🛠️ Project Structure

```
llm-course-simple/
├── hosted-platform/        # Main AI Website Builder
│   ├── server.js          # Backend with auth & AI
│   ├── public/            # Frontend (landing, dashboard, workspace)
│   └── just-work-dammit.sh # Quick start script
├── mcp/                   # Template processor service
├── document-parser/       # Convert docs to MVPs
├── build-llm.js          # Original: Build an LLM
├── stage1-5.js           # Original: Progressive platform building
└── docker-compose.yml     # Run everything with Docker
```

## 📖 Documentation

- [Quick Start Guide](./hosted-platform/NON-TECHNICAL-SETUP.md)
- [Testing Your Platform](./hosted-platform/TEST-YOUR-PLATFORM.md) 
- [Architecture Overview](./ARCHITECTURE.md)
- [Contributing](./CONTRIBUTING.md)

## 🤝 Contributing

We love contributions! This project is open source and welcomes PRs.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Two ways to use this repo:**
1. 🚀 **Quick Start**: Use the hosted platform to build websites with AI
2. 📚 **Learn**: Follow the original course to build your own LLM from scratch

Star ⭐ this repo if you find it useful!