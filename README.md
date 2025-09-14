# ChurnFlow MCP Server

> An ADHD-friendly productivity system powered by AI agents

**ChurnFlow** is a Model Context Protocol (MCP) server that transforms the way ADHD minds manage productivity. Instead of fighting against how your brain works, ChurnFlow works *with* your natural patterns of thinking, capturing, and processing information.

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
- An AI API key (OpenAI or Anthropic)
- A Churn system directory structure

### Installation

```bash
npm install -g churnflow-mcp
```

### Configuration

```bash
churn init --collections-path /path/to/your/Collections
```

### Usage with Claude/Warp

```bash
# Start the MCP server
churn serve

# Then in Warp with Claude:
# "Capture this: I need to call the parts supplier about the carburetor"
# "What should I focus on today?"
# "I'm working on the Gibson website - track my progress"
```

## 🎯 Core Features

### Smart Capture
- **Natural Language Input**: "Remind me to follow up with that consulting client next week"
- **Context Inference**: Automatically routes to the right project tracker
- **Voice Integration**: Capture thoughts while driving or working with your hands
- **Multi-Device**: Phone, iPad, computer - capture anywhere

### Intelligent Processing
- **Item Classification**: Action items, reviews, references, someday/maybe
- **Priority Detection**: Deadlines, dependencies, and urgency analysis
- **Tracker Management**: Auto-sync between active trackers and archived collections

### ADHD-Optimized Workflows
- **Dashboard View**: "What's important today?" without cognitive overhead
- **Interruption Recovery**: "Where was I?" after context switches
- **Hyperfocus Support**: Capture interrupting thoughts without breaking flow
- **Executive Function Assistance**: AI handles the organizing so you can focus on doing

## 🏢 About GSC Dev

ChurnFlow is developed by **Gibson Service Company, LLC - Development Division (GSC Dev)**, the R&D arm of a multi-division business focused on bringing joy-driven solutions to market.

**Other GSC Divisions:**
- **Gibson Service Company**: Small engine repair & vintage tractor restoration ([gibsonsvc.com](https://www.gibsonsvc.com))
- **GSC AI Consulting**: AI-powered workflows for small businesses
- **Project-55**: Building financial independence through passion-driven entrepreneurship

## 🤝 Contributing

We welcome contributions from the ADHD and neurodivergent community! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📋 Roadmap

- [x] Project initialization and architecture design
- [ ] Core MCP server with capture functionality  
- [ ] AI inference engine for context and item type detection
- [ ] Voice capture integration
- [ ] Dashboard and review tools
- [ ] Mobile app for capture on-the-go
- [ ] Community marketplace for custom trackers and workflows

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- 📚 [Documentation](https://github.com/jgsteeler/churnflow-mcp/wiki)
- 🐛 [Issues](https://github.com/jgsteeler/churnflow-mcp/issues)
- 💬 [Discussions](https://github.com/jgsteeler/churnflow-mcp/discussions)

---

*Built with ❤️ for the ADHD community by someone who gets it.*