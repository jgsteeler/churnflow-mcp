/**
 * Tests for InferenceEngine - AI-powered multi-item routing and inference logic
 * 
 * Tests the new multi-item capture capabilities where single inputs can generate
 * multiple items across different trackers and item types.
 */

import { InferenceEngine } from '../../src/core/InferenceEngine.js';
import { TrackerManager } from '../../src/core/TrackerManager.js';
import { 
  TEST_CONFIG, 
  MOCK_AI_RESPONSE,
  MOCK_MULTI_ITEM_RESPONSE,
  MOCK_SINGLE_ITEM_RESPONSE,
  createMockOpenAIResponse,
  SAMPLE_CAPTURE_INPUTS 
} from '../utils/test-helpers.js';
import { CaptureInput } from '../../src/types/churn.js';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
jest.mock('../../src/core/TrackerManager.js');

const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
const mockTrackerManager = TrackerManager as jest.MockedClass<typeof TrackerManager>;

describe('InferenceEngine', () => {
  let inferenceEngine: InferenceEngine;
  let mockTrackerManagerInstance: jest.Mocked<TrackerManager>;
  let mockOpenAIInstance: any;
  let mockCreate: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    // Setup TrackerManager mock
    mockTrackerManagerInstance = {
      getContextMap: jest.fn(),
      initialize: jest.fn(),
      getTracker: jest.fn(),
      getTrackersByContext: jest.fn(),
      appendToTracker: jest.fn(),
      refresh: jest.fn()
    } as any;

    mockTrackerManager.mockImplementation(() => mockTrackerManagerInstance);

    // Setup OpenAI mock
    mockCreate = jest.fn();
    mockOpenAIInstance = {
      chat: {
        completions: {
          create: mockCreate
        }
      }
    };

    mockOpenAI.mockImplementation(() => mockOpenAIInstance);

    inferenceEngine = new InferenceEngine(TEST_CONFIG, mockTrackerManagerInstance);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('successful AI inference', () => {
    beforeEach(() => {
      // Mock comprehensive context map for multi-item testing
      mockTrackerManagerInstance.getContextMap.mockReturnValue({
        'gsc-ai': {
          friendlyName: 'GSC AI Consulting',
          contextType: 'business',
          keywords: ['#client', '#ai', '#consulting'],
          recentActivity: ['Recent business activity']
        },
        'gsc-dev': {
          friendlyName: 'GSC Development',
          contextType: 'business',
          keywords: ['#development', '#welding', '#projects'],
          recentActivity: ['Doug project work']
        },
        'project-55': {
          friendlyName: 'Project 55',
          contextType: 'project',
          keywords: ['#development', '#code'],
          recentActivity: ['Recent project activity']
        },
        'outdoor-maintenance': {
          friendlyName: 'Outdoor Maintenance',
          contextType: 'personal',
          keywords: ['#maintenance', '#outdoor', '#equipment'],
          recentActivity: ['Equipment maintenance']
        },
        'deck': {
          friendlyName: 'Deck Project',
          contextType: 'project',
          keywords: ['#deck', '#home', '#repair'],
          recentActivity: ['Deck repairs']
        },
        'truck': {
          friendlyName: 'Truck Maintenance',
          contextType: 'personal',
          keywords: ['#truck', '#vehicle', '#maintenance'],
          recentActivity: ['Vehicle care']
        }
      });
    });

    it('should generate multiple items from complex Doug welder capture', async () => {
      // Mock AI response with raw descriptions (v0.2.2 format)
      const mockAIResponse = {
        primaryTracker: 'gsc-dev',
        confidence: 0.95,
        overallReasoning: 'Doug welder pickup with multiple actionable items',
        generatedItems: [
          {
            tracker: 'gsc-dev',
            itemType: 'activity',
            priority: 'medium',
            description: 'Doug picked up his welder and paid $200 cash',
            tag: 'gsc-dev',
            reasoning: 'Activity log entry capturing what happened'
          },
          {
            tracker: 'gsc-dev',
            itemType: 'action',
            priority: 'medium',
            description: 'Record $200 payment from Doug as income',
            tag: 'gsc-dev',
            reasoning: 'Payment needs to be recorded in accounting'
          },
          {
            tracker: 'outdoor-maintenance',
            itemType: 'someday',
            priority: 'low',
            description: 'Fix Doug\'s leaf vacuum that needs repair',
            tag: 'outdoor-maintenance',
            reasoning: 'Future work opportunity mentioned'
          },
          {
            tracker: 'outdoor-maintenance',
            itemType: 'review',
            priority: 'low',
            description: 'Look into Doug\'s Ford 8n tractor maintenance needs',
            tag: 'outdoor-maintenance',
            reasoning: 'Potential work that needs evaluation'
          }
        ],
        taskCompletions: [
          {
            tracker: 'gsc-dev',
            description: 'Doug picked up completed welding project',
            reasoning: 'Welder pickup indicates project completion'
          }
        ],
        requiresReview: false
      };
      
      const mockResponse = createMockOpenAIResponse(mockAIResponse);
      mockCreate.mockResolvedValue(mockResponse);

      const input: CaptureInput = {
        text: SAMPLE_CAPTURE_INPUTS.dougWelder,
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      expect(result.primaryTracker).toBe('gsc-dev');
      expect(result.confidence).toBe(0.95);
      expect(result.overallReasoning).toBe('Doug welder pickup with multiple actionable items');
      expect(result.generatedItems).toHaveLength(4);
      expect(result.taskCompletions).toHaveLength(1);
      expect(result.requiresReview).toBe(false);
      
      // Check that FormattingUtils properly formatted the entries
      const activityItem = result.generatedItems.find(item => item.itemType === 'activity')!;
      expect(activityItem.content).toMatch(/^- \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\] Doug picked up his welder and paid \$200 cash$/);
      
      const actionItem = result.generatedItems.find(item => item.itemType === 'action')!;
      expect(actionItem.content).toBe('- [ ] #task Record $200 payment from Doug as income #gsc-dev');
      
      const somedayItem = result.generatedItems.find(item => item.itemType === 'someday')!;
      expect(somedayItem.content).toMatch(/^- \[ \] #someday \[\d{4}-\d{2}-\d{2}\] Fix Doug's leaf vacuum that needs repair #outdoor-maintenance$/);
      
      const reviewItem = result.generatedItems.find(item => item.itemType === 'review')!;
      expect(reviewItem.content).toMatch(/^- \[ \] #review \[\d{4}-\d{2}-\d{2}\] Look into Doug's Ford 8n tractor maintenance needs \(confidence: 95%\)$/);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('analyzes captured thoughts and generates multiple actionable items')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining(SAMPLE_CAPTURE_INPUTS.dougWelder)
          })
        ]),
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });
    });

    it('should handle single item captures properly', async () => {
      // Mock AI response with raw description (v0.2.2 format)
      const mockAIResponse = {
        primaryTracker: 'project-55',
        confidence: 0.85,
        overallReasoning: 'Simple action item for project development',
        generatedItems: [
          {
            tracker: 'project-55',
            itemType: 'action',
            priority: 'high',
            description: 'Fix the bug in user authentication module',
            tag: 'project-55',
            reasoning: 'Clear actionable task for project'
          }
        ],
        taskCompletions: [],
        requiresReview: false
      };
      
      const mockResponse = createMockOpenAIResponse(mockAIResponse);
      mockCreate.mockResolvedValue(mockResponse);

      const input: CaptureInput = {
        text: 'Fix the bug in user authentication module',
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      expect(result.primaryTracker).toBe('project-55');
      expect(result.generatedItems).toHaveLength(1);
      expect(result.generatedItems[0]).toEqual({
        tracker: 'project-55',
        itemType: 'action',
        priority: 'high',
        content: '- [ ] #task Fix the bug in user authentication module #project-55 ⏫',
        reasoning: 'Clear actionable task for project'
      });
      expect(result.taskCompletions).toHaveLength(0);
    });

    it('should validate all item types including activity', async () => {
      const mockResponseWithAllTypes = {
        primaryTracker: 'gsc-dev',
        confidence: 0.85,
        overallReasoning: 'Testing all item types',
        generatedItems: [
          { tracker: 'gsc-dev', itemType: 'action', priority: 'high', content: 'Action item', reasoning: 'Action' },
          { tracker: 'gsc-dev', itemType: 'activity', priority: 'medium', content: 'Activity item', reasoning: 'Activity' },
          { tracker: 'gsc-dev', itemType: 'review', priority: 'medium', content: 'Review item', reasoning: 'Review' },
          { tracker: 'gsc-dev', itemType: 'reference', priority: 'low', content: 'Reference item', reasoning: 'Reference' },
          { tracker: 'gsc-dev', itemType: 'someday', priority: 'low', content: 'Someday item', reasoning: 'Someday' }
        ],
        taskCompletions: [],
        requiresReview: false
      };

      const mockResponse = createMockOpenAIResponse(mockResponseWithAllTypes);
      mockCreate.mockResolvedValue(mockResponse);

      const input: CaptureInput = {
        text: 'Test all item types',
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      expect(result.generatedItems).toHaveLength(5);
      expect(result.generatedItems[0].itemType).toBe('action');
      expect(result.generatedItems[1].itemType).toBe('activity');
      expect(result.generatedItems[2].itemType).toBe('review');
      expect(result.generatedItems[3].itemType).toBe('reference');
      expect(result.generatedItems[4].itemType).toBe('someday');
    });

    it('should build multi-item inference prompt with task completion guidance', async () => {
      const mockResponse = createMockOpenAIResponse(MOCK_MULTI_ITEM_RESPONSE);
      mockCreate.mockResolvedValue(mockResponse);

      const input: CaptureInput = {
        text: SAMPLE_CAPTURE_INPUTS.dougWelder,
        inputType: 'text'
      };

      await inferenceEngine.inferCapture(input);

      const callArgs = mockCreate.mock.calls[0][0];
      const systemMessage = callArgs.messages[0].content;
      const userMessage = callArgs.messages[1].content;

      // Check system prompt for multi-item guidance
      expect(systemMessage).toContain('generates multiple actionable items');
      expect(systemMessage).toContain('One capture can contain multiple items');
      expect(systemMessage).toContain('Activity items capture what happened');
      expect(systemMessage).toContain('Look for task completions');
      expect(systemMessage).toContain('generatedItems');
      expect(systemMessage).toContain('taskCompletions');

      // Check user prompt structure
      expect(userMessage).toContain('INPUT TO ROUTE:');
      expect(userMessage).toContain(SAMPLE_CAPTURE_INPUTS.dougWelder);
      expect(userMessage).toContain('AVAILABLE TRACKERS:');
    });

    it('should handle low confidence by requiring review', async () => {
      const lowConfidenceResponse = {
        ...MOCK_AI_RESPONSE,
        confidence: 0.3,
        requiresReview: true
      };

      const mockResponse = createMockOpenAIResponse(lowConfidenceResponse);
      mockCreate.mockResolvedValue(mockResponse);

      const input: CaptureInput = {
        text: 'Ambiguous input',
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      expect(result.confidence).toBe(0.3);
      expect(result.requiresReview).toBe(true);
    });

    it('should enforce confidence threshold for review requirement', async () => {
      const mediumConfidenceResponse = {
        ...MOCK_AI_RESPONSE,
        confidence: 0.5, // Below default threshold of 0.7
        requiresReview: false
      };

      const mockResponse = createMockOpenAIResponse(mediumConfidenceResponse);
      mockCreate.mockResolvedValue(mockResponse);

      const input: CaptureInput = {
        text: 'Medium confidence input',
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      expect(result.confidence).toBe(0.5);
      expect(result.requiresReview).toBe(true); // Should be true due to threshold override
    });
  });

  describe('AI failure and fallback handling', () => {
    beforeEach(() => {
      // Mock context map for error scenarios
      mockTrackerManagerInstance.getContextMap.mockReturnValue({});
    });

    it('should handle OpenAI API errors gracefully with multi-item fallback', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      const input: CaptureInput = {
        text: 'Test input',
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      expect(result).toEqual({
        primaryTracker: 'review',
        confidence: 0.1,
        overallReasoning: 'AI inference failed, routing to review',
        generatedItems: [{
          tracker: 'review',
          itemType: 'review',
          priority: 'medium',
          content: expect.stringContaining('Test input'),
          reasoning: 'Fallback due to AI failure'
        }],
        taskCompletions: [],
        requiresReview: true
      });

      expect(console.error).toHaveBeenCalledWith('AI inference failed:', expect.any(Error));
    });

    it('should handle malformed AI responses with fallback', async () => {
      const malformedResponse = createMockOpenAIResponse('invalid json');
      mockCreate.mockResolvedValue(malformedResponse);

      const input: CaptureInput = {
        text: 'Test input',
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      expect(result.primaryTracker).toBe('review');
      expect(result.requiresReview).toBe(true);
      expect(result.confidence).toBe(0.5); // Default confidence for malformed responses
      expect(result.generatedItems).toHaveLength(1);
      expect(result.generatedItems[0].itemType).toBe('review');
    });

    // This test case is now covered by 'should validate invalid item types in multi-item responses'
    // Removed as it duplicates the functionality

    it('should validate and normalize priorities in multi-item responses', async () => {
      const invalidPriorityResponse = {
        primaryTracker: 'gsc-dev',
        confidence: 0.8,
        overallReasoning: 'Priority validation test',
        generatedItems: [
          { tracker: 'gsc-dev', itemType: 'action', priority: 'super-urgent', content: 'Item 1', reasoning: 'Test' },
          { tracker: 'gsc-dev', itemType: 'action', priority: 'ultra-high', content: 'Item 2', reasoning: 'Test' },
          { tracker: 'gsc-dev', itemType: 'action', priority: 'low', content: 'Item 3', reasoning: 'Test' }
        ],
        taskCompletions: [],
        requiresReview: false
      };

      const mockResponse = createMockOpenAIResponse(invalidPriorityResponse);
      mockCreate.mockResolvedValue(mockResponse);

      const input: CaptureInput = {
        text: 'Test input',
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      // Invalid priorities should default to 'medium'
      expect(result.generatedItems[0].priority).toBe('medium');
      expect(result.generatedItems[1].priority).toBe('medium');
      expect(result.generatedItems[2].priority).toBe('low'); // Valid priority preserved
    });

    it('should handle empty generatedItems array with fallback', async () => {
      const emptyItemsResponse = {
        primaryTracker: 'gsc-dev',
        confidence: 0.8,
        overallReasoning: 'Empty items test',
        generatedItems: [], // Empty array
        taskCompletions: [],
        requiresReview: false
      };

      const mockResponse = createMockOpenAIResponse(emptyItemsResponse);
      mockCreate.mockResolvedValue(mockResponse);

      const input: CaptureInput = {
        text: 'Test input with no items',
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      // Should create fallback item when generatedItems is empty
      expect(result.generatedItems).toHaveLength(1);
      expect(result.generatedItems[0].tracker).toBe('gsc-dev');
      expect(result.generatedItems[0].itemType).toBe('review');
      expect(result.generatedItems[0].reasoning).toBe('Fallback item creation');
    });

    it('should validate invalid item types in multi-item responses', async () => {
      const invalidTypesResponse = {
        primaryTracker: 'gsc-dev',
        confidence: 0.8,
        overallReasoning: 'Invalid types test',
        generatedItems: [
          { tracker: 'gsc-dev', itemType: 'invalid-type', priority: 'high', content: 'Item 1', reasoning: 'Test' },
          { tracker: 'gsc-dev', itemType: 'also-invalid', priority: 'medium', content: 'Item 2', reasoning: 'Test' },
          { tracker: 'gsc-dev', itemType: 'activity', priority: 'low', content: 'Item 3', reasoning: 'Test' }
        ],
        taskCompletions: [],
        requiresReview: false
      };

      const mockResponse = createMockOpenAIResponse(invalidTypesResponse);
      mockCreate.mockResolvedValue(mockResponse);

      const input: CaptureInput = {
        text: 'Test invalid types',
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      // Invalid types should default to 'review'
      expect(result.generatedItems[0].itemType).toBe('review');
      expect(result.generatedItems[1].itemType).toBe('review');
      expect(result.generatedItems[2].itemType).toBe('activity'); // Valid type preserved
    });

    it('should clamp confidence values to valid range', async () => {
      const invalidConfidenceResponse = {
        primaryTracker: 'gsc-dev',
        confidence: 1.5, // > 1.0
        overallReasoning: 'Confidence test',
        generatedItems: [{
          tracker: 'gsc-dev',
          itemType: 'action',
          priority: 'high',
          content: 'Test item',
          reasoning: 'Test'
        }],
        taskCompletions: [],
        requiresReview: false
      };

      const mockResponse = createMockOpenAIResponse(invalidConfidenceResponse);
      mockCreate.mockResolvedValue(mockResponse);

      const input: CaptureInput = {
        text: 'Test input',
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      expect(result.confidence).toBe(1.0); // Should be clamped to max 1.0
    });
  });

  describe('system prompt generation', () => {
    it('should generate multi-item system prompt with ADHD-friendly guidelines', async () => {
      // Mock context map
      mockTrackerManagerInstance.getContextMap.mockReturnValue({});
      
      const mockResponse = createMockOpenAIResponse(MOCK_SINGLE_ITEM_RESPONSE);
      mockCreate.mockResolvedValue(mockResponse);

      const input: CaptureInput = {
        text: 'Test',
        inputType: 'text'
      };

      await inferenceEngine.inferCapture(input);

      const callArgs = mockCreate.mock.calls[0][0];
      const systemMessage = callArgs.messages[0].content;

      expect(systemMessage).toContain('analyzes captured thoughts and generates multiple actionable items');
      expect(systemMessage).toContain('Identify ALL actionable items');
      expect(systemMessage).toContain('One capture can contain multiple items');
      expect(systemMessage).toContain('Activity items capture what happened');
      expect(systemMessage).toContain('Look for task completions');
      expect(systemMessage).toContain('generatedItems');
      expect(systemMessage).toContain('taskCompletions');
      expect(systemMessage).toContain('valid JSON');
    });
  });

  describe('fallback formatting', () => {
    it('should provide basic formatting when AI fails', async () => {
      // Mock context map
      mockTrackerManagerInstance.getContextMap.mockReturnValue({});
      
      mockCreate.mockRejectedValue(new Error('API Error'));

      const input: CaptureInput = {
        text: 'Remember to do something important',
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      expect(result.generatedItems).toHaveLength(1);
      expect(result.generatedItems[0].itemType).toBe('review');
      // v0.2.2: Fallback uses FormattingUtils.formatEntry for review items
      expect(result.generatedItems[0].content).toMatch(/^- \[ \] #review \[\d{4}-\d{2}-\d{2}\] Remember to do something important \(confidence: 10%\)$/);
      expect(result.primaryTracker).toBe('review');
      expect(result.confidence).toBe(0.1);
      expect(result.requiresReview).toBe(true);
    });
  });

  // v0.3.1 Review System Tests
  describe('Review system integration', () => {
    beforeEach(() => {
      mockTrackerManagerInstance.getContextMap.mockReturnValue({
        'test': 'business tracker'
      });
    });

    describe('calculateInferenceConfidence', () => {
      it('should calculate confidence based on multiple factors', () => {
        const input: CaptureInput = {
          text: 'Complete the project report',
          inputType: 'text'
        };

        // High confidence scenario: tracker match + keywords + clear context
        const highConfidence = inferenceEngine.calculateInferenceConfidence(
          input,
          true,   // tracker match
          3,      // keyword matches
          0.8     // context clarity
        );

        expect(highConfidence).toBeGreaterThan(0.8);

        // Low confidence scenario: no matches
        const lowConfidence = inferenceEngine.calculateInferenceConfidence(
          input,
          false,  // no tracker match
          0,      // no keyword matches
          0.2     // low context clarity
        );

        expect(lowConfidence).toBeLessThan(0.6);
      });

      it('should handle very short text with lower confidence', () => {
        const shortInput: CaptureInput = {
          text: 'Do it',
          inputType: 'text'
        };

        const confidence = inferenceEngine.calculateInferenceConfidence(
          shortInput,
          true,
          2,
          0.8
        );

        // Should be reduced due to short text
        expect(confidence).toBeLessThan(1.0);
      });

      it('should handle very long text with slightly lower confidence', () => {
        const longInput: CaptureInput = {
          text: 'This is a very long input that contains a lot of text and might be harder to process accurately because it has so many words and concepts that could make the AI inference less confident about the routing decision',
          inputType: 'text'
        };

        const confidence = inferenceEngine.calculateInferenceConfidence(
          longInput,
          true,
          3,
          0.8
        );

        // Should be slightly reduced due to length
        const normalConfidence = inferenceEngine.calculateInferenceConfidence(
          { text: 'Normal length task', inputType: 'text' },
          true,
          3,
          0.8
        );

        expect(confidence).toBeLessThanOrEqual(normalConfidence);
      });

      it('should clamp confidence to valid range', () => {
        const input: CaptureInput = {
          text: 'Test input',
          inputType: 'text'
        };

        // Test maximum confidence
        const maxConfidence = inferenceEngine.calculateInferenceConfidence(
          input,
          true,
          10,  // many keywords
          1.0  // perfect clarity
        );
        expect(maxConfidence).toBeLessThanOrEqual(1.0);

        // Test minimum confidence
        const minConfidence = inferenceEngine.calculateInferenceConfidence(
          { text: 'x', inputType: 'text' },  // very short
          false,
          0,
          0
        );
        expect(minConfidence).toBeGreaterThanOrEqual(0.0);
      });
    });

    describe('shouldFlagForReview', () => {
      it('should flag items below confidence threshold', () => {
        expect(inferenceEngine.shouldFlagForReview(0.6, 'review')).toBe(true);
        expect(inferenceEngine.shouldFlagForReview(0.8, 'review')).toBe(false);
      });

      it('should apply stricter criteria for action items', () => {
        expect(inferenceEngine.shouldFlagForReview(0.75, 'action')).toBe(true);
        expect(inferenceEngine.shouldFlagForReview(0.85, 'action')).toBe(false);
      });

      it('should use normal criteria for non-action items', () => {
        expect(inferenceEngine.shouldFlagForReview(0.75, 'reference')).toBe(false);
        expect(inferenceEngine.shouldFlagForReview(0.75, 'someday')).toBe(false);
      });
    });

    describe('extractKeywords', () => {
      it('should extract meaningful keywords from text', () => {
        const text = 'Complete the quarterly financial report with updated metrics';
        const keywords = inferenceEngine.extractKeywords(text);

        expect(keywords).toContain('complete');
        expect(keywords).toContain('quarterly');
        expect(keywords).toContain('financial');
        expect(keywords).toContain('report');
        expect(keywords).toContain('updated');
        expect(keywords).not.toContain('the');
        expect(keywords).not.toContain('with');
      });

      it('should filter out common stop words', () => {
        const text = 'This is something that they have been working on with great dedication';
        const keywords = inferenceEngine.extractKeywords(text);

        expect(keywords).not.toContain('this');
        expect(keywords).not.toContain('that');
        expect(keywords).not.toContain('they');
        expect(keywords).not.toContain('have');
        expect(keywords).not.toContain('been');
        expect(keywords).not.toContain('with');
      });

      it('should limit to 5 keywords', () => {
        const text = 'Complete design implementation testing deployment monitoring optimization performance analysis debugging troubleshooting documentation';
        const keywords = inferenceEngine.extractKeywords(text);

        expect(keywords).toHaveLength(5);
      });

      it('should handle short text gracefully', () => {
        const text = 'Quick task';
        const keywords = inferenceEngine.extractKeywords(text);

        expect(keywords).toHaveLength(2);
        expect(keywords).toContain('quick');
        expect(keywords).toContain('task');
      });
    });

    describe('generateReviewMetadata', () => {
      it('should generate complete metadata for review items', () => {
        const input: CaptureInput = {
          text: 'Complete the project documentation review',
          inputType: 'text'
        };

        const metadata = inferenceEngine.generateReviewMetadata(
          input,
          'action',
          'high'
        );

        expect(metadata).toEqual({
          keywords: expect.arrayContaining(['complete', 'project', 'documentation', 'review']),
          urgency: 'high',
          type: 'action',
          editableFields: ['tracker', 'priority', 'tags', 'type']
        });
      });

      it('should extract keywords from input text', () => {
        const input: CaptureInput = {
          text: 'Schedule meeting with stakeholders about budget allocation',
          inputType: 'text'
        };

        const metadata = inferenceEngine.generateReviewMetadata(
          input,
          'action',
          'medium'
        );

        // Should contain most keywords, but 'about' might be included as it's 5 chars
        expect(metadata.keywords).toEqual(
          expect.arrayContaining(['schedule', 'meeting', 'stakeholders', 'budget'])
        );
      });
    });
  });
});