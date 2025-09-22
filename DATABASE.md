# ChurnFlow Database Setup

ChurnFlow uses SQLite for advanced features like full-text search, analytics, and review prioritization while maintaining full compatibility with file-based workflows.

## Quick Start

### 1. Initial Database Setup
```bash
npm run db:setup
```

This sets up the SQLite database with:
- ✅ Proper schema and tables
- ✅ Initial seed data (contexts, preferences)
- ✅ Full-text search (FTS5) configuration
- ✅ Triggers and indexes

### 2. Start Capturing
```bash
npm run cli capture "Your thoughts here"
```

Captures are saved to **both**:
- 📁 Markdown tracker files (existing workflow)
- 💾 SQLite database (new features)

## Database Commands

| Command | Purpose |
|---------|---------|
| `npm run db:setup` | Initial database setup |
| `npm run db:reset` | Reset database (deletes all data) |
| `npm run db:studio` | Open database browser (Drizzle Studio) |
| `npm run db:generate` | Generate new migrations |

## File-Only Mode

ChurnFlow works perfectly **without** a database:

```bash
# This works even without database setup
npm run cli capture "I can capture without a database"
```

- ✅ All captures save to markdown files
- ⚠️ No database features (search, analytics, review)
- 📢 Clear messaging about missing features

## Database Features

When database is set up, you get:

### 🔍 **Full-Text Search**
- Search across all captures instantly
- FTS5 powered search with ranking
- Search content, tags, and keywords

### 📊 **Analytics Dashboard** 
- Inbox, active, completed items count
- Items needing review
- Overdue tasks
- Progress tracking

### 🧠 **AI Learning**
- Context inference improvement over time
- Pattern recognition for routing
- User feedback integration

### 📋 **Review System**
- ADHD-friendly review prioritization
- Never-reviewed items surface first
- Due-soon and high-priority items highlighted
- Review scoring and notes

## Architecture

```
📁 Markdown Files          💾 SQLite Database
├── Existing workflow       ├── Advanced features  
├── Always works           ├── Optional enhancement
├── Human readable         ├── Structured queries
└── Git trackable          └── Full-text search
```

## Troubleshooting

### Database Not Found
```bash
❌ Database not available: Database not set up. Run: npm run db:setup
```
**Solution:** Run `npm run db:setup`

### Capture Works, No Database Features
```bash
⚠️ Database not available - using file-only mode
```
**Solution:** Database setup needed for advanced features

### Reset Everything
```bash
npm run db:reset
```
This deletes all database data and recreates tables.

## Development

### Database Schema Changes
1. Update `src/storage/schema.ts`
2. Run `npm run db:generate` 
3. Run `npm run db:setup` or `npm run db:reset`

### Testing
```bash
npm test                           # All tests
npm test DatabaseManager.test.ts  # Database tests only
```

Tests use temporary databases and clean up automatically.