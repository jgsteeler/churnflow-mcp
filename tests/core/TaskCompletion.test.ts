import fs from 'fs/promises';
import { TrackerManager } from '../../src/core/TrackerManager.js';
import { CaptureEngine } from '../../src/core/CaptureEngine.js';
import { 
  TEST_CONFIG, 
  MOCK_CROSSREF_ENTRIES, 
  createMockOpenAIResponse
} from '../utils/test-helpers.js';
import matter from 'gray-matter';

// Mock the file system and gray-matter
jest.mock('fs/promises');
jest.mock('gray-matter');

const mockFS = fs as jest.Mocked<typeof fs>;
const mockMatter = matter as jest.MockedFunction<typeof matter>;

describe('Task Completion Tests', () => {
  let trackerManager: TrackerManager;
  let captureEngine: CaptureEngine;
  
  beforeEach(() => {
    trackerManager = new TrackerManager(TEST_CONFIG);
    captureEngine = new CaptureEngine(TEST_CONFIG);
    jest.clearAllMocks();
    
    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('TrackerManager.markTaskComplete', () => {
    const mockTrackerContent = `# Test Tracker

## Action Items
- [ ] #task Complete project documentation #test
- [ ] #task Review code changes #test 
- [ ] #task Deploy to production #test
- [x] #task Already completed task #test ✅ 2024-01-01

## Activity Log
- [2024-01-15] Some activity`;

    beforeEach(async () => {
      // Setup mocks for initialization
      mockFS.readFile.mockResolvedValueOnce(JSON.stringify(MOCK_CROSSREF_ENTRIES));
      mockFS.readFile.mockResolvedValueOnce(mockTrackerContent);
      mockMatter.mockReturnValue({
        orig: '',
        language: '',
        matter: '',
        stringify: jest.fn().mockReturnValue(mockTrackerContent),
        data: {
          tag: 'test',
          friendlyName: 'Test Tracker',
          contextType: 'business',
          active: true
        },
        content: mockTrackerContent
      } as any);
      
      await trackerManager.initialize();
    });

    it('should mark a task as complete', async () => {
      // Mock the file read for markTaskComplete
      mockFS.readFile.mockResolvedValueOnce(mockTrackerContent);
      
      // Mock matter parsing
      const mockStringify = jest.fn().mockReturnValue('updated content');
      mockMatter.mockReturnValueOnce({
        orig: '',
        language: '',
        matter: '',
        stringify: mockStringify,
        data: {
          tag: 'test',
          friendlyName: 'Test Tracker',
          contextType: 'business',
          active: true
        },
        content: mockTrackerContent
      } as any);

      const result = await trackerManager.markTaskComplete('gsc-ai', 'Complete project documentation');
      expect(result).toBe(true);
      
      // Verify writeFile was called with updated content
      expect(mockFS.writeFile).toHaveBeenCalled();
      expect(mockStringify).toHaveBeenCalled();
    });

    it('should not modify already completed tasks', async () => {
      // Mock the file read for markTaskComplete
      mockFS.readFile.mockResolvedValueOnce(mockTrackerContent);
      
      // Mock matter parsing
      mockMatter.mockReturnValueOnce({
        orig: '',
        language: '',
        matter: '',
        stringify: jest.fn(),
        data: {
          tag: 'test',
          friendlyName: 'Test Tracker',
          contextType: 'business',
          active: true
        },
        content: mockTrackerContent
      } as any);

      const result = await trackerManager.markTaskComplete('gsc-ai', 'Already completed task');
      expect(result).toBe(false);
      
      // Verify writeFile was not called
      expect(mockFS.writeFile).not.toHaveBeenCalled();
    });

    it('should return false for non-existent tracker', async () => {
      const result = await trackerManager.markTaskComplete('nonexistent', 'Some task');
      expect(result).toBe(false);
    });
  });

  describe('CaptureEngine task completion integration', () => {
    beforeEach(async () => {
      // Setup mocks for initialization
      mockFS.readFile.mockResolvedValueOnce(JSON.stringify(MOCK_CROSSREF_ENTRIES));
      mockFS.readFile.mockResolvedValueOnce('# Test Tracker\n\n- [ ] #task Deploy to production #test');
      mockMatter.mockReturnValue({
        orig: '',
        language: '',
        matter: '',
        stringify: jest.fn(),
        data: {
          tag: 'test',
          friendlyName: 'Test Tracker',
          contextType: 'business',
          active: true
        },
        content: '# Test Tracker\n\n- [ ] #task Deploy to production #test'
      } as any);
      
      await captureEngine.initialize();
    });

    it('should process task completions from AI inference', async () => {
      // Mock the OpenAI API response
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(createMockOpenAIResponse({
              primaryTracker: 'gsc-ai',
              confidence: 0.9,
              overallReasoning: 'Task completion detected',
              generatedItems: [],
              taskCompletions: [
                {
                  tracker: 'gsc-ai',
                  description: 'Deploy to production',
                  reasoning: 'User indicated this task was completed'
                }
              ],
              requiresReview: false
            }))
          }
        }
      };

      // Replace the OpenAI instance in InferenceEngine
      (captureEngine as any).inferenceEngine.openai = mockOpenAI;

      // Mock file operations for task completion
      const mockContent = '# Test Tracker\n\n- [ ] #task Deploy to production #test';
      mockFS.readFile.mockResolvedValueOnce(mockContent);
      const mockStringify = jest.fn().mockReturnValue('updated content');
      mockMatter.mockReturnValueOnce({
        orig: '',
        language: '',
        matter: '',
        stringify: mockStringify,
        data: {
          tag: 'test',
          friendlyName: 'Test Tracker',
          contextType: 'business',
          active: true
        },
        content: mockContent
      } as any);

      const result = await captureEngine.capture('I finished deploying to production');
      
      expect(result.success).toBe(true);
      expect(result.completedTasks).toHaveLength(1);
      expect(result.completedTasks[0].description).toBe('Deploy to production');
      expect((result.completedTasks[0] as any).success).toBe(true);
      
      // Verify the task was marked complete
      expect(mockFS.writeFile).toHaveBeenCalled();
      expect(mockStringify).toHaveBeenCalled();
    });

    it('should handle task completion failures gracefully', async () => {
      // Mock the OpenAI API response with a non-existent task
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(createMockOpenAIResponse({
              primaryTracker: 'gsc-ai',
              confidence: 0.9,
              overallReasoning: 'Task completion detected',
              generatedItems: [],
              taskCompletions: [
                {
                  tracker: 'gsc-ai',
                  description: 'Non-existent task',
                  reasoning: 'User indicated this task was completed'
                }
              ],
              requiresReview: false
            }))
          }
        }
      };

      // Replace the OpenAI instance in InferenceEngine
      (captureEngine as any).inferenceEngine.openai = mockOpenAI;

      // Mock file operations for task completion
      const mockContent = '# Test Tracker\n\n- [ ] #task Deploy to production #test';
      mockFS.readFile.mockResolvedValueOnce(mockContent);
      mockMatter.mockReturnValueOnce({
        orig: '',
        language: '',
        matter: '',
        stringify: jest.fn(),
        data: {
          tag: 'test',
          friendlyName: 'Test Tracker',
          contextType: 'business',
          active: true
        },
        content: mockContent
      } as any);

      const result = await captureEngine.capture('I finished a non-existent task');
      
      expect(result.success).toBe(false);
      expect(result.completedTasks).toHaveLength(1);
      expect(result.completedTasks[0].description).toBe('Non-existent task');
      expect((result.completedTasks[0] as any).success).toBe(false);
      
      // Verify writeFile was not called since task wasn't found
      expect(mockFS.writeFile).not.toHaveBeenCalled();
    });
  });
});