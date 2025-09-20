# ChurnFlow MCP Server - GitHub Copilot Instructions

**ALWAYS follow these instructions first and only fallback to additional search or context gathering if the information here is incomplete or found to be in error.**

ChurnFlow MCP is a TypeScript-based Model Context Protocol server that provides ADHD-friendly productivity capture and routing capabilities to AI assistants. It manages markdown tracker files with YAML frontmatter and uses OpenAI GPT-4 for intelligent routing.

## Essential Setup Commands

**CRITICAL**: Always run these setup steps first on a fresh clone:

```bash
# Install dependencies - takes ~3-17 seconds
npm install

# Build TypeScript to dist/ - takes ~3 seconds, NEVER CANCEL
npm run build

# Test the build - takes ~5-9 seconds, NEVER CANCEL
npm test
```

## Required Configuration

Before the application will work, you MUST create a proper configuration:

1. **Create test configuration for development/testing**:
```bash
# Create test directories
mkdir -p /tmp/churn-test/Collections /tmp/churn-test/Tracking

# Create test crossref
echo '[{"tag":"test-tracker","trackerFile":"/tmp/churn-test/Tracking/test-tracker.md","collectionFile":"/tmp/churn-test/Collections/test.md","priority":1,"contextType":"project","active":true}]' > /tmp/churn-test/Tracking/crossref.json

# Create test tracker
cat > /tmp/churn-test/Tracking/test-tracker.md << 'EOF'
---
tag: "test-tracker"
friendlyName: "Test Tracker"
collection: "test"
contextType: "project"
mode: "active"
iterationType: "weekly"
active: true
priority: 1
---

# Test Tracker

## Action Items
- [ ] #task Example task

## Activity Log
- 2024-01-01: Created test tracker

## References
- Test reference
EOF

# Create working test config
cat > churn.config.json << 'EOF'
{
  "collectionsPath": "/tmp/churn-test/Collections",
  "trackingPath": "/tmp/churn-test/Tracking", 
  "crossrefPath": "/tmp/churn-test/Tracking/crossref.json",
  "aiProvider": "openai",
  "aiApiKey": "test-key",
  "confidenceThreshold": 0.7
}
EOF
```

2. **For OpenAI functionality**: Set `export OPENAI_API_KEY=your-actual-key`

## Build and Test Commands

**TIMING NOTE**: All build commands are fast. NEVER CANCEL any of these operations.

```bash
# Build - ~3 seconds
npm run build

# Test suite - ~5-9 seconds, 161 tests across 7 suites
npm test

# Test with coverage - ~8-12 seconds
npm run test:coverage

# Development watch mode
npm run dev

# Lint (currently missing config) - EXPECTED TO FAIL
npm run lint  # Will fail: "ESLint couldn't find a configuration file"

# Format code (works) - ~1 second  
npm run format  # Formats all TypeScript files with prettier
```

## Running the Applications

### CLI Application

```bash
# Initialize configuration (creates sample churn.config.json)
npm run cli init

# Check system status
npm run cli status

# Test capture (requires OPENAI_API_KEY for full functionality)
npm run cli capture "Test task to capture"

# Show help
npm run cli

# Brain dump mode (interactive)
npm run cli dump
```

### MCP Server (for AI Assistants)

```bash
# Start MCP server - starts instantly
npm run mcp

# Alternative: run directly with tsx
tsx src/index.ts

# Production mode (requires build first)
npm start
```

## Testing and Validation

### Quick Validation Workflow

Always run these steps after making changes:

```bash
# 1. Build and test - NEVER CANCEL, total ~8-12 seconds
npm run build && npm test

# 2. Validate CLI functionality
npm run cli status

# 3. Test MCP server startup (should start instantly)
timeout 5 npm run mcp
```

### Manual Validation Scenarios

**CRITICAL**: After making changes, ALWAYS test these end-to-end scenarios:

1. **CLI Capture Flow**:
   - Set up test config (use commands above)
   - Run: `npm run cli status` (should show 1 tracker loaded)
   - Test: `npm run cli capture "Test task"` (will use fallback without real API key)

2. **MCP Server Flow**:
   - Run: `npm run mcp` (should start instantly with success message)
   - Server should output: "ChurnFlow MCP Server v0.3.0 started successfully"

3. **Build System Flow**:
   - Clean: `rm -rf dist/`
   - Build: `npm run build` (should complete in ~10 seconds)
   - Verify: `ls dist/` (should contain compiled JS files)

## Codebase Navigation

### Key Directories

```
src/
├── cli.ts              # Command-line interface entry point
├── index.ts            # MCP server entry point  
├── core/               # Core business logic
│   ├── CaptureEngine.ts    # Main capture orchestration
│   ├── InferenceEngine.ts  # OpenAI GPT-4 integration
│   ├── TrackerManager.ts   # Markdown file management
│   ├── DashboardManager.ts # Task prioritization
│   └── ReviewManager.ts    # Review workflow system
├── types/              # TypeScript type definitions
└── utils/              # Utility functions

tests/                  # 161 tests across 7 suites
├── core/              # Core logic tests
├── types/             # Type definition tests
├── utils/             # Utility tests
└── fixtures/          # Mock data for testing
```

### Important Files

- `package.json`: Dependencies and npm scripts
- `tsconfig.json`: TypeScript configuration (ESM modules)
- `jest.config.js`: Test configuration
- `churn.config.json`: Runtime configuration (create from template)
- `README.md`: User documentation
- `MCP-SETUP.md`: AI assistant integration guide
- `DEV-NOTES.md`: Development status and history

### Architecture Overview

**3-Layer Architecture**:
1. **Capture Layer** (`CaptureEngine.ts`): ADHD-friendly input processing
2. **Inference Layer** (`InferenceEngine.ts`): OpenAI GPT-4 routing decisions  
3. **Storage Layer** (`TrackerManager.ts`): Markdown file manipulation

**Key Concepts**:
- **Trackers**: Active markdown files with YAML frontmatter
- **Collections**: Archived domain-specific folders
- **Crossref**: JSON registry mapping tracker tags to file paths
- **Context Types**: `business`, `personal`, `project`, `system`
- **Item Types**: `action`, `review`, `reference`, `someday`

## Known Limitations and Workarounds

1. **Linting Configuration Missing**: 
   - `npm run lint` fails with "ESLint couldn't find a configuration file"
   - **Workaround**: TypeScript compilation provides type checking via `npm run build`

2. **Prettier Configuration Works**:
   - `npm run format` works and formats TypeScript files
   - Uses prettier to format all src/**/*.ts files

3. **OpenAI API Dependency**:
   - Full capture functionality requires valid `OPENAI_API_KEY`
   - **Workaround**: System falls back gracefully with reduced confidence routing

4. **Path Dependencies**:
   - Requires proper `churn.config.json` with valid file paths
   - **Workaround**: Use test configuration template above for development

## Performance Expectations

**NEVER CANCEL** any of these operations - they complete quickly:

- **npm install**: ~3-17 seconds (506 packages, varies by network)
- **npm run build**: ~3 seconds (TypeScript compilation)
- **npm test**: ~5-9 seconds (161 tests, 7 suites, 100% pass rate)
- **npm run cli status**: ~1 second (with valid config)
- **npm run mcp**: Instant startup (~1 second)
- **npm run format**: ~1 second (prettier formatting)
- **Capture operations**: ~2 seconds (including OpenAI API call or fallback)

## Debugging and Troubleshooting

### Common Issues

1. **"Cannot initialize without crossref data"**:
   - Run test configuration setup commands above
   - Verify `churn.config.json` points to valid crossref file

2. **"ESLint couldn't find a configuration file"**:
   - Expected behavior - configuration missing
   - Use `npm run build` for type checking instead

3. **OpenAI API errors**:
   - Set valid `OPENAI_API_KEY` environment variable
   - System will fallback gracefully without it

4. **File not found errors**:
   - Use test configuration template above
   - Ensure all paths in `churn.config.json` exist

### Debug Mode

```bash
# View detailed logs
DEBUG=* npm run mcp 2> mcp-server.log

# Check configuration loading
npm run cli status

# Validate test files
ls -la /tmp/churn-test/Tracking/
```

## GitHub Copilot Integration

To use ChurnFlow with GitHub Copilot, add to your MCP configuration:

```json
{
  "mcpServers": {
    "churnflow": {
      "command": "tsx",
      "args": ["/path/to/churnflow-mcp/src/index.ts"],
      "cwd": "/path/to/churnflow-mcp",
      "env": {
        "OPENAI_API_KEY": "your-openai-key"
      }
    }
  }
}
```

Available tools: `capture`, `status`, `list_trackers`

## Development Workflow

1. **Setup**: Run essential setup commands above
2. **Develop**: Use `npm run dev` for watch mode
3. **Test**: Run `npm test` frequently (fast, ~5-9 seconds)
4. **Format**: Run `npm run format` to format code with prettier
5. **Validate**: Test CLI and MCP server functionality
6. **Build**: Always `npm run build` before committing

**Always validate with end-to-end scenarios after making changes.**