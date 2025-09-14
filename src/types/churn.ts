/**
 * Core types for ChurnFlow ADHD-friendly productivity system
 */

export type ItemType = 'action' | 'review' | 'reference' | 'someday';
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
 * AI inference result for captured items
 */
export interface InferenceResult {
  inferredTracker: string;
  itemType: ItemType;
  priority: Priority;
  confidence: number;
  reasoning: string;
  formattedEntry: string;
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
 * Result of a capture operation
 */
export interface CaptureResult {
  success: boolean;
  tracker: string;
  itemType: ItemType;
  formattedEntry: string;
  confidence: number;
  requiresReview: boolean;
  error?: string;
}