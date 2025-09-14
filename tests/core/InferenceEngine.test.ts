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
      const mockResponse = createMockOpenAIResponse(MOCK_MULTI_ITEM_RESPONSE);
      mockCreate.mockResolvedValue(mockResponse);

      const input: CaptureInput = {
        text: SAMPLE_CAPTURE_INPUTS.dougWelder,
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      expect(result).toEqual({
        primaryTracker: 'gsc-dev',
        confidence: 0.95,
        overallReasoning: 'Doug welder pickup with multiple actionable items',
        generatedItems: [
          {
            tracker: 'gsc-dev',
            itemType: 'activity',
            priority: 'medium',
            content: '- [2024-01-15] Doug picked up his welder and paid $200 cash.',
            reasoning: 'Activity log entry capturing what happened'
          },
          {
            tracker: 'gsc-dev',
            itemType: 'action',
            priority: 'medium',
            content: '- [ ] #task Record $200 payment from Doug as income.',
            reasoning: 'Payment needs to be recorded in accounting'
          },
          {
            tracker: 'outdoor-maintenance',
            itemType: 'someday',
            priority: 'low',
            content: '- [ ] #someday Fix Doug\'s leaf vacuum that needs repair.',
            reasoning: 'Future work opportunity mentioned'
          },
          {
            tracker: 'outdoor-maintenance',
            itemType: 'review',
            priority: 'low',
            content: '- [ ] #review Look into Doug\'s Ford 8n tractor maintenance needs.',
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
      });

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
      const mockResponse = createMockOpenAIResponse(MOCK_SINGLE_ITEM_RESPONSE);
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
        content: '- [ ] #task Fix the bug in user authentication module.',
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
      expect(result.generatedItems[0].content).toMatch(/^- \[ \] #task Remember to do something important 📅 \d{4}-\d{2}-\d{2}$/);
      expect(result.generatedItems[0].itemType).toBe('review');
    });
  });
});