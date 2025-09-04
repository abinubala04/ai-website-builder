# Stage 0: One Real User - Your First Believer 👤

## You Found Your Pain. Now Find Your Person.

You have a problem that pisses you off. Good.
Now find ONE other person with the same problem.

Not 10. Not 100. ONE.

## Why One User Matters More Than 1000

### 1000 Hypothetical Users
- Don't exist
- Never give feedback
- Never pay
- Make you build wrong things

### 1 Real User
- Exists
- Uses your thing
- Tells you what sucks
- Might pay
- Brings friends

## The One User Process

### Step 1: The Hit List

List everyone who might have your problem:

```
My Problem: "I waste 2 hours writing similar emails"

Who else has this problem:
1. Jake - sales guy at my company
2. Sarah - founder friend doing outreach  
3. Mike - recruiter always messaging
4. Lisa - customer success manager
5. Tom - freelancer pitching clients
```

### Step 2: The Coffee Test

Rank them by who you could have coffee with THIS WEEK:

```
1. Jake - sits next to me ⭐
2. Lisa - lunch tomorrow ⭐
3. Sarah - could text now
4. Mike - LinkedIn connection
5. Tom - friend of friend
```

Start at the top.

### Step 3: The Problem Pitch

Don't pitch your solution. Pitch the PROBLEM:

**Bad**: "I'm building an AI email writer"
**Good**: "You know how you write the same email 50 times?"

If they say "OH GOD YES" → You found your person
If they say "Not really" → Next person

### Step 4: The Shitty Demo

Build the absolute minimum that solves THEIR version:

```javascript
// Not this:
class AIEmailPlatform {
  // 1000 lines of code
  // User management
  // Template library
  // Analytics dashboard
}

// This:
function writeEmail(context) {
  return `Hi ${context.name},
  
  I saw you're working on ${context.company}.
  
  We help companies like yours ${context.painPoint}.
  
  Worth a quick chat?
  
  Best,
  ${context.sender}`;
}
```

ONE function that solves ONE problem.

### Step 5: The Watch Test

Watch them use it IN PERSON:
- Where do they click first?
- What confuses them?
- What do they try that doesn't work?
- What makes them smile?

Don't explain. Just watch.

### Step 6: The Tomorrow Test

The only question that matters:
**"Will you use this tomorrow?"**

If yes → You have a real user
If no → Ask "What would make you use it?"

## The One User Diary

Track everything about your one user:

```markdown
USER #1: Jake
--------------
Problem: "Writes 50 cold emails daily"
Current Solution: Copy/paste from Google Doc
Pain Level: 8/10
Would Pay: $50/month

First Demo: [Date]
- Confused by: Input format
- Loved: Email variations
- Wanted: LinkedIn templates
- Quote: "Holy shit this is fast"

Day 1: Used it 5 times
Day 2: Used it 12 times
Day 3: Asked for API access
Day 4: Showed it to teammate
Day 5: "Can I pay you for this?"
```

## Red Flags from User #1

### 🚩 "This is cool but..."
They're being polite. It doesn't solve their problem.

### 🚩 "Once you add X, I'll use it"
They won't. Find someone who needs what you have NOW.

### 🚩 "I'll try it later"
Later never comes. If it's not urgent, it's not painful.

### 🚩 Using it only when you're watching
They're being nice. Real use happens alone.

## Green Flags from User #1

### ✅ "Can I use this right now?"
Urgency = real pain

### ✅ "What's your Venmo?"
Money talks, everything else walks

### ✅ "Can my teammate have access?"
They're selling it for you

### ✅ "I used it 10 times yesterday"
Usage is the only truth

### ✅ "It broke, fix it ASAP!"
They depend on it now

## The Simplest Possible Versions

### Email Writer
```html
<!-- index.html -->
<textarea id="context" placeholder="Name, company, pain point"></textarea>
<button onclick="generate()">Write Email</button>
<div id="output"></div>

<script>
function generate() {
  // 10 lines of template logic
}
</script>
```

### Code Reviewer
```python
# review.py
def review_code(file_path):
    code = open(file_path).read()
    
    issues = []
    if "console.log" in code:
        issues.append("Remove console.log")
    if "var " in code:
        issues.append("Use const/let instead of var")
        
    return issues

# That's it. That's the MVP.
```

### Meeting Notes
```javascript
// notes.js
function extractActionItems(transcript) {
  const lines = transcript.split('\n');
  const actions = lines.filter(line => 
    line.includes('will') || 
    line.includes('TODO') ||
    line.includes('action')
  );
  return actions;
}
```

## The One User Rules

1. **They must have the problem TODAY**
   Not someday. Today.

2. **They must try it THIS WEEK**
   Not next month. This week.

3. **You must WATCH them use it**
   Not report. Watch.

4. **They must use it WITHOUT you**
   Real usage happens alone.

5. **They must want to use it TOMORROW**
   One-time use isn't enough.

## From One to Two

Only after User #1 is using it daily:

1. Ask User #1: "Who else has this problem?"
2. Get a warm intro
3. Repeat the process
4. Compare their needs
5. Build the overlap

User #1 is your co-founder, whether they know it or not.

## The Stage 0 Success Criteria

Before moving to Stage 0.5:
- [ ] One real person uses it daily
- [ ] Without reminders from you
- [ ] They've used it 10+ times
- [ ] They've asked for something
- [ ] They've mentioned it to someone

No? Stay in Stage 0. Keep refining.

Yes? Time for Stage 0.5: The First "Holy Shit"

---

*One real user is worth more than a million imaginary ones.*