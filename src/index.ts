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
import { CaptureInput, CaptureResult } from './types/churn.js';

// Global capture engine instance
let captureEngine: CaptureEngine | null = null;

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
 * Initialize the capture engine
 */
async function initializeCaptureEngine(): Promise<void> {
  if (!captureEngine) {
    captureEngine = new CaptureEngine();
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
      priority: args.priority || 'medium',
      context: args.context,
      source: 'mcp',
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
      };
    }

    // Format successful capture result
    const summary = [
      `✅ Capture Successful!`,
      `📁 Primary Tracker: ${result.primaryTracker}`,
      `🎯 Confidence: ${result.confidence}%`,
      `📊 Generated ${result.generatedItems?.length || 0} items`,
      '',
    ];

    if (result.generatedItems && result.generatedItems.length > 0) {
      summary.push('📝 Items Generated:');
      result.generatedItems.forEach(item => {
        summary.push(`  ✅ ${item.type} → ${item.tracker}`);
        summary.push(`     ${item.formattedEntry}`);
      });
    }

    if (result.taskCompletions && result.taskCompletions.length > 0) {
      summary.push('');
      summary.push('🎯 Task Completions:');
      result.taskCompletions.forEach(completion => {
        summary.push(`  ✅ ${completion.type} in ${completion.tracker}`);
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
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error during capture: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
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
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting status: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
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
    const status = await captureEngine.getStatus();
    const trackers = captureEngine['trackerManager']?.getAllTrackers() || [];
    
    let filteredTrackers = trackers;
    if (args.context) {
      filteredTrackers = trackers.filter(tracker => 
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
      filteredTrackers.forEach(tracker => {
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
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error listing trackers: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

/**
 * Main server setup
 */
async function main(): Promise<void> {
  const server = new Server(
    {
      name: 'churnflow-mcp',
      version: '0.2.2',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

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