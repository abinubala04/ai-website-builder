# 🧪 Test Your Platform (For Non-Technical You!)

## Quick Test in 5 Minutes

### 1. Start it up
```bash
cd /Users/matthewmauer/Desktop/Document-Generator/llm-course/llm-course-simple/hosted-platform
./just-run-this.sh
```

### 2. Open your browser
Go to: http://localhost:3000

You should see a nice landing page with "Build Apps with Natural Language" 🎨

### 3. Test Sign Up
1. Click "Get Started" or "Sign Up"
2. Use email: `test@test.com`
3. Use password: `password123`
4. Click Sign Up

You should land on your dashboard! 🎉

### 4. Create a Project
1. Click "Create New Project"
2. Name it: "My First App"
3. Choose type: Web App
4. Click Create

### 5. Test the AI
In the chat, type:
```
Create a button that shows a random joke when clicked
```

Watch as:
- The AI responds in the chat
- Code appears in the editor
- Preview updates automatically

### 6. Test Saving
- Make any change in the code editor
- It should auto-save (see "Saved!" message)
- Refresh the page - your code is still there!

---

## Check Everything Works

### ✅ Ollama Check
In a new Terminal:
```bash
curl http://localhost:11434/api/tags
```

Should show your Ollama models. If not:
```bash
ollama serve  # In one terminal
ollama pull codellama:7b  # In another
```

### ✅ AI Credits Check
Look at top right of dashboard - should show "AI Credits: 100"

Each message uses 1 credit. After 100, users would need to upgrade (but you can change this in .env)

### ✅ Database Check
A file called `platform.db` should exist in the hosted-platform folder.

---

## Common Issues & Fixes

### "Cannot connect to Ollama"
Your Ollama isn't running. Start it:
```bash
ollama serve
```

### "AI not responding"
Check your .env file has your API keys:
```bash
cat .env | grep API_KEY
```

### "Login not working"
Clear your browser cookies for localhost:3000

---

## Show Your Friends!

### Local Network (same WiFi):
1. Find your IP:
   ```bash
   ipconfig getifaddr en0
   ```
2. Share: `http://YOUR-IP:3000`

### Internet (anywhere):
```bash
./deploy-simple.sh local
```
Share the ngrok URL it gives you!

---

## You Did It! 🎉

You now have:
- A working AI app builder
- User accounts and authentication  
- Project saving
- AI-powered code generation
- No technical skills required for users

Your mom could literally sign up and build an app. That's the whole point!