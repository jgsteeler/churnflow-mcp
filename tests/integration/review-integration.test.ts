import { CaptureEngine } from '../../src/core/CaptureEngine.js';
import { ChurnConfig } from '../../src/types/churn.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Review System Integration', () => {
  let captureEngine: CaptureEngine;
  let tempDir: string;
  let config: ChurnConfig;

  beforeEach(async () => {
    // Create temporary directory structure
    tempDir = `/tmp/churn-test-${Date.now()}`;
    const collectionsPath = path.join(tempDir, 'collections');
    const trackingPath = path.join(tempDir, 'tracking');
    const crossrefPath = path.join(tempDir, 'crossref.json');

    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(collectionsPath, { recursive: true });
    await fs.mkdir(trackingPath, { recursive: true });

    // Create minimal crossref
    const crossref = [{
      tag: 'test-tracker',
      trackerFile: path.join(trackingPath, 'test-tracker.md'),
      collectionFile: path.join(collectionsPath, 'test-collection.md'),
      priority: 1,
      contextType: 'business' as const,
      active: true
    }, {
      tag: 'review',
      trackerFile: path.join(trackingPath, 'review.md'),
      collectionFile: path.join(collectionsPath, 'review.md'),
      priority: 2,
      contextType: 'system' as const,
      active: true
    }];
    await fs.writeFile(crossrefPath, JSON.stringify(crossref, null, 2));

    // Create minimal tracker
    const trackerContent = `---
tag: test-tracker
friendlyName: Test Tracker
collection: test-collection
contextType: business
mode: daily
iterationType: week
iterationStarted: 2024-01-01
syncDefault: daily
syncModes: [daily, weekly]
reloadCarryForwardAll: true
reloadFocusItemCount: 5
reloadCarryForwardTags: []
active: true
---

# Test Tracker — Tracker

## Action Items

## Activity Log
`;
    await fs.writeFile(path.join(trackingPath, 'test-tracker.md'), trackerContent);

    // Create review tracker for fallback tests
    const reviewTrackerContent = `---
tag: review
friendlyName: Review Tracker
collection: review
contextType: system
mode: daily
iterationType: week
iterationStarted: 2024-01-01
syncDefault: daily
syncModes: [daily, weekly]
reloadCarryForwardAll: true
reloadFocusItemCount: 5
reloadCarryForwardTags: []
active: true
---

# Review Tracker — Tracker

## Review Queue

## Activity Log
`;
    await fs.writeFile(path.join(trackingPath, 'review.md'), reviewTrackerContent);

    config = {
      collectionsPath,
      trackingPath,
      crossrefPath,
      aiProvider: 'openai' as const,
      aiApiKey: 'fake-key',
      confidenceThreshold: 0.7,
      review: {
        autoReviewThreshold: 0.8,
        requireReviewThreshold: 0.5,
        defaultBatchSize: 10,
        colorOutput: true,
        showConfidenceScores: true
      }
    };

    captureEngine = new CaptureEngine(config);
    await captureEngine.initialize();
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Low-confidence capture routing', () => {
    it('should route low-confidence captures to ReviewManager instead of trackers', async () => {
      // Mock the inference engine to return low confidence
      const originalInferCapture = captureEngine['inferenceEngine'].inferCapture;
      jest.spyOn(captureEngine['inferenceEngine'], 'inferCapture').mockResolvedValue({
        primaryTracker: 'test-tracker',
        confidence: 0.3, // Below threshold
        overallReasoning: 'Low confidence test',
        generatedItems: [{
          tracker: 'test-tracker',
          itemType: 'action',
          priority: 'medium',
          content: 'Test low confidence item',
          reasoning: 'Test reasoning'
        }],
        taskCompletions: [],
        requiresReview: true
      });

      // Capture with low confidence
      const result = await captureEngine.capture('ambiguous test input');

      // Verify result indicates review routing
      expect(result.success).toBe(true);
      expect(result.requiresReview).toBe(true);
      expect(result.primaryTracker).toBe('review');
      expect(result.itemResults).toHaveLength(1);
      expect(result.itemResults[0].tracker).toBe('review');

      // Verify item was flagged in ReviewManager
      const reviewManager = captureEngine['reviewManager'];
      const reviewItems = reviewManager.getItemsNeedingReview();
      expect(reviewItems).toHaveLength(1);
      expect(reviewItems[0].content).toBe('ambiguous test input');
      expect(reviewItems[0].confidence).toBe(0.3);
      expect(reviewItems[0].source).toBe('capture');
      expect(reviewItems[0].reviewStatus).toBe('pending'); // Low confidence = pending
    });

    it('should extract keywords for review metadata', async () => {
      // Mock low-confidence inference
      jest.spyOn(captureEngine['inferenceEngine'], 'inferCapture').mockResolvedValue({
        primaryTracker: 'test-tracker',
        confidence: 0.4,
        overallReasoning: 'Low confidence test',
        generatedItems: [{
          tracker: 'test-tracker',
          itemType: 'action',
          priority: 'high',
          content: 'Important project task',
          reasoning: 'Test reasoning'
        }],
        taskCompletions: [],
        requiresReview: true
      });

      await captureEngine.capture('urgent project meeting schedule');

      const reviewManager = captureEngine['reviewManager'];
      const reviewItems = reviewManager.getItemsNeedingReview();
      expect(reviewItems).toHaveLength(1);
      
      const item = reviewItems[0];
      expect(item.metadata.keywords).toContain('urgent');
      expect(item.metadata.keywords).toContain('project');
      expect(item.metadata.keywords).toContain('meeting');
      expect(item.metadata.keywords).toContain('schedule');
      expect(item.metadata.type).toBe('action');
    });
  });

  describe('High-confidence capture bypass', () => {
    it('should bypass ReviewManager for high-confidence captures', async () => {
      // Mock high-confidence inference
      jest.spyOn(captureEngine['inferenceEngine'], 'inferCapture').mockResolvedValue({
        primaryTracker: 'test-tracker',
        confidence: 0.9, // Above threshold
        overallReasoning: 'High confidence test',
        generatedItems: [{
          tracker: 'test-tracker',
          itemType: 'action',
          priority: 'medium',
          content: '- [ ] #task Clear test action #test-tracker 🔼',
          reasoning: 'Clear action item'
        }],
        taskCompletions: [],
        requiresReview: false
      });

      const result = await captureEngine.capture('clear action item test');

      // Verify direct tracker routing
      expect(result.success).toBe(true);
      expect(result.requiresReview).toBe(false);
      expect(result.primaryTracker).toBe('test-tracker');
      expect(result.confidence).toBe(0.9);

      // Verify no items in review queue
      const reviewManager = captureEngine['reviewManager'];
      const reviewItems = reviewManager.getItemsNeedingReview();
      expect(reviewItems).toHaveLength(0);
    });
  });

  describe('Error handling', () => {
    it('should fallback to old behavior if ReviewManager fails', async () => {
      // Mock low confidence inference
      jest.spyOn(captureEngine['inferenceEngine'], 'inferCapture').mockResolvedValue({
        primaryTracker: 'test-tracker',
        confidence: 0.3,
        overallReasoning: 'Low confidence test',
        generatedItems: [{
          tracker: 'test-tracker',
          itemType: 'action',
          priority: 'medium',
          content: 'Test item',
          reasoning: 'Test reasoning'
        }],
        taskCompletions: [],
        requiresReview: true
      });

      // Mock ReviewManager.flagItemForReview to throw error
      const reviewManager = captureEngine['reviewManager'];
      jest.spyOn(reviewManager, 'flagItemForReview').mockImplementation(() => {
        throw new Error('ReviewManager error');
      });

      const result = await captureEngine.capture('test input');

      // Should still succeed with fallback
      expect(result.success).toBe(true);
      expect(result.requiresReview).toBe(true);
      expect(result.primaryTracker).toBe('review');
    });
  });

  describe('Configuration integration', () => {
    it('should use configuration confidence threshold for review decisions', () => {
      const threshold = config.confidenceThreshold;
      expect(threshold).toBe(0.7);
      
      // Test the InferenceEngine shouldFlagForReview method directly
      const shouldFlag1 = captureEngine['inferenceEngine'].shouldFlagForReview(0.6, 'action');
      const shouldFlag2 = captureEngine['inferenceEngine'].shouldFlagForReview(0.8, 'action');
      
      expect(shouldFlag1).toBe(true);  // Below threshold
      expect(shouldFlag2).toBe(false); // Above threshold (but action items have stricter criteria)
    });
  });
});