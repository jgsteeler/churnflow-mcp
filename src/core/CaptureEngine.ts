import { 
  CaptureInput, 
  CaptureResult, 
  ChurnConfig 
} from '../types/churn.js';
import { TrackerManager } from './TrackerManager.js';
import { InferenceEngine } from './InferenceEngine.js';

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
    
    console.log('🧠 Initializing ChurnFlow capture system...');
    
    try {
      await this.trackerManager.initialize();
      this.initialized = true;
      console.log('✅ ChurnFlow ready for ADHD-friendly capture!');
    } catch (error) {
      console.error('❌ Failed to initialize ChurnFlow:', error);
      throw error;
    }
  }

  /**
   * Capture a thought, idea, or task with ADHD-friendly processing
   */
  async capture(input: string | CaptureInput): Promise<CaptureResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Normalize input
    const captureInput: CaptureInput = typeof input === 'string' 
      ? { text: input, inputType: 'text' }
      : input;

    console.log(`🎯 Capturing: "${captureInput.text}"`);

    try {
      // Use AI to infer routing and formatting
      const inference = await this.inferenceEngine.inferCapture(captureInput);
      
      console.log(`🤖 AI inference: ${inference.inferredTracker} (${inference.confidence * 100}% confidence)`);
      console.log(`📝 Reasoning: ${inference.reasoning}`);

      // Handle low confidence - route to review
      if (inference.requiresReview) {
        return await this.routeToReview(captureInput, inference);
      }

      // Append to the inferred tracker
      const success = await this.trackerManager.appendToTracker(
        inference.inferredTracker,
        inference.formattedEntry
      );

      if (success) {
        console.log(`✅ Successfully captured to ${inference.inferredTracker}`);
        
        return {
          success: true,
          tracker: inference.inferredTracker,
          itemType: inference.itemType,
          formattedEntry: inference.formattedEntry,
          confidence: inference.confidence,
          requiresReview: false
        };
      } else {
        // Fallback to review if tracker write failed
        return await this.routeToReview(captureInput, inference);
      }

    } catch (error) {
      console.error('❌ Capture failed:', error);
      
      // Emergency fallback - try to save somewhere
      return await this.emergencyCapture(captureInput, error as Error);
    }
  }

  /**
   * Route items that need human review
   */
  private async routeToReview(
    input: CaptureInput, 
    inference?: any
  ): Promise<CaptureResult> {
    console.log('📋 Routing to review queue (needs human attention)');
    
    // Create a review entry with context
    const reviewEntry = this.formatReviewEntry(input, inference);
    
    // Try to append to a review tracker or create inline review
    const success = await this.appendToReviewTracker(reviewEntry);
    
    return {
      success,
      tracker: 'review',
      itemType: 'review',
      formattedEntry: reviewEntry,
      confidence: inference?.confidence || 0.1,
      requiresReview: true,
      error: success ? undefined : 'Failed to save to review tracker'
    };
  }

  /**
   * Emergency capture when everything else fails
   */
  private async emergencyCapture(input: CaptureInput, error: Error): Promise<CaptureResult> {
    console.log('🚨 Emergency capture - saving raw input');
    
    // Format as basic entry with error context
    const timestamp = new Date().toISOString();
    const emergencyEntry = `- [ ] EMERGENCY CAPTURE [${timestamp}]: ${input.text} (Error: ${error.message})`;
    
    // Try to append to any available tracker
    const trackers = this.trackerManager.getTrackersByContext();
    for (const tracker of trackers) {
      try {
        const success = await this.trackerManager.appendToTracker(
          tracker.frontmatter.tag,
          emergencyEntry
        );
        if (success) {
          console.log(`🆘 Emergency capture saved to ${tracker.frontmatter.tag}`);
          return {
            success: true,
            tracker: tracker.frontmatter.tag,
            itemType: 'action',
            formattedEntry: emergencyEntry,
            confidence: 0.1,
            requiresReview: true
          };
        }
      } catch {
        continue; // Try next tracker
      }
    }

    // Complete failure
    return {
      success: false,
      tracker: 'none',
      itemType: 'action',
      formattedEntry: emergencyEntry,
      confidence: 0,
      requiresReview: true,
      error: `Complete capture failure: ${error.message}`
    };
  }

  /**
   * Format an entry for the review queue
   */
  private formatReviewEntry(input: CaptureInput, inference?: any): string {
    const timestamp = new Date().toISOString().split('T')[0];
    let entry = `- [ ] REVIEW NEEDED [${timestamp}]: ${input.text}`;
    
    if (inference) {
      entry += ` (AI suggested: ${inference.inferredTracker}, confidence: ${Math.round(inference.confidence * 100)}%)`;
    }
    
    return entry;
  }

  /**
   * Append to a dedicated review tracker
   */
  private async appendToReviewTracker(entry: string): Promise<boolean> {
    // Try to find a review or inbox tracker
    const reviewTracker = this.trackerManager.getTracker('review') || 
                         this.trackerManager.getTracker('inbox') ||
                         this.trackerManager.getTracker('churn-system'); // Fallback to system tracker
    
    if (reviewTracker) {
      return await this.trackerManager.appendToTracker(reviewTracker.frontmatter.tag, entry);
    }
    
    return false;
  }

  /**
   * Voice capture helper (for future voice integration)
   */
  async captureVoice(audioData: any): Promise<CaptureResult> {
    // TODO: Implement voice-to-text conversion
    // For now, this is a placeholder
    throw new Error('Voice capture not yet implemented');
  }

  /**
   * Batch capture for processing multiple items
   */
  async captureBatch(inputs: (string | CaptureInput)[]): Promise<CaptureResult[]> {
    const results: CaptureResult[] = [];
    
    for (const input of inputs) {
      try {
        const result = await this.capture(input);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          tracker: 'none',
          itemType: 'review',
          formattedEntry: typeof input === 'string' ? input : input.text,
          confidence: 0,
          requiresReview: true,
          error: error instanceof Error ? error.message : 'Unknown error'
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
      trackersByContext: trackers.reduce((acc, tracker) => {
        const type = tracker.frontmatter.contextType;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      config: {
        collectionsPath: this.config.collectionsPath,
        aiProvider: this.config.aiProvider,
        confidenceThreshold: this.config.confidenceThreshold
      }
    };
  }

  /**
   * Refresh system data (useful after manual tracker updates)
   */
  async refresh(): Promise<void> {
    console.log('🔄 Refreshing ChurnFlow system...');
    await this.trackerManager.refresh();
    console.log('✅ System refreshed');
  }
}