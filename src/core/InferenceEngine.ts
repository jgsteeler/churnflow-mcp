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
    return `You are an ADHD-friendly productivity assistant that helps route captured thoughts to the right project trackers.

Your job is to:
1. Analyze natural language input from someone with ADHD
2. Determine which project/context this belongs to
3. Classify the type of item (action, review, reference, someday)
4. Format it appropriately for a markdown tracker
5. Assess confidence and whether human review is needed

Key principles for ADHD brains:
- Reduce cognitive overhead - don't ask unnecessary questions
- Preserve the original thought/energy - don't over-process
- When unsure, route to review rather than guessing wrong
- Action items should be specific and actionable
- References should capture context for future retrieval

Always respond with valid JSON in this format:
{
  "inferredTracker": "tag-name",
  "itemType": "action|review|reference|someday",
  "priority": "critical|high|medium|low",
  "confidence": 0.95,
  "reasoning": "Brief explanation of routing decision",
  "formattedEntry": "- [ ] #task Formatted markdown entry with appropriate tags",
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
2. What type of item this is (action/review/reference/someday)
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
    
    return {
      inferredTracker: aiResult.inferredTracker || 'review',
      itemType: this.validateItemType(aiResult.itemType),
      priority: this.validatePriority(aiResult.priority),
      confidence: normalizedConfidence,
      reasoning: aiResult.reasoning || 'AI inference result',
      formattedEntry: aiResult.formattedEntry || this.fallbackFormat(input.text),
      requiresReview: (aiResult.requiresReview !== undefined ? aiResult.requiresReview : false) || normalizedConfidence < this.config.confidenceThreshold
    };
  }

  /**
   * Fallback inference when AI fails
   */
  private fallbackInference(input: CaptureInput): InferenceResult {
    return {
      inferredTracker: 'review',
      itemType: 'review',
      priority: 'medium',
      confidence: 0.1,
      reasoning: 'AI inference failed, routing to review',
      formattedEntry: this.fallbackFormat(input.text),
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
    const validTypes: ItemType[] = ['action', 'review', 'reference', 'someday'];
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