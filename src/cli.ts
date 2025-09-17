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
import { ReviewManager } from './core/ReviewManager.js';
import { TrackerManager } from './core/TrackerManager.js';
import { DashboardManager } from './core/DashboardManager.js';
import { ChurnConfig, ReviewableItem, ReviewAction, Priority, ItemType } from './types/churn.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import chalk from 'chalk';

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
  private reviewManager?: ReviewManager;
  private trackerManager?: TrackerManager;
  private dashboardManager?: DashboardManager;

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

  async initializeReviewManager(): Promise<ReviewManager> {
    if (this.reviewManager) return this.reviewManager;

    const config = await this.loadConfig();
    
    // Initialize TrackerManager first
    if (!this.trackerManager) {
      this.trackerManager = new TrackerManager(config);
      await this.trackerManager.initialize();
    }
    
    this.reviewManager = new ReviewManager(config, this.trackerManager);
    
    return this.reviewManager;
  }

  async initializeDashboardManager(): Promise<DashboardManager> {
    if (this.dashboardManager) return this.dashboardManager;

    const config = await this.loadConfig();
    
    // Initialize dependencies
    if (!this.trackerManager) {
      this.trackerManager = new TrackerManager(config);
      await this.trackerManager.initialize();
    }
    
    if (!this.reviewManager) {
      this.reviewManager = new ReviewManager(config, this.trackerManager);
    }
    
    this.dashboardManager = new DashboardManager(config, this.trackerManager, this.reviewManager);
    
    return this.dashboardManager;
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
      
      console.log(`�︢ Initialized: ${status.initialized}`);
      console.log(`📚 Total Trackers: ${status.totalTrackers}`);
      console.log(`⚙️  AI Provider: ${status.config.aiProvider}`);
      console.log(`🎯 Confidence Threshold: ${status.config.confidenceThreshold}`);
      console.log(`📁 Collections Path: ${status.config.collectionsPath}`);
      
      console.log('\n📋 Trackers by Context:');
      for (const [context, count] of Object.entries(status.trackersByContext)) {
        console.log(`  ${context}: ${count}`);
      }
      
      // Add review status
      try {
        const reviewManager = await this.initializeReviewManager();
        const reviewStatus = reviewManager.getReviewStatus();
        
        console.log('\n🔍 Review Status:');
        if (reviewStatus.total > 0) {
          console.log(`  ${chalk.yellow('⚠️  Pending Review:')} ${reviewStatus.pending}`);
          console.log(`  ${chalk.blue('🏷️  Flagged Items:')} ${reviewStatus.flagged}`);
          console.log(`  ${chalk.green('✅ Confirmed:')} ${reviewStatus.confirmed}`);
          console.log(`  ${chalk.cyan('📊 Total:')} ${reviewStatus.total}`);
          
          if (reviewStatus.pending > 0 || reviewStatus.flagged > 0) {
            console.log(`\n${chalk.yellow('➡️  Run')} ${chalk.bold('npm run cli review')} ${chalk.yellow('to process items')}`);
          }
        } else {
          console.log(`  ${chalk.green('✅ No items need review')}`);
        }
      } catch (reviewError) {
        console.log(`  ${chalk.red('❌ Review system unavailable:')} ${reviewError}`);
      }
      
    } catch (error) {
      console.error('💥 Status check failed:', error);
      process.exit(1);
    }
  }

  async review(targetTracker?: string) {
    try {
      console.log('🔍 ChurnFlow Review Interface\n');
      
      const reviewManager = await this.initializeReviewManager();
      const items = reviewManager.getItemsNeedingReview(targetTracker);
      
      if (items.length === 0) {
        if (targetTracker) {
          console.log(`${chalk.green('✅ No items need review in tracker:')} ${chalk.bold(targetTracker)}`);
        } else {
          console.log(`${chalk.green('✅ No items need review across all trackers')}`);
        }
        return;
      }
      
      console.log(`${chalk.cyan('📊 Found')} ${chalk.bold(items.length)} ${chalk.cyan('items needing review')}`);
      if (targetTracker) {
        console.log(`${chalk.blue('🎯 Filtering by tracker:')} ${chalk.bold(targetTracker)}`);
      }
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const isLast = i === items.length - 1;
        
        console.log(`\n${chalk.yellow('=')}${'='.repeat(60)}${chalk.yellow('=')}`);
        console.log(`${chalk.cyan('📝 Item')} ${chalk.bold(`${i + 1}/${items.length}`)}`);
        console.log(`${chalk.blue('📁 Tracker:')} ${item.currentTracker}`);
        console.log(`${chalk.blue('📜 Section:')} ${item.currentSection}`);
        console.log(`${chalk.blue('🎯 Confidence:')} ${Math.round(item.confidence * 100)}%`);
        console.log(`${chalk.blue('🔗 Type:')} ${item.metadata.type}`);
        console.log(`${chalk.blue('⚙️ Priority:')} ${item.metadata.urgency}`);
        console.log(`${chalk.blue('🏷️ Keywords:')} ${item.metadata.keywords.join(', ')}`);
        console.log(`${chalk.blue('🕰️ Status:')} ${item.reviewStatus}`);
        console.log(`\n${chalk.bold('📝 Content:')}`);
        console.log(`${chalk.gray(item.content)}`);
        
        const action = await this.promptReviewAction(item);
        const success = await this.executeReviewAction(reviewManager, item.id, action);
        
        if (success) {
          console.log(`${chalk.green('✅ Action completed successfully')}`);
        } else {
          console.log(`${chalk.red('❌ Action failed')}`);
        }
        
        if (!isLast) {
          const continueReview = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'continue',
              message: 'Continue to next item?',
              default: true
            }
          ]);
          
          if (!continueReview.continue) {
            console.log(`${chalk.yellow('🙄 Review session ended')}`);
            break;
          }
        }
      }
      
      console.log(`\n${chalk.green('✅ Review session completed')}`);
      
    } catch (error) {
      console.error('💥 Review failed:', error);
      process.exit(1);
    }
  }

  async promptReviewAction(item: ReviewableItem): Promise<{action: ReviewAction; newValues?: any}> {
    const choices = [
      {
        name: `${chalk.green('✅ Accept')} - Move to tracker as-is`,
        value: 'accept'
      },
      {
        name: `${chalk.blue('🎯 Edit Priority')} - Change urgency level`,
        value: 'edit-priority'
      },
      {
        name: `${chalk.cyan('🏷️ Edit Tags')} - Modify keywords`,
        value: 'edit-tags'
      },
      {
        name: `${chalk.magenta('🔄 Edit Type')} - Change item type`,
        value: 'edit-type'
      },
      {
        name: `${chalk.yellow('📦 Move')} - Change tracker`,
        value: 'move'
      },
      {
        name: `${chalk.red('❌ Reject')} - Remove from system`,
        value: 'reject'
      }
    ];
    
    const actionChoice = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do with this item?',
        choices
      }
    ]);
    
    const action = actionChoice.action as ReviewAction;
    let newValues = {};
    
    switch (action) {
      case 'edit-priority':
        const priorityChoice = await inquirer.prompt([
          {
            type: 'list',
            name: 'priority',
            message: 'Select new priority:',
            choices: [
              { name: `${chalk.red('🚨 High')} - Urgent/important`, value: 'high' },
              { name: `${chalk.yellow('🔼 Medium')} - Normal priority`, value: 'medium' },
              { name: `${chalk.gray('🔻 Low')} - Low priority`, value: 'low' }
            ],
            default: item.metadata.urgency
          }
        ]);
        newValues = { priority: priorityChoice.priority as Priority };
        break;
        
      case 'edit-tags':
        const tagsInput = await inquirer.prompt([
          {
            type: 'input',
            name: 'tags',
            message: 'Enter keywords (comma-separated):',
            default: item.metadata.keywords.join(', ')
          }
        ]);
        newValues = { tags: tagsInput.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag) };
        break;
        
      case 'edit-type':
        const typeChoice = await inquirer.prompt([
          {
            type: 'list',
            name: 'type',
            message: 'Select new type:',
            choices: [
              { name: 'Action Item - Task to complete', value: 'action' },
              { name: 'Reference - Information to keep', value: 'reference' },
              { name: 'Review Item - Needs more review', value: 'review' },
              { name: 'Someday/Maybe - Future consideration', value: 'someday' }
            ],
            default: item.metadata.type
          }
        ]);
        newValues = { type: typeChoice.type as ItemType };
        break;
        
      case 'move':
        // Get available trackers
        if (!this.trackerManager) {
          await this.initializeReviewManager(); // This initializes trackerManager too
        }
        const trackers = this.trackerManager!.getTrackersByContext();
        const trackerChoices = trackers.map((tracker: any) => ({
          name: `${tracker.frontmatter.friendlyName} (${tracker.frontmatter.contextType})`,
          value: tracker.frontmatter.tag
        }));
        
        const trackerChoice = await inquirer.prompt([
          {
            type: 'list',
            name: 'tracker',
            message: 'Select target tracker:',
            choices: trackerChoices,
            default: item.currentTracker
          }
        ]);
        newValues = { tracker: trackerChoice.tracker };
        break;
    }
    
    return { action, newValues };
  }

  async executeReviewAction(
    reviewManager: ReviewManager, 
    itemId: string, 
    actionData: {action: ReviewAction; newValues?: any}
  ): Promise<boolean> {
    try {
      return await reviewManager.processReviewAction(
        itemId, 
        actionData.action, 
        actionData.newValues
      );
    } catch (error) {
      console.error(`${chalk.red('Error executing action:')} ${error}`);
      return false;
    }
  }

  async dump() {
    try {
      console.log('🧠 ChurnFlow Brain Dump Mode\n');
      console.log('💡 Enter your thoughts one at a time, press Enter after each one');
      console.log('✅ Type "quit" or press Enter on empty line to finish\n');
      
      const engine = await this.initializeCaptureEngine();
      const thoughts: string[] = [];
      let totalItems = 0;
      let totalSuccess = 0;
      
      while (true) {
        const input = await inquirer.prompt([
          {
            type: 'input',
            name: 'thought',
            message: `💭 Thought ${thoughts.length + 1}:`,
            default: ''
          }
        ]);
        
        const thought = input.thought.trim();
        
        // Exit conditions
        if (!thought || thought.toLowerCase() === 'quit') {
          break;
        }
        
        // Capture the thought immediately
        console.log(`\n🔄 Processing: "${thought}"`);
        const result = await engine.capture(thought);
        
        if (result.success) {
          console.log(`✅ Routed to ${result.primaryTracker} (${Math.round(result.confidence * 100)}% confidence)`);
          console.log(`📊 Generated ${result.itemResults.length} items`);
          totalItems += result.itemResults.length;
          totalSuccess += result.itemResults.filter(item => item.success).length;
          
          if (result.completedTasks.length > 0) {
            console.log(`🎉 Detected ${result.completedTasks.length} task completions`);
          }
        } else {
          console.log(`⚠️  Capture failed, but saved to emergency: ${result.error}`);
        }
        
        thoughts.push(thought);
        console.log(`\n${'─'.repeat(50)}`);
      }
      
      // Summary
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🎉 Brain Dump Complete!`);
      console.log(`💭 Processed ${thoughts.length} thoughts`);
      console.log(`📊 Generated ${totalItems} total items`);
      console.log(`✅ ${totalSuccess} items successfully routed`);
      
      if (totalItems > totalSuccess) {
        const failed = totalItems - totalSuccess;
        console.log(`⚠️  ${failed} items need review (run: npm run cli review)`);
      }
      
      console.log(`\n💡 Your brain dump is safely captured and organized!`);
      
    } catch (error) {
      console.error('💥 Brain dump failed:', error);
      process.exit(1);
    }
  }

  async next() {
    try {
      console.log('🎯 ChurnFlow - What\'s Next Dashboard\n');
      
      const dashboardManager = await this.initializeDashboardManager();
      const [recommendations, summary] = await Promise.all([
        dashboardManager.getWhatsNext(),
        dashboardManager.getDashboardSummary()
      ]);
      
      // Display summary
      console.log(`📊 ${chalk.bold('System Summary')}`);
      console.log(`📝 Total Action Items: ${chalk.cyan(summary.totalActionItems)}`);
      if (summary.overdueTasks > 0) {
        console.log(`🚨 ${chalk.red('Overdue:')} ${summary.overdueTasks}`);
      }
      if (summary.dueTodayTasks > 0) {
        console.log(`🗓️ ${chalk.yellow('Due Today:')} ${summary.dueTodayTasks}`);
      }
      if (summary.reviewItemCount > 0) {
        console.log(`🔍 ${chalk.blue('Pending Review:')} ${summary.reviewItemCount}`);
      }
      
      // Display breakdown
      console.log(`\n📊 ${chalk.bold('By Context:')}`);
      for (const [context, count] of Object.entries(summary.trackerBreakdown)) {
        const emoji = this.getContextEmoji(context);
        console.log(`  ${emoji} ${context}: ${count}`);
      }
      
      if (recommendations.length === 0) {
        console.log(`\n${chalk.green('✅ All caught up! No urgent items found.')}`);
        console.log(`${chalk.gray('Consider using:')} ${chalk.bold('dump')} ${chalk.gray('to capture new thoughts')}`);
        return;
      }
      
      // Display recommendations
      console.log(`\n${chalk.bold('🎯 What to Work on Next:')}`);
      console.log(`${'='.repeat(60)}`);
      
      for (let i = 0; i < recommendations.length; i++) {
        const rec = recommendations[i];
        const number = chalk.bold(`${i + 1}.`);
        
        console.log(`\n${number} ${rec.categoryEmoji} ${chalk.bold(rec.categoryTitle)}`);
        console.log(`   ${chalk.cyan(rec.item.title)}`);
        console.log(`   ${chalk.gray('📍')} ${rec.item.trackerFriendlyName} ${chalk.gray('|')} ${chalk.gray('⏱️')} ${rec.estimatedTime}`);
        console.log(`   ${chalk.gray('💯')} ${rec.reason}`);
        
        if (rec.item.dueDate) {
          const isOverdue = new Date(rec.item.dueDate) < new Date();
          const dateColor = isOverdue ? chalk.red : chalk.yellow;
          console.log(`   ${chalk.gray('🗓️')} ${dateColor(rec.item.dueDate)}`);
        }
      }
      
      console.log(`\n${chalk.gray('Pro tip:')} Run ${chalk.bold('churn review')} to process review items`);
      console.log(`${chalk.gray('Or:')} ${chalk.bold('dump')} to capture more thoughts`);
      
    } catch (error) {
      console.error('💥 Dashboard failed:', error);
      process.exit(1);
    }
  }

  async tasks(filterTracker?: string, showAll: boolean = false) {
    try {
      console.log('📝 ChurnFlow - All Open Tasks\n');
      
      const dashboardManager = await this.initializeDashboardManager();
      const summary = await dashboardManager.getDashboardSummary();
      
      // Get all action items
      const allItems = await (dashboardManager as any).getAllActionableItems();
      
      // Filter by tracker if specified
      const filteredItems = filterTracker ? 
        allItems.filter((item: any) => item.tracker === filterTracker) : 
        allItems;
      
      // Sort by urgency score (highest first) unless showing all
      const sortedItems = showAll ? 
        filteredItems.sort((a: any, b: any) => a.tracker.localeCompare(b.tracker)) :
        filteredItems.sort((a: any, b: any) => b.urgencyScore - a.urgencyScore);
      
      console.log(`📊 ${chalk.bold('Summary:')}`);
      console.log(`📝 Found ${chalk.cyan(sortedItems.length)} open tasks`);
      if (filterTracker) {
        console.log(`🎯 Filtered by tracker: ${chalk.bold(filterTracker)}`);
      }
      console.log(`📊 Total across all trackers: ${chalk.cyan(allItems.length)}`);
      
      if (sortedItems.length === 0) {
        console.log(`\n${chalk.green('✅ No open tasks found!')}`);
        return;
      }
      
      console.log(`\n${chalk.bold('📋 All Open Tasks:')}`);
      console.log(`${'='.repeat(80)}`);
      
      let currentTracker = '';
      for (let i = 0; i < sortedItems.length; i++) {
        const item = sortedItems[i];
        
        // Group by tracker when showing all
        if (showAll && item.tracker !== currentTracker) {
          currentTracker = item.tracker;
          console.log(`\n${chalk.bold.blue(`📋 ${item.trackerFriendlyName} (${item.tracker})`)}`);
          console.log(`${'-'.repeat(40)}`);
        }
        
        const number = showAll ? '  •' : chalk.bold(`${i + 1}.`);
        const priorityColor = item.priority === 'high' ? chalk.red : 
                             item.priority === 'medium' ? chalk.yellow : chalk.gray;
        const priorityText = priorityColor(item.priority.toUpperCase());
        
        console.log(`${number} ${chalk.cyan(item.title)}`);
        
        if (!showAll) {
          console.log(`     ${chalk.gray('📍')} ${item.trackerFriendlyName}`);
        }
        
        const details = [];
        details.push(`${priorityText}`);
        details.push(`⏱️ ~${item.estimatedMinutes || 30}min`);
        details.push(`💯 ${item.urgencyScore}/100`);
        
        if (item.dueDate) {
          const isOverdue = new Date(item.dueDate) < new Date();
          const dateColor = isOverdue ? chalk.red : chalk.yellow;
          details.push(`🗓️ ${dateColor(item.dueDate)}`);
        }
        
        console.log(`     ${chalk.gray(details.join(' | '))}`);
        
        if (!showAll && i < sortedItems.length - 1) {
          console.log();
        }
      }
      
      console.log(`\n${chalk.gray('Pro tip:')} Run ${chalk.bold('next')} to see prioritized recommendations`);
      console.log(`${chalk.gray('Or:')} ${chalk.bold('tasks all')} to group by tracker`);
      console.log(`${chalk.gray('Complete tasks:')} ${chalk.bold('done "task title"')}`);
      
    } catch (error) {
      console.error('💥 Tasks list failed:', error);
      process.exit(1);
    }
  }

  async done(taskQuery: string) {
    try {
      console.log('✅ ChurnFlow - Mark Task Complete\n');
      
      const dashboardManager = await this.initializeDashboardManager();
      const allItems = await (dashboardManager as any).getAllActionableItems();
      
      // Find matching tasks
      const matches = allItems.filter((item: any) => 
        item.title.toLowerCase().includes(taskQuery.toLowerCase())
      );
      
      if (matches.length === 0) {
        console.log(`${chalk.red('❌ No tasks found matching:')} "${taskQuery}"`);
        console.log(`\n${chalk.gray('Try a shorter search term or check:')} ${chalk.bold('tasks')}`);
        return;
      }
      
      if (matches.length === 1) {
        const task = matches[0];
        const success = await this.markTaskComplete(task);
        
        if (success) {
          console.log(`${chalk.green('✅ Task completed successfully!')}`);
          console.log(`${chalk.cyan(task.title)}`);
          console.log(`${chalk.gray('In tracker:')} ${task.trackerFriendlyName}`);
          console.log(`\n${chalk.gray('Run')} ${chalk.bold('next')} ${chalk.gray('to see updated recommendations')}`);
        } else {
          console.log(`${chalk.red('❌ Failed to mark task as complete')}`);
        }
        return;
      }
      
      // Multiple matches - let user choose
      console.log(`${chalk.yellow('🔍 Multiple tasks found matching:')} "${taskQuery}"\n`);
      
      const choices = matches.map((task: any, index: number) => ({
        name: `${task.title} (${task.trackerFriendlyName})`,
        value: index
      }));
      
      choices.push({ name: 'Cancel', value: -1 });
      
      const selection = await inquirer.prompt([
        {
          type: 'list',
          name: 'taskIndex',
          message: 'Which task did you complete?',
          choices
        }
      ]);
      
      if (selection.taskIndex === -1) {
        console.log(`${chalk.gray('Cancelled')}`);
        return;
      }
      
      const selectedTask = matches[selection.taskIndex];
      const success = await this.markTaskComplete(selectedTask);
      
      if (success) {
        console.log(`${chalk.green('✅ Task completed successfully!')}`);
        console.log(`${chalk.cyan(selectedTask.title)}`);
        console.log(`${chalk.gray('In tracker:')} ${selectedTask.trackerFriendlyName}`);
        console.log(`\n${chalk.gray('Run')} ${chalk.bold('next')} ${chalk.gray('to see updated recommendations')}`);
      } else {
        console.log(`${chalk.red('❌ Failed to mark task as complete')}`);
      }
      
    } catch (error) {
      console.error('💥 Done command failed:', error);
      process.exit(1);
    }
  }

  private async markTaskComplete(task: any): Promise<boolean> {
    try {
      // Initialize tracker manager to get file access
      if (!this.trackerManager) {
        const config = await this.loadConfig();
        this.trackerManager = new TrackerManager(config);
        await this.trackerManager.initialize();
      }
      
      // Get tracker file path
      const trackerPath = path.join(
        (await this.loadConfig()).trackingPath, 
        `${task.tracker}-tracker.md`
      );
      
      // Read file content
      const content = await fs.readFile(trackerPath, 'utf-8');
      const lines = content.split('\n');
      
      // Find and replace the task line
      let found = false;
      const updatedLines = lines.map(line => {
        if (found) return line;
        
        const trimmed = line.trim();
        if (trimmed.startsWith('- [ ]') && 
            trimmed.toLowerCase().includes(task.title.toLowerCase())) {
          found = true;
          // Replace [ ] with [x] and add completion date
          const completedLine = line.replace('- [ ]', '- [x]');
          const today = new Date().toISOString().split('T')[0];
          
          // Add completion date if not already present
          if (!completedLine.includes('✅')) {
            return completedLine + ` ✅ ${today}`;
          }
          return completedLine;
        }
        return line;
      });
      
      if (!found) {
        console.log(`${chalk.yellow('⚠️  Could not find exact task in file')}`);
        return false;
      }
      
      // Write updated content back
      await fs.writeFile(trackerPath, updatedLines.join('\n'));
      return true;
      
    } catch (error) {
      console.error('Error marking task complete:', error);
      return false;
    }
  }

  private getContextEmoji(context: string): string {
    switch (context.toLowerCase()) {
      case 'business': return '💼';
      case 'project': return '🚀';
      case 'personal': return '🏠';
      case 'system': return '⚙️';
      default: return '📝';
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
        
      case 'review':
        const targetTracker = args[1];
        await this.review(targetTracker);
        break;
        
      case 'dump':
        await this.dump();
        break;
        
      case 'next':
        await this.next();
        break;
        
      case 'tasks':
        const showAll = args[1] === 'all';
        const trackerFilter = showAll ? undefined : args[1];
        await this.tasks(trackerFilter, showAll);
        break;
        
      case 'done':
        const taskQuery = args.slice(1).join(' ');
        if (!taskQuery) {
          console.error('❌ Please provide a task to mark as complete');
          console.log('Usage: npm run cli done "task title or partial match"');
          process.exit(1);
        }
        await this.done(taskQuery);
        break;
        
      case 'init':
        await this.init();
        break;
        
      default:
        console.log('🧐 ChurnFlow CLI\n');
        console.log('Available commands:');
        console.log('  next                - Show what to work on next');
        console.log('  tasks [tracker|all] - List all open tasks');
        console.log('  done "task"         - Mark a task as complete');
        console.log('  dump                - Interactive brain dump mode');
        console.log('  capture "text"      - Capture and route single text');
        console.log('  status              - Show system status');
        console.log('  review [tracker]    - Review flagged items');
        console.log('  init                - Initialize configuration');
        console.log('\nExamples:');
        console.log('  npm run cli next');
        console.log('  npm run cli tasks');
        console.log('  npm run cli tasks all');
        console.log('  npm run cli tasks gsc-ai');
        console.log('  npm run cli done "call client"');
        console.log('  npm run cli dump');
        console.log('  npm run cli capture "Call client about proposal"');
        console.log('  npm run cli status');
        console.log('  npm run cli review');
        console.log('  npm run cli review work-tracker');
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