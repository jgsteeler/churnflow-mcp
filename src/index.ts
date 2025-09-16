#!/usr/bin/env node

/**
 * ChurnFlow MCP Server
 * 
 * An MCP (Model Context Protocol) server that provides ADHD-friendly
 * productivity capture and routing capabilities to AI assistants.
 * 
 * Features:
 * - Smart capture with AI-driven routing to appropriate trackers
 * - Multi-item processing from single inputs
 * - Consistent formatting with FormattingUtils
 * - Perfect section placement in markdown files
 * - ADHD-optimized brain dump processing
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  CallToolResult,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { CaptureEngine } from './core/CaptureEngine.js';
import { CaptureInput, CaptureResult, ChurnConfig } from './types/churn.js';

// Global capture engine instance
let captureEngine: CaptureEngine | null = null;
let config: ChurnConfig | null = null;

/**
 * Available MCP tools for AI assistants
 */
const TOOLS: Tool[] = [
  {
    name: 'capture',
    description: 'Capture and route text input using ChurnFlow ADHD-friendly AI system',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to capture and route (can contain multiple items)',
        },
        priority: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
          description: 'Priority level for the captured content',
        },
        context: {
          type: 'string',
          description: 'Optional context hint for routing (business, personal, project, system)',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'status',
    description: 'Get ChurnFlow system status and tracker information',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_trackers',
    description: 'List available trackers with their context types and status',
    inputSchema: {
      type: 'object',
      properties: {
        context: {
          type: 'string',
          description: 'Filter by context type (business, personal, project, system)',
        },
      },
    },
  },
];

/**
 * Load configuration
 */
async function loadConfig(): Promise<ChurnConfig> {
  if (config) return config;
  
  // Try to load from churn.config.json
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const configPath = path.resolve(process.cwd(), 'churn.config.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    config = JSON.parse(configData);
    return config!;
  } catch (error) {
    // Fallback config for development
    config = {
      collectionsPath: '/Users/jack/code/Collections/Churn/Collections',
      trackingPath: '/Users/jack/code/Collections/Churn/tracking', 
      crossrefPath: '/Users/jack/code/Collections/Churn/crossref.json',
      aiProvider: 'openai',
      aiApiKey: process.env.OPENAI_API_KEY || '',
      confidenceThreshold: 0.7
    };
    return config;
  }
}

/**
 * Initialize the capture engine
 */
async function initializeCaptureEngine(): Promise<void> {
  if (!captureEngine) {
    const churnConfig = await loadConfig();
    captureEngine = new CaptureEngine(churnConfig);
    await captureEngine.initialize();
  }
}

/**
 * Handle capture tool requests
 */
async function handleCapture(args: any): Promise<CallToolResult> {
  try {
    await initializeCaptureEngine();
    
    if (!captureEngine) {
      throw new Error('Failed to initialize capture engine');
    }

    const input: CaptureInput = {
      text: args.text,
      inputType: 'text',
      forceContext: args.context,
    };

    const result: CaptureResult = await captureEngine.capture(input);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Capture failed: ${result.error}`,
          },
        ],
        isError: true,
      };
    }

    // Format successful capture result
    const summary = [
      `✅ Capture Successful!`,
      `📁 Primary Tracker: ${result.primaryTracker}`,
      `🎯 Confidence: ${Math.round(result.confidence * 100)}%`,
      `📊 Generated ${result.itemResults?.length || 0} items`,
      '',
    ];

    if (result.itemResults && result.itemResults.length > 0) {
      summary.push('📝 Items Generated:');
      result.itemResults.forEach(item => {
        summary.push(`  ✅ ${item.itemType} → ${item.tracker}`);
        summary.push(`     ${item.formattedEntry}`);
      });
    }

    if (result.completedTasks && result.completedTasks.length > 0) {
      summary.push('');
      summary.push('🎯 Task Completions:');
      result.completedTasks.forEach(completion => {
        summary.push(`  ✅ completion in ${completion.tracker}`);
        summary.push(`     ${completion.description}`);
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: summary.join('\n'),
        },
      ],
      isError: false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error during capture: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle status tool requests
 */
async function handleStatus(): Promise<CallToolResult> {
  try {
    await initializeCaptureEngine();
    
    if (!captureEngine) {
      throw new Error('Failed to initialize capture engine');
    }

    const status = await captureEngine.getStatus();
    
    const statusLines = [
      '📊 ChurnFlow System Status',
      '',
      `🟢 Initialized: ${status.initialized}`,
      `📚 Total Trackers: ${status.totalTrackers}`,
      `⚙️  AI Provider: ${status.aiProvider}`,
      `🎯 Confidence Threshold: ${status.confidenceThreshold}`,
      `📁 Collections Path: ${status.collectionsPath}`,
      '',
      '📋 Trackers by Context:',
    ];

    Object.entries(status.trackersByContext || {}).forEach(([context, count]) => {
      statusLines.push(`  ${context}: ${count}`);
    });

    return {
      content: [
        {
          type: 'text',
          text: statusLines.join('\n'),
        },
      ],
      isError: false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting status: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle list_trackers tool requests
 */
async function handleListTrackers(args: any): Promise<CallToolResult> {
  try {
    await initializeCaptureEngine();
    
    if (!captureEngine) {
      throw new Error('Failed to initialize capture engine');
    }

    // Get all trackers through the capture engine's tracker manager
    const trackers = captureEngine['trackerManager']?.getTrackersByContext() || [];
    
    let filteredTrackers = trackers;
    if (args.context) {
      filteredTrackers = trackers.filter((tracker: any) => 
        tracker.frontmatter.contextType === args.context
      );
    }

    const trackerLines = [
      '📚 Available Trackers',
      '',
    ];

    if (filteredTrackers.length === 0) {
      trackerLines.push('No trackers found matching criteria.');
    } else {
      filteredTrackers.forEach((tracker: any) => {
        const context = tracker.frontmatter.contextType || 'undefined';
        const mode = tracker.frontmatter.mode || 'standard';
        trackerLines.push(`📁 ${tracker.frontmatter.tag} (${tracker.frontmatter.friendlyName})`);
        trackerLines.push(`   Context: ${context} | Mode: ${mode}`);
        if (tracker.frontmatter.collection) {
          trackerLines.push(`   Collection: ${tracker.frontmatter.collection}`);
        }
        trackerLines.push('');
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: trackerLines.join('\n'),
        },
      ],
      isError: false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error listing trackers: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Main server setup
 */
async function main(): Promise<void> {
  const server = new Server({
    name: 'churnflow-mcp',
    version: '0.2.2',
    capabilities: {
      tools: {},
    },
  });

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'capture':
        return await handleCapture(args);
      
      case 'status':
        return await handleStatus();
      
      case 'list_trackers':
        return await handleListTrackers(args);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('ChurnFlow MCP Server v0.2.2 started successfully');
  console.error('Available tools: capture, status, list_trackers');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('\nShutting down ChurnFlow MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\nShutting down ChurnFlow MCP Server...');
  process.exit(0);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error in ChurnFlow MCP Server:', error);
    process.exit(1);
  });
}