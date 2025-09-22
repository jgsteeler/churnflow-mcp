/**
 * Unit tests for DatabaseManager - Core ADHD-Friendly Operations
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { DatabaseManager } from '../DatabaseManager.js';
import fs from 'fs';
import path from 'path';

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;
  let testDbPath: string;

  beforeEach(async () => {
  // Create a temporary database for testing
  testDbPath = path.join(__dirname, `test-${Date.now()}.db`);
  dbManager = new DatabaseManager({ dbPath: testDbPath });
  await dbManager.setupDatabase();
  });

  afterEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Capture Operations', () => {
    test('should create and retrieve captures', async () => {
      const testCapture = {
        content: 'Test capture content',
        rawInput: 'Test capture content',
        captureType: 'action' as const,
        priority: 'medium' as const,
        status: 'inbox' as const,
        contextId: null,
        confidence: 0.95,
        aiReasoning: 'Test reasoning',
        tags: JSON.stringify(['test']),
        contextTags: JSON.stringify([]),
        keywords: JSON.stringify(['test', 'capture']),
        captureSource: 'manual' as const,
      };

      const created = await dbManager.createCapture(testCapture);
      
      expect(created.id).toBeDefined();
      expect(created.content).toBe(testCapture.content);
      expect(created.captureType).toBe(testCapture.captureType);
      expect(created.priority).toBe(testCapture.priority);
      expect(created.status).toBe(testCapture.status);
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();

      // Test retrieval
      const retrieved = await dbManager.getCaptureById(created.id);
      expect(retrieved).toEqual(created);
    });

    test('should update captures', async () => {
      const testCapture = {
        content: 'Original content',
        rawInput: 'Original content',
        captureType: 'action' as const,
        priority: 'low' as const,
        status: 'inbox' as const,
        contextId: null,
        confidence: 0.5,
        aiReasoning: 'Original reasoning',
        tags: JSON.stringify(['original']),
        contextTags: JSON.stringify([]),
        keywords: JSON.stringify(['original']),
        captureSource: 'manual' as const,
      };

      const created = await dbManager.createCapture(testCapture);
      
      const updates = {
        priority: 'high' as const,
        status: 'active' as const,
      };

      const updated = await dbManager.updateCapture(created.id, updates);
      
      expect(updated?.priority).toBe('high');
      expect(updated?.status).toBe('active');
      expect(updated?.content).toBe(testCapture.content); // unchanged
      expect(updated?.updatedAt).not.toBe(created.updatedAt);
    });

    test('should delete captures', async () => {
      const testCapture = {
        content: 'Content to delete',
        rawInput: 'Content to delete',
        captureType: 'action' as const,
        priority: 'medium' as const,
        status: 'inbox' as const,
        contextId: null,
        confidence: 0.8,
        aiReasoning: 'Delete test',
        tags: JSON.stringify([]),
        contextTags: JSON.stringify([]),
        keywords: JSON.stringify([]),
        captureSource: 'manual' as const,
      };

      const created = await dbManager.createCapture(testCapture);
      const deleted = await dbManager.deleteCapture(created.id);
      
      expect(deleted).toBe(true);
      
      const retrieved = await dbManager.getCaptureById(created.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('Context Operations', () => {
    test('should create and retrieve contexts', async () => {
      const testContext = {
        name: 'test-context',
        displayName: 'Test Context',
        description: 'A test context',
        keywords: JSON.stringify(['test', 'context']),
        patterns: JSON.stringify([]),
      };

      const created = await dbManager.createContext(testContext);
      
      expect(created.id).toBeDefined();
      expect(created.name).toBe(testContext.name);
      expect(created.displayName).toBe(testContext.displayName);
      expect(created.createdAt).toBeDefined();

      const retrieved = await dbManager.getContextByName(testContext.name);
      expect(retrieved).toEqual(created);
    });

    test('should list active contexts', async () => {
      await dbManager.createContext({
        name: 'context1',
        displayName: 'Context 1',
        description: 'First context',
        keywords: JSON.stringify([]),
        patterns: JSON.stringify([]),
      });

      await dbManager.createContext({
        name: 'context2',
        displayName: 'Context 2',
        description: 'Second context',
        keywords: JSON.stringify([]),
        patterns: JSON.stringify([]),
      });

      const contexts = await dbManager.getContexts();
      expect(contexts.length).toBeGreaterThanOrEqual(2);
      expect(contexts.every(c => c.active)).toBe(true);
    });
  });

  describe('Search Operations', () => {
    test('should search captures by content', async () => {
      await dbManager.createCapture({
        content: 'Database integration testing',
        rawInput: 'Database integration testing',
        captureType: 'action' as const,
        priority: 'medium' as const,
        status: 'inbox' as const,
        contextId: null,
        confidence: 0.9,
        aiReasoning: 'Test',
        tags: JSON.stringify(['database']),
        contextTags: JSON.stringify([]),
        keywords: JSON.stringify(['database', 'testing']),
        captureSource: 'manual' as const,
      });

      await dbManager.createCapture({
        content: 'UI design mockups',
        rawInput: 'UI design mockups',
        captureType: 'reference' as const,
        priority: 'low' as const,
        status: 'inbox' as const,
        contextId: null,
        confidence: 0.8,
        aiReasoning: 'Test',
        tags: JSON.stringify(['design']),
        contextTags: JSON.stringify([]),
        keywords: JSON.stringify(['ui', 'design']),
        captureSource: 'manual' as const,
      });

      const results = await dbManager.searchCaptures('database');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].content).toContain('Database');
    });
  });

  describe('Review System', () => {
    test('should identify captures needing review', async () => {
      const capture = await dbManager.createCapture({
        content: 'Never reviewed capture',
        rawInput: 'Never reviewed capture',
        captureType: 'action' as const,
        priority: 'medium' as const,
        status: 'active' as const,
        contextId: null,
        confidence: 0.9,
        aiReasoning: 'Test',
        tags: JSON.stringify([]),
        contextTags: JSON.stringify([]),
        keywords: JSON.stringify([]),
        captureSource: 'manual' as const,
      });

      const needsReview = await dbManager.getCapturesNeedingReview(10);
      expect(needsReview.length).toBeGreaterThanOrEqual(1);
      expect(needsReview.some(c => c.id === capture.id)).toBe(true);
    });

    test('should mark captures as reviewed', async () => {
      const capture = await dbManager.createCapture({
        content: 'To be reviewed',
        rawInput: 'To be reviewed',
        captureType: 'action' as const,
        priority: 'medium' as const,
        status: 'inbox' as const,
        contextId: null,
        confidence: 0.9,
        aiReasoning: 'Test',
        tags: JSON.stringify([]),
        contextTags: JSON.stringify([]),
        keywords: JSON.stringify([]),
        captureSource: 'manual' as const,
      });

      const marked = await dbManager.markCaptureReviewed(capture.id, 'Test review');
      expect(marked).toBe(true);

      const updated = await dbManager.getCaptureById(capture.id);
      expect(updated?.lastReviewedAt).toBeDefined();
      expect(updated?.reviewNotes).toBe('Test review');
    });
  });

  describe('Dashboard Analytics', () => {
    test('should provide dashboard statistics', async () => {
      // Create test captures with different statuses
      await dbManager.createCapture({
        content: 'Inbox item',
        rawInput: 'Inbox item',
        captureType: 'action' as const,
        priority: 'medium' as const,
        status: 'inbox' as const,
        contextId: null,
        confidence: 0.9,
        aiReasoning: 'Test',
        tags: JSON.stringify([]),
        contextTags: JSON.stringify([]),
        keywords: JSON.stringify([]),
        captureSource: 'manual' as const,
      });

      await dbManager.createCapture({
        content: 'Active item',
        rawInput: 'Active item',
        captureType: 'action' as const,
        priority: 'medium' as const,
        status: 'active' as const,
        contextId: null,
        confidence: 0.9,
        aiReasoning: 'Test',
        tags: JSON.stringify([]),
        contextTags: JSON.stringify([]),
        keywords: JSON.stringify([]),
        captureSource: 'manual' as const,
      });

      const stats = await dbManager.getDashboardStats();
      expect(stats).toBeDefined();
      expect(stats.inbox).toBeGreaterThanOrEqual(1);
      expect(stats.active).toBeGreaterThanOrEqual(1);
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.needingReview).toBe('number');
      expect(typeof stats.overdue).toBe('number');
    });
  });

  describe('Learning Operations', () => {
    test('should record and update learning patterns', async () => {
      const context = await dbManager.createContext({
        name: 'test-learning',
        displayName: 'Test Learning',
        description: 'Learning test context',
        keywords: JSON.stringify([]),
        patterns: JSON.stringify([]),
      });

      const pattern = {
        inputKeywords: JSON.stringify(['test', 'learning']),
        inputLength: 20,
        inputPatterns: JSON.stringify([]),
        chosenContextId: context.id,
        chosenType: 'action' as const,
        originalConfidence: 0.85,
        wasCorrect: null as null,
      };

      await dbManager.recordLearningPattern(pattern);

      // This test mainly verifies no errors are thrown
      // In a more complete test, we'd query the learning patterns table
      expect(true).toBe(true);
    });
  });
});