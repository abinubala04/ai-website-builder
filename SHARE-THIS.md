# How to Share This With Others

## What This Is
Two simple tools that work together:
1. **LLM Course** - Build and chat with your own AI
2. **Simple Git Platform** - GitHub without the complexity

## For You to Share

### Option 1: Quick Share (They use your setup)
```bash
# They clone your folder
git clone [your-repo] 

# They run
./start-local.sh
```
They'll use YOUR API keys (from .env files).

### Option 2: They Get Their Own API Keys

Tell them to:

1. **Get Ollama (FREE)**
   ```bash
   # Mac
   brew install ollama
   ollama pull codellama:7b
   
   # Or download from https://ollama.ai
   ```

2. **Get API Keys (Optional)**
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com
   - Or just use Ollama (free)

3. **Update .env files**
   ```bash
   # Edit these files:
   .env                        # LLM Course keys
   simple-git-platform/.env    # Simple Git keys
   ```

4. **Run**
   ```bash
   ./start-local.sh
   ```

## What They Get

### LLM Chat (Like ChatGPT but yours)
- Terminal: `node build-llm.js`
- Web: `node stage1.js` → http://localhost:3000

### Simple Git (Like GitHub but simple)
- `cd simple-git-platform && npm start`
- Create projects, edit code, save versions
- No git commands needed

## The Magic
- **100% Local** - Runs on their computer
- **Their API Keys** - They control the AI
- **No Tracking** - No cloud dependency
- **Actually Simple** - 10 files, not 1000

## One-Liner to Share
"Here's a simple AI coding environment. Clone this, add your API keys to .env, run ./start-local.sh"

## For Non-Technical Friends
1. Install Node.js from nodejs.org
2. Download this folder
3. Double-click `start-local.sh` (Mac/Linux) or run commands in README
4. Open browser to http://localhost:3000

That's it. No complex setup. Just tools that work.