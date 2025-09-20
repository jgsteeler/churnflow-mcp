import {
  ItemType,
  Priority,
  FormattingOptions,
  FORMATTING_CONSTANTS,
  VALIDATION_PATTERNS,
} from "../types/churn.js";

/**
 * v0.2.2 Formatting Utilities
 *
 * Centralizes all formatting logic for consistent entry generation
 * across the ChurnFlow system. Focuses on ChurnFlow-managed formatting
 * while preserving compatibility with existing Obsidian workflows.
 */
export class FormattingUtils {
  /**
   * Format a date to ISO standard (YYYY-MM-DD)
   */
  static formatDate(date: Date = new Date()): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Format a timestamp to standard format (YYYY-MM-DD HH:mm)
   */
  static formatTimestamp(date: Date = new Date()): string {
    const isoString = date.toISOString();
    const datePart = isoString.split("T")[0];
    const timePart = isoString.split("T")[1].substring(0, 5);
    return `${datePart} ${timePart}`;
  }

  /**
   * Get priority indicator emoji
   */
  static getPriorityIndicator(priority: Priority): string {
    return FORMATTING_CONSTANTS.PRIORITY_INDICATORS[priority];
  }

  /**
   * Format an action item entry with consistent structure
   */
  static formatActionItem(options: {
    description: string;
    tag: string;
    priority?: Priority;
    dueDate?: Date;
    completed?: boolean;
    completionDate?: Date;
  }): string {
    const {
      description,
      tag,
      priority,
      dueDate,
      completed = false,
      completionDate,
    } = options;

    let entry = completed
      ? FORMATTING_CONSTANTS.ENTRY_PREFIXES.completed
      : FORMATTING_CONSTANTS.ENTRY_PREFIXES.action;

    // Add description
    entry += ` ${description}`;

    // Add tag
    entry += ` #${tag}`;

    // Add priority if specified
    if (priority) {
      entry += ` ${this.getPriorityIndicator(priority)}`;
    }

    // Add due date if specified and not completed
    if (dueDate && !completed) {
      entry += ` 📅 ${this.formatDate(dueDate)}`;
    }

    // Add completion date if completed
    if (completed && completionDate) {
      entry += ` ✅ ${this.formatDate(completionDate)}`;
    }

    return entry;
  }

  /**
   * Format an activity log entry with consistent timestamp
   */
  static formatActivity(
    description: string,
    timestamp: Date = new Date(),
  ): string {
    return `${FORMATTING_CONSTANTS.ENTRY_PREFIXES.activity} [${this.formatTimestamp(timestamp)}] ${description}`;
  }

  /**
   * Format a reference entry
   */
  static formatReference(
    title: string,
    description: string,
    date: Date = new Date(),
  ): string {
    return `- **${title}**: ${description} [${this.formatDate(date)}]`;
  }

  /**
   * Format a someday/maybe entry
   */
  static formatSomedayItem(
    description: string,
    tag: string,
    captureDate: Date = new Date(),
  ): string {
    return `- [ ] #someday [${this.formatDate(captureDate)}] ${description} #${tag}`;
  }

  /**
   * Format a review item entry
   */
  static formatReviewItem(
    description: string,
    confidence: number = 0,
    date: Date = new Date(),
  ): string {
    const confidencePercent = Math.round(confidence * 100);
    return `- [ ] #review [${this.formatDate(date)}] ${description} (confidence: ${confidencePercent}%)`;
  }

  /**
   * Generate a formatted entry based on item type
   */
  static formatEntry(
    itemType: ItemType,
    description: string,
    options: FormattingOptions & {
      tag?: string;
      priority?: Priority;
      dueDate?: Date;
      confidence?: number;
      title?: string;
    } = {},
  ): string {
    const {
      tag = "general",
      priority,
      dueDate,
      confidence,
      title,
      includeTimestamp = false,
      includePriority = false,
      includeDueDate = false,
    } = options;

    switch (itemType) {
      case "action":
        return this.formatActionItem({
          description,
          tag,
          priority: includePriority ? priority : undefined,
          dueDate: includeDueDate ? dueDate : undefined,
        });

      case "activity":
        return this.formatActivity(
          description,
          includeTimestamp ? new Date() : new Date(),
        );

      case "reference":
        return this.formatReference(title || "Reference", description);

      case "someday":
        return this.formatSomedayItem(description, tag);

      case "review":
        return this.formatReviewItem(description, confidence);

      default:
        // Fallback to basic format
        return `- ${description}`;
    }
  }

  /**
   * Validate if a date string matches our ISO format
   */
  static validateDateFormat(dateStr: string): boolean {
    return VALIDATION_PATTERNS.isoDate.test(dateStr);
  }

  /**
   * Validate if a timestamp string matches our format
   */
  static validateTimestampFormat(timestampStr: string): boolean {
    return VALIDATION_PATTERNS.timestamp.test(timestampStr);
  }

  /**
   * Validate if a hashtag matches our format
   */
  static validateHashtag(tag: string): boolean {
    return VALIDATION_PATTERNS.hashtag.test(tag);
  }

  /**
   * Validate if a context tag matches our format
   */
  static validateContextTag(tag: string): boolean {
    return VALIDATION_PATTERNS.contextTag.test(tag);
  }

  /**
   * Extract and validate tags from entry text
   */
  static extractTags(text: string): {
    hashtags: string[];
    contextTags: string[];
  } {
    // Extract potential tags, then validate them
    const hashtagMatches = text.match(/#[\w-]+/g) || [];
    const contextTagMatches = text.match(/@[\w-]+/g) || [];

    // Only include tags that are followed by word boundary (space, punctuation, end of string)
    const hashtags = hashtagMatches.filter((tag) => {
      const tagIndex = text.indexOf(tag);
      const nextCharIndex = tagIndex + tag.length;
      const nextChar = nextCharIndex < text.length ? text[nextCharIndex] : " ";
      // Tag is valid if followed by non-word character or end of string
      return /\W|$/.test(nextChar) && this.validateHashtag(tag);
    });

    const contextTags = contextTagMatches.filter((tag) => {
      const tagIndex = text.indexOf(tag);
      const nextCharIndex = tagIndex + tag.length;
      const nextChar = nextCharIndex < text.length ? text[nextCharIndex] : " ";
      return /\W|$/.test(nextChar) && this.validateContextTag(tag);
    });

    return { hashtags, contextTags };
  }

  /**
   * Clean and standardize an entry to our formatting rules
   * Preserves existing Obsidian IDs and dependencies
   */
  static standardizeEntry(entry: string, itemType: ItemType): string {
    // Basic cleanup - normalize whitespace
    let cleaned = entry.trim().replace(/\s+/g, " ");

    // Ensure proper checkbox format for tasks
    if (itemType === "action" && !cleaned.includes("- [")) {
      if (cleaned.startsWith("- ")) {
        cleaned = cleaned.replace("- ", "- [ ] ");
      }
    }

    // Ensure #task prefix for action items
    if (itemType === "action" && !cleaned.includes("#task")) {
      cleaned = cleaned.replace("- [ ] ", "- [ ] #task ");
    }

    // Preserve existing formatting while ensuring consistency
    return cleaned;
  }

  /**
   * Generate section headers with consistent formatting
   */
  static getSectionHeader(
    sectionType: keyof typeof FORMATTING_CONSTANTS.SECTION_HEADERS,
  ): string {
    return FORMATTING_CONSTANTS.SECTION_HEADERS[sectionType];
  }

  /**
   * Check if entry has proper formatting for its type
   */
  static validateEntryFormat(
    entry: string,
    expectedType: ItemType,
  ): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    let isValid = true;

    // Check basic structure
    if (!entry.trim().startsWith("-")) {
      issues.push('Entry should start with "-"');
      isValid = false;
    }

    // Type-specific validation
    switch (expectedType) {
      case "action":
        if (!entry.includes("[ ]") && !entry.includes("[x]")) {
          issues.push("Action item missing checkbox");
          isValid = false;
        }
        if (!entry.includes("#task")) {
          issues.push("Action item missing #task prefix");
          isValid = false;
        }
        break;

      case "activity":
        const timestampMatch = entry.match(
          /\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]/,
        );
        if (
          !timestampMatch ||
          !this.validateTimestampFormat(timestampMatch[1])
        ) {
          issues.push("Activity missing valid timestamp format");
          isValid = false;
        }
        break;

      case "someday":
        if (!entry.includes("#someday")) {
          issues.push("Someday item missing #someday tag");
          isValid = false;
        }
        break;

      case "review":
        if (!entry.includes("#review")) {
          issues.push("Review item missing #review tag");
          isValid = false;
        }
        break;
    }

    return { isValid, issues };
  }
}
