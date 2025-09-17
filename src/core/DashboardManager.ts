/**
 * DashboardManager - ADHD-friendly "What's Next" analysis
 * 
 * Analyzes all trackers and provides clear, actionable recommendations
 * to eliminate analysis paralysis and decision fatigue.
 */

import { ChurnConfig, Priority, ItemType, ContextType } from '../types/churn.js';
import { TrackerManager } from './TrackerManager.js';
import { ReviewManager } from './ReviewManager.js';
import chalk from 'chalk';

export interface DashboardItem {
  id: string;
  title: string;
  tracker: string;
  trackerFriendlyName: string;
  context: ContextType;
  priority: Priority;
  type: ItemType;
  dueDate?: string;
  estimatedMinutes?: number;
  urgencyScore: number; // 0-100, higher = more urgent
  impactScore: number;   // 0-100, higher = more impact
  confidenceScore?: number; // for review items
  reviewItemCount?: number; // for review chunks
}

export interface DashboardRecommendation {
  category: 'urgent' | 'high-impact' | 'quick-win' | 'review-chunk';
  categoryTitle: string;
  categoryEmoji: string;
  item: DashboardItem;
  reason: string;
  estimatedTime: string;
}

export interface DashboardSummary {
  totalActionItems: number;
  overdueTasks: number;
  dueTodayTasks: number;
  reviewItemCount: number;
  trackerBreakdown: { [context: string]: number };
  lastUpdated: string;
}

export class DashboardManager {
  private trackerManager: TrackerManager;
  private reviewManager?: ReviewManager;
  private config: ChurnConfig;

  constructor(config: ChurnConfig, trackerManager: TrackerManager, reviewManager?: ReviewManager) {
    this.config = config;
    this.trackerManager = trackerManager;
    this.reviewManager = reviewManager;
  }

  /**
   * Get the top 4 recommendations for what to work on next
   * Designed to eliminate analysis paralysis with clear, prioritized options
   */
  async getWhatsNext(): Promise<DashboardRecommendation[]> {
    const allItems = await this.getAllActionableItems();
    const recommendations: DashboardRecommendation[] = [];

    // 1. Most Urgent (overdue or due today)
    const urgent = this.getMostUrgentItem(allItems);
    if (urgent) {
      recommendations.push({
        category: 'urgent',
        categoryTitle: 'Most Urgent',
        categoryEmoji: '🚨',
        item: urgent,
        reason: urgent.dueDate ? 
          (this.isOverdue(urgent.dueDate) ? 'Overdue task' : 'Due today') : 
          'High priority action',
        estimatedTime: this.formatEstimatedTime(urgent.estimatedMinutes)
      });
    }

    // 2. High Impact (business/project items with high priority)
    const highImpact = this.getHighestImpactItem(allItems.filter(item => item.id !== urgent?.id));
    if (highImpact) {
      recommendations.push({
        category: 'high-impact',
        categoryTitle: 'High Impact',
        categoryEmoji: '📈',
        item: highImpact,
        reason: `${highImpact.context} priority with high impact`,
        estimatedTime: this.formatEstimatedTime(highImpact.estimatedMinutes)
      });
    }

    // 3. Quick Win (low effort, reasonable impact)
    const quickWin = this.getBestQuickWin(allItems.filter(item => 
      item.id !== urgent?.id && item.id !== highImpact?.id
    ));
    if (quickWin) {
      recommendations.push({
        category: 'quick-win',
        categoryTitle: 'Quick Win',
        categoryEmoji: '⚡',
        item: quickWin,
        reason: `Quick task to build momentum`,
        estimatedTime: this.formatEstimatedTime(quickWin.estimatedMinutes)
      });
    }

    // 4. Review Chunk (if items need review)
    const reviewChunk = await this.getReviewChunk();
    if (reviewChunk) {
      recommendations.push({
        category: 'review-chunk',
        categoryTitle: 'Review Chunk',
        categoryEmoji: '🔍',
        item: reviewChunk,
        reason: `${reviewChunk.reviewItemCount} items need review`,
        estimatedTime: '5-10 minutes'
      });
    }

    return recommendations;
  }

  /**
   * Get comprehensive dashboard summary
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    const allItems = await this.getAllActionableItems();
    const reviewStatus = this.reviewManager?.getReviewStatus();
    
    const trackerBreakdown: { [context: string]: number } = {};
    let overdueTasks = 0;
    let dueTodayTasks = 0;

    for (const item of allItems) {
      trackerBreakdown[item.context] = (trackerBreakdown[item.context] || 0) + 1;
      
      if (item.dueDate) {
        if (this.isOverdue(item.dueDate)) {
          overdueTasks++;
        } else if (this.isDueToday(item.dueDate)) {
          dueTodayTasks++;
        }
      }
    }

    return {
      totalActionItems: allItems.length,
      overdueTasks,
      dueTodayTasks,
      reviewItemCount: reviewStatus?.pending || 0,
      trackerBreakdown,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
  }

  /**
   * Parse all trackers and extract actionable items
   */
  private async getAllActionableItems(): Promise<DashboardItem[]> {
    const trackers = this.trackerManager.getTrackersByContext();
    const items: DashboardItem[] = [];

    for (const tracker of trackers) {
      const trackerItems = this.parseTrackerForActionItems(tracker);
      items.push(...trackerItems);
    }

    return items;
  }

  /**
   * Parse a single tracker for action items
   */
  private parseTrackerForActionItems(tracker: any): DashboardItem[] {
    const items: DashboardItem[] = [];
    const lines = tracker.content.split('\n');
    
    let currentSection = '';
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Track sections
      if (trimmed.startsWith('##')) {
        currentSection = trimmed.replace('##', '').trim();
        continue;
      }

      // Skip non-action items - look for open checkboxes
      if (!trimmed.startsWith('- [ ]')) {
        continue;
      }

      // Parse action item
      const item = this.parseActionItem(trimmed, tracker, currentSection);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Parse individual action item line - supports both ChurnFlow and Obsidian Tasks formats
   */
  private parseActionItem(line: string, tracker: any, section: string): DashboardItem | null {
    try {
      // Start with the full line after checkbox
      let workingLine = line.replace('- [ ]', '').trim();
      if (!workingLine) return null;

      // Extract title (everything before hashtags, emojis, and dates)
      let title = workingLine;
      
      // Remove common task prefixes
      title = title.replace(/^#task\s*/, '');
      title = title.replace(/^REVIEW NEEDED\s*\[\d{4}-\d{2}-\d{2}\]:\s*/, '');
      
      // Extract priority from Obsidian tags (@urgent, @high) or emojis
      const priority = this.extractPriorityFromObsidian(line);
      
      // Extract due date from Obsidian format (📅 YYYY-MM-DD) or ChurnFlow format
      const dueDate = this.extractDueDateFromObsidian(line);
      
      // Clean title of all metadata (hashtags, emojis, dates, obsidian tags)
      title = this.cleanTitle(title);
      
      if (!title || title.length < 3) return null;
      
      // Calculate scores
      const urgencyScore = this.calculateUrgencyScore(priority, dueDate);
      const impactScore = this.calculateImpactScore(tracker.frontmatter.contextType, priority);
      const estimatedMinutes = this.estimateMinutes(title, priority);

      return {
        id: `${tracker.frontmatter.tag}-${title.substring(0, 20).replace(/\s+/g, '-').toLowerCase()}`,
        title: title,
        tracker: tracker.frontmatter.tag,
        trackerFriendlyName: tracker.frontmatter.friendlyName || tracker.frontmatter.tag,
        context: tracker.frontmatter.contextType || 'personal',
        priority,
        type: 'action',
        dueDate,
        estimatedMinutes,
        urgencyScore,
        impactScore
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract priority from Obsidian Tasks format and ChurnFlow emojis
   */
  private extractPriorityFromObsidian(line: string): Priority {
    // Obsidian Tasks priority tags
    if (line.includes('@urgent') || line.includes('@high')) return 'high';
    if (line.includes('@medium')) return 'medium';
    if (line.includes('@low')) return 'low';
    
    // ChurnFlow emojis
    if (line.includes('🚨')) return 'high'; // 🚨
    if (line.includes('⏫')) return 'high';   // ⏫
    if (line.includes('🔼')) return 'medium'; // 🔼
    if (line.includes('🔻')) return 'low';    // 🔻
    
    // Default based on content keywords
    if (/urgent|asap|emergency|critical/i.test(line)) return 'high';
    if (line.includes('@waiting') || line.includes('@someday') || line.includes('@maybe')) return 'low';
    
    return 'medium';
  }
  
  /**
   * Extract priority from line based on emojis (legacy method)
   */
  private extractPriority(line: string): Priority {
    return this.extractPriorityFromObsidian(line);
  }

  /**
   * Extract due date from Obsidian Tasks and ChurnFlow formats
   */
  private extractDueDateFromObsidian(line: string): string | undefined {
    // Obsidian Tasks format: 📅 YYYY-MM-DD or ⏳ YYYY-MM-DD
    const obsidianDateMatch = line.match(/[📅⏳]\s*(\d{4}-\d{2}-\d{2})/);
    if (obsidianDateMatch) return obsidianDateMatch[1];
    
    // ChurnFlow format: just YYYY-MM-DD
    const dateMatch = line.match(/\d{4}-\d{2}-\d{2}/);
    return dateMatch ? dateMatch[0] : undefined;
  }
  
  /**
   * Extract due date from line (legacy method)
   */
  private extractDueDate(line: string): string | undefined {
    return this.extractDueDateFromObsidian(line);
  }
  
  /**
   * Clean title by removing all metadata, tags, emojis, and dates
   */
  private cleanTitle(title: string): string {
    // Remove hashtags (#task, #gsc-ai, etc.)
    title = title.replace(/#[\w-]+/g, '');
    
    // Remove Obsidian task tags (@next, @waiting, @urgent, etc.)
    title = title.replace(/@[\w-]+/g, '');
    
    // Remove emojis (priority, date, and other emojis)
    title = title.replace(/[🚨⏫🔼🔻📅⏳🆔]/g, '');
    
    // Remove dates (YYYY-MM-DD format)
    title = title.replace(/\d{4}-\d{2}-\d{2}/g, '');
    
    // Remove task IDs (🆔 xxxxxx)
    title = title.replace(/🆔\s*\w+/g, '');
    
    // Remove dependency markers (⛔ xxxxxx)
    title = title.replace(/⛔\s*\w+/g, '');
    
    // Clean up multiple spaces and trim
    title = title.replace(/\s+/g, ' ').trim();
    
    return title;
  }

  /**
   * Calculate urgency score (0-100)
   */
  private calculateUrgencyScore(priority: Priority, dueDate?: string): number {
    let score = 0;
    
    // Base priority score
    switch (priority) {
      case 'high': score += 60; break;
      case 'medium': score += 40; break;
      case 'low': score += 20; break;
    }
    
    // Due date urgency
    if (dueDate) {
      const today = new Date();
      const due = new Date(dueDate);
      const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
      
      if (daysUntilDue < 0) score += 40; // Overdue
      else if (daysUntilDue === 0) score += 30; // Due today
      else if (daysUntilDue === 1) score += 20; // Due tomorrow
      else if (daysUntilDue <= 3) score += 10; // Due this week
    }
    
    return Math.min(100, score);
  }

  /**
   * Calculate impact score (0-100)
   */
  private calculateImpactScore(context: ContextType, priority: Priority): number {
    let score = 0;
    
    // Context impact
    switch (context) {
      case 'business': score += 50; break;
      case 'project': score += 40; break;
      case 'system': score += 30; break;
      case 'personal': score += 20; break;
    }
    
    // Priority multiplier
    switch (priority) {
      case 'high': score *= 1.5; break;
      case 'medium': score *= 1.0; break;
      case 'low': score *= 0.7; break;
    }
    
    return Math.min(100, Math.round(score));
  }

  /**
   * Estimate minutes needed for a task
   */
  private estimateMinutes(title: string, priority: Priority): number {
    const fullTitle = title.toLowerCase();
    
    // @waiting tasks are 0 minutes (can't work on them now)
    if (fullTitle.includes('@waiting')) return 0;
    
    const titleLength = title.length;
    const hasComplexWords = /review|analyze|design|implement|research|plan|organize|create detailed/.test(fullTitle);
    const isSimple = /call|email|update|check|send|contact|ask/.test(fullTitle);
    const isQuick = /fix|clean|put away|register/.test(fullTitle);
    
    let baseMinutes = 30; // Default estimate
    
    if (isQuick) baseMinutes = 10;
    else if (isSimple) baseMinutes = 15;
    else if (hasComplexWords) baseMinutes = 60;
    else if (titleLength > 80) baseMinutes = 60;
    else if (titleLength > 50) baseMinutes = 45;
    
    // Adjust for priority
    if (priority === 'high' && baseMinutes < 30) baseMinutes = 30;
    
    return baseMinutes;
  }

  /**
   * Get the most urgent item
   */
  private getMostUrgentItem(items: DashboardItem[]): DashboardItem | null {
    if (items.length === 0) return null;
    return items.reduce((most, current) => 
      current.urgencyScore > most.urgencyScore ? current : most
    );
  }

  /**
   * Get the highest impact item
   */
  private getHighestImpactItem(items: DashboardItem[]): DashboardItem | null {
    if (items.length === 0) return null;
    return items.reduce((highest, current) => 
      current.impactScore > highest.impactScore ? current : highest
    );
  }

  /**
   * Get the best quick win (low time, decent impact)
   */
  private getBestQuickWin(items: DashboardItem[]): DashboardItem | null {
    // Filter out @waiting tasks (0 minutes = can't work on them)
    const workableItems = items.filter(item => (item.estimatedMinutes || 30) > 0);
    
    if (workableItems.length === 0) return null;
    
    const quickWins = workableItems.filter(item => 
      (item.estimatedMinutes || 30) <= 15 && item.impactScore >= 30
    );
    
    if (quickWins.length === 0) {
      // Fallback to shortest workable task
      return workableItems.reduce((shortest, current) => 
        (current.estimatedMinutes || 30) < (shortest.estimatedMinutes || 30) ? current : shortest
      , workableItems[0]) || null;
    }
    
    return quickWins.reduce((best, current) => 
      current.impactScore > best.impactScore ? current : best
    );
  }

  /**
   * Get review chunk if items need review
   */
  private async getReviewChunk(): Promise<DashboardItem | null> {
    if (!this.reviewManager) return null;
    
    const reviewStatus = this.reviewManager.getReviewStatus();
    if (reviewStatus.pending === 0 && reviewStatus.flagged === 0) return null;
    
    const reviewCount = reviewStatus.pending + reviewStatus.flagged;
    const chunkSize = Math.min(reviewCount, 5);
    
    return {
      id: 'review-chunk',
      title: `Review ${chunkSize} captured items`,
      tracker: 'review',
      trackerFriendlyName: 'Review System',
      context: 'system',
      priority: reviewCount > 10 ? 'high' : 'medium',
      type: 'review',
      estimatedMinutes: chunkSize * 2, // 2 minutes per item
      urgencyScore: reviewCount > 10 ? 70 : 40,
      impactScore: 60, // High impact to maintain system health
      reviewItemCount: chunkSize
    };
  }

  /**
   * Utility functions
   */
  private isOverdue(dueDate: string): boolean {
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  }

  private isDueToday(dueDate: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return dueDate === today;
  }

  private formatEstimatedTime(minutes?: number): string {
    if (!minutes) return '~30 min';
    if (minutes <= 15) return `~${minutes} min`;
    if (minutes <= 60) return `~${minutes} min`;
    return `~${Math.round(minutes / 60)} hr`;
  }
}