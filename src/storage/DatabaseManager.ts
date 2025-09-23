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

    try {
      // Configure SQLite for optimal performance
      if (this.dbConfig.enableWAL !== false) {
        this.sqlite.exec('PRAGMA journal_mode = WAL;');
      }
      if (this.dbConfig.enableForeignKeys !== false) {
        this.sqlite.exec('PRAGMA foreign_keys = ON;');
      }
      this.sqlite.exec('PRAGMA synchronous = NORMAL;');

      // Verify database exists and is accessible
      await this.verifyDatabaseSetup();

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Database not available:', error);
      throw error;
    }
  }

  private async verifyDatabaseSetup(): Promise<void> {
    // Quick check that essential tables exist
    try {
      await this.db.select().from(captures).limit(1);
    } catch (error) {
      throw new Error('Database not set up. Run: npm run db:setup');
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
            isNull(captures.reminderDate),
            lte(captures.reminderDate, now)
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
          sql`LENGTH(${captures.item}) < 100`,
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
      // Use FTS5 search. The `captures_fts` table is a virtual table that indexes the `captures` table.
      // We match against the FTS table and then join back to the original `captures` table to get the full data.
      const ftsResults = this.sqlite.prepare(`
        SELECT c.* FROM captures c
        JOIN captures_fts fts ON c.id = fts.rowid
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
    
    // Fallback to LIKE search if FTS fails or returns no results
    return this.db
      .select()
      .from(captures)
      .where(
        or(
          like(captures.item, `%${query}%`),
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

  // DATABASE SETUP METHODS (Only called during setup, not normal operations)

  async setupDatabase(): Promise<void> {
    console.log('🗄️ Setting up ChurnFlow database...');
    
    try {
      // Run migrations to ensure tables exist
      await this.runMigrations();

      // Initialize with seed data if needed
      await this.seedInitialData();

      // Enable full-text search
      await this.createFullTextSearch();

      console.log('✅ ChurnFlow database setup completed successfully!');
    } catch (error) {
      console.error('❌ Failed to setup database:', error);
      throw error;
    }
  }

  async resetDatabase(): Promise<void> {
    console.log('🗑️ Resetting ChurnFlow database...');
    
    try {
      // Drop all tables
      this.sqlite.exec('DROP TABLE IF EXISTS captures_fts;');
      this.sqlite.exec('DROP TABLE IF EXISTS captures;');
      this.sqlite.exec('DROP TABLE IF EXISTS learning_patterns;');
      this.sqlite.exec('DROP TABLE IF EXISTS contexts;');
      this.sqlite.exec('DROP TABLE IF EXISTS preferences;');
      this.sqlite.exec('DROP TABLE IF EXISTS config;');

      // Recreate everything
      await this.setupDatabase();
      
      console.log('✅ Database reset completed!');
    } catch (error) {
      console.error('❌ Failed to reset database:', error);
      throw error;
    }
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
      // FTS5 table using the 'content' option to link to the captures table.
      // By omitting `content_rowid`, we let FTS5 use the table's implicit integer rowid,
      // which avoids datatype mismatches with our text-based CUID `id`.
      this.sqlite.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS captures_fts USING fts5(
          item,
          tags,
          keywords,
          content='captures'
        )
      `);
      
      // Triggers to keep the FTS index up-to-date automatically.
      // These now operate on the implicit rowid.
      this.sqlite.exec(`
        CREATE TRIGGER IF NOT EXISTS captures_ai AFTER INSERT ON captures BEGIN
          INSERT INTO captures_fts(rowid, item, tags, keywords) VALUES (new.rowid, new.item, new.tags, new.keywords);
        END;
      `);
      this.sqlite.exec(`
        CREATE TRIGGER IF NOT EXISTS captures_ad AFTER DELETE ON captures BEGIN
          INSERT INTO captures_fts(captures_fts, rowid, item, tags, keywords) VALUES ('delete', old.rowid, old.item, old.tags, old.keywords);
        END;
      `);
      this.sqlite.exec(`
        CREATE TRIGGER IF NOT EXISTS captures_au AFTER UPDATE ON captures BEGIN
          INSERT INTO captures_fts(captures_fts, rowid, item, tags, keywords) VALUES ('delete', old.rowid, old.item, old.tags, old.keywords);
          INSERT INTO captures_fts(rowid, item, tags, keywords) VALUES (new.rowid, new.item, new.tags, new.keywords);
        END;
      `);
      
      // Populate FTS table with existing captures
      this.sqlite.exec(`
        INSERT OR IGNORE INTO captures_fts (rowid, item, tags, keywords)
        SELECT rowid, item, tags, keywords FROM captures
      `);
      
      console.log('✅ Full-text search enabled');
    } catch (error) {
      console.warn('⚠️ Could not enable full-text search:', error);
    }
  }

  private async runMigrations(): Promise<void> {
    // Use Drizzle ORM migrator for schema evolution
    try {
      await migrate(this.db, { migrationsFolder: path.join(__dirname, 'migrations') });
      console.log('✅ Database migrations applied');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * @deprecated Manual table creation is deprecated. Use Drizzle ORM migrations instead.
   */
  private async createTablesManually(): Promise<void> {
    console.warn('Manual table creation is deprecated. Use Drizzle ORM migrations instead.');
  }

  async close(): Promise<void> {
    this.sqlite.close();
  }
}
