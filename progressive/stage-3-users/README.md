# Stage 3: Multi-User AI with Authentication 👤

## What's New in Stage 3

We've added **user accounts** so everyone has their own AI!

### Improvements from Stage 2:
- ✅ Secure user registration and login
- ✅ Personal AI patterns for each user
- ✅ Can only delete YOUR OWN patterns
- ✅ Optional public sharing
- ✅ Password hashing with bcrypt
- ✅ JWT authentication
- ✅ Personalized AI responses

### New Problems:
- ❌ Still one big system for everyone
- ❌ No way to have separate organizations
- ❌ No team features
- ❌ No billing or subscriptions
- ❌ No API for developers

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

1. **Browser 1**: Create account "alice"
   - Teach: "coffee" → "energy boost!"
   - Keep it private

2. **Browser 2**: Create account "bob"
   - Type "coffee" - no response!
   - Alice's patterns are private!

3. **Back to Alice**: Make pattern public
   - Check "Share publicly"
   - Re-teach the pattern

4. **Back to Bob**: Type "coffee" again
   - Now it works! (marked as public pattern)

## Technical Stack

- **Authentication**: JWT tokens
- **Password Security**: bcrypt hashing
- **Database**: SQLite with user relationships
- **Authorization**: User-owned resources

## Database Schema

```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    password_hash TEXT,
    created_at DATETIME
);

-- Patterns belong to users
CREATE TABLE patterns (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    trigger TEXT,
    response TEXT,
    is_public BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## API Endpoints

### Public Endpoints
```
POST /api/register - Create new account
POST /api/login    - Login to get JWT token
```

### Protected Endpoints (require token)
```
GET    /api/patterns     - Get your patterns + public ones
POST   /api/teach        - Create pattern (yours)
POST   /api/chat         - Chat with your AI
DELETE /api/patterns/:id - Delete YOUR pattern only
GET    /api/stats        - Get personalized stats
```

## Security Features

1. **Password Hashing**: Never store plain passwords
2. **JWT Tokens**: Stateless authentication
3. **Resource Authorization**: Can only modify your own data
4. **Input Validation**: Check all user inputs

## The Core Problem

This works great for a personal app, but what if you want to:

1. **Sell to businesses**: Each company needs their own space
2. **Support teams**: Multiple users per organization
3. **Charge money**: Billing and subscriptions
4. **White-label**: Custom branding per customer
5. **Scale**: Handle thousands of organizations

**This is why we need Stage 4: Multi-Tenant SaaS!**

## Code Structure

```javascript
// Authentication middleware
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token required' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Protected route example
app.delete('/api/patterns/:id', authenticateToken, (req, res) => {
    // Can only delete YOUR OWN patterns
    db.run(
        "DELETE FROM patterns WHERE id = ? AND user_id = ?",
        [req.params.id, req.user.id],
        // ...
    );
});
```

## What You've Learned

1. **User Authentication**: Register, login, JWT tokens
2. **Authorization**: User owns their data
3. **Data Isolation**: Users can't mess with each other
4. **Sharing Models**: Public/private patterns
5. **Security Basics**: Password hashing, token validation

## Moving Forward

Ready to build a real SaaS product?

→ **[Continue to Stage 4: Multi-Tenant AI SaaS](../stage-4-saas/README.md)**