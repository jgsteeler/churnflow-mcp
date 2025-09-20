import {
  ReviewableItem,
  ReviewAction,
  ReviewStatus,
  ReviewSource,
  ItemType,
  Priority,
  ChurnConfig,
} from "../types/churn.js";
import { TrackerManager } from "./TrackerManager.js";
import { FormattingUtils } from "../utils/FormattingUtils.js";

/**
 * ReviewManager - Core class for managing reviewable items and their workflows
 *
 * Provides ADHD-friendly interface for reviewing, editing, and managing items
 * that need human attention before final placement in trackers.
 */
export class ReviewManager {
  private reviewItems: Map<string, ReviewableItem> = new Map();

  constructor(
    private config: ChurnConfig,
    private trackerManager: TrackerManager,
  ) {}

  /**
   * Flag an item for review with given confidence and metadata
   */
  flagItemForReview(
    content: string,
    confidence: number,
    tracker: string,
    section: string,
    source: ReviewSource,
    metadata: {
      keywords?: string[];
      urgency?: Priority;
      type?: ItemType;
      editableFields?: string[];
    } = {},
  ): ReviewableItem {
    const id = this.generateItemId();
    const reviewItem: ReviewableItem = {
      id,
      content,
      confidence,
      currentSection: section,
      currentTracker: tracker,
      timestamp: new Date(),
      source,
      reviewStatus: confidence < 0.5 ? "pending" : "flagged",
      metadata: {
        keywords: metadata.keywords || [],
        urgency: metadata.urgency || "medium",
        type: metadata.type || "review",
        editableFields: metadata.editableFields || [
          "tracker",
          "priority",
          "tags",
          "type",
        ],
      },
    };

    this.reviewItems.set(id, reviewItem);
    return reviewItem;
  }

  /**
   * Get all items that need review, optionally filtered by tracker
   */
  getItemsNeedingReview(tracker?: string): ReviewableItem[] {
    const items = Array.from(this.reviewItems.values());

    if (tracker) {
      return items.filter(
        (item) =>
          item.currentTracker === tracker &&
          (item.reviewStatus === "pending" || item.reviewStatus === "flagged"),
      );
    }

    return items.filter(
      (item) =>
        item.reviewStatus === "pending" || item.reviewStatus === "flagged",
    );
  }

  /**
   * Get review status counts for dashboard indicators
   */
  getReviewStatus(): {
    pending: number;
    flagged: number;
    confirmed: number;
    total: number;
  } {
    const items = Array.from(this.reviewItems.values());

    return {
      pending: items.filter((item) => item.reviewStatus === "pending").length,
      flagged: items.filter((item) => item.reviewStatus === "flagged").length,
      confirmed: items.filter((item) => item.reviewStatus === "confirmed")
        .length,
      total: items.length,
    };
  }

  /**
   * Process a review action on an item
   */
  async processReviewAction(
    itemId: string,
    action: ReviewAction,
    newValues?: {
      tracker?: string;
      priority?: Priority;
      tags?: string[];
      type?: ItemType;
      content?: string;
    },
  ): Promise<boolean> {
    const item = this.reviewItems.get(itemId);
    if (!item) {
      throw new Error(`Review item with ID ${itemId} not found`);
    }

    switch (action) {
      case "accept":
        return this.acceptItem(item);

      case "edit-priority":
        if (newValues?.priority) {
          item.metadata.urgency = newValues.priority;
          return this.updateItemContent(item);
        }
        break;

      case "edit-tags":
        if (newValues?.tags) {
          item.metadata.keywords = newValues.tags;
          return this.updateItemContent(item);
        }
        break;

      case "edit-type":
        if (newValues?.type) {
          item.metadata.type = newValues.type;
          return this.updateItemContent(item);
        }
        break;

      case "move":
        if (newValues?.tracker) {
          item.currentTracker = newValues.tracker;
          return this.updateItemContent(item);
        }
        break;

      case "reject":
        return this.rejectItem(itemId);

      default:
        throw new Error(`Unknown review action: ${action}`);
    }

    return false;
  }

  /**
   * Accept an item and move it to its final tracker location
   */
  private async acceptItem(item: ReviewableItem): Promise<boolean> {
    try {
      // Format the content for final placement
      const formattedContent = FormattingUtils.formatEntry(
        item.metadata.type,
        item.content,
        {
          priority: item.metadata.urgency,
          tag: item.metadata.keywords[0], // Use first keyword as tag if available
        },
      );

      // Write to the target tracker
      const success = await this.trackerManager.appendToTracker(
        item.currentTracker,
        formattedContent,
      );

      if (success) {
        item.reviewStatus = "confirmed";
        this.reviewItems.delete(item.id); // Remove from review queue
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error accepting review item:", error);
      return false;
    }
  }

  /**
   * Update item content based on current metadata
   */
  private updateItemContent(item: ReviewableItem): boolean {
    try {
      // Regenerate formatted content with updated metadata
      const formattedContent = FormattingUtils.formatEntry(
        item.metadata.type,
        item.content,
        {
          priority: item.metadata.urgency,
          tag: item.metadata.keywords[0], // Use first keyword as tag if available
        },
      );

      item.content = formattedContent;
      return true;
    } catch (error) {
      console.error("Error updating item content:", error);
      return false;
    }
  }

  /**
   * Reject an item and remove it from review queue
   */
  private rejectItem(itemId: string): boolean {
    return this.reviewItems.delete(itemId);
  }

  /**
   * Get a specific reviewable item by ID
   */
  getReviewItem(itemId: string): ReviewableItem | undefined {
    return this.reviewItems.get(itemId);
  }

  /**
   * Update the review status of an item
   */
  updateReviewStatus(itemId: string, status: ReviewStatus): boolean {
    const item = this.reviewItems.get(itemId);
    if (item) {
      item.reviewStatus = status;
      return true;
    }
    return false;
  }

  /**
   * Batch process multiple review items
   */
  async batchProcessReview(
    actions: Array<{ itemId: string; action: ReviewAction; newValues?: any }>,
  ): Promise<{
    success: number;
    failed: number;
    results: Array<{ itemId: string; success: boolean; error?: string }>;
  }> {
    const results: Array<{ itemId: string; success: boolean; error?: string }> =
      [];
    let successCount = 0;
    let failedCount = 0;

    for (const { itemId, action, newValues } of actions) {
      try {
        const success = await this.processReviewAction(
          itemId,
          action,
          newValues,
        );
        results.push({ itemId, success });
        if (success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        results.push({
          itemId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        failedCount++;
      }
    }

    return {
      success: successCount,
      failed: failedCount,
      results,
    };
  }

  /**
   * Clear all confirmed items from the review queue
   */
  clearConfirmedItems(): number {
    const confirmedItems = Array.from(this.reviewItems.entries()).filter(
      ([_, item]) => item.reviewStatus === "confirmed",
    );

    confirmedItems.forEach(([id, _]) => this.reviewItems.delete(id));

    return confirmedItems.length;
  }

  /**
   * Generate a unique ID for review items
   */
  private generateItemId(): string {
    return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
