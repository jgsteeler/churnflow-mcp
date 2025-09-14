import OpenAI from 'openai';
import { 
  CaptureInput, 
  InferenceResult, 
  ChurnConfig, 
  ItemType, 
  Priority 
} from '../types/churn.js';
import { TrackerManager } from './TrackerManager.js';

/**
 * AI-powered inference engine for ChurnFlow capture system
 * 
 * This is where the magic happens - using AI to understand natural language
 * input and route it to the right tracker with the right formatting.
 */
export class InferenceEngine {
  private openai!: OpenAI;
  
  constructor(
    private config: ChurnConfig,
    private trackerManager: TrackerManager
  ) {
    if (this.config.aiProvider === 'openai') {
      this.openai = new OpenAI({
        apiKey: this.config.aiApiKey
      });
    }
    // TODO: Add Anthropic support
  }

  /**
   * Analyze input and determine routing and formatting
   */
  async inferCapture(input: CaptureInput): Promise<InferenceResult> {
    const contextMap = this.trackerManager.getContextMap();
    
    const prompt = this.buildInferencePrompt(input, contextMap);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return this.parseInferenceResult(result, input);
    } catch (error) {
      console.error('AI inference failed:', error);
      
      // Fallback to basic routing
      return this.fallbackInference(input);
    }
  }

  /**
   * System prompt that teaches the AI about ADHD-friendly productivity
   */
  private getSystemPrompt(): string {
    return `You are an ADHD-friendly productivity assistant that analyzes captured thoughts and generates multiple actionable items.

Your job is to:
1. Analyze natural language input from someone with ADHD
2. Identify ALL actionable items, updates, and completions within the input
3. Generate separate entries for each distinct item (action, review, reference, someday, activity)
4. Detect if the input indicates completion of existing tasks
5. Route each item to the appropriate tracker

Key principles for ADHD brains:
- One capture can contain multiple items - extract them all
- Activity items capture what happened (go to Activity Log)
- Action items are specific tasks to do (go to Action Items)
- References capture important info (go to References)
- Review items need human decision (go to review queue)
- Someday items are future possibilities
- Look for task completions ("Doug picked up his welder" = task done)

Always respond with valid JSON in this format:
{
  "primaryTracker": "most-relevant-tag",
  "confidence": 0.95,
  "overallReasoning": "Brief explanation of analysis",
  "generatedItems": [
    {
      "tracker": "tag-name",
      "itemType": "action|review|reference|someday|activity",
      "priority": "critical|high|medium|low",
      "content": "- [date] Formatted entry for this specific item",
      "reasoning": "Why this item goes here"
    }
  ],
  "taskCompletions": [
    {
      "tracker": "tag-name",
      "description": "What task was completed",
      "reasoning": "Evidence of completion"
    }
  ],
  "requiresReview": false
}`;
  }

  /**
   * Build the context-aware prompt for inference
   */
  private buildInferencePrompt(input: CaptureInput, contextMap: Record<string, any>): string {
    const timestamp = input.timestamp || new Date();
    
    let prompt = `INPUT TO ROUTE:
"${input.text}"

Input Type: ${input.inputType}
Timestamp: ${timestamp.toISOString()}
${input.forceContext ? `Forced Context: ${input.forceContext}` : ''}

AVAILABLE TRACKERS:
`;

    for (const [tag, info] of Object.entries(contextMap)) {
      prompt += `
${tag}: ${info.friendlyName} (${info.contextType})
  Keywords: ${info.keywords.slice(0, 5).join(', ')}
  Recent: ${info.recentActivity.slice(0, 2).join(' | ')}`;
    }

    prompt += `

TASK:
Analyze the input and determine:
1. Which tracker (tag) this belongs to based on context clues
2. What type of item this is (action/review/reference/someday/activity)
3. Appropriate priority level
4. Formatted markdown entry with proper tags and structure
5. Your confidence level and if human review is needed

Remember: This is for someone with ADHD - prioritize quick, accurate routing over perfection.`;

    return prompt;
  }

  /**
   * Parse the AI response into our result format
   */
  private parseInferenceResult(aiResult: any, input: CaptureInput): InferenceResult {
    const normalizedConfidence = Math.max(0, Math.min(1, aiResult.confidence || 0.5));
    
    // Parse generated items
    const generatedItems: any[] = [];
    if (aiResult.generatedItems && Array.isArray(aiResult.generatedItems)) {
      for (const item of aiResult.generatedItems) {
        generatedItems.push({
          tracker: item.tracker || 'review',
          itemType: this.validateItemType(item.itemType),
          priority: this.validatePriority(item.priority),
          content: item.content || this.fallbackFormat(input.text),
          reasoning: item.reasoning || 'Generated item'
        });
      }
    }
    
    // If no items generated, create a fallback item
    if (generatedItems.length === 0) {
      generatedItems.push({
        tracker: aiResult.primaryTracker || 'review',
        itemType: 'review',
        priority: 'medium',
        content: this.fallbackFormat(input.text),
        reasoning: 'Fallback item creation'
      });
    }
    
    // Parse task completions
    const taskCompletions: any[] = [];
    if (aiResult.taskCompletions && Array.isArray(aiResult.taskCompletions)) {
      for (const completion of aiResult.taskCompletions) {
        taskCompletions.push({
          tracker: completion.tracker || 'review',
          description: completion.description || 'Task completion detected',
          reasoning: completion.reasoning || 'Completion inference'
        });
      }
    }
    
    return {
      primaryTracker: aiResult.primaryTracker || 'review',
      confidence: normalizedConfidence,
      overallReasoning: aiResult.overallReasoning || 'AI inference result',
      generatedItems,
      taskCompletions,
      requiresReview: (aiResult.requiresReview !== undefined ? aiResult.requiresReview : false) || normalizedConfidence < this.config.confidenceThreshold
    };
  }

  /**
   * Fallback inference when AI fails
   */
  private fallbackInference(input: CaptureInput): InferenceResult {
    return {
      primaryTracker: 'review',
      confidence: 0.1,
      overallReasoning: 'AI inference failed, routing to review',
      generatedItems: [{
        tracker: 'review',
        itemType: 'review',
        priority: 'medium',
        content: this.fallbackFormat(input.text),
        reasoning: 'Fallback due to AI failure'
      }],
      taskCompletions: [],
      requiresReview: true
    };
  }

  /**
   * Basic formatting fallback
   */
  private fallbackFormat(text: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `- [ ] #task ${text} 📅 ${timestamp}`;
  }

  /**
   * Validate and normalize item type
   */
  private validateItemType(itemType: any): ItemType {
    const validTypes: ItemType[] = ['action', 'review', 'reference', 'someday', 'activity'];
    if (validTypes.includes(itemType)) {
      return itemType;
    }
    return 'review'; // Safe default
  }

  /**
   * Validate and normalize priority
   */
  private validatePriority(priority: any): Priority {
    const validPriorities: Priority[] = ['critical', 'high', 'medium', 'low'];
    if (validPriorities.includes(priority)) {
      return priority;
    }
    return 'medium'; // Safe default
  }
}