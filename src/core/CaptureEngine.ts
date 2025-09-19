import { CaptureInput, CaptureResult, ChurnConfig } from "../types/churn.js";
import { TrackerManager } from "./TrackerManager.js";
import { InferenceEngine } from "./InferenceEngine.js";
import { FormattingUtils } from "../utils/FormattingUtils.js";

/**
 * Main capture engine for ChurnFlow
 *
 * This orchestrates the entire ADHD-friendly capture process:
 * 1. Accept natural language input
 * 2. Use AI to infer context and formatting
 * 3. Route to appropriate tracker
 * 4. Provide feedback with minimal cognitive overhead
 */
export class CaptureEngine {
  private trackerManager: TrackerManager;
  private inferenceEngine: InferenceEngine;
  private initialized = false;

  constructor(private config: ChurnConfig) {
    this.trackerManager = new TrackerManager(config);
    this.inferenceEngine = new InferenceEngine(config, this.trackerManager);
  }

  /**
   * Initialize the capture system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log("🧠 Initializing ChurnFlow capture system...");

    try {
      await this.trackerManager.initialize();
      this.initialized = true;
      console.log("✅ ChurnFlow ready for ADHD-friendly capture!");
    } catch (error) {
      console.error("❌ Failed to initialize ChurnFlow:", error);
      throw error;
    }
  }

  /**
   * Capture a thought, idea, or task with ADHD-friendly processing
   * Now supports multiple items from single capture
   */
  async capture(input: string | CaptureInput): Promise<CaptureResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Normalize input
    const captureInput: CaptureInput =
      typeof input === "string" ? { text: input, inputType: "text" } : input;

    console.log(`🎯 Capturing: "${captureInput.text}"`);

    try {
      // Use AI to infer routing and generate multiple items
      const inference = await this.inferenceEngine.inferCapture(captureInput);

      console.log(
        `🤖 AI inference: ${inference.primaryTracker} (${inference.confidence * 100}% confidence)`,
      );
      console.log(`📝 Analysis: ${inference.overallReasoning}`);
      console.log(
        `🔢 Generated ${inference.generatedItems.length} items, ${inference.taskCompletions.length} completions`,
      );

      // Handle low confidence - route to review
      if (inference.requiresReview) {
        return await this.routeToReview(captureInput, inference);
      }

      // Process task completions first
      const completedTasks = [];
      for (const completion of inference.taskCompletions) {
        console.log(
          `✅ Task completion detected: ${completion.description} in ${completion.tracker}`,
        );
        completedTasks.push(completion);
        // TODO: Actually mark tasks as complete in tracker files
      }

      // Process generated items
      const itemResults = [];
      for (const item of inference.generatedItems) {
        console.log(
          `📝 Processing ${item.itemType} for ${item.tracker}: ${item.reasoning}`,
        );

        let success: boolean;
        if (item.itemType === "activity") {
          success = await this.trackerManager.appendActivityToTracker(
            item.tracker,
            item.content,
          );
        } else {
          success = await this.trackerManager.appendToTracker(
            item.tracker,
            item.content,
          );
        }

        itemResults.push({
          success,
          tracker: item.tracker,
          itemType: item.itemType,
          formattedEntry: item.content,
          error: success ? undefined : `Failed to write to ${item.tracker}`,
        });

        if (success) {
          console.log(
            `✅ ${item.itemType} successfully added to ${item.tracker}`,
          );
        } else {
          console.error(`❌ Failed to add ${item.itemType} to ${item.tracker}`);
        }
      }

      // Determine overall success
      const overallSuccess = itemResults.some((result) => result.success);

      return {
        success: overallSuccess,
        primaryTracker: inference.primaryTracker,
        confidence: inference.confidence,
        itemResults,
        completedTasks,
        requiresReview: false,
      };
    } catch (error) {
      console.error("❌ Capture failed:", error);

      // Emergency fallback - try to save somewhere
      return await this.emergencyCapture(captureInput, error as Error);
    }
  }

  /**
   * Route items that need human review
   */
  private async routeToReview(
    input: CaptureInput,
    inference?: any,
  ): Promise<CaptureResult> {
    console.log("📋 Routing to review queue (needs human attention)");

    // Create a review entry with context
    const reviewEntry = this.formatReviewEntry(input, inference);

    // Try to append to a review tracker or create inline review
    const success = await this.appendToReviewTracker(reviewEntry);

    return {
      success,
      primaryTracker: "review",
      confidence: inference?.confidence || 0.1,
      itemResults: [
        {
          success,
          tracker: "review",
          itemType: "review",
          formattedEntry: reviewEntry,
          error: success ? undefined : "Failed to save to review tracker",
        },
      ],
      completedTasks: [],
      requiresReview: true,
    };
  }

  /**
   * Emergency capture when everything else fails
   */
  private async emergencyCapture(
    input: CaptureInput,
    error: Error,
  ): Promise<CaptureResult> {
    console.log("🚨 Emergency capture - saving raw input");

    // Format as basic entry with error context
    const timestamp = new Date().toISOString();
    const emergencyEntry = `- [ ] EMERGENCY CAPTURE [${timestamp}]: ${input.text} (Error: ${error.message})`;

    // Try to append to any available tracker
    const trackers = this.trackerManager.getTrackersByContext();
    for (const tracker of trackers) {
      try {
        const success = await this.trackerManager.appendToTracker(
          tracker.frontmatter.tag,
          emergencyEntry,
        );
        if (success) {
          console.log(
            `🆘 Emergency capture saved to ${tracker.frontmatter.tag}`,
          );
          return {
            success: true,
            primaryTracker: tracker.frontmatter.tag,
            confidence: 0.1,
            itemResults: [
              {
                success: true,
                tracker: tracker.frontmatter.tag,
                itemType: "action",
                formattedEntry: emergencyEntry,
              },
            ],
            completedTasks: [],
            requiresReview: true,
          };
        }
      } catch {
        continue; // Try next tracker
      }
    }

    // Complete failure
    return {
      success: false,
      primaryTracker: "none",
      confidence: 0,
      itemResults: [
        {
          success: false,
          tracker: "none",
          itemType: "action",
          formattedEntry: emergencyEntry,
          error: `Complete capture failure: ${error.message}`,
        },
      ],
      completedTasks: [],
      requiresReview: true,
      error: `Complete capture failure: ${error.message}`,
    };
  }

  /**
   * Format an entry for the review queue
   */
  private formatReviewEntry(input: CaptureInput, inference?: any): string {
    const confidence = inference?.confidence || 0.1;
    const description = `REVIEW NEEDED: ${input.text}`;
    
    if (inference) {
      const enhancedDescription = `${description} (AI suggested: ${inference.inferredTracker})`;
      return FormattingUtils.formatEntry("review", enhancedDescription, { confidence });
    }
    
    return FormattingUtils.formatEntry("review", description, { confidence });
  }

  /**
   * Append to a dedicated review tracker
   */
  private async appendToReviewTracker(entry: string): Promise<boolean> {
    // Try to find a review or inbox tracker
    const reviewTracker =
      this.trackerManager.getTracker("review") ||
      this.trackerManager.getTracker("inbox") ||
      this.trackerManager.getTracker("churn-system"); // Fallback to system tracker

    if (reviewTracker) {
      return await this.trackerManager.appendToTracker(
        reviewTracker.frontmatter.tag,
        entry,
      );
    }

    return false;
  }

  /**
   * Voice capture helper (for future voice integration)
   */
  async captureVoice(audioData: any): Promise<CaptureResult> {
    // TODO: Implement voice-to-text conversion
    // For now, this is a placeholder
    throw new Error("Voice capture not yet implemented");
  }

  /**
   * Batch capture for processing multiple items
   */
  async captureBatch(
    inputs: (string | CaptureInput)[],
  ): Promise<CaptureResult[]> {
    const results: CaptureResult[] = [];

    for (const input of inputs) {
      try {
        const result = await this.capture(input);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          primaryTracker: "none",
          confidence: 0,
          itemResults: [
            {
              success: false,
              tracker: "none",
              itemType: "review",
              formattedEntry: typeof input === "string" ? input : input.text,
              error: error instanceof Error ? error.message : "Unknown error",
            },
          ],
          completedTasks: [],
          requiresReview: true,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Get system status for debugging
   */
  getStatus(): Record<string, any> {
    const trackers = this.trackerManager.getTrackersByContext();

    return {
      initialized: this.initialized,
      totalTrackers: trackers.length,
      trackersByContext: trackers.reduce(
        (acc, tracker) => {
          const type = tracker.frontmatter.contextType;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      config: {
        collectionsPath: this.config.collectionsPath,
        aiProvider: this.config.aiProvider,
        confidenceThreshold: this.config.confidenceThreshold,
      },
    };
  }

  /**
   * Refresh system data (useful after manual tracker updates)
   */
  async refresh(): Promise<void> {
    console.log("🔄 Refreshing ChurnFlow system...");
    await this.trackerManager.refresh();
    console.log("✅ System refreshed");
  }
}
