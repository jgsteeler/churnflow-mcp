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

  async initializeDashboardManager(): Promise<DashboardManager> {
    if (this.dashboardManager) return this.dashboardManager;

    const config = await this.loadConfig();
    
    this.dashboardManager = new DashboardManager(config);
    
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
        console.log(`📁 Primary Context: ${result.primaryTracker}`);
        console.log(`🎯 Confidence: ${Math.round(result.confidence * 100)}%`);
        console.log(`� Saved ${result.itemResults.length} items to the database.`);
        
        if (result.requiresReview) {
          console.log('\n⚠️  Requires human review');
        }
      } else {
        console.log('❌ Capture Failed');
        console.log(`❗ Error: ${result.error}`);
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
      
      console.log(`︢ Initialized: ${status.initialized}`);
      console.log(`💾 Database Available: ${status.databaseAvailable}`);
      console.log(`⚙️  AI Provider: ${status.config.aiProvider}`);
      console.log(`🎯 Confidence Threshold: ${status.config.confidenceThreshold}`);
      
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
      console.log(`${chalk.gray('Edit tasks:')} ${chalk.bold('change "task title"')} ${chalk.gray('or')} ${chalk.bold('change')} ${chalk.gray('for picker')}`);
      
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
        filteredItems.sort((a: any, b: any) => {
          const trackerA = a.tracker || '';
          const trackerB = b.tracker || '';
          return trackerA.localeCompare(trackerB);
        }) :
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
      console.log(`${chalk.gray('Edit tasks:')} ${chalk.bold('change "task title"')} ${chalk.gray('or')} ${chalk.bold('change')} ${chalk.gray('for picker')}`);
      
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

  async edit(taskQuery?: string) {
    try {
      console.log('✏️ ChurnFlow - Edit Task\n');
      
      const dashboardManager = await this.initializeDashboardManager();
      const allItems = await (dashboardManager as any).getAllActionableItems();
      
      let selectedTask: any;
      
      if (taskQuery) {
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
          selectedTask = matches[0];
        } else {
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
              message: 'Which task would you like to edit?',
              choices
            }
          ]);
          
          if (selection.taskIndex === -1) {
            console.log(`${chalk.gray('Cancelled')}`);
            return;
          }
          
          selectedTask = matches[selection.taskIndex];
        }
      } else {
        // No query provided - show task picker
        if (allItems.length === 0) {
          console.log(`${chalk.green('✅ No open tasks found!')}`);
          return;
        }
        
        // Sort by urgency for better selection experience
        const sortedItems = allItems.sort((a: any, b: any) => b.urgencyScore - a.urgencyScore);
        
        // Show top 20 tasks to avoid overwhelming the user
        const displayItems = sortedItems.slice(0, 20);
        
        const choices = displayItems.map((task: any, index: number) => {
          const priorityEmoji = task.priority === 'high' ? '🔴' : 
                               task.priority === 'medium' ? '🟡' : '🟢';
          return {
            name: `${priorityEmoji} ${task.title} (${task.trackerFriendlyName})`,
            value: index
          };
        });
        
        choices.push({ name: 'Cancel', value: -1 });
        
        const selection = await inquirer.prompt([
          {
            type: 'list',
            name: 'taskIndex',
            message: 'Which task would you like to edit?',
            choices,
            pageSize: 15
          }
        ]);
        
        if (selection.taskIndex === -1) {
          console.log(`${chalk.gray('Cancelled')}`);
          return;
        }
        
        selectedTask = displayItems[selection.taskIndex];
      }
      
      // Show current task details
      console.log(`\n${chalk.bold('Current Task:')}`);
      console.log(`📋 ${chalk.cyan(selectedTask.title)}`);
      console.log(`📍 ${selectedTask.trackerFriendlyName}`);
      console.log(`⚖️ Priority: ${selectedTask.priority}`);
      if (selectedTask.dueDate) {
        console.log(`📅 Due: ${selectedTask.dueDate}`);
      }
      
      // Get edit action
      const editAction = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to edit?',
          choices: [
            { name: '✏️ Edit title', value: 'title' },
            { name: '⚖️ Change priority', value: 'priority' },
            { name: '📅 Update due date', value: 'dueDate' },
            { name: '🏷️ Edit tags', value: 'tags' },
            { name: '🚚 Move to different tracker', value: 'move' },
            { name: '✅ Close (mark as completed)', value: 'close' },
            { name: '🗑️ Delete task permanently', value: 'delete' },
            { name: '📝 View full line (for manual editing)', value: 'viewFull' },
            { name: '❌ Cancel', value: 'cancel' }
          ]
        }
      ]);
      
      if (editAction.action === 'cancel') {
        console.log(`${chalk.gray('Cancelled')}`);
        return;
      }
      
      const success = await this.performTaskEdit(selectedTask, editAction.action);
      
      if (success) {
        console.log(`${chalk.green('✅ Task updated successfully!')}`);
        console.log(`\n${chalk.gray('Run')} ${chalk.bold('next')} ${chalk.gray('or')} ${chalk.bold('tasks')} ${chalk.gray('to see the updated task')}`);
      } else {
        console.log(`${chalk.red('❌ Failed to update task')}`);
      }
      
    } catch (error) {
      console.error('💥 Edit command failed:', error);
      process.exit(1);
    }
  }
  
  private async performTaskEdit(task: any, editType: string): Promise<boolean> {
    try {
      // Initialize tracker manager to get file access
      if (!this.trackerManager) {
        const config = await this.loadConfig();
        this.trackerManager = new TrackerManager(config);
        await this.trackerManager.initialize();
      }
      
      // Get the correct tracker file path from crossref
      const crossrefEntries = this.trackerManager.getCrossrefEntries();
      const entry = crossrefEntries.find(e => e.tag === task.tracker);
      
      if (!entry) {
        console.log(`${chalk.yellow('⚠️ Could not find tracker entry for:')} ${task.tracker}`);
        return false;
      }
      
      const trackerPath = entry.trackerFile;
      
      const content = await fs.readFile(trackerPath, 'utf-8');
      const lines = content.split('\n');
      
      // Find the task line
      let taskLineIndex = -1;
      let currentTaskLine = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('- [ ]') && 
            trimmed.toLowerCase().includes(task.title.toLowerCase())) {
          taskLineIndex = i;
          currentTaskLine = line;
          break;
        }
      }
      
      if (taskLineIndex === -1) {
        console.log(`${chalk.yellow('⚠️ Could not find task in file')}`);
        return false;
      }
      
      let newTaskLine = currentTaskLine;
      
      switch (editType) {
        case 'title':
          newTaskLine = await this.editTaskTitle(currentTaskLine, task.title);
          break;
        case 'priority':
          newTaskLine = await this.editTaskPriority(currentTaskLine);
          break;
        case 'dueDate':
          newTaskLine = await this.editTaskDueDate(currentTaskLine);
          break;
        case 'tags':
          newTaskLine = await this.editTaskTags(currentTaskLine);
          break;
        case 'move':
          return await this.moveTaskToTracker(task, currentTaskLine, taskLineIndex, lines, trackerPath);
        case 'close':
          return await this.closeTask(task, currentTaskLine, taskLineIndex, lines, trackerPath);
        case 'delete':
          return await this.deleteTask(task, currentTaskLine, taskLineIndex, lines, trackerPath);
        case 'viewFull':
          console.log(`\n${chalk.bold('Full task line:')}`);
          console.log(`${chalk.gray(currentTaskLine)}`);
          console.log(`\n${chalk.yellow('💡 To manually edit:')}`);
          console.log(`1. Open: ${chalk.cyan(trackerPath)}`);
          console.log(`2. Find line: ${task.title}`);
          console.log(`3. Make your changes and save`);
          return true;
        default:
          return false;
      }
      
      if (newTaskLine === currentTaskLine) {
        console.log(`${chalk.gray('No changes made')}`);
        return true;
      }
      
      // Update the file
      lines[taskLineIndex] = newTaskLine;
      await fs.writeFile(trackerPath, lines.join('\n'));
      
      console.log(`\n${chalk.green('✅ Updated task line:')}`);
      console.log(`${chalk.gray('Old:')} ${currentTaskLine.trim()}`);
      console.log(`${chalk.green('New:')} ${newTaskLine.trim()}`);
      
      return true;
      
    } catch (error) {
      console.error('Error editing task:', error);
      return false;
    }
  }
  
  private async editTaskTitle(currentLine: string, currentTitle: string): Promise<string> {
    const response = await inquirer.prompt([
      {
        type: 'input',
        name: 'newTitle',
        message: 'Enter new title:',
        default: currentTitle
      }
    ]);
    
    if (response.newTitle.trim() === currentTitle) {
      return currentLine;
    }
    
    // Replace the title portion while preserving tags and formatting
    return currentLine.replace(currentTitle, response.newTitle.trim());
  }
  
  private async editTaskPriority(currentLine: string): Promise<string> {
    const priorityResponse = await inquirer.prompt([
      {
        type: 'list',
        name: 'priority',
        message: 'Select priority:',
        choices: [
          { name: '🔴 High (⏫)', value: '⏫' },
          { name: '🟡 Medium (🔼)', value: '🔼' },
          { name: '🟢 Low (🔽)', value: '🔽' },
          { name: '❌ Remove priority', value: 'remove' }
        ]
      }
    ]);
    
    let newLine = currentLine;
    
    // Remove existing priority indicators
    newLine = newLine.replace(/[⏫🔼🔽]/g, '').replace(/\s+/g, ' ');
    
    if (priorityResponse.priority !== 'remove') {
      // Add new priority before any existing tags
      const tagIndex = newLine.search(/#\w+|📅|@\w+/);
      if (tagIndex !== -1) {
        newLine = newLine.slice(0, tagIndex) + priorityResponse.priority + ' ' + newLine.slice(tagIndex);
      } else {
        newLine = newLine + ' ' + priorityResponse.priority;
      }
    }
    
    return newLine;
  }
  
  private async editTaskDueDate(currentLine: string): Promise<string> {
    const dateResponse = await inquirer.prompt([
      {
        type: 'list',
        name: 'dateOption',
        message: 'Due date option:',
        choices: [
          { name: '📅 Set custom date', value: 'custom' },
          { name: '📅 Today', value: 'today' },
          { name: '📅 Tomorrow', value: 'tomorrow' },
          { name: '📅 Next week', value: 'nextweek' },
          { name: '❌ Remove due date', value: 'remove' }
        ]
      }
    ]);
    
    let newDate = '';
    
    switch (dateResponse.dateOption) {
      case 'custom':
        const customResponse = await inquirer.prompt([
          {
            type: 'input',
            name: 'customDate',
            message: 'Enter date (YYYY-MM-DD):',
            validate: (input) => {
              const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
              return dateRegex.test(input) || 'Please use YYYY-MM-DD format';
            }
          }
        ]);
        newDate = customResponse.customDate;
        break;
      case 'today':
        newDate = new Date().toISOString().split('T')[0];
        break;
      case 'tomorrow':
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        newDate = tomorrow.toISOString().split('T')[0];
        break;
      case 'nextweek':
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        newDate = nextWeek.toISOString().split('T')[0];
        break;
      case 'remove':
        return currentLine.replace(/📅 \d{4}-\d{2}-\d{2}/g, '').replace(/\s+/g, ' ');
    }
    
    let newLine = currentLine;
    
    // Remove existing due date
    newLine = newLine.replace(/📅 \d{4}-\d{2}-\d{2}/g, '');
    
    // Add new due date at the end
    if (newDate) {
      newLine = newLine.trim() + ` 📅 ${newDate}`;
    }
    
    return newLine;
  }
  
  private async editTaskTags(currentLine: string): Promise<string> {
    // Extract current tags
    const currentTags = currentLine.match(/#\w+/g) || [];
    const currentTagsStr = currentTags.join(' ');
    
    console.log(`\n${chalk.bold('Current tags:')} ${currentTagsStr || 'none'}`);
    
    const tagResponse = await inquirer.prompt([
      {
        type: 'input',
        name: 'tags',
        message: 'Enter tags (space-separated, use # prefix):',
        default: currentTagsStr
      }
    ]);
    
    let newLine = currentLine;
    
    // Remove all current tags
    newLine = newLine.replace(/#\w+/g, '').replace(/\s+/g, ' ');
    
    // Add new tags
    if (tagResponse.tags.trim()) {
      const tags = tagResponse.tags.trim();
      newLine = newLine.trim() + ' ' + tags;
    }
    
    return newLine;
  }
  
  private async moveTaskToTracker(task: any, currentTaskLine: string, taskLineIndex: number, sourceLines: string[], sourceTrackerPath: string): Promise<boolean> {
    try {
      console.log(`\n${chalk.bold('Moving task to different tracker...')}`);
      
      // Get available trackers
      const crossrefEntries = this.trackerManager!.getCrossrefEntries();
      const availableTrackers = crossrefEntries
        .filter(entry => entry.active && entry.tag !== task.tracker)
        .sort((a, b) => a.tag.localeCompare(b.tag));
      
      if (availableTrackers.length === 0) {
        console.log(`${chalk.yellow('⚠️ No other trackers available')}`);
        return false;
      }
      
      // Create choices with context information
      const choices = availableTrackers.map(entry => {
        const contextEmoji = this.getContextEmoji(entry.contextType || 'system');
        const tracker = this.trackerManager!.getTracker(entry.tag);
        const friendlyName = tracker?.frontmatter?.friendlyName || entry.tag;
        
        return {
          name: `${contextEmoji} ${friendlyName} (${entry.tag})`,
          value: entry.tag,
          short: friendlyName
        };
      });
      
      choices.push({ name: 'Cancel', value: 'cancel', short: 'Cancel' });
      
      const response = await inquirer.prompt([
        {
          type: 'list',
          name: 'targetTracker',
          message: 'Move task to which tracker?',
          choices,
          pageSize: 15
        }
      ]);
      
      if (response.targetTracker === 'cancel') {
        console.log(`${chalk.gray('Cancelled move')}`);
        return false;
      }
      
      // Get target tracker info
      const targetEntry = crossrefEntries.find(e => e.tag === response.targetTracker);
      if (!targetEntry) {
        console.log(`${chalk.red('❌ Target tracker not found')}`);
        return false;
      }
      
      // Prepare the task line for the new tracker
      let movedTaskLine = currentTaskLine;
      
      // Update the main tag to match the new tracker
      const oldMainTag = `#${task.tracker}`;
      const newMainTag = `#${response.targetTracker}`;
      
      if (movedTaskLine.includes(oldMainTag)) {
        movedTaskLine = movedTaskLine.replace(oldMainTag, newMainTag);
      } else {
        // If no main tag exists, add it
        const tagInsertIndex = movedTaskLine.search(/@\w+|📅|\u23eb|🔼|🔽/);
        if (tagInsertIndex !== -1) {
          movedTaskLine = movedTaskLine.slice(0, tagInsertIndex) + newMainTag + ' ' + movedTaskLine.slice(tagInsertIndex);
        } else {
          movedTaskLine = movedTaskLine + ' ' + newMainTag;
        }
      }
      
      // Confirm the move
      const targetTracker = this.trackerManager!.getTracker(response.targetTracker);
      const targetFriendlyName = targetTracker?.frontmatter?.friendlyName || response.targetTracker;
      
      console.log(`\n${chalk.bold('Move Summary:')}`);
      console.log(`${chalk.gray('From:')} ${task.trackerFriendlyName} (${task.tracker})`);
      console.log(`${chalk.green('To:')} ${targetFriendlyName} (${response.targetTracker})`);
      console.log(`${chalk.gray('Task:')} ${task.title}`);
      console.log(`${chalk.gray('Updated line:')} ${movedTaskLine.trim()}`);
      
      const confirmResponse = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Proceed with move?',
          default: true
        }
      ]);
      
      if (!confirmResponse.confirm) {
        console.log(`${chalk.gray('Move cancelled')}`);
        return false;
      }
      
      // Step 1: Remove task from source tracker
      sourceLines.splice(taskLineIndex, 1);
      await fs.writeFile(sourceTrackerPath, sourceLines.join('\n'));
      
      // Step 2: Add task to target tracker
      const success = await this.trackerManager!.appendToTracker(response.targetTracker, movedTaskLine.trim());
      
      if (success) {
        console.log(`\n${chalk.green('✅ Task moved successfully!')}`);
        console.log(`${chalk.cyan(task.title)}`);
        console.log(`${chalk.gray('From:')} ${task.trackerFriendlyName}`);
        console.log(`${chalk.green('To:')} ${targetFriendlyName}`);
        console.log(`\n${chalk.gray('The task has been removed from')} ${chalk.cyan(task.trackerFriendlyName)}`);
        console.log(`${chalk.gray('and added to')} ${chalk.green(targetFriendlyName)}`);
        return true;
      } else {
        console.log(`${chalk.red('❌ Failed to add task to target tracker')}`);
        // Try to restore the task to original location
        sourceLines.splice(taskLineIndex, 0, currentTaskLine);
        await fs.writeFile(sourceTrackerPath, sourceLines.join('\n'));
        console.log(`${chalk.yellow('⚠️ Task restored to original location')}`);
        return false;
      }
      
    } catch (error) {
      console.error('Error moving task:', error);
      return false;
    }
  }
  
  private async closeTask(task: any, currentTaskLine: string, taskLineIndex: number, lines: string[], trackerPath: string): Promise<boolean> {
    try {
      console.log(`\n${chalk.bold('✅ Closing task (marking as completed)...')}`);
      console.log(`${chalk.cyan(task.title)}`);
      
      const confirmResponse = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Mark this task as completed?',
          default: true
        }
      ]);
      
      if (!confirmResponse.confirm) {
        console.log(`${chalk.gray('Close cancelled')}`);
        return false;
      }
      
      // Replace [ ] with [x] and add completion date
      const completedLine = currentTaskLine.replace('- [ ]', '- [x]');
      const today = new Date().toISOString().split('T')[0];
      
      // Add completion date if not already present
      let finalLine = completedLine;
      if (!completedLine.includes('✅')) {
        finalLine = completedLine + ` ✅ ${today}`;
      }
      
      // Update the file
      lines[taskLineIndex] = finalLine;
      await fs.writeFile(trackerPath, lines.join('\n'));
      
      console.log(`\n${chalk.green('✅ Task completed successfully!')}`);
      console.log(`${chalk.cyan(task.title)}`);
      console.log(`${chalk.gray('Completed:')} ${today}`);
      console.log(`${chalk.gray('In tracker:')} ${task.trackerFriendlyName}`);
      
      return true;
      
    } catch (error) {
      console.error('Error closing task:', error);
      return false;
    }
  }
  
  private async deleteTask(task: any, currentTaskLine: string, taskLineIndex: number, lines: string[], trackerPath: string): Promise<boolean> {
    try {
      console.log(`\n${chalk.bold.red('🗑️ Deleting task permanently...')}`);
      console.log(`${chalk.cyan(task.title)}`);
      console.log(`${chalk.gray('From:')} ${task.trackerFriendlyName}`);
      console.log(`${chalk.yellow('⚠️ This action cannot be undone!')}`);
      
      const confirmResponse = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to delete this task permanently?',
          default: false
        }
      ]);
      
      if (!confirmResponse.confirm) {
        console.log(`${chalk.gray('Delete cancelled')}`);
        return false;
      }
      
      // Double confirmation for safety
      const doubleConfirmResponse = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Really delete? This will permanently remove the task from your tracker.',
          default: false
        }
      ]);
      
      if (!doubleConfirmResponse.confirm) {
        console.log(`${chalk.gray('Delete cancelled')}`);
        return false;
      }
      
      // Remove the line from the file
      lines.splice(taskLineIndex, 1);
      await fs.writeFile(trackerPath, lines.join('\n'));
      
      console.log(`\n${chalk.red('🗑️ Task deleted permanently!')}`);
      console.log(`${chalk.gray('Deleted:')} ${task.title}`);
      console.log(`${chalk.gray('From:')} ${task.trackerFriendlyName}`);
      console.log(`${chalk.yellow('💡 The task has been removed from your tracker file.')}`);
      
      return true;
      
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
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
        
      case 'edit':
      case 'change':
        const editQuery = args.slice(1).join(' ');
        await this.edit(editQuery || undefined);
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
        console.log('  edit|change ["task"] - Edit a task (title, priority, due date, tags)');
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
        console.log('  npm run cli edit "call client"');
        console.log('  npm run cli change "call client"');
        console.log('  npm run cli change              # Shows task picker');
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