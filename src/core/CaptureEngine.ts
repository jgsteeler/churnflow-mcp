import { 
  CaptureInput, 
  CaptureResult, 
  ChurnConfig 
} from '../types/churn.js';
import { InferenceEngine } from './InferenceEngine.js';
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
  private inferenceEngine: InferenceEngine;
  private dbManager: DatabaseManager;
  private initialized = false;

  constructor(private config: ChurnConfig) {
    this.dbManager = new DatabaseManager({ dbPath: config.dbPath });
    this.inferenceEngine = new InferenceEngine(config, this.dbManager);
  }

  /**
   * Initialize the capture system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log("🧠 Initializing ChurnFlow capture system...");

    try {
      await this.dbManager.initialize();
      console.log("✅ Database ready for capture storage!");
      
      this.initialized = true;
      console.log("✅ ChurnFlow ready for ADHD-friendly capture!");
    } catch (error) {
      console.error("❌ Failed to initialize ChurnFlow database:", error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Capture a thought, idea, or task with ADHD-friendly processing
   */
  async capture(captureInput: CaptureInput): Promise<CaptureResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log(`🎯 Capturing: "${captureInput.text}"`);

    let rawCaptureId: string | null = null;
    try {
      // Step 1: Create a raw capture record in the database
      const rawCapture = await this.dbManager.createRawCapture(captureInput.text, captureInput.inputType as 'manual' | 'voice' | 'api' | 'import');
      rawCaptureId = rawCapture.id;
      console.log(`📝 Raw capture created with ID: ${rawCaptureId}`);

      // Step 2: Use AI to infer routing and generate multiple items
      const inference = await this.inferenceEngine.inferCapture(captureInput);
      console.log(`🤖 AI inference: ${inference.primaryTracker} (${inference.confidence * 100}% confidence)`);
      console.log(`📝 Analysis: ${inference.overallReasoning}`);

      // Step 3: Update the capture record with the inference results
      await this.dbManager.updateCaptureWithInference(rawCaptureId, inference);
      console.log(`💾 Capture record ${rawCaptureId} updated with AI inference.`);

      return {
        success: true,
        captureId: rawCaptureId,
        primaryTracker: inference.primaryTracker,
        confidence: inference.confidence,
        itemResults: inference.generatedItems.map(item => ({
          success: true,
          tracker: item.tracker, // 'tracker' is now more like 'context'
          itemType: item.itemType,
          formattedEntry: item.content,
        })),
        completedTasks: [], // Task completions are now a separate DB-driven feature
        requiresReview: inference.requiresReview,
      };

    } catch (error) {
      console.error("❌ Capture failed:", error);
      
      if (rawCaptureId) {
        // Fallback for inference failure
        const fallbackInference = {
          primaryTracker: 'review',
          confidence: 0,
          generatedItems: [{
            tracker: 'review',
            itemType: 'review',
            priority: 'medium',
            content: captureInput.text,
          }],
          requiresReview: true,
          overallReasoning: `Inference engine failed: ${(error as Error).message}`,
        };
        await this.dbManager.updateCaptureWithInference(rawCaptureId, fallbackInference);
      }

      return {
        success: false,
        captureId: rawCaptureId || undefined,
        primaryTracker: "review",
        confidence: 0,
        itemResults: [],
        completedTasks: [],
        requiresReview: true,
        error: `Inference engine failed: ${(error as Error).message}`,
      };
    }
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
    inputs: CaptureInput[],
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
              formattedEntry: input.text,
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
  async getStatus(): Promise<Record<string, any>> {
    const dbStats = await this.dbManager.getDashboardStats();
    const databaseAvailable = await this.dbManager.isAvailable();
    return {
      initialized: this.initialized,
      databaseAvailable,
      dbStats,
      config: {
        aiProvider: this.config.aiProvider,
        confidenceThreshold: this.config.confidenceThreshold,
      },
    };
  }

  /**
   * Refresh system data (useful after manual tracker updates)
   */
  async refresh(): Promise<void> {
    console.log("🔄 Refreshing ChurnFlow system... (no-op in db-only mode)");
  }
}
