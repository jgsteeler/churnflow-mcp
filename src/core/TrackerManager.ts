import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import {
  Tracker,
  TrackerFrontmatter,
  CrossrefEntry,
  ChurnConfig,
  ItemType,
  FORMATTING_CONSTANTS,
} from "../types/churn.js";
import { FormattingUtils } from "../utils/FormattingUtils.js";

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
      const crossrefData = await fs.readFile(this.config.crossrefPath, "utf-8");
      this.crossref = JSON.parse(crossrefData);
      console.log(`Loaded ${this.crossref.length} crossref entries`);
    } catch (error) {
      console.error("Failed to load crossref:", error);
      throw new Error("Cannot initialize without crossref data");
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
        const trackerData = await fs.readFile(entry.trackerFile, "utf-8");
        const parsed = matter(trackerData);

        const tracker: Tracker = {
          frontmatter: parsed.data as TrackerFrontmatter,
          content: parsed.content,
          filePath: entry.trackerFile,
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

    return Array.from(this.trackers.values()).filter(
      (tracker) => tracker.frontmatter.contextType === contextType,
    );
  }

  /**
   * Get a specific tracker by tag
   */
  getTracker(tag: string): Tracker | undefined {
    return this.trackers.get(tag);
  }

  /**
   * Get crossref entries for external access
   */
  getCrossrefEntries(): CrossrefEntry[] {
    return this.crossref;
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
        recentActivity: this.extractRecentActivity(tracker.content),
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
    const words = content
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3 && !this.isCommonWord(word));

    return [...hashtags, ...words.slice(0, 10)]; // Top 10 significant words
  }

  /**
   * Extract recent activity items for context
   */
  private extractRecentActivity(content: string): string[] {
    const lines = content.split("\n");
    const activitySection = this.findSection(lines, "## Activity Log");

    if (activitySection) {
      return activitySection
        .filter((line) => line.trim().startsWith("-"))
        .slice(-5) // Last 5 activities
        .map((line) => line.trim());
    }

    return [];
  }

  /**
   * Find a section in tracker content
   */
  private findSection(lines: string[], sectionHeader: string): string[] | null {
    const startIndex = lines.findIndex((line) => line.trim() === sectionHeader);
    if (startIndex === -1) return null;

    const endIndex = lines.findIndex(
      (line, index) => index > startIndex && line.startsWith("##"),
    );

    return lines.slice(startIndex + 1, endIndex === -1 ? undefined : endIndex);
  }

  /**
   * Check if a word is too common to be useful for inference
   */
  private isCommonWord(word: string): boolean {
    const commonWords = [
      "the",
      "and",
      "for",
      "are",
      "but",
      "not",
      "you",
      "all",
      "can",
      "had",
      "her",
      "was",
      "one",
      "our",
      "out",
      "day",
      "get",
      "has",
      "him",
      "his",
      "how",
      "its",
      "may",
      "new",
      "now",
      "old",
      "see",
      "two",
      "who",
      "boy",
      "did",
      "man",
      "way",
      "she",
      "use",
      "your",
      "said",
      "each",
      "make",
      "most",
      "over",
      "such",
      "very",
      "what",
      "with",
      "have",
      "will",
      "this",
      "that",
      "they",
      "from",
      "been",
      "call",
      "come",
      "could",
      "down",
      "first",
      "good",
      "into",
      "just",
      "like",
      "look",
      "made",
      "many",
      "more",
      "than",
      "then",
      "them",
      "time",
      "well",
      "were",
    ];
    return commonWords.includes(word);
  }

  /**
   * Append an item to a tracker file with proper section placement and ordering
   */
  async appendToTracker(tag: string, formattedEntry: string): Promise<boolean> {
    const tracker = this.trackers.get(tag);
    if (!tracker) {
      console.error(`Tracker not found: ${tag}`);
      return false;
    }

    try {
      // Read current file content
      const currentContent = await fs.readFile(tracker.filePath, "utf-8");
      const parsed = matter(currentContent);

      // Use the new section placement logic
      const updatedLines = this.insertEntryIntoSection(
        parsed.content.split("\n"),
        "## Action Items",
        formattedEntry,
      );

      // Reconstruct the file with frontmatter
      const updatedContent = matter.stringify(
        updatedLines.join("\n"),
        parsed.data,
      );

      // Write back to file
      await fs.writeFile(tracker.filePath, updatedContent, "utf-8");

      console.log(`Successfully appended to tracker: ${tag}`);
      return true;
    } catch (error) {
      console.error(`Failed to append to tracker ${tag}:`, error);
      return false;
    }
  }

  /**
   * Append an activity item to the Activity Log section with proper placement and ordering
   */
  async appendActivityToTracker(
    tag: string,
    formattedEntry: string,
  ): Promise<boolean> {
    const tracker = this.trackers.get(tag);
    if (!tracker) {
      console.error(`Tracker not found: ${tag}`);
      return false;
    }

    try {
      // Read current file content
      const currentContent = await fs.readFile(tracker.filePath, "utf-8");
      const parsed = matter(currentContent);

      // Use the new section placement logic
      const updatedLines = this.insertEntryIntoSection(
        parsed.content.split("\n"),
        "## Activity Log",
        formattedEntry,
        true, // Sort activities by timestamp
      );

      // Reconstruct the file with frontmatter
      const updatedContent = matter.stringify(
        updatedLines.join("\n"),
        parsed.data,
      );

      // Write back to file
      await fs.writeFile(tracker.filePath, updatedContent, "utf-8");

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
    return lines.findIndex((line) => line.trim() === sectionHeader);
  }

  /**
   * v0.2.2: Insert entry into the correct section with proper placement and ordering
   */
  private insertEntryIntoSection(
    lines: string[],
    sectionHeader: string,
    newEntry: string,
    sortByDate: boolean = false,
  ): string[] {
    const sectionIndex = this.findSectionIndex(lines, sectionHeader);

    if (sectionIndex !== -1) {
      // Section exists - find where to insert the new entry
      return this.insertIntoExistingSection(
        lines,
        sectionIndex,
        newEntry,
        sortByDate,
      );
    } else {
      // Section doesn't exist - create it
      return this.createSectionAndInsert(lines, sectionHeader, newEntry);
    }
  }

  /**
   * Insert entry into existing section with proper ordering
   */
  private insertIntoExistingSection(
    lines: string[],
    sectionIndex: number,
    newEntry: string,
    sortByDate: boolean,
  ): string[] {
    // Find the end of this section (next ## header or end of file)
    let sectionEndIndex = lines.length;
    for (let i = sectionIndex + 1; i < lines.length; i++) {
      if (lines[i].startsWith("##")) {
        sectionEndIndex = i;
        break;
      }
    }

    // Extract existing entries from this section
    const existingEntries: string[] = [];
    let insertIndex = sectionIndex + 1;

    // Skip blank line after section header if it exists
    if (insertIndex < sectionEndIndex && lines[insertIndex].trim() === "") {
      insertIndex++;
    }

    // Collect existing entries
    for (let i = insertIndex; i < sectionEndIndex; i++) {
      const line = lines[i];
      if (line.trim().startsWith("-") && line.trim() !== "") {
        existingEntries.push(line);
      }
    }

    // Add new entry and sort if needed
    existingEntries.push(newEntry);
    if (sortByDate) {
      existingEntries.sort((a, b) => this.compareDateInEntries(a, b));
    }

    // Rebuild section with proper spacing
    const newLines = [...lines];

    // Remove old entries from section
    let entriesToRemove = 0;
    for (let i = insertIndex; i < sectionEndIndex; i++) {
      if (lines[i].trim().startsWith("-") || lines[i].trim() === "") {
        entriesToRemove++;
      } else {
        break;
      }
    }

    if (entriesToRemove > 0) {
      newLines.splice(insertIndex, entriesToRemove);
    }

    // Insert formatted entries
    const entriesToInsert = ["", ...existingEntries];
    newLines.splice(insertIndex, 0, ...entriesToInsert);

    return newLines;
  }

  /**
   * Create new section and insert entry
   */
  private createSectionAndInsert(
    lines: string[],
    sectionHeader: string,
    newEntry: string,
  ): string[] {
    // Determine where to place the new section based on standard order
    const sectionOrder = [
      "## Activity Log",
      "## Action Items",
      "## Review Queue",
      "## References",
      "## Someday/Maybe",
      "## Notes & Context",
    ];

    const currentSectionPriority = sectionOrder.indexOf(sectionHeader);

    // Find the best place to insert this section
    let insertIndex = lines.length;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("##")) {
        const existingSectionPriority = sectionOrder.indexOf(line);
        if (
          existingSectionPriority > currentSectionPriority ||
          existingSectionPriority === -1
        ) {
          // Insert before this section
          insertIndex = i;
          break;
        }
      }
    }

    // Create the new section with proper spacing
    const newSectionLines = [];

    // Add blank line before section if not at the beginning
    if (insertIndex > 0 && lines[insertIndex - 1].trim() !== "") {
      newSectionLines.push("");
    }

    // Add section header, blank line, and entry
    newSectionLines.push(sectionHeader, "", newEntry);

    // Add blank line after if there's content following
    if (insertIndex < lines.length && lines[insertIndex].trim() !== "") {
      newSectionLines.push("");
    }

    const newLines = [...lines];
    newLines.splice(insertIndex, 0, ...newSectionLines);

    return newLines;
  }

  /**
   * Compare two entries by their timestamps/dates for sorting (oldest first)
   */
  private compareDateInEntries(entryA: string, entryB: string): number {
    const dateA = this.extractDateFromEntry(entryA);
    const dateB = this.extractDateFromEntry(entryB);

    if (!dateA && !dateB) return 0;
    if (!dateA) return 1; // Entries without dates go to the end
    if (!dateB) return -1;

    return dateA.getTime() - dateB.getTime(); // Oldest first
  }

  /**
   * Extract date/timestamp from an entry for sorting
   */
  private extractDateFromEntry(entry: string): Date | null {
    // Look for timestamp format [YYYY-MM-DD HH:MM]
    const timestampMatch = entry.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]/);
    if (timestampMatch) {
      return new Date(timestampMatch[1]);
    }

    // Look for date format [YYYY-MM-DD]
    const dateMatch = entry.match(/\[(\d{4}-\d{2}-\d{2})\]/);
    if (dateMatch) {
      return new Date(dateMatch[1]);
    }

    // Look for due date format 📅 YYYY-MM-DD
    const dueDateMatch = entry.match(/📅 (\d{4}-\d{2}-\d{2})/);
    if (dueDateMatch) {
      return new Date(dueDateMatch[1]);
    }

    // Look for completion date ✅ YYYY-MM-DD
    const completionMatch = entry.match(/✅ (\d{4}-\d{2}-\d{2})/);
    if (completionMatch) {
      return new Date(completionMatch[1]);
    }

    return null;
  }

  /**
   * Refresh tracker data (useful after updates)
   */
  async refresh(): Promise<void> {
    await this.initialize();
  }

  /**
   * v0.2.2: Create a properly formatted entry using FormattingUtils
   */
  createFormattedEntry(
    itemType: ItemType,
    description: string,
    options: {
      tag?: string;
      priority?: "critical" | "high" | "medium" | "low";
      dueDate?: Date;
      confidence?: number;
    } = {},
  ): string {
    return FormattingUtils.formatEntry(itemType, description, options);
  }

  /**
   * v0.2.2: Append a formatted entry to a tracker with validation
   */
  async appendFormattedEntry(
    tag: string,
    itemType: ItemType,
    description: string,
    options: {
      tag?: string;
      priority?: "critical" | "high" | "medium" | "low";
      dueDate?: Date;
      confidence?: number;
    } = {},
  ): Promise<boolean> {
    // Create properly formatted entry
    const formattedEntry = this.createFormattedEntry(
      itemType,
      description,
      options,
    );

    // Validate the formatting
    const validation = FormattingUtils.validateEntryFormat(
      formattedEntry,
      itemType,
    );
    if (!validation.isValid) {
      console.warn(
        `Formatting validation failed for ${itemType}:`,
        validation.issues,
      );
      console.warn("Entry:", formattedEntry);
    }

    // Use appropriate append method based on item type
    if (itemType === "activity") {
      return await this.appendActivityToTracker(tag, formattedEntry);
    } else {
      return await this.appendToTracker(tag, formattedEntry);
    }
  }

  /**
   * v0.2.2: Validate existing entries in a tracker for formatting consistency
   */
  async validateTrackerFormatting(tag: string): Promise<{
    isValid: boolean;
    issues: Array<{ line: number; entry: string; issues: string[] }>;
    suggestions: string[];
  }> {
    const tracker = this.trackers.get(tag);
    if (!tracker) {
      return {
        isValid: false,
        issues: [{ line: 0, entry: "", issues: ["Tracker not found"] }],
        suggestions: [],
      };
    }

    const lines = tracker.content.split("\n");
    const issues: Array<{ line: number; entry: string; issues: string[] }> = [];
    const suggestions: string[] = [];

    // Check entries in different sections
    const sections = [
      { header: "## Action Items", expectedType: "action" as ItemType },
      { header: "## Activity Log", expectedType: "activity" as ItemType },
      { header: "## Review Queue", expectedType: "review" as ItemType },
      { header: "## Someday/Maybe", expectedType: "someday" as ItemType },
    ];

    for (const section of sections) {
      const sectionLines = this.findSection(lines, section.header);
      if (sectionLines) {
        sectionLines.forEach((line, index) => {
          if (line.trim().startsWith("-")) {
            const validation = FormattingUtils.validateEntryFormat(
              line,
              section.expectedType,
            );
            if (!validation.isValid) {
              const lineNumber = lines.findIndex((l) => l === line) + 1;
              issues.push({
                line: lineNumber,
                entry: line,
                issues: validation.issues,
              });
            }
          }
        });
      }
    }

    // Generate suggestions
    if (issues.length > 0) {
      suggestions.push(
        "Consider running format standardization on this tracker",
      );
      suggestions.push(
        "Use FormattingUtils.standardizeEntry() to fix formatting issues",
      );
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
    };
  }

  /**
   * v0.2.2: Get formatting statistics across all trackers
   */
  getFormattingStats(): {
    totalTrackers: number;
    trackersWithIssues: number;
    commonIssues: Record<string, number>;
  } {
    // This would scan all trackers for formatting consistency
    // For now, return basic stats structure
    return {
      totalTrackers: this.trackers.size,
      trackersWithIssues: 0, // Would be calculated by running validation
      commonIssues: {}, // Would track most frequent formatting issues
    };
  }

  /**
   * Mark a task as complete in a tracker file
   */
  async markTaskComplete(tracker: string, taskDescription: string): Promise<boolean> {
    try {
      const trackerObj = this.trackers.get(tracker);
      if (!trackerObj) {
        console.error(`Tracker not found: ${tracker}`);
        return false;
      }

      // Read the tracker file
      const content = await fs.readFile(trackerObj.filePath, 'utf-8');
      const parsed = matter(content);
      const lines = parsed.content.split('\n');

      // Find and mark the task as complete
      let found = false;
      const updatedLines = lines.map(line => {
        if (found) return line;
        
        const trimmed = line.trim();
        // Look for incomplete tasks that match the description
        if (trimmed.startsWith('- [ ]') && 
            trimmed.toLowerCase().includes(taskDescription.toLowerCase())) {
          found = true;
          // Replace [ ] with [x] and add completion date
          const completedLine = line.replace('- [ ]', '- [x]');
          const today = FormattingUtils.formatDate(new Date());
          
          // Add completion date if not already present
          if (!completedLine.includes('✅')) {
            return completedLine + ` ✅ ${today}`;
          }
          return completedLine;
        }
        return line;
      });

      if (!found) {
        console.log(`Task not found or already completed in ${tracker}: ${taskDescription}`);
        return false;
      }

      // Write the updated content back to the file
      const updatedContent = matter.stringify(updatedLines.join('\n'), parsed.data);
      await fs.writeFile(trackerObj.filePath, updatedContent, 'utf-8');
      
      console.log(`✅ Task marked as complete in ${tracker}: ${taskDescription}`);
      return true;
    } catch (error) {
      console.error(`Failed to mark task complete in ${tracker}:`, error);
      return false;
    }
  }
}
