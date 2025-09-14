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
