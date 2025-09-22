
/**
 * ChurnFlow Core Database Schema - Simplified & ADHD-Friendly
 * Code-first with Drizzle ORM - Focus on capture, review, dashboard
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// Helper function for CUID generation
export const generateId = () => createId();

// Helper for JSON columns with type safety
export const jsonColumn = <T>() => text('json').$type<T>();

// CORE TABLES - Free Tier

// Main captures table - the heart of the system
export const captures = sqliteTable('captures', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  
  // Core content
  content: text('content').notNull(),
  rawInput: text('raw_input'), // Original input before AI processing
  
  // Capture metadata
  captureType: text('capture_type', { 
    enum: ['action', 'reference', 'someday', 'activity'] 
  }).notNull().default('action'),
  priority: text('priority', { 
    enum: ['critical', 'high', 'medium', 'low'] 
  }).notNull().default('medium'),
  status: text('status', { 
    enum: ['inbox', 'active', 'completed', 'cancelled', 'archived', 'someday'] 
  }).notNull().default('inbox'),
  
  // Context inference (AI-powered)
  contextId: text('context_id').references(() => contexts.id),
  confidence: real('confidence'), // AI confidence (0.0 to 1.0)
  aiReasoning: text('ai_reasoning'),
  
  // Tags and categorization (stored as JSON strings for now)
  tags: text('tags').default('[]'), // #hashtags as JSON string
  contextTags: text('context_tags').default('[]'), // @context as JSON string
  keywords: text('keywords').default('[]'), // extracted keywords as JSON string
  
  // Time tracking
  startDate: text('start_date'), // ISO date string
  dueDate: text('due_date'), // ISO date string
  completedAt: text('completed_at'), // ISO datetime string
  
  // Review system - null means needs review
  lastReviewedAt: text('last_reviewed_at'), // ISO datetime string
  reviewScore: real('review_score'), // 0-1, higher = more important to review
  reviewNotes: text('review_notes'),
  
  // System metadata
  captureSource: text('capture_source', { 
    enum: ['manual', 'ai', 'voice', 'api', 'import'] 
  }).default('manual'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// Contexts table - inferred contexts for routing
export const contexts = sqliteTable('contexts', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  name: text('name').unique().notNull(), // e.g., 'work', 'personal', 'project-55'
  displayName: text('display_name').notNull(),
  description: text('description'),
  color: text('color'), // For UI theming
  
  // Context patterns for AI learning (stored as JSON strings)
  keywords: text('keywords').default('[]'),
  patterns: text('patterns').default('[]'),
  
  // Context metadata
  active: integer('active', { mode: 'boolean' }).default(true),
  priority: integer('priority').default(0), // Higher = more likely to be chosen
  
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// AI learning patterns - improve context inference over time
export const learningPatterns = sqliteTable('learning_patterns', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  
  // Input analysis (stored as JSON strings)
  inputKeywords: text('input_keywords').default('[]'),
  inputLength: integer('input_length'),
  inputPatterns: text('input_patterns').default('[]'), // regex patterns that matched
  
  // AI decision
  chosenContextId: text('chosen_context_id').references(() => contexts.id),
  chosenType: text('chosen_type', { 
    enum: ['action', 'reference', 'someday', 'activity'] 
  }).notNull(),
  originalConfidence: real('original_confidence').notNull(),
  
  // User feedback
  wasCorrect: integer('was_correct', { mode: 'boolean' }), // null = no feedback yet
  userCorrectedContextId: text('user_corrected_context_id').references(() => contexts.id),
  userCorrectedType: text('user_corrected_type', { 
    enum: ['action', 'reference', 'someday', 'activity'] 
  }),
  
  // Learning weight
  weight: real('weight').default(1.0), // Adjust based on success rate
  
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// System configuration
export const config = sqliteTable('config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  category: text('category').default('general'),
  description: text('description'),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// User preferences
export const preferences = sqliteTable('preferences', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  key: text('key').unique().notNull(),
  value: text('value').notNull(),
  type: text('type', { enum: ['string', 'number', 'boolean', 'json'] }).default('string'),
  category: text('category').default('general'),
  description: text('description'),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// PREMIUM COLLECTIONS ADD-ON TABLES

// Collections - premium feature
export const collections = sqliteTable('collections', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  name: text('name').unique().notNull(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  color: text('color'),
  icon: text('icon'),
  
  // Collection metadata
  isArchive: integer('is_archive', { mode: 'boolean' }).default(false),
  contextId: text('context_id').references(() => contexts.id), // Associated context
  
  // Premium feature flag
  isPremium: integer('is_premium', { mode: 'boolean' }).default(true),
  
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// Many-to-many: captures can belong to multiple collections
export const captureCollections = sqliteTable('capture_collections', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  captureId: text('capture_id').notNull().references(() => captures.id, { onDelete: 'cascade' }),
  collectionId: text('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  
  // Collection-specific metadata
  addedReason: text('added_reason'), // Why was this added to this collection?
  sortOrder: integer('sort_order').default(0),
  
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

// SEARCH & ANALYTICS

// Full-text search virtual table
// Note: This will be created with a separate SQL command since Drizzle doesn't fully support FTS5 yet
// CREATE VIRTUAL TABLE captures_fts USING fts5(content, tags, contextTags, content=captures, content_rowid=id);

// RELATIONSHIPS

export const capturesRelations = relations(captures, ({ one, many }) => ({
  context: one(contexts, {
    fields: [captures.contextId],
    references: [contexts.id],
  }),
  collections: many(captureCollections),
}));

export const contextsRelations = relations(contexts, ({ many }) => ({
  captures: many(captures),
  learningPatterns: many(learningPatterns),
  collections: many(collections),
}));

export const learningPatternsRelations = relations(learningPatterns, ({ one }) => ({
  chosenContext: one(contexts, {
    fields: [learningPatterns.chosenContextId],
    references: [contexts.id],
  }),
  correctedContext: one(contexts, {
    fields: [learningPatterns.userCorrectedContextId],
    references: [contexts.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  context: one(contexts, {
    fields: [collections.contextId],
    references: [contexts.id],
  }),
  captures: many(captureCollections),
}));

export const captureCollectionsRelations = relations(captureCollections, ({ one }) => ({
  capture: one(captures, {
    fields: [captureCollections.captureId],
    references: [captures.id],
  }),
  collection: one(collections, {
    fields: [captureCollections.collectionId],
    references: [collections.id],
  }),
}));

// INFERRED TYPES

export type Capture = typeof captures.$inferSelect;
export type NewCapture = typeof captures.$inferInsert;

export type Context = typeof contexts.$inferSelect;
export type NewContext = typeof contexts.$inferInsert;

export type LearningPattern = typeof learningPatterns.$inferSelect;
export type NewLearningPattern = typeof learningPatterns.$inferInsert;

export type Config = typeof config.$inferSelect;
export type NewConfig = typeof config.$inferInsert;

export type Preference = typeof preferences.$inferSelect;
export type NewPreference = typeof preferences.$inferInsert;

// Premium types
export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;

export type CaptureCollection = typeof captureCollections.$inferSelect;
export type NewCaptureCollection = typeof captureCollections.$inferInsert;

// ADHD-FRIENDLY QUERY HELPERS (to be used in DatabaseManager)

export const REVIEW_PRIORITY_RULES = {
  // Items that need review ASAP (null lastReviewedAt)
  needsInitialReview: 'lastReviewedAt IS NULL',
  
  // Items with due dates approaching
  dueSoon: 'dueDate IS NOT NULL AND dueDate <= ?', // pass Date + 3 days
  
  // High priority items not reviewed recently
  highPriorityStale: 'priority IN ("critical", "high") AND lastReviewedAt < ?', // pass Date - 7 days
  
  // Active items not reviewed in 2 weeks
  activeStale: 'status = "active" AND lastReviewedAt < ?', // pass Date - 14 days
};

export const NEXT_ACTION_RULES = {
  // Ready to work on now
  readyNow: 'status = "active" AND (startDate IS NULL OR startDate <= ?) AND lastReviewedAt IS NOT NULL',
  
  // Quick wins (short, easy tasks)
  quickWins: 'LENGTH(content) < 100 AND priority IN ("low", "medium") AND status = "active"',
  
  // High impact (important but manageable)
  highImpact: 'priority IN ("high", "critical") AND status = "active" AND lastReviewedAt IS NOT NULL',
};