import { 
  CaptureInput, 
  CaptureResult, 
  ChurnConfig 
} from '../types/churn.js';
import { TrackerManager } from './TrackerManager.js';
import { InferenceEngine } from './InferenceEngine.js';
import { ReviewManager } from './ReviewManager.js';
import { FormattingUtils } from '../utils/FormattingUtils.js';
import { DatabaseManager } from '../storage/DatabaseManager.js';

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
  private reviewManager: ReviewManager;
  private databaseManager: DatabaseManager;
  private databaseAvailable = false;
  private initialized = false;

  constructor(private config: ChurnConfig) {
    this.trackerManager = new TrackerManager(config);
    this.inferenceEngine = new InferenceEngine(config, this.trackerManager);
    this.reviewManager = new ReviewManager(config, this.trackerManager);
    this.databaseManager = new DatabaseManager(); // Use default SQLite database
  }

  /**
   * Initialize the capture system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log("🧠 Initializing ChurnFlow capture system...");

    try {
      await this.trackerManager.initialize();
      
      // Initialize database (non-blocking - capture still works if DB fails)
      try {
        await this.databaseManager.initialize();
        this.databaseAvailable = true;
        console.log("✅ Database ready for capture storage!");
      } catch (dbError) {
        this.databaseAvailable = false;
        console.warn("⚠️ Database not available - using file-only mode. Run 'npm run db:setup' to enable database features.");
      }
      
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

    const captureInput: CaptureInput =
      typeof input === "string" ? { text: input, inputType: "text" } : input;

    console.log(`🎯 Capturing: "${captureInput.text}"`);

    // Step 1: Create a raw capture record in the database if available
    let rawCaptureId: string | null = null;
    if (this.databaseAvailable) {
      try {
        const rawCapture = await this.databaseManager.createRawCapture(captureInput.text, captureInput.inputType as 'manual' | 'voice' | 'api' | 'import');
        rawCaptureId = rawCapture.id;
        console.log(`📝 Raw capture created with ID: ${rawCaptureId}`);
      } catch (dbError) {
        console.warn("⚠️ Could not create raw capture in DB, continuing with file-based capture.", dbError);
      }
    }

    try {
      // Step 2: Use AI to infer routing and generate multiple items
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
        // If we have a DB record, update it to reflect the review status
        if (rawCaptureId && this.databaseAvailable) {
          await this.databaseManager.updateCapture(rawCaptureId, {
            status: 'active', // or a dedicated 'review' status if you add one
            aiReasoning: 'Low confidence, routed to review.',
            confidence: inference.confidence,
          });
        }
        return await this.routeToReview(captureInput, inference);
      }

      // Process task completions first
      const completedTasks = [];
      for (const completion of inference.taskCompletions) {
        console.log(`✅ Task completion detected: ${completion.description} in ${completion.tracker}`);
        
        const success = await this.trackerManager.markTaskComplete(
          completion.tracker,
          completion.description
        );
        
        completedTasks.push({
          ...completion,
          success
        });
        
        if (success) {
          console.log(`✅ Successfully marked task as complete: ${completion.description}`);
        } else {
          console.error(`❌ Failed to mark task as complete: ${completion.description}`);
        }
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

      const overallSuccess = itemResults.some((result) => result.success);
      
      // Step 3: Update the database record with the inference results
      if (rawCaptureId && this.databaseAvailable) {
        try {
          // For simplicity, we'll update the raw capture with the details of the *first* generated item.
          // A more complex implementation could create multiple linked captures.
          const primaryItem = inference.generatedItems[0];
          if (primaryItem) {
            const context = await this.databaseManager.getContextByName(primaryItem.tracker);
            
            let captureType: 'action' | 'note' | 'journal' | 'link' | 'someday' | 'reminder' | null = null;
            switch (primaryItem.itemType) {
              case 'action':
              case 'someday':
                captureType = primaryItem.itemType;
                break;
              case 'activity':
                captureType = 'journal';
                break;
              case 'reference':
                captureType = 'note';
                break;
              default:
                captureType = 'note';
            }

            await this.databaseManager.updateCapture(rawCaptureId, {
              item: primaryItem.content,
              captureType,
              priority: primaryItem.priority as 'critical' | 'high' | 'medium' | 'low',
              status: 'active',
              contextId: context?.id || null,
              confidence: inference.confidence,
              aiReasoning: primaryItem.reasoning,
              tags: JSON.stringify([primaryItem.tracker]),
              keywords: JSON.stringify(this.inferenceEngine.extractKeywords(captureInput.text)),
            });
            console.log(`💾 Capture record ${rawCaptureId} updated with AI inference.`);
          }
        } catch (dbError) {
          console.warn("⚠️ Failed to update capture in database:", dbError);
        }
      }

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

      // If we have a DB record, mark it as failed
      if (rawCaptureId && this.databaseAvailable) {
        await this.databaseManager.updateCapture(rawCaptureId, {
          status: 'cancelled', // Or a new 'failed' status
          aiReasoning: `Capture processing failed: ${(error as Error).message}`,
        });
      }

      return await this.emergencyCapture(captureInput, error as Error);
    }
  }

  /**
   * Save capture to database (non-blocking)
   */
  private async saveCaptureToDatabase(
    input: CaptureInput,
    inference: any,
    itemResults: any[],
    success: boolean
  ): Promise<void> {
    // This method is now superseded by the new capture flow, but we'll keep it for now.
    // The new flow creates a raw capture and then updates it.
    console.warn("Legacy `saveCaptureToDatabase` called. This should be phased out.");
    
    // Find or create context
    let contextId: string | null = null;
    if (inference.primaryTracker) {
      const existingContext = await this.databaseManager.getContextByName(inference.primaryTracker);
      if (existingContext) {
        contextId = existingContext.id;
      } else {
        const newContext = await this.databaseManager.createContext({
          name: inference.primaryTracker,
          displayName: inference.primaryTracker.charAt(0).toUpperCase() + inference.primaryTracker.slice(1),
          description: `Auto-created from ${inference.primaryTracker} tracker`,
          keywords: JSON.stringify([]),
          patterns: JSON.stringify([]),
        });
        contextId = newContext.id;
      }
    }

    // Save each generated item as a capture
    for (const item of inference.generatedItems) {
      let captureType: 'action' | 'note' | 'journal' | 'link' | 'someday' | 'reminder' | null = null;
      switch (item.itemType) {
        case 'action':
        case 'someday':
          captureType = item.itemType;
          break;
        case 'activity':
          captureType = 'journal';
          break;
        case 'reference':
          captureType = 'note';
          break;
        default:
          captureType = 'note';
      }
      
      const capture = {
        item: item.content,
        rawInput: input.text,
        captureType,
        priority: item.priority as 'critical' | 'high' | 'medium' | 'low',
        status: 'active' as const,
        contextId,
        confidence: inference.confidence,
        aiReasoning: item.reasoning,
        tags: JSON.stringify([inference.primaryTracker]),
        keywords: JSON.stringify(this.inferenceEngine.extractKeywords(input.text)),
        captureSource: input.inputType === 'voice' ? 'voice' as const : 'manual' as const,
      };

      await this.databaseManager.createCapture(capture);
      console.log(`💾 Saved to database: ${item.itemType} in ${inference.primaryTracker}`);
    }
  }

  /**
   * Route items that need human review
   */
  private async routeToReview(
    input: CaptureInput,
    inference?: any,
  ): Promise<CaptureResult> {
    console.log('📋 Routing to review queue (needs human attention)');
    
    try {
      // Use ReviewManager to flag item for review instead of direct tracker writing
      const reviewItem = this.reviewManager.flagItemForReview(
        input.text,
        inference?.confidence || 0.1,
        inference?.primaryTracker || 'review',
        'actions', // default section
        'capture', // source
        {
          keywords: this.inferenceEngine.extractKeywords(input.text),
          urgency: 'medium',
          type: inference?.generatedItems?.[0]?.itemType || 'review',
          editableFields: ['tracker', 'priority', 'tags', 'type']
        }
      );

      return {
        success: true,
        primaryTracker: 'review',
        confidence: inference?.confidence || 0.1,
        itemResults: [{
          success: true,
          tracker: 'review',
          itemType: 'review',
          formattedEntry: `Review item flagged: ${reviewItem.id}`,
          error: undefined
        }],
        completedTasks: [],
        requiresReview: true
      };
    } catch (error) {
      console.error('❌ Failed to flag item for review:', error);
      
      // Fallback mechanism: If ReviewManager integration fails (e.g., throws an error),
      // this fallback writes the review entry directly to the tracker files.
      // This ensures that review items are not lost even if the review queue cannot be updated.
      const reviewEntry = this.formatReviewEntry(input, inference);
      const success = await this.appendToReviewTracker(reviewEntry);
      
      return {
        success,
        primaryTracker: 'review',
        confidence: inference?.confidence || 0.1,
        itemResults: [{
          success,
          tracker: 'review',
          itemType: 'review',
          formattedEntry: reviewEntry,
          error: success ? undefined : 'Failed to save to review tracker'
        }],
        completedTasks: [],
        requiresReview: true
      };
    }
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
    const reviewTracker = this.trackerManager.getTracker("review") || 
                         this.trackerManager.getTracker("inbox") ||
                         this.trackerManager.getTracker("churn-system"); // Fallback to system tracker
    
    if (reviewTracker) {
      // Use the dedicated method to append to the Review Queue section
      return await this.trackerManager.appendReviewToTracker(reviewTracker.frontmatter.tag, entry);
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
