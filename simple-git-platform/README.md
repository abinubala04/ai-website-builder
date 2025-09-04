# Simple Git Platform - GitHub for Normal People

## What This Is

A simplified version control platform that works like GitHub but without all the technical complexity. Perfect for people who just want to build and share projects without learning git commands.

## Features

- 📁 **Simple Projects** - Create projects with one click (no `git init`)
- 💾 **Auto-Save** - Every change saved automatically (no `git add/commit`)
- 📝 **Visual Editor** - Edit files right in your browser
- 🤖 **AI Helper** - Describe what you want, AI writes the code
- 📊 **Version History** - See all versions, restore any time
- 🔗 **Easy Sharing** - Share projects with a simple link
- 🚀 **No Terminal** - Everything works with buttons and forms

## Quick Start

```bash
# Clone or download this folder
cd simple-git-platform

# Install dependencies (just 4!)
npm install

# Start the server
npm start

# Open browser
http://localhost:3000
```

## How It Works

1. **Sign Up** - Just email and password
2. **Create Project** - Name it and click create
3. **Add Files** - Create files with the UI
4. **AI Generate** - Or let AI create files for you
5. **Save Versions** - Click "Save Version" anytime
6. **Share** - Send project link to friends

## The Simplicity

### Traditional Git:
```bash
git init
git add .
git commit -m "message"
git push origin main
# 😵 Confusing!
```

### Simple Git Platform:
```
Click "Create Project"
Edit files
Click "Save Version"
# 😊 Easy!
```

## Technical Details (for developers)

- **Single File**: Everything in `server.js` (1 file!)
- **Database**: SQLite (no setup required)
- **Dependencies**: Only 4 packages
- **No Build Process**: Just Node.js
- **Embedded HTML**: No separate frontend

## File Structure

```
simple-git-platform/
├── server.js       # Everything is here!
├── package.json    # Just 4 dependencies
├── platform.db     # Auto-created SQLite database
└── projects/       # Where projects are stored
```

## Why This Exists

GitHub is amazing for developers, but for everyone else:
- Too many concepts (repos, commits, branches, PRs)
- Terminal commands are scary
- Git errors are cryptic
- Setup is complex

This platform removes all that complexity while keeping the core value: version control and project sharing.

## Future Features

- [ ] Real AI integration (currently using templates)
- [ ] One-click deployment
- [ ] Project templates
- [ ] Collaboration features
- [ ] Mobile app

## The Philosophy

**Make version control as easy as Google Docs**. No technical knowledge required. Just create, edit, save, and share.

---

*Built for humans, not machines.*