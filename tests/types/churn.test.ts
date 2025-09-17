/**
 * Comprehensive tests for ChurnFlow types and interfaces
 */

import {
  ItemType,
  ContextType,
  Priority,
  TrackerFrontmatter,
  CrossrefEntry,
  Tracker,
  CaptureInput,
  InferenceResult,
  ChurnConfig,
  CaptureResult,
  ReviewAction,
  ReviewStatus,
  ReviewSource,
  ReviewableItem,
  ReviewConfig
} from '../../src/types/churn.js';

describe('ChurnFlow Types', () => {
  describe('ItemType', () => {
    it('should include all expected item types', () => {
      const validTypes: ItemType[] = ['action', 'review', 'reference', 'someday', 'activity'];
      expect(validTypes).toHaveLength(5);
      expect(validTypes).toContain('action');
      expect(validTypes).toContain('review');
      expect(validTypes).toContain('reference');
      expect(validTypes).toContain('someday');
      expect(validTypes).toContain('activity');
    });

    it('should be assignable to string', () => {
      const itemType: ItemType = 'action';
      const stringValue: string = itemType;
      expect(stringValue).toBe('action');
    });
  });

  describe('ContextType', () => {
    it('should include all expected context types', () => {
      const validContexts: ContextType[] = ['business', 'personal', 'project', 'system'];
      expect(validContexts).toHaveLength(4);
      expect(validContexts).toContain('business');
      expect(validContexts).toContain('personal');
      expect(validContexts).toContain('project');
      expect(validContexts).toContain('system');
    });

    it('should be assignable to string', () => {
      const contextType: ContextType = 'business';
      const stringValue: string = contextType;
      expect(stringValue).toBe('business');
    });
  });

  describe('Priority', () => {
    it('should include all expected priority levels', () => {
      const validPriorities: Priority[] = ['critical', 'high', 'medium', 'low'];
      expect(validPriorities).toHaveLength(4);
      expect(validPriorities).toContain('critical');
      expect(validPriorities).toContain('high');
      expect(validPriorities).toContain('medium');
      expect(validPriorities).toContain('low');
    });

    it('should be assignable to string', () => {
      const priority: Priority = 'high';
      const stringValue: string = priority;
      expect(stringValue).toBe('high');
    });
  });

  describe('TrackerFrontmatter', () => {
    it('should create valid frontmatter object', () => {
      const frontmatter: TrackerFrontmatter = {
        tag: 'test-project',
        friendlyName: 'Test Project',
        collection: 'test-collection',
        contextType: 'project',
        mode: 'active',
        iterationType: 'weekly',
        iterationStarted: '2024-01-01',
        syncDefault: 'auto',
        syncModes: ['manual', 'auto'],
        reloadCarryForwardAll: false,
        reloadFocusItemCount: 5,
        reloadCarryForwardTags: ['urgent', 'important'],
        active: true,
        priority: 1
      };

      expect(frontmatter.tag).toBe('test-project');
      expect(frontmatter.contextType).toBe('project');
      expect(frontmatter.active).toBe(true);
    });
  });

  describe('CrossrefEntry', () => {
    it('should create valid crossref entry', () => {
      const entry: CrossrefEntry = {
        tag: 'test-tag',
        trackerFile: '/path/to/tracker.md',
        collectionFile: '/path/to/collection.md',
        priority: 1,
        contextType: 'business',
        active: true,
        _note: 'Optional note'
      };

      expect(entry.tag).toBe('test-tag');
      expect(entry.active).toBe(true);
      expect(entry.contextType).toBe('business');
    });
  });

  describe('CaptureInput', () => {
    it('should create valid capture input for text', () => {
      const input: CaptureInput = {
        text: 'Test capture input',
        inputType: 'text',
        timestamp: new Date('2024-01-01')
      };

      expect(input.text).toBe('Test capture input');
      expect(input.inputType).toBe('text');
      expect(input.timestamp).toEqual(new Date('2024-01-01'));
    });

    it('should create valid capture input for voice', () => {
      const input: CaptureInput = {
        text: 'Voice transcription',
        inputType: 'voice',
        forceContext: 'business'
      };

      expect(input.inputType).toBe('voice');
      expect(input.forceContext).toBe('business');
    });
  });

  describe('InferenceResult', () => {
    it('should create valid inference result', () => {
      const result: InferenceResult = {
        primaryTracker: 'project-55',
        confidence: 0.95,
        overallReasoning: 'High confidence match based on keywords',
        generatedItems: [{
          tracker: 'project-55',
          itemType: 'action',
          priority: 'high',
          content: '- [ ] #task Test action item #project-55 ⏫',
          reasoning: 'Clear actionable task'
        }],
        taskCompletions: [],
        requiresReview: false
      };

      expect(result.confidence).toBe(0.95);
      expect(result.primaryTracker).toBe('project-55');
      expect(result.generatedItems).toHaveLength(1);
      expect(result.generatedItems[0].itemType).toBe('action');
      expect(result.requiresReview).toBe(false);
    });
  });

  describe('ChurnConfig', () => {
    it('should create valid configuration', () => {
      const config: ChurnConfig = {
        collectionsPath: '/path/to/collections',
        trackingPath: '/path/to/tracking',
        crossrefPath: '/path/to/crossref.json',
        aiProvider: 'openai',
        aiApiKey: 'test-api-key',
        confidenceThreshold: 0.7
      };

      expect(config.aiProvider).toBe('openai');
      expect(config.confidenceThreshold).toBe(0.7);
    });
  });

  describe('CaptureResult', () => {
    it('should create successful capture result', () => {
      const result: CaptureResult = {
        success: true,
        primaryTracker: 'gsc-ai',
        confidence: 0.9,
        itemResults: [{
          success: true,
          tracker: 'gsc-ai',
          itemType: 'action',
          formattedEntry: '- [ ] #task Successfully captured #gsc-ai'
        }],
        completedTasks: [],
        requiresReview: false
      };

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.primaryTracker).toBe('gsc-ai');
      expect(result.itemResults).toHaveLength(1);
    });

    it('should create failed capture result with error', () => {
      const result: CaptureResult = {
        success: false,
        primaryTracker: 'none',
        confidence: 0.1,
        itemResults: [{
          success: false,
          tracker: 'none',
          itemType: 'review',
          formattedEntry: 'Failed capture attempt',
          error: 'Write failed'
        }],
        completedTasks: [],
        requiresReview: true,
        error: 'AI service unavailable'
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('AI service unavailable');
      expect(result.requiresReview).toBe(true);
      expect(result.primaryTracker).toBe('none');
    });
  });

  // v0.3.1 Review System Type Tests
  describe('Review Types', () => {
    describe('ReviewAction', () => {
      it('should include all expected review actions', () => {
        const actions: ReviewAction[] = ['accept', 'edit-priority', 'edit-tags', 'edit-type', 'move', 'reject'];
        
        // Test that all actions are valid
        actions.forEach(action => {
          expect(typeof action).toBe('string');
        });
      });
    });

    describe('ReviewStatus', () => {
      it('should include all expected review statuses', () => {
        const statuses: ReviewStatus[] = ['pending', 'flagged', 'confirmed'];
        
        statuses.forEach(status => {
          expect(typeof status).toBe('string');
        });
      });
    });

    describe('ReviewSource', () => {
      it('should include all expected review sources', () => {
        const sources: ReviewSource[] = ['capture', 'inference'];
        
        sources.forEach(source => {
          expect(typeof source).toBe('string');
        });
      });
    });

    describe('ReviewableItem', () => {
      it('should create valid reviewable item', () => {
        const reviewItem: ReviewableItem = {
          id: 'review_123',
          content: 'Test reviewable item',
          confidence: 0.75,
          currentSection: 'actions',
          currentTracker: 'test-tracker',
          timestamp: new Date(),
          source: 'capture',
          reviewStatus: 'flagged',
          metadata: {
            keywords: ['test', 'review'],
            urgency: 'medium',
            type: 'action',
            editableFields: ['tracker', 'priority']
          }
        };

        expect(reviewItem.id).toBe('review_123');
        expect(reviewItem.confidence).toBe(0.75);
        expect(reviewItem.reviewStatus).toBe('flagged');
        expect(reviewItem.metadata.type).toBe('action');
      });
    });

    describe('ReviewConfig', () => {
      it('should create valid review configuration', () => {
        const config: ReviewConfig = {
          autoReviewThreshold: 0.8,
          requireReviewThreshold: 0.5,
          defaultBatchSize: 10,
          colorOutput: true,
          showConfidenceScores: true
        };

        expect(config.autoReviewThreshold).toBe(0.8);
        expect(config.defaultBatchSize).toBe(10);
        expect(config.colorOutput).toBe(true);
      });
    });

    describe('ChurnConfig with Review', () => {
      it('should support optional review configuration', () => {
        const config: ChurnConfig = {
          collectionsPath: '/path/to/collections',
          trackingPath: '/path/to/tracking',
          crossrefPath: '/path/to/crossref.json',
          aiProvider: 'openai',
          aiApiKey: 'test-api-key',
          confidenceThreshold: 0.7,
          review: {
            autoReviewThreshold: 0.8,
            requireReviewThreshold: 0.5,
            defaultBatchSize: 10,
            colorOutput: true,
            showConfidenceScores: true
          }
        };

        expect(config.review?.autoReviewThreshold).toBe(0.8);
        expect(config.review?.defaultBatchSize).toBe(10);
      });
    });
  });
});
