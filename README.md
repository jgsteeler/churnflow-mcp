# ChurnFlow MCP Server v0.4.2

> An ADHD-friendly productivity system powered by AI agents, SQLite database, and GitHub Copilot

**ChurnFlow** is a production-ready Model Context Protocol (MCP) server that transforms the way ADHD minds manage productivity. Built with optional SQLite database integration, GitHub Copilot support, and comprehensive AI assistance, ChurnFlow works *with* your natural patterns of thinking, capturing, and processing information.

<a href="https://glama.ai/mcp/servers/@jgsteeler/churnflow-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@jgsteeler/churnflow-mcp/badge" alt="ChurnFlow Server MCP server" />
</a>

## 🎉 New in v0.4.2: Advanced Database Features & Migrations

**v0.4.1 Highlights:**

- **Database CLI Commands**: Search, analytics, and review query commands
- **MCP Database Tools**: Expose database features through GitHub Copilot
- **Enhanced Dashboard**: Database-powered statistics and insights
- **Search Interface**: Full-text search integration with CLI

- **🗄️ SQLite Database Integration**: Optional advanced features with full-text search, analytics, and AI learning
- **🔍 Full-Text Search (FTS5)**: Search across all captures with ranking and relevance scoring
- **📊 Analytics Dashboard**: Track inbox, active, completed, and overdue items with real-time statistics
- **🧠 AI Learning Patterns**: Context inference improves over time with user feedback
- **🏗️ Clean Architecture**: Database setup separated from capture operations (resolves code smells)
- **📁 Dual Storage**: Captures save to both markdown files AND SQLite database
- **🔄 Optional Enhancement**: System works perfectly in file-only mode when database not set up

## 🧠 The Problem

Traditional productivity systems fail ADHD brains because they require too much cognitive overhead:

- **Capture friction**: Great ideas get lost while driving, in meetings, or during hyperfocus sessions
- **Processing overhead**: Spending more time organizing tasks than actually doing them
- **Context switching pain**: Losing track of where you were after interruptions
- **System maintenance burden**: The productivity system becomes another task to manage

## ✨ The ChurnFlow Solution

ChurnFlow uses AI to eliminate the cognitive overhead of productivity management:

- **🎤 Frictionless Capture**: Voice or text input that automatically infers context and routing
- **🤖 AI-Powered Processing**: Natural language understanding that categorizes and prioritizes items
- **📍 Context Awareness**: Seamlessly switch between life domains (business, personal, projects)
- **🔄 Automatic Recovery**: Get back on track after interruptions without losing momentum

## 🏗️ Architecture

ChurnFlow is built around three core concepts:

### Collections

Domain-specific folders that archive completed work and reference materials:

- `gsc-ai/` - AI consulting business
- `project-55/` - Personal business empire plan
- `tractor/` - Equipment restoration projects

### Trackers

Active markdown files that capture ongoing work and action items:

- Auto-categorized by context (business, personal, project, system)
- YAML frontmatter for metadata and workflow control
- Natural language task formatting with AI assistance

### AI Inference

Intelligent routing that understands your workflow:

- Context detection from existing tracker patterns
- Item type classification (action, review, reference, someday/maybe)
- Automatic prioritization and dependency discovery

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- GitHub Copilot or compatible AI assistant
- OpenAI API key for AI inference
- Existing Churn system directory structure

### Installation

```bash
# Clone the repository
git clone https://github.com/jgsteeler/churnflow-mcp.git
cd churn-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Setup database (optional - enables advanced features)
npm run db:setup
```

### Configuration

1. **Create `churn.config.json`**:

   ```json
   {
     "collectionsPath": "/path/to/your/Collections",
     "trackingPath": "/path/to/your/tracking", 
     "crossrefPath": "/path/to/crossref.json",
     "aiProvider": "openai",
     "aiApiKey": "your-openai-key",
     "confidenceThreshold": 0.7
   }
   ```

2. **Set up GitHub Copilot** (see [MCP-SETUP.md](MCP-SETUP.md) for complete guide)

### Usage with GitHub Copilot

1. **Configure GitHub Copilot** with ChurnFlow MCP server:

   ```json
   {
     "mcpServers": {
       "churnflow": {
         "command": "tsx",
         "args": ["/path/to/churn-mcp/src/index.ts"],
         "cwd": "/path/to/churn-mcp"
       }
     }
   }
   ```

2. **Start the MCP server**:

   ```bash
   npm run mcp
   ```

3. **Use with GitHub Copilot**:
   - *"Use ChurnFlow to capture 'Need to call parts supplier about carburetor for John Deere restoration'"*
   - *"What's the status of my ChurnFlow system?"*
   - *"Show me my available ChurnFlow trackers"*

### Database Features (Optional)

Database setup enables advanced features while maintaining full file-based compatibility:

```bash
# Setup database (one-time)
npm run db:setup

# Reset database (development)
npm run db:reset

# View database (browser)
npm run db:studio
```

**Database Features:**

- 🔍 **Full-text search** across all captures
- 📊 **Analytics dashboard** with statistics
- 🧠 **AI learning** that improves over time
- 📋 **Review prioritization** for ADHD workflows

**File-Only Mode:**
ChurnFlow works perfectly without database setup - all captures save to markdown files as usual.

### CLI Usage (Alternative)

```bash
# Direct capture via CLI
npm run cli capture "Complex task with multiple components"

# Check system status
npm run cli status
```

## 🎯 Core Features

### 🤖 AI Assistant Integration (v0.3.0)

- **GitHub Copilot Ready**: Full MCP server with three tools (`capture`, `status`, `list_trackers`)
- **Multi-AI Support**: Works with any MCP-compatible AI assistant
- **Natural Conversations**: *"Use ChurnFlow to capture..."* or *"What should I work on?"*
- **Cross-Interface Sync**: Seamless between AI assistants and CLI

### 🧐 Smart Capture

- **Multi-Item Processing**: Single brain dump generates multiple routed items
- **Context Inference**: AI routes to appropriate trackers automatically
- **Natural Language**: "Working on Gibson website, need to call client, update docs"
- **Confidence-Based Routing**: High confidence items placed directly, low confidence flagged for review
- **Complete Review Integration**: Low-confidence items properly routed through ReviewManager for human oversight

### ✨ Perfect Formatting (v0.2.2)

- **ISO Date Standards**: Consistent `2025-09-16` and `2025-09-16 14:30` formats
- **Priority Indicators**: Visual emojis (🚨 ⏫ 🔼 🔻) for quick scanning
- **Section Placement**: Items go exactly where they belong in tracker files
- **ADHD-Friendly**: Clean, consistent output reduces cognitive load

### 🔧 Production Ready

- **176+ Comprehensive Tests**: Full test coverage across all components including database
- **Dual Storage System**: Redundant file + database storage with graceful fallback
- **Error Handling**: Graceful degradation ensures no thoughts are lost
- **Emergency Capture**: Always saves input even when systems fail
- **Clean Architecture**: Database setup separated from capture operations
- **Multi-Item Support**: Doug welder example processes complex scenarios

## 🏢 About GSC Dev

ChurnFlow is developed by **Gibson Service Company, LLC - Development Division (GSC Dev)**, the R&D arm of a multi-division business focused on bringing joy-driven solutions to market.

**Other GSC Divisions:**

- **Gibson Service Company**: Small engine repair & vintage tractor restoration ([gibsonsvc.com](https://www.gibsonsvc.com))
- **GSC AI Consulting**: AI-powered workflows for small businesses
- **Project-55**: Building financial independence through passion-driven entrepreneurship

## 🤝 Contributing

We welcome contributions from the ADHD and neurodivergent community! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📋 Roadmap

### ✅ Completed

- [x] **v0.2.1**: Multi-item capture with cross-tracker routing
- [x] **v0.2.2**: Complete formatting consistency and perfect section placement  
- [x] **v0.3.0**: MCP server integration with GitHub Copilot support
- [x] **v0.3.1**: Review Process system foundation
- [x] **v0.3.2**: Complete ADHD dashboard & task management system  
- [x] **v0.3.3**: Complete task editing and lifecycle management
- [x] **v0.3.4**: Review system integration - complete capture → review → action workflow
- [x] **v0.4.0**: Complete SQLite database integration with FTS, analytics, and AI learning

### 🏁 Next (v0.4.3)

- [ ] **Capture input refinements**: Enhanced AI processing and edge cases
- [ ] **Priority detection**: Improved priority inference from natural language
- [ ] **Multi-item enhancement**: Improved multi-item capture from complex inputs
- [ ] **Edge case handling**: Better handling of ambiguous or unusual inputs
- [ ] **Confidence scoring**: Refined confidence algorithms for routing decisions

### 🚀 Future Releases

- [ ] **v0.4.4**: Context-aware dashboard views with database backing
- [ ] **v0.4.5**: Inferred due dates with AI learning patterns
- [ ] **v0.4.6**: Enhanced MCP server with database-powered tools
- [ ] **v0.5.0**: Voice memo capture system with database integration
- [ ] **v0.6.0**: Smart sync system with database analytics
- [ ] **v0.7.0+**: Advanced AI features, mobile app, community features

## 🏆 Roadmap Principles

### 💪 Database-First Architecture

- All future features leverage SQLite database foundation
- Dual storage (files + database) ensures backwards compatibility
- Database analytics and learning enhance every feature
- Clean migrations enable safe schema evolution

### 🧠 ADHD-Focused Development

- MVP refinements based on real usage patterns
- Incremental improvements over major rewrites
- Database insights drive UX optimizations
- Maintain zero-friction capture workflow

### 🚀 Proven Velocity

- v0.4.0 database integration completed in focused sessions
- Each version builds incrementally on solid foundation
- Database infrastructure enables rapid feature development
- Clear, bounded objectives for each release

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- 📚 [Documentation](https://github.com/jgsteeler/churnflow-mcp/wiki)
- 🐛 [Issues](https://github.com/jgsteeler/churnflow-mcp/issues)
- 💬 [Discussions](https://github.com/jgsteeler/churnflow-mcp/discussions)

---

*Built with ❤️ for the ADHD community by someone who gets it.*