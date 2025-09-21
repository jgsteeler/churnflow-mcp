/**
 * ChurnFlow Database Manager - Core ADHD-Friendly Operations
 * Simplified database operations using Drizzle ORM
 */

import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq, desc, asc, and, or, isNull, lt, lte, gte, sql, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import fs from 'fs';

import {
  captures,
  contexts,
  learningPatterns,
  config,
  preferences,
  collections,
  captureCollections,
  generateId,
  type Capture,
  type NewCapture,
  type Context,
  type NewContext,
  type LearningPattern,
  type NewLearningPattern,
  REVIEW_PRIORITY_RULES,
  NEXT_ACTION_RULES,
} from './schema.js';

export interface DatabaseConfig {
  dbPath?: string;
  enableWAL?: boolean;
  enableForeignKeys?: boolean;
}

export class DatabaseManager {
  private db: BetterSQLite3Database;
  private sqlite: Database.Database;
  private isInitialized = false;

  constructor(private dbConfig: DatabaseConfig = {}) {
    const dbPath = dbConfig.dbPath || path.join(process.cwd(), 'churnflow.db');
    
    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.sqlite = new Database(dbPath);
    this.db = drizzle(this.sqlite);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🗄️ Initializing ChurnFlow database...');

    try {
      // Configure SQLite for optimal performance
      if (this.dbConfig.enableWAL !== false) {
        this.sqlite.exec('PRAGMA journal_mode = WAL;');
      }
      if (this.dbConfig.enableForeignKeys !== false) {
        this.sqlite.exec('PRAGMA foreign_keys = ON;');
      }
      this.sqlite.exec('PRAGMA synchronous = NORMAL;');

      // Run migrations to ensure tables exist
      await this.runMigrations();

      // Initialize with seed data if needed
      await this.seedInitialData();

      // Re-enable full-text search with fixed schema
      await this.createFullTextSearch();

      this.isInitialized = true;
      console.log('✅ ChurnFlow database initialized successfully!');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  // CORE CAPTURE OPERATIONS

  async createCapture(capture: NewCapture): Promise<Capture> {
    const insertData = {
      ...capture,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const [created] = await this.db.insert(captures).values(insertData).returning();
    return created;
  }

  async getCaptureById(id: string): Promise<Capture | null> {
    const [capture] = await this.db
      .select()
      .from(captures)
      .where(eq(captures.id, id))
      .limit(1);
    return capture || null;
  }

  async updateCapture(id: string, updates: Partial<NewCapture>): Promise<Capture | null> {
    const [updated] = await this.db
      .update(captures)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(captures.id, id))
      .returning();
    return updated || null;
  }

  async deleteCapture(id: string): Promise<boolean> {
    const result = await this.db
      .delete(captures)
      .where(eq(captures.id, id));
    return result.changes > 0;
  }

  // REVIEW SYSTEM - ADHD-Friendly Prioritization

  async getCapturesNeedingReview(limit = 20): Promise<Capture[]> {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    return this.db
      .select()
      .from(captures)
      .where(
        or(
          // Never been reviewed
          isNull(captures.lastReviewedAt),
          // Due soon
          and(
            lte(captures.dueDate, threeDaysFromNow.toISOString()),
            isNull(captures.completedAt)
          ),
          // High priority and stale
          and(
            sql`${captures.priority} IN ('critical', 'high')`,
            lt(captures.lastReviewedAt, oneWeekAgo.toISOString())
          ),
          // Active but stale
          and(
            eq(captures.status, 'active'),
            lt(captures.lastReviewedAt, twoWeeksAgo.toISOString())
          )
        )
      )
      .orderBy(
        desc(captures.priority),
        asc(captures.lastReviewedAt),
        asc(captures.dueDate)
      )
      .limit(limit);
  }

  async markCaptureReviewed(id: string, reviewNotes?: string): Promise<boolean> {
    const result = await this.db
      .update(captures)
      .set({
        lastReviewedAt: new Date().toISOString(),
        reviewNotes,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(captures.id, id));
    return result.changes > 0;
  }

  // NEXT ACTIONS - What to work on now

  async getNextActions(limit = 10): Promise<Capture[]> {
    const now = new Date().toISOString();
    
    return this.db
      .select()
      .from(captures)
      .where(
        and(
          eq(captures.status, 'active'),
          or(
            isNull(captures.startDate),
            lte(captures.startDate, now)
          ),
          // Must be reviewed
          sql`${captures.lastReviewedAt} IS NOT NULL`
        )
      )
      .orderBy(
        desc(captures.priority),
        asc(captures.dueDate),
        asc(captures.createdAt)
      )
      .limit(limit);
  }

  async getQuickWins(limit = 5): Promise<Capture[]> {
    return this.db
      .select()
      .from(captures)
      .where(
        and(
          eq(captures.status, 'active'),
          sql`LENGTH(${captures.content}) < 100`,
          sql`${captures.priority} IN ('low', 'medium')`,
          sql`${captures.lastReviewedAt} IS NOT NULL`
        )
      )
      .orderBy(asc(captures.createdAt))
      .limit(limit);
  }

  async getHighImpactTasks(limit = 5): Promise<Capture[]> {
    return this.db
      .select()
      .from(captures)
      .where(
        and(
          eq(captures.status, 'active'),
          sql`${captures.priority} IN ('high', 'critical')`,
          sql`${captures.lastReviewedAt} IS NOT NULL`
        )
      )
      .orderBy(
        desc(captures.priority),
        asc(captures.dueDate)
      )
      .limit(limit);
  }

  // CONTEXT OPERATIONS

  async createContext(context: NewContext): Promise<Context> {
    const [created] = await this.db.insert(contexts).values({
      ...context,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();
    return created;
  }

  async getContexts(): Promise<Context[]> {
    return this.db
      .select()
      .from(contexts)
      .where(eq(contexts.active, true))
      .orderBy(desc(contexts.priority), asc(contexts.displayName));
  }

  async getContextByName(name: string): Promise<Context | null> {
    const [context] = await this.db
      .select()
      .from(contexts)
      .where(eq(contexts.name, name))
      .limit(1);
    return context || null;
  }

  // SEARCH OPERATIONS

  async searchCaptures(query: string, limit = 20): Promise<Capture[]> {
    try {
      // Try to use FTS5 search first using raw SQLite
      const ftsResults = this.sqlite.prepare(`
        SELECT c.* FROM captures c
        JOIN captures_fts fts ON c.content = fts.content
        WHERE captures_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `).all(query, limit) as Capture[];
      
      if (ftsResults && ftsResults.length > 0) {
        return ftsResults;
      }
    } catch (error) {
      console.warn('FTS search failed, falling back to LIKE search:', error);
    }
    
    // Fallback to LIKE search
    return this.db
      .select()
      .from(captures)
      .where(
        or(
          like(captures.content, `%${query}%`),
          like(captures.tags, `%${query}%`),
          like(captures.keywords, `%${query}%`)
        )
      )
      .limit(limit);
  }

  // LEARNING OPERATIONS

  async recordLearningPattern(pattern: NewLearningPattern): Promise<void> {
    await this.db.insert(learningPatterns).values({
      ...pattern,
      createdAt: new Date().toISOString(),
    });
  }

  async updateLearningFeedback(
    patternId: string, 
    wasCorrect: boolean, 
    userCorrectedContextId?: string,
    userCorrectedType?: 'action' | 'reference' | 'someday' | 'activity'
  ): Promise<void> {
    await this.db
      .update(learningPatterns)
      .set({
        wasCorrect,
        userCorrectedContextId,
        userCorrectedType,
        weight: wasCorrect ? 1.1 : 0.9, // Simple weight adjustment
      })
      .where(eq(learningPatterns.id, patternId));
  }

  // DASHBOARD ANALYTICS

  async getDashboardStats(): Promise<{
    inbox: number;
    active: number;
    completed: number;
    needingReview: number;
    overdue: number;
  }> {
    const now = new Date().toISOString();
    
    const [stats] = await this.db
      .select({
        inbox: sql<number>`COUNT(CASE WHEN status = 'inbox' THEN 1 END)`,
        active: sql<number>`COUNT(CASE WHEN status = 'active' THEN 1 END)`,
        completed: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
        needingReview: sql<number>`COUNT(CASE WHEN last_reviewed_at IS NULL THEN 1 END)`,
        overdue: sql<number>`COUNT(CASE WHEN due_date < ${now} AND status != 'completed' THEN 1 END)`,
      })
      .from(captures);
      
    return stats || { inbox: 0, active: 0, completed: 0, needingReview: 0, overdue: 0 };
  }

  // UTILITY METHODS

  private async seedInitialData(): Promise<void> {
    // Check if we have any contexts
    const existingContexts = await this.db.select().from(contexts).limit(1);
    if (existingContexts.length > 0) return;

    console.log('🌱 Seeding initial data...');

    // Create default contexts based on your existing system
    const defaultContexts = [
      {
        name: 'work',
        displayName: 'Work',
        description: 'Professional tasks and projects',
        keywords: JSON.stringify(['work', 'business', 'meeting', 'project', 'client']),
        patterns: JSON.stringify([]),
        priority: 10,
      },
      {
        name: 'personal',
        displayName: 'Personal',
        description: 'Personal tasks and life management',
        keywords: JSON.stringify(['personal', 'home', 'family', 'health', 'finance']),
        patterns: JSON.stringify([]),
        priority: 8,
      },
      {
        name: 'system',
        displayName: 'System',
        description: 'ChurnFlow system maintenance',
        keywords: JSON.stringify(['system', 'config', 'setup', 'maintenance']),
        patterns: JSON.stringify([]),
        priority: 5,
      },
    ];

    for (const context of defaultContexts) {
      await this.db.insert(contexts).values({
        ...context,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Set initial preferences
    const defaultPrefs = [
      { key: 'review_batch_size', value: '10', type: 'number' as const, category: 'review' },
      { key: 'confidence_threshold', value: '0.7', type: 'number' as const, category: 'ai' },
      { key: 'color_output', value: 'true', type: 'boolean' as const, category: 'ui' },
    ];

    for (const pref of defaultPrefs) {
      await this.db.insert(preferences).values(pref);
    }

    console.log('✅ Initial data seeded successfully!');
  }

  private async createFullTextSearch(): Promise<void> {
    try {
      // First, create the FTS virtual table without content table linking
      // This avoids rowid issues with string primary keys
      this.sqlite.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS captures_fts USING fts5(
          content,
          tags,
          context_tags,
          keywords
        )
      `);
      
      // Create triggers to keep FTS in sync manually
      this.sqlite.exec(`
        CREATE TRIGGER IF NOT EXISTS captures_fts_insert
        AFTER INSERT ON captures
        BEGIN
          INSERT INTO captures_fts (content, tags, context_tags, keywords)
          VALUES (NEW.content, NEW.tags, NEW.context_tags, NEW.keywords);
        END
      `);

      this.sqlite.exec(`
        CREATE TRIGGER IF NOT EXISTS captures_fts_update
        AFTER UPDATE ON captures
        BEGIN
          -- For simplicity, delete and re-insert on update
          DELETE FROM captures_fts WHERE content = OLD.content;
          INSERT INTO captures_fts (content, tags, context_tags, keywords)
          VALUES (NEW.content, NEW.tags, NEW.context_tags, NEW.keywords);
        END
      `);

      this.sqlite.exec(`
        CREATE TRIGGER IF NOT EXISTS captures_fts_delete
        AFTER DELETE ON captures
        BEGIN
          DELETE FROM captures_fts WHERE content = OLD.content;
        END
      `);
      
      // Populate FTS table with existing captures
      this.sqlite.exec(`
        INSERT OR IGNORE INTO captures_fts (content, tags, context_tags, keywords)
        SELECT content, tags, context_tags, keywords FROM captures
      `);
      
      console.log('✅ Full-text search enabled');
    } catch (error) {
      console.warn('⚠️ Could not enable full-text search:', error);
    }
  }

  private async runMigrations(): Promise<void> {
    // Skip migrations for now and create tables manually to avoid schema conflicts
    console.log('🗺️ Creating tables manually (skipping migrations)...');
    await this.createTablesManually();
  }

  private async createTablesManually(): Promise<void> {
    // Create tables matching our current Drizzle schema with ISO date strings
    const createTablesSql = `
      CREATE TABLE IF NOT EXISTS contexts (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        keywords TEXT DEFAULT '[]',
        patterns TEXT DEFAULT '[]',
        active INTEGER DEFAULT 1,
        priority INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS captures (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        raw_input TEXT,
        capture_type TEXT DEFAULT 'action' NOT NULL,
        priority TEXT DEFAULT 'medium' NOT NULL,
        status TEXT DEFAULT 'inbox' NOT NULL,
        context_id TEXT,
        confidence REAL,
        ai_reasoning TEXT,
        tags TEXT DEFAULT '[]',
        context_tags TEXT DEFAULT '[]',
        keywords TEXT DEFAULT '[]',
        start_date TEXT,
        due_date TEXT,
        completed_at TEXT,
        last_reviewed_at TEXT,
        review_score REAL,
        review_notes TEXT,
        capture_source TEXT DEFAULT 'manual',
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (context_id) REFERENCES contexts(id)
      );

      CREATE TABLE IF NOT EXISTS preferences (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        type TEXT DEFAULT 'string',
        category TEXT DEFAULT 'general',
        description TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        description TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS learning_patterns (
        id TEXT PRIMARY KEY,
        input_keywords TEXT DEFAULT '[]',
        input_length INTEGER,
        input_patterns TEXT DEFAULT '[]',
        chosen_context_id TEXT,
        chosen_type TEXT NOT NULL,
        original_confidence REAL NOT NULL,
        was_correct INTEGER,
        user_corrected_context_id TEXT,
        user_corrected_type TEXT,
        weight REAL DEFAULT 1,
        created_at TEXT,
        FOREIGN KEY (chosen_context_id) REFERENCES contexts(id),
        FOREIGN KEY (user_corrected_context_id) REFERENCES contexts(id)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS contexts_name_unique ON contexts (name);
      CREATE UNIQUE INDEX IF NOT EXISTS preferences_key_unique ON preferences (key);
    `;

    this.sqlite.exec(createTablesSql);
    console.log('✅ Tables created manually');
  }

  async close(): Promise<void> {
    this.sqlite.close();
  }
}
