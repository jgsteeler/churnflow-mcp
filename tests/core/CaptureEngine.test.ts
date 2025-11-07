import { CaptureEngine } from '../../src/core/CaptureEngine';
import { InferenceEngine } from '../../src/core/InferenceEngine';
import { DatabaseManager } from '../../src/storage/DatabaseManager';
import { ChurnConfig, CaptureInput } from '../../src/types';

// Mock dependencies
jest.mock('../../src/core/InferenceEngine');
jest.mock('../../src/storage/DatabaseManager');

const MockInferenceEngine = InferenceEngine as jest.MockedClass<typeof InferenceEngine>;
const MockDatabaseManager = DatabaseManager as jest.MockedClass<typeof DatabaseManager>;

describe('CaptureEngine (DB-Only)', () => {
  let captureEngine: CaptureEngine;
  let mockInferenceEngineInstance: jest.Mocked<InferenceEngine>;
  let mockDbManagerInstance: jest.Mocked<DatabaseManager>;
  const testConfig: ChurnConfig = {
    aiProvider: 'openai',
    aiApiKey: 'test-key',
    confidenceThreshold: 0.7,
    dbPath: ':memory:',
  };

  beforeEach(() => {
    // The 'as any' is a workaround for Jest not being able to mock constructors with private members easily
    mockInferenceEngineInstance = new (MockInferenceEngine as any)(testConfig, null);
    mockDbManagerInstance = new (MockDatabaseManager as any)(testConfig);

    // Mock the constructor of DatabaseManager to return our singleton mock instance
    MockDatabaseManager.mockImplementation(() => mockDbManagerInstance);
    
    captureEngine = new CaptureEngine(testConfig);
    
    // Manually inject the mocked dependencies into the instance of CaptureEngine
    (captureEngine as any).dbManager = mockDbManagerInstance;
    (captureEngine as any).inferenceEngine = mockInferenceEngineInstance;

    // Assume initialization is successful for most tests
    mockDbManagerInstance.setupDatabase.mockResolvedValue();
    (captureEngine as any).initialized = true;

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      (captureEngine as any).initialized = false; // Force re-initialization
      await captureEngine.initialize();
      expect(mockDbManagerInstance.initialize).toHaveBeenCalled();
      expect(captureEngine.isInitialized()).toBe(true);
    });
  });

  describe('capture', () => {
    it('should perform a successful capture', async () => {
      const input: CaptureInput = { text: 'this is a test capture', inputType: 'text' };
      const rawCaptureId = 'test-capture-id';
      const inferenceResult = {
        primaryTracker: 'test-context',
        confidence: 0.9,
        generatedItems: [{
          tracker: 'test-context',
          itemType: 'action',
          priority: 'medium',
          content: '- [ ] this is a test capture #test',
        }],
        requiresReview: false,
      };

      mockDbManagerInstance.createRawCapture.mockResolvedValue({ id: rawCaptureId, item: input.text, status: 'processing', createdAt: new Date().toISOString() } as any);
      mockInferenceEngineInstance.inferCapture.mockResolvedValue(inferenceResult as any);
      mockDbManagerInstance.updateCaptureWithInference.mockResolvedValue();

      const result = await captureEngine.capture(input);

      expect(mockDbManagerInstance.createRawCapture).toHaveBeenCalledWith(input.text, input.inputType);
      expect(mockInferenceEngineInstance.inferCapture).toHaveBeenCalledWith(input);
      expect(mockDbManagerInstance.updateCaptureWithInference).toHaveBeenCalledWith(rawCaptureId, inferenceResult);
      expect(result.success).toBe(true);
      expect(result.captureId).toBe(rawCaptureId);
      expect(result.primaryTracker).toBe('test-context');
    });

    it('should handle low confidence by flagging for review', async () => {
        const input: CaptureInput = { text: 'ambiguous input', inputType: 'text' };
        const rawCaptureId = 'ambiguous-capture-id';
        const inferenceResult = {
          primaryTracker: 'review',
          confidence: 0.4,
          generatedItems: [{
            tracker: 'review',
            itemType: 'review',
            priority: 'medium',
            content: 'ambiguous input',
          }],
          requiresReview: true,
        };
  
        mockDbManagerInstance.createRawCapture.mockResolvedValue({ id: rawCaptureId, item: input.text, status: 'processing', createdAt: new Date().toISOString() } as any);
        mockInferenceEngineInstance.inferCapture.mockResolvedValue(inferenceResult as any);
        mockDbManagerInstance.updateCaptureWithInference.mockResolvedValue();
  
        const result = await captureEngine.capture(input);
  
        expect(result.success).toBe(true);
        expect(result.requiresReview).toBe(true);
        expect(result.primaryTracker).toBe('review');
      });

    it('should handle inference engine failure', async () => {
      const input: CaptureInput = { text: 'inference will fail', inputType: 'text' };
      const rawCaptureId = 'fail-capture-id';
      const error = new Error('Inference failed');

      mockDbManagerInstance.createRawCapture.mockResolvedValue({ id: rawCaptureId, item: input.text, status: 'processing', createdAt: new Date().toISOString() } as any);
      mockInferenceEngineInstance.inferCapture.mockRejectedValue(error);
      mockDbManagerInstance.updateCaptureWithInference.mockResolvedValue();

      const result = await captureEngine.capture(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Inference engine failed');
      expect(mockDbManagerInstance.updateCaptureWithInference).toHaveBeenCalled();
      const updatedInference = mockDbManagerInstance.updateCaptureWithInference.mock.calls[0][1];
      expect(updatedInference.requiresReview).toBe(true);
      expect(updatedInference.primaryTracker).toBe('review');
    });
  });

  describe('getStatus', () => {
    it('should return the system status', async () => {
        mockDbManagerInstance.getDashboardStats.mockResolvedValue({
            inbox: 10,
            needingReview: 2,
            active: 5,
            completed: 3,
            overdue: 1,
        });
        mockDbManagerInstance.isAvailable.mockResolvedValue(true);

        const status = await captureEngine.getStatus();

        expect(status.initialized).toBe(true);
        expect(status.databaseAvailable).toBe(true);
        expect(status.dbStats).toEqual({
            inbox: 10,
            needingReview: 2,
            active: 5,
            completed: 3,
            overdue: 1,
        });
    });
  });
});