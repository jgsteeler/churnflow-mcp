# ChurnFlow MCP Server v0.3.4

> An ADHD-friendly productivity system powered by AI agents and GitHub Copilot

**ChurnFlow** is a production-ready Model Context Protocol (MCP) server that transforms the way ADHD minds manage productivity. Built with GitHub Copilot integration and comprehensive AI assistant support, ChurnFlow works *with* your natural patterns of thinking, capturing, and processing information.

## 🎉 New in v0.3.4: Complete Review System Integration

- **🔗 Review System Integration**: CaptureEngine now properly routes low-confidence items through ReviewManager
- **🧠 Complete ADHD Workflow**: Full capture → review → action → edit cycle now functional
- **🤖 GitHub Copilot Ready**: Full MCP server integration with three AI tools
- **🔧 Production Grade**: 166 comprehensive tests, robust error handling with graceful fallbacks
- **⚡ Multi-item Capture**: Single input generates multiple routed items
- **📐 Perfect Formatting**: Consistent ISO dates, priority emojis, section placement

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
- **122 Comprehensive Tests**: Full test coverage across all components
- **Error Handling**: Graceful fallbacks ensure no thoughts are lost
- **Emergency Capture**: Always saves input even when systems fail
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

### 🎯 In Progress  
- [ ] **v0.3.5**: Enhanced review dashboard and batch processing tools
- [ ] Advanced review analytics and confidence scoring improvements
- [ ] Review workflow optimization based on user patterns

### 🚀 Future
- [ ] **v0.3.2+**: Voice capture integration building on MCP foundation
- [ ] Mobile app for capture on-the-go with MCP sync
- [ ] Advanced AI features: learning from user patterns
- [ ] Community marketplace for custom trackers and workflows

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- 📚 [Documentation](https://github.com/jgsteeler/churnflow-mcp/wiki)
- 🐛 [Issues](https://github.com/jgsteeler/churnflow-mcp/issues)
- 💬 [Discussions](https://github.com/jgsteeler/churnflow-mcp/discussions)

---

*Built with ❤️ for the ADHD community by someone who gets it.*