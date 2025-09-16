#!/usr/bin/env node

/**
 * ChurnFlow CLI - Local testing interface for ADHD-friendly capture
 * 
 * Usage:
 *   npm run cli capture "I need to follow up with the client about the proposal"
 *   npm run cli status
 *   npm run cli init
 */

import { CaptureEngine } from './core/CaptureEngine.js';
import { ChurnConfig } from './types/churn.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default configuration - you'll want to customize these paths
const DEFAULT_CONFIG: ChurnConfig = {
  collectionsPath: path.join(process.env.HOME || '/tmp', 'Churn/Collections'),
  trackingPath: path.join(process.env.HOME || '/tmp', 'Churn/Tracking'),
  crossrefPath: path.join(process.env.HOME || '/tmp', 'Churn/Tracking/crossref.json'),
  aiProvider: 'openai',
  aiApiKey: process.env.OPENAI_API_KEY || '',
  confidenceThreshold: 0.7
};

class ChurnCLI {
  private captureEngine?: CaptureEngine;

  async loadConfig(): Promise<ChurnConfig> {
    // Look for config file first
    const configPath = path.join(process.cwd(), 'churn.config.json');
    
    try {
      const configFile = await fs.readFile(configPath, 'utf-8');
      const fileConfig = JSON.parse(configFile);
      console.log('📝 Loaded configuration from churn.config.json');
      return { ...DEFAULT_CONFIG, ...fileConfig };
    } catch {
      console.log('⚙️  Using default configuration (create churn.config.json to customize)');
      return DEFAULT_CONFIG;
    }
  }

  async initializeCaptureEngine(): Promise<CaptureEngine> {
    if (this.captureEngine) return this.captureEngine;

    const config = await this.loadConfig();
    
    if (!config.aiApiKey) {
      console.error('❌ OpenAI API key required. Set OPENAI_API_KEY environment variable or add to config file.');
      process.exit(1);
    }

    this.captureEngine = new CaptureEngine(config);
    await this.captureEngine.initialize();
    
    return this.captureEngine;
  }

  async capture(text: string) {
    try {
      console.log('🧠 ChurnFlow Capture Starting...\n');
      
      const engine = await this.initializeCaptureEngine();
      const result = await engine.capture(text);
      
      console.log('\n' + '='.repeat(50));
      
      if (result.success) {
        console.log('✅ Capture Successful!');
        console.log(`📁 Primary Tracker: ${result.primaryTracker}`);
        console.log(`🎯 Confidence: ${Math.round(result.confidence * 100)}%`);
        console.log(`📊 Generated ${result.itemResults.length} items`);
        
        if (result.completedTasks.length > 0) {
          console.log(`✅ Detected ${result.completedTasks.length} task completions`);
        }
        
        console.log('\n📝 Items Generated:');
        for (const item of result.itemResults) {
          const status = item.success ? '✅' : '❌';
          console.log(`  ${status} ${item.itemType} → ${item.tracker}`);
          console.log(`     ${item.formattedEntry}`);
          if (item.error) {
            console.log(`     Error: ${item.error}`);
          }
        }
        
        if (result.completedTasks.length > 0) {
          console.log('\n🎉 Task Completions:');
          for (const completion of result.completedTasks) {
            console.log(`  ✅ ${completion.description} (${completion.tracker})`);
          }
        }
        
        if (result.requiresReview) {
          console.log('\n⚠️  Requires human review');
        }
      } else {
        console.log('❌ Capture Failed');
        console.log(`❗ Error: ${result.error}`);
        if (result.itemResults.length > 0) {
          console.log(`🚨 Emergency entry: ${result.itemResults[0].formattedEntry}`);
        }
      }
      
    } catch (error) {
      console.error('💥 Capture engine error:', error);
      process.exit(1);
    }
  }

  async status() {
    try {
      console.log('📊 ChurnFlow System Status\n');
      
      const engine = await this.initializeCaptureEngine();
      const status = engine.getStatus();
      
      console.log(`🟢 Initialized: ${status.initialized}`);
      console.log(`📚 Total Trackers: ${status.totalTrackers}`);
      console.log(`⚙️  AI Provider: ${status.config.aiProvider}`);
      console.log(`🎯 Confidence Threshold: ${status.config.confidenceThreshold}`);
      console.log(`📁 Collections Path: ${status.config.collectionsPath}`);
      
      console.log('\n📋 Trackers by Context:');
      for (const [context, count] of Object.entries(status.trackersByContext)) {
        console.log(`  ${context}: ${count}`);
      }
      
    } catch (error) {
      console.error('💥 Status check failed:', error);
      process.exit(1);
    }
  }

  async init() {
    console.log('🚀 ChurnFlow Initialization\n');
    
    // Create sample configuration file
    const configPath = path.join(process.cwd(), 'churn.config.json');
    
    try {
      await fs.access(configPath);
      console.log('⚠️  Configuration file already exists at churn.config.json');
    } catch {
      const sampleConfig = {
        collectionsPath: "/path/to/your/Churn/Collections",
        trackingPath: "/path/to/your/Churn/Tracking", 
        crossrefPath: "/path/to/your/Churn/Tracking/crossref.json",
        aiProvider: "openai",
        confidenceThreshold: 0.7,
        note: "Set OPENAI_API_KEY environment variable or add aiApiKey here"
      };
      
      await fs.writeFile(configPath, JSON.stringify(sampleConfig, null, 2));
      console.log('✅ Created sample configuration at churn.config.json');
      console.log('📝 Edit this file with your actual Churn system paths');
    }
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Edit churn.config.json with your Churn system paths');
    console.log('2. Set OPENAI_API_KEY environment variable');
    console.log('3. Test with: npm run cli status');
    console.log('4. Capture with: npm run cli capture "your text here"');
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
      case 'capture':
        const text = args.slice(1).join(' ');
        if (!text) {
          console.error('❌ Please provide text to capture');
          console.log('Usage: npm run cli capture "your text here"');
          process.exit(1);
        }
        await this.capture(text);
        break;
        
      case 'status':
        await this.status();
        break;
        
      case 'init':
        await this.init();
        break;
        
      default:
        console.log('🧠 ChurnFlow CLI\n');
        console.log('Available commands:');
        console.log('  capture "text"  - Capture and route text');
        console.log('  status          - Show system status');
        console.log('  init            - Initialize configuration');
        console.log('\nExamples:');
        console.log('  npm run cli capture "Call client about proposal"');
        console.log('  npm run cli status');
        break;
    }
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new ChurnCLI();
  cli.run().catch(error => {
    console.error('💥 CLI Error:', error);
    process.exit(1);
  });
}