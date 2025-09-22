#!/usr/bin/env tsx
/**
 * ChurnFlow Database Setup Command
 * Sets up the SQLite database with proper schema and initial data
 */

import { DatabaseManager } from '../storage/DatabaseManager.js';
import path from 'path';

interface SetupOptions {
  reset?: boolean;
  dbPath?: string;
  verbose?: boolean;
}

async function setupDatabase(options: SetupOptions = {}) {
  const dbPath = options.dbPath || path.join(process.cwd(), 'churnflow.db');
  
  console.log('🚀 ChurnFlow Database Setup\n');
  
  if (options.verbose) {
    console.log(`📍 Database path: ${dbPath}`);
    console.log(`🔄 Reset mode: ${options.reset ? 'Yes' : 'No'}`);
    console.log('');
  }

  const dbManager = new DatabaseManager({ 
    dbPath,
    enableWAL: true,
    enableForeignKeys: true 
  });

  try {
    if (options.reset) {
      await dbManager.resetDatabase();
    } else {
      await dbManager.setupDatabase();
    }
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('  • Run captures: npm run cli capture "your text"');
    console.log('  • View database: npm run db:studio');
    console.log('  • Run tests: npm test');
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: SetupOptions = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--reset':
      options.reset = true;
      break;
    case '--db-path':
      options.dbPath = args[++i];
      break;
    case '--verbose':
    case '-v':
      options.verbose = true;
      break;
    case '--help':
    case '-h':
      console.log(`
ChurnFlow Database Setup

Usage:
  npm run db:setup [options]

Options:
  --reset           Reset the database (delete all data)
  --db-path <path>  Specify database file path
  --verbose, -v     Show detailed output
  --help, -h        Show this help message

Examples:
  npm run db:setup                    # Initial setup
  npm run db:setup -- --reset         # Reset database
  npm run db:setup -- --verbose       # Setup with detailed output
`);
      process.exit(0);
    default:
      console.error(`Unknown option: ${arg}`);
      console.log('Use --help for usage information');
      process.exit(1);
  }
}

// Run setup
setupDatabase(options);