import { ReviewManager } from '../../src/core/ReviewManager.js';
import { TrackerManager } from '../../src/core/TrackerManager.js';
import { 
  ReviewableItem, 
  ReviewAction, 
  ReviewStatus,
  ChurnConfig 
} from '../../src/types/churn.js';

// Mock TrackerManager
const mockTrackerManager = {
  appendToTracker: jest.fn().mockResolvedValue(true),
  getContextMap: jest.fn(),
  refresh: jest.fn()
} as jest.Mocked<Partial<TrackerManager>>;

// Mock config
const mockConfig: ChurnConfig = {
  collectionsPath: './test-collections',
  trackingPath: './test-tracking',
  crossrefPath: './test-crossref.json',
  aiProvider: 'openai',
  aiApiKey: 'test-key',
  confidenceThreshold: 0.7
};

describe('ReviewManager', () => {
  let reviewManager: ReviewManager;

  beforeEach(() => {
    reviewManager = new ReviewManager(mockConfig, mockTrackerManager as TrackerManager);
    jest.clearAllMocks();
  });

  describe('flagItemForReview', () => {
    it('should create a reviewable item with correct defaults', () => {
      const content = 'Test review item';
      const confidence = 0.6;
      const tracker = 'test-tracker';
      const section = 'actions';

      const reviewItem = reviewManager.flagItemForReview(
        content,
        confidence,
        tracker,
        section,
        'capture'
      );

      expect(reviewItem).toMatchObject({
        content,
        confidence,
        currentTracker: tracker,
        currentSection: section,
        source: 'capture',
        reviewStatus: 'flagged', // confidence >= 0.5
        metadata: {
          keywords: [],
          urgency: 'medium',
          type: 'review',
          editableFields: ['tracker', 'priority', 'tags', 'type']
        }
      });
      expect(reviewItem.id).toMatch(/^review_\d+_[a-z0-9]+$/);
      expect(reviewItem.timestamp).toBeInstanceOf(Date);
    });

    it('should set status to pending for low confidence items', () => {
      const reviewItem = reviewManager.flagItemForReview(
        'Low confidence item',
        0.3,
        'test-tracker',
        'actions',
        'inference'
      );

      expect(reviewItem.reviewStatus).toBe('pending');
    });

    it('should use provided metadata', () => {
      const metadata = {
        keywords: ['urgent', 'task'],
        urgency: 'high' as const,
        type: 'action' as const,
        editableFields: ['priority']
      };

      const reviewItem = reviewManager.flagItemForReview(
        'Test item',
        0.8,
        'test-tracker',
        'actions',
        'capture',
        metadata
      );

      expect(reviewItem.metadata).toEqual(metadata);
    });
  });

  describe('getItemsNeedingReview', () => {
    beforeEach(() => {
      // Add some test items
      reviewManager.flagItemForReview('Item 1', 0.3, 'tracker1', 'actions', 'capture');
      reviewManager.flagItemForReview('Item 2', 0.8, 'tracker1', 'actions', 'capture');
      reviewManager.flagItemForReview('Item 3', 0.6, 'tracker2', 'references', 'inference');
    });

    it('should return all items needing review when no tracker specified', () => {
      const items = reviewManager.getItemsNeedingReview();
      expect(items).toHaveLength(3);
      expect(items.every(item => 
        item.reviewStatus === 'pending' || item.reviewStatus === 'flagged'
      )).toBe(true);
    });

    it('should filter by tracker when specified', () => {
      const items = reviewManager.getItemsNeedingReview('tracker1');
      expect(items).toHaveLength(2);
      expect(items.every(item => item.currentTracker === 'tracker1')).toBe(true);
    });

    it('should exclude confirmed items', () => {
      const items = reviewManager.getItemsNeedingReview();
      const firstItem = items[0];
      
      // Confirm one item
      reviewManager.updateReviewStatus(firstItem.id, 'confirmed');
      
      const updatedItems = reviewManager.getItemsNeedingReview();
      expect(updatedItems).toHaveLength(2);
      expect(updatedItems.find(item => item.id === firstItem.id)).toBeUndefined();
    });
  });

  describe('getReviewStatus', () => {
    beforeEach(() => {
      reviewManager.flagItemForReview('Pending item', 0.3, 'tracker1', 'actions', 'capture');
      reviewManager.flagItemForReview('Flagged item', 0.8, 'tracker1', 'actions', 'capture');
      
      const items = reviewManager.getItemsNeedingReview();
      reviewManager.updateReviewStatus(items[1].id, 'confirmed');
    });

    it('should return correct status counts', () => {
      const status = reviewManager.getReviewStatus();
      
      expect(status).toEqual({
        pending: 1,
        flagged: 0,
        confirmed: 1,
        total: 2
      });
    });
  });

  describe('processReviewAction', () => {
    let reviewItem: ReviewableItem;

    beforeEach(() => {
      reviewItem = reviewManager.flagItemForReview(
        'Test action item',
        0.8,
        'test-tracker',
        'actions',
        'capture'
      );
    });

    it('should accept an item and move to tracker', async () => {
      const result = await reviewManager.processReviewAction(reviewItem.id, 'accept');

      expect(result).toBe(true);
      expect(mockTrackerManager.appendToTracker).toHaveBeenCalledWith(
        'test-tracker',
        expect.any(String)
      );
      
      // Item should be removed from review queue
      expect(reviewManager.getReviewItem(reviewItem.id)).toBeUndefined();
    });

    it('should edit priority', async () => {
      const result = await reviewManager.processReviewAction(
        reviewItem.id, 
        'edit-priority',
        { priority: 'high' }
      );

      expect(result).toBe(true);
      
      const updatedItem = reviewManager.getReviewItem(reviewItem.id);
      expect(updatedItem?.metadata.urgency).toBe('high');
    });

    it('should edit tags', async () => {
      const newTags = ['urgent', 'task'];
      const result = await reviewManager.processReviewAction(
        reviewItem.id,
        'edit-tags',
        { tags: newTags }
      );

      expect(result).toBe(true);
      
      const updatedItem = reviewManager.getReviewItem(reviewItem.id);
      expect(updatedItem?.metadata.keywords).toEqual(newTags);
    });

    it('should edit type', async () => {
      const result = await reviewManager.processReviewAction(
        reviewItem.id,
        'edit-type',
        { type: 'action' }
      );

      expect(result).toBe(true);
      
      const updatedItem = reviewManager.getReviewItem(reviewItem.id);
      expect(updatedItem?.metadata.type).toBe('action');
    });

    it('should move item to different tracker', async () => {
      const result = await reviewManager.processReviewAction(
        reviewItem.id,
        'move',
        { tracker: 'new-tracker' }
      );

      expect(result).toBe(true);
      
      const updatedItem = reviewManager.getReviewItem(reviewItem.id);
      expect(updatedItem?.currentTracker).toBe('new-tracker');
    });

    it('should reject and remove item', async () => {
      const result = await reviewManager.processReviewAction(reviewItem.id, 'reject');

      expect(result).toBe(true);
      expect(reviewManager.getReviewItem(reviewItem.id)).toBeUndefined();
    });

    it('should throw error for non-existent item', async () => {
      await expect(
        reviewManager.processReviewAction('non-existent', 'accept')
      ).rejects.toThrow('Review item with ID non-existent not found');
    });

    it('should throw error for unknown action', async () => {
      await expect(
        reviewManager.processReviewAction(reviewItem.id, 'unknown' as ReviewAction)
      ).rejects.toThrow('Unknown review action: unknown');
    });
  });

  describe('batchProcessReview', () => {
    let reviewItems: ReviewableItem[];

    beforeEach(() => {
      reviewItems = [
        reviewManager.flagItemForReview('Item 1', 0.8, 'tracker1', 'actions', 'capture'),
        reviewManager.flagItemForReview('Item 2', 0.6, 'tracker1', 'actions', 'capture'),
        reviewManager.flagItemForReview('Item 3', 0.9, 'tracker2', 'references', 'inference')
      ];
    });

    it('should process multiple actions successfully', async () => {
      const actions = [
        { itemId: reviewItems[0].id, action: 'accept' as ReviewAction },
        { itemId: reviewItems[1].id, action: 'edit-priority' as ReviewAction, newValues: { priority: 'high' } },
        { itemId: reviewItems[2].id, action: 'reject' as ReviewAction }
      ];

      const result = await reviewManager.batchProcessReview(actions);

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.results.every(r => r.success)).toBe(true);
    });

    it('should handle individual failures in batch', async () => {
      const actions = [
        { itemId: 'non-existent', action: 'accept' as ReviewAction },
        { itemId: reviewItems[1].id, action: 'edit-priority' as ReviewAction, newValues: { priority: 'high' } }
      ];

      const result = await reviewManager.batchProcessReview(actions);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('not found');
      expect(result.results[1].success).toBe(true);
    });
  });

  describe('clearConfirmedItems', () => {
    it('should remove only confirmed items', () => {
      const item1 = reviewManager.flagItemForReview('Item 1', 0.8, 'tracker1', 'actions', 'capture');
      const item2 = reviewManager.flagItemForReview('Item 2', 0.6, 'tracker1', 'actions', 'capture');
      
      reviewManager.updateReviewStatus(item1.id, 'confirmed');
      
      const clearedCount = reviewManager.clearConfirmedItems();
      
      expect(clearedCount).toBe(1);
      expect(reviewManager.getReviewItem(item1.id)).toBeUndefined();
      expect(reviewManager.getReviewItem(item2.id)).toBeDefined();
    });
  });

  describe('updateReviewStatus', () => {
    it('should update status for existing item', () => {
      const item = reviewManager.flagItemForReview('Test item', 0.8, 'tracker1', 'actions', 'capture');
      
      const result = reviewManager.updateReviewStatus(item.id, 'confirmed');
      
      expect(result).toBe(true);
      expect(reviewManager.getReviewItem(item.id)?.reviewStatus).toBe('confirmed');
    });

    it('should return false for non-existent item', () => {
      const result = reviewManager.updateReviewStatus('non-existent', 'confirmed');
      expect(result).toBe(false);
    });
  });
});