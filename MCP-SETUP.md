# ChurnFlow MCP Server Setup

This guide shows how to configure ChurnFlow as an MCP (Model Context Protocol) server for use with GitHub Copilot and other AI assistants.

## Quick Start

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Start the MCP server**:
   ```bash
   npm run mcp
   ```

3. **Or run directly with tsx**:
   ```bash
   tsx src/index.ts
   ```

## Available Tools

The ChurnFlow MCP server provides three tools for AI assistants:

### 1. `capture`
Capture and route text using ChurnFlow's ADHD-friendly AI system.

**Parameters**:
- `text` (required): Text to capture and route (can contain multiple items)
- `priority` (optional): Priority level (`high`, `medium`, `low`)
- `context` (optional): Context hint for routing (`business`, `personal`, `project`, `system`)

**Example**:
```json
{
  "text": "Schedule client meeting about the proposal and update project documentation",
  "priority": "high", 
  "context": "business"
}
```

### 2. `status`
Get ChurnFlow system status and tracker information.

**Parameters**: None

**Returns**: System initialization status, tracker counts, AI provider info, confidence threshold, collections path.

### 3. `list_trackers`
List available trackers with their context types and status.

**Parameters**:
- `context` (optional): Filter by context type (`business`, `personal`, `project`, `system`)

**Returns**: List of available trackers with their metadata.

## GitHub Copilot Configuration

To use ChurnFlow with GitHub Copilot, you'll need to configure it as an MCP server in your settings.

### For VS Code:

1. Create or update your MCP configuration file (typically `~/.config/mcp/servers.json`):

```json
{
  "churnflow": {
    "command": "node",
    "args": ["/path/to/churn-mcp/dist/index.js"],
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

2. Or for development with tsx:

```json
{
  "churnflow": {
    "command": "tsx",
    "args": ["/path/to/churn-mcp/src/index.ts"],
    "cwd": "/path/to/churn-mcp"
  }
}
```

### Configuration Requirements

Make sure ChurnFlow is properly configured:

1. **Config file**: `churn.config.json` should exist in your system
2. **Collections path**: Should point to your Churn collections directory
3. **Crossref**: `crossref.json` should exist with tracker definitions
4. **OpenAI API**: API key should be configured for AI inference

## Testing the MCP Server

### Manual Testing

You can test the MCP server manually using the standard input/output protocol:

```bash
npm run mcp
```

Then send JSON-RPC messages like:

```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}
{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "status", "arguments": {}}}
{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "capture", "arguments": {"text": "Test MCP capture functionality"}}}
```

### Integration Testing with AI Assistants

Once configured with GitHub Copilot:

1. Open a conversation with Copilot
2. Ask it to capture something: *"Use ChurnFlow to capture 'Review quarterly financials and prepare board presentation'"*
3. Ask for status: *"What's the status of my ChurnFlow system?"*
4. List trackers: *"Show me my available ChurnFlow trackers"*

## Features

- **Multi-item Processing**: Single input can generate multiple routed items
- **ADHD-Friendly**: Designed for brain dump style capture
- **Smart Routing**: AI determines appropriate trackers automatically
- **Consistent Formatting**: Uses FormattingUtils v0.2.2 for perfect formatting
- **Error Handling**: Graceful fallbacks ensure no thoughts are lost
- **Production Ready**: 122 comprehensive tests, proper error handling

## Troubleshooting

### Common Issues

1. **Server won't start**: Check that all dependencies are installed (`npm install`)
2. **Configuration errors**: Verify `churn.config.json` exists and is valid
3. **No trackers found**: Check `crossref.json` and tracker file paths
4. **OpenAI errors**: Verify API key is configured and valid

### Debug Mode

For debugging, you can add logging:

```bash
DEBUG=* npm run mcp
```

### Log Files

Server logs go to stderr, so you can capture them:

```bash
npm run mcp 2> mcp-server.log
```

## Architecture

The MCP server:
- Uses `@modelcontextprotocol/sdk` for MCP protocol handling
- Integrates with existing `CaptureEngine` for processing
- Leverages `FormattingUtils` for consistent output
- Maintains all v0.2.2 formatting and routing capabilities
- Provides the same multi-item capture as the CLI

This allows AI assistants to use ChurnFlow's ADHD-friendly productivity capture system directly!