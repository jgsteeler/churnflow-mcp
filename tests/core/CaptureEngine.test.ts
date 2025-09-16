/**
 * Tests for CaptureEngine - Main orchestration and ADHD-friendly capture flow
 */

import { CaptureEngine } from '../../src/core/CaptureEngine.js';
import { TrackerManager } from '../../src/core/TrackerManager.js';
import { InferenceEngine } from '../../src/core/InferenceEngine.js';
import { 
  TEST_CONFIG, 
  MOCK_AI_RESPONSE,
  SAMPLE_CAPTURE_INPUTS 
} from '../utils/test-helpers.js';
import { CaptureInput, InferenceResult, Tracker } from '../../src/types/churn.js';

// Mock the dependencies
jest.mock('../../src/core/TrackerManager.js');
jest.mock('../../src/core/InferenceEngine.js');

const mockTrackerManager = TrackerManager as jest.MockedClass<typeof TrackerManager>;
const mockInferenceEngine = InferenceEngine as jest.MockedClass<typeof InferenceEngine>;

describe('CaptureEngine', () => {
  let captureEngine: CaptureEngine;
  let mockTrackerManagerInstance: jest.Mocked<TrackerManager>;
  let mockInferenceEngineInstance: jest.Mocked<InferenceEngine>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    // Setup TrackerManager mock
    mockTrackerManagerInstance = {
      initialize: jest.fn(),
      getTracker: jest.fn(),
      getTrackersByContext: jest.fn(),
      appendToTracker: jest.fn(),
      getContextMap: jest.fn(),
      refresh: jest.fn()
    } as any;

    mockTrackerManager.mockImplementation(() => mockTrackerManagerInstance);

    // Setup InferenceEngine mock
    mockInferenceEngineInstance = {
      inferCapture: jest.fn()
    } as any;

    mockInferenceEngine.mockImplementation(() => mockInferenceEngineInstance);

    captureEngine = new CaptureEngine(TEST_CONFIG);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      mockTrackerManagerInstance.initialize.mockResolvedValue(undefined);

      await captureEngine.initialize();

      expect(mockTrackerManagerInstance.initialize).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('🧠 Initializing ChurnFlow capture system...');
      expect(console.log).toHaveBeenCalledWith('✅ ChurnFlow ready for ADHD-friendly capture!');
    });

    it('should handle initialization failures', async () => {
      const initError = new Error('Initialization failed');
      mockTrackerManagerInstance.initialize.mockRejectedValue(initError);

      await expect(captureEngine.initialize()).rejects.toThrow('Initialization failed');
      expect(console.error).toHaveBeenCalledWith('❌ Failed to initialize ChurnFlow:', initError);
    });

    it('should not reinitialize if already initialized', async () => {
      mockTrackerManagerInstance.initialize.mockResolvedValue(undefined);

      await captureEngine.initialize();
      await captureEngine.initialize(); // Second call

      expect(mockTrackerManagerInstance.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('successful capture flow', () => {
    beforeEach(async () => {
      mockTrackerManagerInstance.initialize.mockResolvedValue(undefined);
      await captureEngine.initialize();
    });

    it('should capture text input with high confidence successfully', async () => {
      const mockInference: InferenceResult = {
        primaryTracker: 'gsc-ai',
        confidence: 0.95,
        overallReasoning: 'High confidence match based on business context keywords',
        generatedItems: [{
          tracker: 'gsc-ai',
          itemType: 'action',
          priority: 'high',
          content: '- [ ] #task Test AI generated entry #gsc-ai ⏫',
          reasoning: 'Clear actionable task'
        }],
        taskCompletions: [],
        requiresReview: false
      };

      mockInferenceEngineInstance.inferCapture.mockResolvedValue(mockInference);
      mockTrackerManagerInstance.appendToTracker.mockResolvedValue(true);

      const result = await captureEngine.capture(SAMPLE_CAPTURE_INPUTS.business);

      expect(result.success).toBe(true);
      expect(result.primaryTracker).toBe('gsc-ai');
      expect(result.confidence).toBe(0.95);
      expect(result.itemResults).toHaveLength(1);
      expect(result.itemResults[0].success).toBe(true);
      expect(result.itemResults[0].tracker).toBe('gsc-ai');
      expect(result.itemResults[0].itemType).toBe('action');
      expect(result.itemResults[0].formattedEntry).toBe('- [ ] #task Test AI generated entry #gsc-ai ⏫');
      expect(result.requiresReview).toBe(false);

      expect(mockInferenceEngineInstance.inferCapture).toHaveBeenCalledWith({
        text: SAMPLE_CAPTURE_INPUTS.business,
        inputType: 'text'
      });

      expect(mockTrackerManagerInstance.appendToTracker).toHaveBeenCalledWith(
        'gsc-ai',
        '- [ ] #task Test AI generated entry #gsc-ai ⏫'
      );
    });

    it('should handle CaptureInput object', async () => {
      const captureInput: CaptureInput = {
        text: SAMPLE_CAPTURE_INPUTS.personal,
        inputType: 'voice',
        forceContext: 'personal',
        timestamp: new Date('2024-01-15')
      };

      const mockInference: InferenceResult = {
        primaryTracker: 'tractor',
        confidence: 0.85,
        overallReasoning: 'Personal context match',
        generatedItems: [{
          tracker: 'tractor',
          itemType: 'action',
          priority: 'medium',
          content: '- [ ] #task Personal maintenance task #tractor',
          reasoning: 'Personal maintenance item'
        }],
        taskCompletions: [],
        requiresReview: false
      };

      mockInferenceEngineInstance.inferCapture.mockResolvedValue(mockInference);
      mockTrackerManagerInstance.appendToTracker.mockResolvedValue(true);

      const result = await captureEngine.capture(captureInput);

      expect(result.success).toBe(true);
      expect(result.primaryTracker).toBe('tractor');
      expect(result.itemResults[0].tracker).toBe('tractor');
      expect(mockInferenceEngineInstance.inferCapture).toHaveBeenCalledWith(captureInput);
    });

    it('should auto-initialize if not already initialized', async () => {
      const freshCaptureEngine = new CaptureEngine(TEST_CONFIG);
      
      mockTrackerManagerInstance.initialize.mockResolvedValue(undefined);
      mockInferenceEngineInstance.inferCapture.mockResolvedValue({
        primaryTracker: 'gsc-ai',
        confidence: 0.8,
        overallReasoning: 'Auto-init test',
        generatedItems: [{
          tracker: 'gsc-ai',
          itemType: 'action',
          priority: 'medium',
          content: '- [ ] #task Test input #gsc-ai',
          reasoning: 'Test item'
        }],
        taskCompletions: [],
        requiresReview: false
      });
      mockTrackerManagerInstance.appendToTracker.mockResolvedValue(true);

      await freshCaptureEngine.capture('Test input');

      expect(mockTrackerManagerInstance.initialize).toHaveBeenCalled();
    });
  });

  describe('review routing', () => {
    beforeEach(async () => {
      mockTrackerManagerInstance.initialize.mockResolvedValue(undefined);
      await captureEngine.initialize();
    });

    it('should route to review when confidence is low', async () => {
      const lowConfidenceInference: InferenceResult = {
        primaryTracker: 'gsc-ai',
        confidence: 0.3,
        overallReasoning: 'Low confidence match',
        generatedItems: [{
          tracker: 'gsc-ai',
          itemType: 'action',
          priority: 'medium',
          content: '- [ ] #task Ambiguous input #gsc-ai',
          reasoning: 'Unclear intent'
        }],
        taskCompletions: [],
        requiresReview: true
      };

      mockInferenceEngineInstance.inferCapture.mockResolvedValue(lowConfidenceInference);
      
      // Mock review tracker exists
      const mockReviewTracker: Tracker = {
        frontmatter: { tag: 'review' } as any,
        content: 'content',
        filePath: '/path/to/review.md'
      };
      
      mockTrackerManagerInstance.getTracker.mockReturnValue(mockReviewTracker);
      mockTrackerManagerInstance.appendToTracker.mockResolvedValue(true);

      const result = await captureEngine.capture('Ambiguous input');

      expect(result.success).toBe(true);
      expect(result.primaryTracker).toBe('review');
      expect(result.requiresReview).toBe(true);
      expect(result.itemResults[0].formattedEntry).toContain('REVIEW NEEDED');
      expect(result.itemResults[0].formattedEntry).toContain('Ambiguous input');
    });

    it('should try multiple review tracker names', async () => {
      const lowConfidenceInference: InferenceResult = {
        primaryTracker: 'gsc-ai',
        confidence: 0.95,
        overallReasoning: 'High confidence but requires review',
        generatedItems: [{
          tracker: 'gsc-ai',
          itemType: 'action',
          priority: 'medium',
          content: '- [ ] #task Test input #gsc-ai',
          reasoning: 'Test item'
        }],
        taskCompletions: [],
        requiresReview: true
      };

      mockInferenceEngineInstance.inferCapture.mockResolvedValue(lowConfidenceInference);
      
      // Mock that review and inbox don't exist, but churn-system does
      mockTrackerManagerInstance.getTracker
        .mockReturnValueOnce(undefined) // 'review'
        .mockReturnValueOnce(undefined) // 'inbox'  
        .mockReturnValueOnce({ // 'churn-system'
          frontmatter: { tag: 'churn-system' } as any,
          content: 'content',
          filePath: '/path/to/system.md'
        });
      
      mockTrackerManagerInstance.appendToTracker.mockResolvedValue(true);

      const result = await captureEngine.capture('Test input');

      expect(result.primaryTracker).toBe('review');
      expect(mockTrackerManagerInstance.getTracker).toHaveBeenCalledWith('review');
      expect(mockTrackerManagerInstance.getTracker).toHaveBeenCalledWith('inbox');
      expect(mockTrackerManagerInstance.getTracker).toHaveBeenCalledWith('churn-system');
    });
  });

  describe('error handling and emergency capture', () => {
    beforeEach(async () => {
      mockTrackerManagerInstance.initialize.mockResolvedValue(undefined);
      await captureEngine.initialize();
    });

    it('should fallback to review when tracker write fails', async () => {
      const mockInference: InferenceResult = {
        primaryTracker: 'gsc-ai',
        confidence: 0.8,
        overallReasoning: 'Good match but write fails',
        generatedItems: [{
          tracker: 'gsc-ai',
          itemType: 'action',
          priority: 'medium',
          content: '- [ ] #task Test input #gsc-ai',
          reasoning: 'Test item'
        }],
        taskCompletions: [],
        requiresReview: false
      };

      mockInferenceEngineInstance.inferCapture.mockResolvedValue(mockInference);
      mockTrackerManagerInstance.appendToTracker.mockResolvedValue(false);

      const result = await captureEngine.capture('Test input');

      expect(result.success).toBe(false); // Should fail when write fails
      expect(result.primaryTracker).toBe('gsc-ai');
      expect(result.itemResults[0].success).toBe(false);
      expect(result.itemResults[0].error).toContain('Failed to write to gsc-ai');
    });

    it('should perform emergency capture when everything fails', async () => {
      mockInferenceEngineInstance.inferCapture.mockRejectedValue(new Error('AI service down'));
      
      // Mock available trackers for emergency capture
      const mockTrackers: Tracker[] = [
        {
          frontmatter: { tag: 'emergency-tracker' } as any,
          content: 'content',
          filePath: '/path/to/emergency.md'
        }
      ];
      
      mockTrackerManagerInstance.getTrackersByContext.mockReturnValue(mockTrackers);
      mockTrackerManagerInstance.appendToTracker.mockResolvedValue(true);

      const result = await captureEngine.capture('Emergency input');

      expect(result.success).toBe(true);
      expect(result.primaryTracker).toBe('emergency-tracker');
      expect(result.requiresReview).toBe(true);
      expect(result.confidence).toBe(0.1);
      expect(result.itemResults[0].formattedEntry).toContain('EMERGENCY CAPTURE');
      expect(result.itemResults[0].formattedEntry).toContain('Emergency input');
      expect(console.log).toHaveBeenCalledWith('🆘 Emergency capture saved to emergency-tracker');
    });

    it('should handle complete failure gracefully', async () => {
      mockInferenceEngineInstance.inferCapture.mockRejectedValue(new Error('Complete failure'));
      mockTrackerManagerInstance.getTrackersByContext.mockReturnValue([]);

      const result = await captureEngine.capture('Failed input');

      expect(result.success).toBe(false);
      expect(result.primaryTracker).toBe('none');
      expect(result.requiresReview).toBe(true);
      expect(result.error).toContain('Complete capture failure');
    });

    it('should continue trying trackers on emergency capture failures', async () => {
      mockInferenceEngineInstance.inferCapture.mockRejectedValue(new Error('AI failure'));
      
      const mockTrackers: Tracker[] = [
        { frontmatter: { tag: 'tracker1' } as any, content: '', filePath: '' },
        { frontmatter: { tag: 'tracker2' } as any, content: '', filePath: '' }
      ];
      
      mockTrackerManagerInstance.getTrackersByContext.mockReturnValue(mockTrackers);
      mockTrackerManagerInstance.appendToTracker
        .mockResolvedValueOnce(false) // First tracker fails
        .mockResolvedValueOnce(true);  // Second tracker succeeds

      const result = await captureEngine.capture('Test input');

      expect(result.success).toBe(true);
      expect(result.primaryTracker).toBe('tracker2');
      expect(mockTrackerManagerInstance.appendToTracker).toHaveBeenCalledTimes(2);
    });
  });

  describe('batch capture', () => {
    beforeEach(async () => {
      mockTrackerManagerInstance.initialize.mockResolvedValue(undefined);
      await captureEngine.initialize();
    });

    it('should process multiple inputs successfully', async () => {
      mockInferenceEngineInstance.inferCapture.mockResolvedValue({
        primaryTracker: 'gsc-ai',
        confidence: 0.8,
        overallReasoning: 'Batch test',
        generatedItems: [{
          tracker: 'gsc-ai',
          itemType: 'action',
          priority: 'medium',
          content: '- [ ] #task Batch item #gsc-ai',
          reasoning: 'Test item'
        }],
        taskCompletions: [],
        requiresReview: false
      });
      mockTrackerManagerInstance.appendToTracker.mockResolvedValue(true);

      const inputs = [
        SAMPLE_CAPTURE_INPUTS.business,
        SAMPLE_CAPTURE_INPUTS.personal
      ];

      const results = await captureEngine.captureBatch(inputs);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(mockInferenceEngineInstance.inferCapture).toHaveBeenCalledTimes(2);
    });

    it('should handle individual failures in batch', async () => {
      mockInferenceEngineInstance.inferCapture
        .mockResolvedValueOnce({
          primaryTracker: 'gsc-ai',
          confidence: 0.8,
          overallReasoning: 'Success case',
          generatedItems: [{
            tracker: 'gsc-ai',
            itemType: 'action',
            priority: 'medium',
            content: '- [ ] #task Success input #gsc-ai',
            reasoning: 'Test item'
          }],
          taskCompletions: [],
          requiresReview: false
        })
        .mockRejectedValueOnce(new Error('Second item failed'));
      
      mockTrackerManagerInstance.appendToTracker.mockResolvedValue(true);
      
      // Mock emergency capture scenario
      mockTrackerManagerInstance.getTrackersByContext.mockReturnValue([]);
      mockTrackerManagerInstance.getTracker.mockReturnValue(undefined);

      const inputs = ['Success input', 'Failed input'];
      const results = await captureEngine.captureBatch(inputs);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Complete capture failure');
    });
  });

  describe('status and refresh', () => {
    beforeEach(async () => {
      mockTrackerManagerInstance.initialize.mockResolvedValue(undefined);
      await captureEngine.initialize();
    });

    it('should provide system status', () => {
      const mockTrackers: Tracker[] = [
        { frontmatter: { contextType: 'business' } as any, content: '', filePath: '' },
        { frontmatter: { contextType: 'business' } as any, content: '', filePath: '' },
        { frontmatter: { contextType: 'personal' } as any, content: '', filePath: '' }
      ];

      mockTrackerManagerInstance.getTrackersByContext.mockReturnValue(mockTrackers);

      const status = captureEngine.getStatus();

      expect(status).toEqual({
        initialized: true,
        totalTrackers: 3,
        trackersByContext: {
          business: 2,
          personal: 1
        },
        config: {
          collectionsPath: TEST_CONFIG.collectionsPath,
          aiProvider: TEST_CONFIG.aiProvider,
          confidenceThreshold: TEST_CONFIG.confidenceThreshold
        }
      });
    });

    it('should refresh system data', async () => {
      mockTrackerManagerInstance.refresh.mockResolvedValue(undefined);

      await captureEngine.refresh();

      expect(mockTrackerManagerInstance.refresh).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('🔄 Refreshing ChurnFlow system...');
      expect(console.log).toHaveBeenCalledWith('✅ System refreshed');
    });
  });

  describe('voice capture placeholder', () => {
    it('should throw not implemented error for voice capture', async () => {
      await expect(captureEngine.captureVoice({})).rejects.toThrow('Voice capture not yet implemented');
    });
  });
});