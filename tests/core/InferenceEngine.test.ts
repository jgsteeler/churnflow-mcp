/**
 * Tests for InferenceEngine - AI-powered routing and inference logic
 */

import { InferenceEngine } from '../../src/core/InferenceEngine.js';
import { TrackerManager } from '../../src/core/TrackerManager.js';
import { 
  TEST_CONFIG, 
  MOCK_AI_RESPONSE, 
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
      // Mock context map from TrackerManager
      mockTrackerManagerInstance.getContextMap.mockReturnValue({
        'gsc-ai': {
          friendlyName: 'GSC AI Consulting',
          contextType: 'business',
          keywords: ['#client', '#ai', '#consulting'],
          recentActivity: ['Recent business activity']
        },
        'project-55': {
          friendlyName: 'Project 55',
          contextType: 'project',
          keywords: ['#development', '#code'],
          recentActivity: ['Recent project activity']
        }
      });
    });

    it('should successfully infer capture routing with high confidence', async () => {
      const mockResponse = createMockOpenAIResponse(MOCK_AI_RESPONSE);
      mockCreate.mockResolvedValue(mockResponse);

      const input: CaptureInput = {
        text: SAMPLE_CAPTURE_INPUTS.business,
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      expect(result).toEqual({
        inferredTracker: 'gsc-ai',
        itemType: 'action',
        priority: 'high',
        confidence: 0.95,
        reasoning: 'High confidence match based on business context keywords',
        formattedEntry: '- [ ] #task Test AI generated entry 📅 2024-01-15',
        requiresReview: false
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('ADHD-friendly productivity assistant')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining(SAMPLE_CAPTURE_INPUTS.business)
          })
        ]),
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });
    });

    it('should build comprehensive inference prompt with context', async () => {
      const mockResponse = createMockOpenAIResponse(MOCK_AI_RESPONSE);
      mockCreate.mockResolvedValue(mockResponse);

      const input: CaptureInput = {
        text: 'Test input',
        inputType: 'voice',
        forceContext: 'business',
        timestamp: new Date('2024-01-15T10:00:00Z')
      };

      await inferenceEngine.inferCapture(input);

      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = callArgs.messages[1].content;

      expect(userMessage).toContain('INPUT TO ROUTE:');
      expect(userMessage).toContain('Test input');
      expect(userMessage).toContain('Input Type: voice');
      expect(userMessage).toContain('Forced Context: business');
      expect(userMessage).toContain('2024-01-15T10:00:00.000Z');
      expect(userMessage).toContain('AVAILABLE TRACKERS:');
      expect(userMessage).toContain('gsc-ai: GSC AI Consulting (business)');
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

    it('should handle OpenAI API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      const input: CaptureInput = {
        text: 'Test input',
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      expect(result).toEqual({
        inferredTracker: 'review',
        itemType: 'review',
        priority: 'medium',
        confidence: 0.1,
        reasoning: 'AI inference failed, routing to review',
        formattedEntry: expect.stringContaining('Test input'),
        requiresReview: true
      });

      expect(console.error).toHaveBeenCalledWith('AI inference failed:', expect.any(Error));
    });

    it('should handle malformed AI responses', async () => {
      const malformedResponse = createMockOpenAIResponse('invalid json');
      mockCreate.mockResolvedValue(malformedResponse);

      const input: CaptureInput = {
        text: 'Test input',
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      expect(result.inferredTracker).toBe('review');
      expect(result.requiresReview).toBe(true);
      expect(result.confidence).toBe(0.5); // Default confidence for malformed responses
    });

    it('should validate and normalize item types', async () => {
      const invalidItemTypeResponse = {
        ...MOCK_AI_RESPONSE,
        itemType: 'invalid-type'
      };

      const mockResponse = createMockOpenAIResponse(invalidItemTypeResponse);
      mockCreate.mockResolvedValue(mockResponse);

      const input: CaptureInput = {
        text: 'Test input',
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      expect(result.itemType).toBe('review'); // Should default to 'review'
    });

    it('should validate and normalize priorities', async () => {
      const invalidPriorityResponse = {
        ...MOCK_AI_RESPONSE,
        priority: 'super-urgent'
      };

      const mockResponse = createMockOpenAIResponse(invalidPriorityResponse);
      mockCreate.mockResolvedValue(mockResponse);

      const input: CaptureInput = {
        text: 'Test input',
        inputType: 'text'
      };

      const result = await inferenceEngine.inferCapture(input);

      expect(result.priority).toBe('medium'); // Should default to 'medium'
    });

    it('should clamp confidence values to valid range', async () => {
      const invalidConfidenceResponse = {
        ...MOCK_AI_RESPONSE,
        confidence: 1.5 // > 1.0
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
    it('should generate system prompt with ADHD-friendly guidelines', async () => {
      // Mock context map
      mockTrackerManagerInstance.getContextMap.mockReturnValue({});
      
      const mockResponse = createMockOpenAIResponse(MOCK_AI_RESPONSE);
      mockCreate.mockResolvedValue(mockResponse);

      const input: CaptureInput = {
        text: 'Test',
        inputType: 'text'
      };

      await inferenceEngine.inferCapture(input);

      const callArgs = mockCreate.mock.calls[0][0];
      const systemMessage = callArgs.messages[0].content;

      expect(systemMessage).toContain('ADHD-friendly productivity assistant');
      expect(systemMessage).toContain('Reduce cognitive overhead');
      expect(systemMessage).toContain('route to review rather than guessing wrong');
      expect(systemMessage).toContain('Action items should be specific and actionable');
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

      expect(result.formattedEntry).toMatch(/^- \[ \] #task Remember to do something important 📅 \d{4}-\d{2}-\d{2}$/);
    });
  });
});