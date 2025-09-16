/**
 * Core types for ChurnFlow ADHD-friendly productivity system
 */

export type ItemType = 'action' | 'review' | 'reference' | 'someday' | 'activity';
export type ContextType = 'business' | 'personal' | 'project' | 'system';
export type Priority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Tracker frontmatter structure from existing Churn system
 */
export interface TrackerFrontmatter {
  tag: string;
  friendlyName: string;
  collection: string;
  contextType: ContextType;
  mode: string;
  iterationType: string;
  iterationStarted: string;
  syncDefault: string;
  syncModes: string[];
  reloadCarryForwardAll: boolean;
  reloadFocusItemCount: number;
  reloadCarryForwardTags: string[];
  active?: boolean;
  priority?: number;
}

/**
 * Crossref entry structure for linking trackers to collections
 */
export interface CrossrefEntry {
  tag: string;
  trackerFile: string;
  collectionFile: string;
  priority: number;
  contextType: ContextType;
  active: boolean;
  _note?: string;
}

/**
 * Parsed tracker information with content
 */
export interface Tracker {
  frontmatter: TrackerFrontmatter;
  content: string;
  filePath: string;
}

/**
 * Input for capture system
 */
export interface CaptureInput {
  text: string;
  inputType: 'voice' | 'text';
  forceContext?: string;
  timestamp?: Date;
}

/**
 * Single generated item from AI inference
 */
export interface GeneratedItem {
  tracker: string;
  itemType: ItemType;
  priority: Priority;
  content: string;
  reasoning: string;
}

/**
 * Task completion detection
 */
export interface TaskCompletion {
  tracker: string;
  description: string;
  reasoning: string;
}

/**
 * AI inference result for captured items (supports multiple items)
 */
export interface InferenceResult {
  primaryTracker: string;
  confidence: number;
  overallReasoning: string;
  generatedItems: GeneratedItem[];
  taskCompletions: TaskCompletion[];
  requiresReview: boolean;
}

/**
 * Configuration for ChurnFlow system
 */
export interface ChurnConfig {
  collectionsPath: string;
  trackingPath: string;
  crossrefPath: string;
  aiProvider: 'openai' | 'anthropic';
  aiApiKey: string;
  confidenceThreshold: number;
}

/**
 * v0.2.2 Formatting Standards for consistent entry formats
 * Focused on ChurnFlow-managed formatting (not Obsidian IDs/dependencies)
 */
export const FORMATTING_CONSTANTS = {
  // Date and time formats
  DATE_FORMAT: 'YYYY-MM-DD', // ISO date format
  TIMESTAMP_FORMAT: 'YYYY-MM-DD HH:mm', // 24-hour timestamp
  COMPLETION_FORMAT: '✅ YYYY-MM-DD', // Task completion format
  DUE_DATE_FORMAT: '📅 YYYY-MM-DD', // Due date format
  
  // Entry prefixes by type
  ENTRY_PREFIXES: {
    action: '- [ ] #task',
    completed: '- [x] #task',
    activity: '-',
    reference: '- **Ref**:',
    someday: '- [ ] #someday',
    review: '- [ ] #review'
  },
  
  // Standard section headers
  SECTION_HEADERS: {
    activity: '## Activity Log',
    actions: '## Action Items',
    references: '## References', 
    review: '## Review Queue',
    someday: '## Someday/Maybe',
    notes: '## Notes & Context'
  },
  
  // Priority indicators
  PRIORITY_INDICATORS: {
    critical: '🚨',
    high: '⏫',
    medium: '🔼', 
    low: '🔻'
  },
  
  // Standard metadata patterns (ChurnFlow managed only)
  METADATA_PATTERNS: {
    tags: '#[\\w-]+', // Hashtag format
    context: '@[\\w-]+' // Context tags (@next, @review, etc)
  },
  
  // Tracker header template
  TRACKER_HEADER_TEMPLATE: '# {friendlyName} — Tracker{iteration}',
  
  // Standard entry templates (without Obsidian IDs/dependencies)
  ENTRY_TEMPLATES: {
    action: '- [ ] #task {description} #{tag} {priority} {dueDate}',
    completed: '- [x] #task {description} #{tag} {priority} ✅ {completionDate}',
    activity: '- [{timestamp}] {description}',
    reference: '- **{title}**: {description} [{date}]',
    someday: '- [ ] #someday [{captureDate}] {description} #{tag}',
    review: '- [ ] #review [{date}] {description} (confidence: {confidence}%)'
  }
} as const;

/**
 * Formatting validation patterns
 */
export const VALIDATION_PATTERNS = {
  isoDate: /^\d{4}-\d{2}-\d{2}$/,
  timestamp: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
  hashtag: /^#[\w-]+$/,
  contextTag: /^@[\w-]+$/,
  priorityIcon: /^[🚨⏫🔼🔻]$/
} as const;

/**
 * Standard formatting options for different contexts
 */
export interface FormattingOptions {
  includeTimestamp?: boolean;
  includePriority?: boolean;
  includeDueDate?: boolean;
  customTemplate?: string;
}

/**
 * Individual item result from capture
 */
export interface CaptureItemResult {
  success: boolean;
  tracker: string;
  itemType: ItemType;
  formattedEntry: string;
  error?: string;
}

/**
 * Result of a capture operation (supports multiple items)
 */
export interface CaptureResult {
  success: boolean;
  primaryTracker: string;
  confidence: number;
  itemResults: CaptureItemResult[];
  completedTasks: TaskCompletion[];
  requiresReview: boolean;
  error?: string;
}
