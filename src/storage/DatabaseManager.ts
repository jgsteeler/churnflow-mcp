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

      // Create full-text search table (Drizzle doesn't support FTS5 declaratively yet)
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
    console.log('Creating capture with data:', JSON.stringify(capture, null, 2));
    const insertData = {
      ...capture,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    console.log('Insert data:', JSON.stringify(insertData, null, 2));
    
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
      .set({ ...updates, updatedAt: Date.now() })
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
            lte(captures.dueDate, threeDaysFromNow.getTime()),
            isNull(captures.completedAt)
          ),
          // High priority and stale
          and(
            sql`${captures.priority} IN ('critical', 'high')`,
            lt(captures.lastReviewedAt, oneWeekAgo.getTime())
          ),
          // Active but stale
          and(
            eq(captures.status, 'active'),
            lt(captures.lastReviewedAt, twoWeeksAgo.getTime())
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
        lastReviewedAt: Date.now(),
        reviewNotes,
        updatedAt: Date.now(),
      })
      .where(eq(captures.id, id));
    return result.changes > 0;
  }

  // NEXT ACTIONS - What to work on now

  async getNextActions(limit = 10): Promise<Capture[]> {
    const now = new Date();
    
    return this.db
      .select()
      .from(captures)
      .where(
        and(
          eq(captures.status, 'active'),
          or(
            isNull(captures.startDate),
            lte(captures.startDate, now.getTime())
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
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
    // Use full-text search when available, otherwise fall back to LIKE
    try {
      return await this.db.run(sql`
        SELECT c.* FROM captures c
        JOIN captures_fts fts ON c.id = fts.rowid
        WHERE captures_fts MATCH ${query}
        ORDER BY bm25(captures_fts)
        LIMIT ${limit}
      `);
    } catch {
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
  }

  // LEARNING OPERATIONS

  async recordLearningPattern(pattern: NewLearningPattern): Promise<void> {
    await this.db.insert(learningPatterns).values({
      ...pattern,
      createdAt: Date.now(),
    });
  }

  async updateLearningFeedback(
    patternId: string, 
    wasCorrect: boolean, 
    userCorrectedContextId?: string,
    userCorrectedType?: string
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
    const now = new Date();
    
    const [stats] = await this.db
      .select({
        inbox: sql<number>`COUNT(CASE WHEN status = 'inbox' THEN 1 END)`,
        active: sql<number>`COUNT(CASE WHEN status = 'active' THEN 1 END)`,
        completed: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
        needingReview: sql<number>`COUNT(CASE WHEN lastReviewedAt IS NULL THEN 1 END)`,
        overdue: sql<number>`COUNT(CASE WHEN dueDate < ${now.getTime()} AND status != 'completed' THEN 1 END)`,
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
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
      await this.db.run(sql`
        CREATE VIRTUAL TABLE IF NOT EXISTS captures_fts USING fts5(
          content,
          tags,
          contextTags,
          keywords,
          content=captures,
          content_rowid=id
        )
      `);
      
      // Create triggers to keep FTS in sync
      await this.db.run(sql`
        CREATE TRIGGER IF NOT EXISTS captures_fts_insert
        AFTER INSERT ON captures
        BEGIN
          INSERT INTO captures_fts (rowid, content, tags, contextTags, keywords)
          VALUES (NEW.id, NEW.content, NEW.tags, NEW.context_tags, NEW.keywords);
        END
      `);

      await this.db.run(sql`
        CREATE TRIGGER IF NOT EXISTS captures_fts_update
        AFTER UPDATE ON captures
        BEGIN
          UPDATE captures_fts SET
            content = NEW.content,
            tags = NEW.tags,
            contextTags = NEW.context_tags,
            keywords = NEW.keywords
          WHERE rowid = NEW.id;
        END
      `);

      await this.db.run(sql`
        CREATE TRIGGER IF NOT EXISTS captures_fts_delete
        AFTER DELETE ON captures
        BEGIN
          DELETE FROM captures_fts WHERE rowid = OLD.id;
        END
      `);
      
      console.log('✅ Full-text search enabled');
    } catch (error) {
      console.warn('⚠️ Could not enable full-text search:', error);
    }
  }

  private async runMigrations(): Promise<void> {
    try {
      const migrationsPath = path.join(process.cwd(), 'src/storage/migrations');
      if (fs.existsSync(migrationsPath)) {
        console.log('🔄 Running database migrations...');
        migrate(this.db, { migrationsFolder: migrationsPath });
        console.log('✅ Database migrations completed');
      } else {
        console.log('ℹ️ No migrations folder found, creating tables manually...');
        await this.createTablesManually();
      }
    } catch (error) {
      console.warn('⚠️ Migration failed, creating tables manually:', error);
      await this.createTablesManually();
    }
  }

  private async createTablesManually(): Promise<void> {
    // As a fallback, create tables using raw SQL based on our schema
    // This ensures the system works even without proper migrations
    const createTablesSql = `
      CREATE TABLE IF NOT EXISTS contexts (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        json TEXT DEFAULT '[]',
        active INTEGER DEFAULT 1,
        priority INTEGER DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER
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
        json TEXT DEFAULT '[]',
        start_date INTEGER,
        due_date INTEGER,
        completed_at INTEGER,
        last_reviewed_at INTEGER,
        review_score REAL,
        review_notes TEXT,
        capture_source TEXT DEFAULT 'manual',
        created_at INTEGER,
        updated_at INTEGER,
        FOREIGN KEY (context_id) REFERENCES contexts(id)
      );

      CREATE TABLE IF NOT EXISTS preferences (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        type TEXT DEFAULT 'string',
        category TEXT DEFAULT 'general',
        description TEXT,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        description TEXT,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS learning_patterns (
        id TEXT PRIMARY KEY,
        json TEXT DEFAULT '[]',
        input_length INTEGER,
        chosen_context_id TEXT,
        chosen_type TEXT NOT NULL,
        original_confidence REAL NOT NULL,
        was_correct INTEGER,
        user_corrected_context_id TEXT,
        user_corrected_type TEXT,
        weight REAL DEFAULT 1,
        created_at INTEGER,
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
