import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { 
  Tracker, 
  TrackerFrontmatter, 
  CrossrefEntry, 
  ChurnConfig 
} from '../types/churn.js';

/**
 * Manages reading, parsing, and updating Churn system trackers
 * 
 * This is the core class that understands your existing tracker structure
 * and provides the intelligence needed for capture routing.
 */
export class TrackerManager {
  private trackers: Map<string, Tracker> = new Map();
  private crossref: CrossrefEntry[] = [];
  
  constructor(private config: ChurnConfig) {}

  /**
   * Load all trackers and crossref data from the file system
   */
  async initialize(): Promise<void> {
    await this.loadCrossref();
    await this.loadTrackers();
  }

  /**
   * Load and parse the crossref registry
   */
  private async loadCrossref(): Promise<void> {
    try {
      const crossrefData = await fs.readFile(this.config.crossrefPath, 'utf-8');
      this.crossref = JSON.parse(crossrefData);
      console.log(`Loaded ${this.crossref.length} crossref entries`);
    } catch (error) {
      console.error('Failed to load crossref:', error);
      throw new Error('Cannot initialize without crossref data');
    }
  }

  /**
   * Load and parse all tracker files
   */
  private async loadTrackers(): Promise<void> {
    this.trackers.clear();
    
    for (const entry of this.crossref) {
      if (!entry.active) continue;
      
      try {
        const trackerData = await fs.readFile(entry.trackerFile, 'utf-8');
        const parsed = matter(trackerData);
        
        const tracker: Tracker = {
          frontmatter: parsed.data as TrackerFrontmatter,
          content: parsed.content,
          filePath: entry.trackerFile
        };
        
        this.trackers.set(entry.tag, tracker);
        console.log(`Loaded tracker: ${entry.tag} (${entry.contextType})`);
      } catch (error) {
        console.warn(`Failed to load tracker ${entry.tag}:`, error);
      }
    }
    
    console.log(`Loaded ${this.trackers.size} active trackers`);
  }

  /**
   * Get all active trackers by context type
   */
  getTrackersByContext(contextType?: string): Tracker[] {
    if (!contextType) {
      return Array.from(this.trackers.values());
    }
    
    return Array.from(this.trackers.values())
      .filter(tracker => tracker.frontmatter.contextType === contextType);
  }

  /**
   * Get a specific tracker by tag
   */
  getTracker(tag: string): Tracker | undefined {
    return this.trackers.get(tag);
  }

  /**
   * Get all available context information for AI inference
   */
  getContextMap(): Record<string, any> {
    const contextMap: Record<string, any> = {};
    
    for (const [tag, tracker] of this.trackers) {
      contextMap[tag] = {
        friendlyName: tracker.frontmatter.friendlyName,
        contextType: tracker.frontmatter.contextType,
        keywords: this.extractKeywords(tracker.content),
        recentActivity: this.extractRecentActivity(tracker.content)
      };
    }
    
    return contextMap;
  }

  /**
   * Extract keywords from tracker content for inference
   */
  private extractKeywords(content: string): string[] {
    // Extract hashtags and common terms from tracker content
    const hashtags = content.match(/#[\w-]+/g) || [];
    const words = content.toLowerCase().split(/\s+/)
      .filter(word => word.length > 3 && !this.isCommonWord(word));
    
    return [...hashtags, ...words.slice(0, 10)]; // Top 10 significant words
  }

  /**
   * Extract recent activity items for context
   */
  private extractRecentActivity(content: string): string[] {
    const lines = content.split('\n');
    const activitySection = this.findSection(lines, '## Activity Log');
    
    if (activitySection) {
      return activitySection
        .filter(line => line.trim().startsWith('-'))
        .slice(-5) // Last 5 activities
        .map(line => line.trim());
    }
    
    return [];
  }

  /**
   * Find a section in tracker content
   */
  private findSection(lines: string[], sectionHeader: string): string[] | null {
    const startIndex = lines.findIndex(line => line.trim() === sectionHeader);
    if (startIndex === -1) return null;
    
    const endIndex = lines.findIndex((line, index) => 
      index > startIndex && line.startsWith('##')
    );
    
    return lines.slice(startIndex + 1, endIndex === -1 ? undefined : endIndex);
  }

  /**
   * Check if a word is too common to be useful for inference
   */
  private isCommonWord(word: string): boolean {
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'way', 'she', 'use', 'your', 'said', 'each', 'make', 'most', 'over', 'such', 'very', 'what', 'with', 'have', 'will', 'this', 'that', 'they', 'from', 'been', 'call', 'come', 'could', 'down', 'first', 'good', 'into', 'just', 'like', 'look', 'made', 'many', 'more', 'than', 'then', 'them', 'time', 'well', 'were'];
    return commonWords.includes(word);
  }

  /**
   * Append an item to a tracker file
   */
  async appendToTracker(tag: string, formattedEntry: string): Promise<boolean> {
    const tracker = this.trackers.get(tag);
    if (!tracker) {
      console.error(`Tracker not found: ${tag}`);
      return false;
    }

    try {
      // Read current file content
      const currentContent = await fs.readFile(tracker.filePath, 'utf-8');
      const parsed = matter(currentContent);
      
      // Find the appropriate section to append to
      const lines = parsed.content.split('\n');
      const actionSectionIndex = this.findSectionIndex(lines, '## Action Items');
      
      if (actionSectionIndex !== -1) {
        // Insert after the section header
        lines.splice(actionSectionIndex + 2, 0, formattedEntry);
      } else {
        // Append to end if no action items section found
        lines.push('', formattedEntry);
      }
      
      // Reconstruct the file with frontmatter
      const updatedContent = matter.stringify(lines.join('\n'), parsed.data);
      
      // Write back to file
      await fs.writeFile(tracker.filePath, updatedContent, 'utf-8');
      
      console.log(`Successfully appended to tracker: ${tag}`);
      return true;
    } catch (error) {
      console.error(`Failed to append to tracker ${tag}:`, error);
      return false;
    }
  }

  /**
   * Append an activity item to the Activity Log section
   */
  async appendActivityToTracker(tag: string, formattedEntry: string): Promise<boolean> {
    const tracker = this.trackers.get(tag);
    if (!tracker) {
      console.error(`Tracker not found: ${tag}`);
      return false;
    }

    try {
      // Read current file content
      const currentContent = await fs.readFile(tracker.filePath, 'utf-8');
      const parsed = matter(currentContent);
      
      // Find the Activity Log section to append to
      const lines = parsed.content.split('\n');
      const activitySectionIndex = this.findSectionIndex(lines, '## Activity Log');
      
      if (activitySectionIndex !== -1) {
        // Insert after the section header
        lines.splice(activitySectionIndex + 2, 0, formattedEntry);
      } else {
        // Create Activity Log section if it doesn't exist
        const actionSectionIndex = this.findSectionIndex(lines, '## Action Items');
        if (actionSectionIndex !== -1) {
          // Add Activity Log section before Action Items
          lines.splice(actionSectionIndex, 0, '## Activity Log', '', formattedEntry, '');
        } else {
          // Add at the end
          lines.push('', '## Activity Log', '', formattedEntry);
        }
      }
      
      // Reconstruct the file with frontmatter
      const updatedContent = matter.stringify(lines.join('\n'), parsed.data);
      
      // Write back to file
      await fs.writeFile(tracker.filePath, updatedContent, 'utf-8');
      
      console.log(`Successfully appended activity to tracker: ${tag}`);
      return true;
    } catch (error) {
      console.error(`Failed to append activity to tracker ${tag}:`, error);
      return false;
    }
  }

  /**
   * Find the index of a section header
   */
  private findSectionIndex(lines: string[], sectionHeader: string): number {
    return lines.findIndex(line => line.trim() === sectionHeader);
  }

  /**
   * Refresh tracker data (useful after updates)
   */
  async refresh(): Promise<void> {
    await this.initialize();
  }
}