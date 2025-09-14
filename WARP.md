# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

ChurnFlow is a Model Context Protocol (MCP) server that provides an ADHD-friendly productivity system. It uses AI to automatically route and format captured thoughts, tasks, and ideas into appropriate project trackers without cognitive overhead.

### Core Architecture

The system follows a three-layer architecture:

1. **Capture Layer** (`CaptureEngine.ts`) - Orchestrates the entire capture process with ADHD-friendly error handling
2. **Inference Layer** (`InferenceEngine.ts`) - Uses OpenAI GPT-4 to understand natural language and determine routing
3. **Storage Layer** (`TrackerManager.ts`) - Manages markdown files with YAML frontmatter, reads crossref registry

### Key Concepts

- **Collections**: Domain-specific folders that archive completed work (e.g., `gsc-ai/`, `project-55/`, `tractor/`)  
- **Trackers**: Active markdown files that capture ongoing work with YAML frontmatter for metadata
- **Crossref Registry**: JSON file mapping tracker tags to file paths and metadata
- **Context Types**: `business`, `personal`, `project`, `system` for automatic categorization
- **Item Types**: `action`, `review`, `reference`, `someday` for task classification

## Development Commands

```bash
# Build TypeScript to dist/
npm run build

# Development with watch mode
npm run dev

# Run tests with Jest
npm test

# Start the MCP server (requires build first)
npm start

# Lint TypeScript files (if configured)
npm run lint

# Format code (if configured)  
npm run format
```

## Testing

- Test framework: Jest with ts-jest for ESM support
- Test files: `**/*.test.ts` or `**/*.spec.ts` in `src/` or `tests/`
- Fixtures: Mock data in `tests/fixtures/`
- Coverage reports generated to `coverage/`

## Architecture Deep Dive

### CaptureEngine Flow
The main orchestrator follows this pattern:
1. Initialize system (load trackers, crossref)
2. Accept natural language input 
3. Use AI inference to determine routing
4. Append formatted entry to target tracker
5. Fallback to review queue on errors or low confidence

### Error Handling Strategy
Designed for ADHD minds - never lose a thought:
- Low confidence → route to review tracker
- AI failure → basic formatting fallback  
- Tracker write failure → emergency capture to any available tracker
- Complete failure → detailed error logging with context

### TrackerManager Structure
- Reads JSON crossref registry to discover active trackers
- Parses markdown files with gray-matter for YAML frontmatter
- Extracts keywords and recent activity for AI context
- Appends entries to "## Action Items" section when available

### AI Integration
Currently uses OpenAI GPT-4 with:
- Temperature: 0.3 (consistent but creative)
- JSON response format for structured output
- System prompt optimized for ADHD-friendly productivity
- Context map includes tracker keywords and recent activity

## Configuration Requirements

The system expects a `ChurnConfig` object with:
- `collectionsPath`: Base path for archived collections
- `trackingPath`: Path to active tracker files  
- `crossrefPath`: Path to crossref.json registry
- `aiProvider`: Currently only 'openai' supported
- `aiApiKey`: OpenAI API key
- `confidenceThreshold`: Minimum confidence for auto-routing (default: 0.7)

## File Structure Patterns

```
Collections/
├── gsc-ai/           # Business domain
├── project-55/       # Personal projects  
└── tractor/          # Hobby/personal

Trackers/
├── gsc-ai-tracker.md
├── project-55-tracker.md
└── crossref.json     # Registry mapping tags to files
```

## Markdown Tracker Format

Trackers are markdown files with YAML frontmatter:

```yaml
---
tag: "project-name"
friendlyName: "Project Display Name"
collection: "collection-folder"
contextType: "business|personal|project|system" 
mode: "active"
iterationType: "weekly"
# ... additional metadata
---

## Action Items
- [ ] #task Example task entry 📅 2024-01-15

## Activity Log  
- Recent work items for AI context

## References
- Important context items
```

## Development Notes

- Uses ESM modules throughout (`.js` imports in TypeScript)
- Follows semantic versioning and CHANGELOG standards  
- MIT licensed, developed by GSC Dev
- Node.js 18+ required
- No main entry point file yet - likely needs `src/index.ts` for MCP server
- Lint/format configs not yet present but referenced in package.json

## Future MCP Integration

The codebase is structured to become an MCP server but missing:
- MCP server entry point (`src/index.ts`)  
- MCP protocol handlers for capture operations
- Configuration management for MCP clients
- Voice capture implementation (placeholder exists)