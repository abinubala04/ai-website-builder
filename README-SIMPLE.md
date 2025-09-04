# Simple Setup - No Bullshit

You have two things that work:

## 1. LLM Course
Build your own LLM and use it to build stuff.

```bash
# Test the LLM
node build-llm.js

# Build a web interface
node stage1.js
```

## 2. Simple Git Platform
GitHub for normal people. No git commands.

```bash
cd simple-git-platform
npm install
npm start

# Open http://localhost:3000
```

## Your API Keys
Both tools use YOUR API keys from `.env`:
- Ollama (free, local)
- OpenAI 
- Anthropic
- DeepSeek

## Quick Start
```bash
./start-local.sh
```

That's it. No complex integrations. Just tools that work.