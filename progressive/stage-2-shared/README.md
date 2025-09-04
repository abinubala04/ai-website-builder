# Stage 2: Shared AI with Database 🌍

## What's New in Stage 2

We've added a **real database** so the AI works across browsers!

### Improvements from Stage 1:
- ✅ SQLite database for persistence
- ✅ Works across ALL browsers and devices
- ✅ Survives server restarts
- ✅ Can see usage statistics
- ✅ Shared learning for everyone

### New Problems:
- ❌ ANYONE can delete patterns
- ❌ No user accounts or privacy
- ❌ Trolls can teach inappropriate things
- ❌ Can't have personal AI patterns
- ❌ No way to know who taught what

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open in browser
open http://localhost:3000
```

## Try This Test

1. **Terminal 1**: Start the server
   ```bash
   npm start
   ```

2. **Browser 1**: Open http://localhost:3000
   - Teach: "pizza" → "yummy!"

3. **Browser 2**: Open in incognito/different browser
   - Type "pizza"
   - It responds "yummy!" 
   - **It works across browsers!** 🎉

4. **The Problem**: In Browser 2, click ❌ on the pattern
   - It's deleted for EVERYONE
   - No protection!

## Technical Stack

- **Backend**: Express.js server
- **Database**: SQLite (file-based, no setup needed)
- **API**: RESTful endpoints
- **Frontend**: Vanilla JavaScript

## API Endpoints

```
GET  /api/patterns     - Get all patterns
POST /api/teach        - Teach new pattern
POST /api/chat         - Get AI response  
GET  /api/stats        - Get usage statistics
DELETE /api/patterns/:id - Delete pattern (THE PROBLEM!)
```

## Database Schema

```sql
-- Everyone shares these patterns
CREATE TABLE patterns (
    id INTEGER PRIMARY KEY,
    trigger TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at DATETIME,
    use_count INTEGER DEFAULT 0
);

-- Chat history for analytics
CREATE TABLE chat_history (
    id INTEGER PRIMARY KEY,
    message TEXT,
    response TEXT,
    timestamp DATETIME
);
```

## The Core Problem

This works great for a demo, but for a real product:

1. **No Protection**: Anyone can delete/modify patterns
2. **No Privacy**: Everyone sees everything
3. **No Attribution**: Don't know who taught what
4. **No Customization**: Can't have personal AI

**This is why we need Stage 3: User Authentication!**

## Files in This Stage

```
stage-2-shared/
├── server.js       # Express server with SQLite
├── index.html      # Frontend with shared AI
├── package.json    # Dependencies
├── README.md       # This file
└── shared-ai.db    # SQLite database (created automatically)
```

## Moving Forward

Ready for user accounts and private AI spaces?

→ **[Continue to Stage 3: Multi-User AI](../stage-3-users/README.md)**