/**
 * Tests for TrackerManager - Core tracker management functionality
 */

import { TrackerManager } from '../../src/core/TrackerManager.js';
import { 
  TEST_CONFIG, 
  MOCK_CROSSREF_ENTRIES, 
  MOCK_TRACKER_CONTENT,
  createMockFS 
} from '../utils/test-helpers.js';
import fs from 'fs/promises';
import matter from 'gray-matter';

// Mock the file system
jest.mock('fs/promises');
jest.mock('gray-matter');

const mockFS = fs as jest.Mocked<typeof fs>;
const mockMatter = matter as jest.MockedFunction<typeof matter>;

describe('TrackerManager', () => {
  let trackerManager: TrackerManager;
  
  beforeEach(() => {
    trackerManager = new TrackerManager(TEST_CONFIG);
    jest.clearAllMocks();
    
    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should load crossref and trackers successfully', async () => {
      // Mock crossref file loading
      mockFS.readFile.mockResolvedValueOnce(JSON.stringify(MOCK_CROSSREF_ENTRIES));
      
      // Mock tracker file loading
      mockFS.readFile.mockResolvedValueOnce(MOCK_TRACKER_CONTENT);
      
      // Mock gray-matter parsing
      mockMatter.mockReturnValue({
        orig: '',
        language: '',
        matter: '',
        stringify: jest.fn(),
        data: {
          tag: 'gsc-ai',
          friendlyName: 'GSC AI Consulting',
          contextType: 'business'
        },
        content: '## Action Items\\n- [ ] Test item'
      } as any);

      await trackerManager.initialize();

      expect(mockFS.readFile).toHaveBeenCalledWith(TEST_CONFIG.crossrefPath, 'utf-8');
      expect(console.log).toHaveBeenCalledWith('Loaded 3 crossref entries');
    });

    it('should throw error when crossref loading fails', async () => {
      mockFS.readFile.mockRejectedValueOnce(new Error('File not found'));

      await expect(trackerManager.initialize()).rejects.toThrow('Cannot initialize without crossref data');
    });

    it('should skip inactive trackers during loading', async () => {
      mockFS.readFile.mockResolvedValueOnce(JSON.stringify(MOCK_CROSSREF_ENTRIES));
      
      // Mock successful loading for active tracker
      mockFS.readFile.mockResolvedValueOnce(MOCK_TRACKER_CONTENT);
      mockMatter.mockReturnValue({
        orig: "",
        language: "",
        matter: "",
        stringify: jest.fn(),
        data: { tag: 'gsc-ai', contextType: 'business' },
        content: 'content'
      } as any);

      await trackerManager.initialize();

      // Should only load active trackers (inactive-test should be skipped)
      expect(mockFS.readFile).toHaveBeenCalledTimes(3); // crossref + 2 active trackers
    });
  });

  describe('tracker retrieval', () => {
    beforeEach(async () => {
      // Setup successful initialization
      mockFS.readFile.mockResolvedValueOnce(JSON.stringify(MOCK_CROSSREF_ENTRIES));
      mockFS.readFile.mockResolvedValueOnce(MOCK_TRACKER_CONTENT);
      mockMatter.mockReturnValue({
        orig: "",
        language: "",
        matter: "",
        stringify: jest.fn(),
        data: {
          tag: 'gsc-ai',
          friendlyName: 'GSC AI Consulting',
          contextType: 'business'
        },
        content: MOCK_TRACKER_CONTENT
      } as any);
      
      await trackerManager.initialize();
    });

    it('should get tracker by tag', () => {
      const tracker = trackerManager.getTracker('gsc-ai');
      
      expect(tracker).toBeDefined();
      expect(tracker?.frontmatter.tag).toBe('gsc-ai');
      expect(tracker?.frontmatter.contextType).toBe('business');
    });

    it('should return undefined for non-existent tracker', () => {
      const tracker = trackerManager.getTracker('non-existent');
      
      expect(tracker).toBeUndefined();
    });

    it('should get all trackers when no context filter applied', () => {
      const trackers = trackerManager.getTrackersByContext();
      
      expect(trackers).toHaveLength(2); // Both gsc-ai and project-55 are loaded
      expect(trackers[0].frontmatter.tag).toBe('gsc-ai');
    });

    it('should filter trackers by context type', () => {
      const businessTrackers = trackerManager.getTrackersByContext('business');
      const personalTrackers = trackerManager.getTrackersByContext('personal');
      
      expect(businessTrackers).toHaveLength(2); // Both trackers are business context in our mock
      expect(businessTrackers[0].frontmatter.contextType).toBe('business');
      expect(personalTrackers).toHaveLength(0);
    });
  });

  describe('context extraction', () => {
    beforeEach(async () => {
      mockFS.readFile.mockResolvedValueOnce(JSON.stringify(MOCK_CROSSREF_ENTRIES));
      mockFS.readFile.mockResolvedValueOnce(MOCK_TRACKER_CONTENT);
      mockMatter.mockReturnValue({
        orig: "",
        language: "",
        matter: "",
        stringify: jest.fn(),
        data: {
          tag: 'gsc-ai',
          friendlyName: 'GSC AI Consulting',
          contextType: 'business'
        },
        content: MOCK_TRACKER_CONTENT
      } as any);
      
      await trackerManager.initialize();
    });

    it('should create context map for AI inference', () => {
      const contextMap = trackerManager.getContextMap();
      
      expect(contextMap).toHaveProperty('gsc-ai');
      expect(contextMap['gsc-ai']).toEqual({
        friendlyName: 'GSC AI Consulting',
        contextType: 'business',
        keywords: expect.any(Array),
        recentActivity: expect.any(Array)
      } as any);
    });

    it('should extract hashtags and keywords from content', () => {
      const contextMap = trackerManager.getContextMap();
      const keywords = contextMap['gsc-ai'].keywords;
      
      expect(keywords).toContain('#task');
      expect(keywords).toContain('#urgent');
      expect(keywords).toContain('#completed');
    });
  });

  describe('file operations', () => {
    beforeEach(async () => {
      mockFS.readFile.mockResolvedValueOnce(JSON.stringify(MOCK_CROSSREF_ENTRIES));
      mockFS.readFile.mockResolvedValueOnce(MOCK_TRACKER_CONTENT);
      mockMatter.mockReturnValue({
        orig: "",
        language: "",
        matter: "",
        stringify: jest.fn(),
        data: {
          tag: 'gsc-ai',
          friendlyName: 'GSC AI Consulting',
          contextType: 'business'
        },
        content: MOCK_TRACKER_CONTENT
      } as any);
      
      await trackerManager.initialize();
    });

    it('should append entry to tracker successfully', async () => {
      const existingContent = `---\\ntag: gsc-ai\\n---\\n\\n## Action Items\\n- [ ] Existing item`;
      
      mockFS.readFile.mockResolvedValueOnce(existingContent);
      mockMatter
        .mockReturnValueOnce({
          orig: '',
          language: '',
          matter: '',
          stringify: jest.fn(),
          data: { tag: 'gsc-ai' },
          content: '\\n## Action Items\\n- [ ] Existing item'
        } as any)
        .mockImplementation(matter.stringify as any);
      
      mockFS.writeFile.mockResolvedValueOnce(undefined);

      const result = await trackerManager.appendToTracker('gsc-ai', '- [ ] #task New test item');
      
      expect(result).toBe(true);
      expect(mockFS.writeFile).toHaveBeenCalled();
    });

    it('should return false when tracker not found', async () => {
      const result = await trackerManager.appendToTracker('non-existent', '- [ ] Test item');
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Tracker not found: non-existent');
    });

    it('should handle file write errors gracefully', async () => {
      mockFS.readFile.mockResolvedValueOnce('mock content');
      mockMatter.mockReturnValue({
        orig: "",
        language: "",
        matter: "",
        stringify: jest.fn(),
        data: { tag: 'gsc-ai' },
        content: 'content'
      } as any);
      mockFS.writeFile.mockRejectedValueOnce(new Error('Write failed'));

      const result = await trackerManager.appendToTracker('gsc-ai', '- [ ] Test item');
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Failed to append to tracker gsc-ai:', expect.any(Error));
    });
  });

  describe('refresh functionality', () => {
    it('should reinitialize when refreshed', async () => {
      const initializeSpy = jest.spyOn(trackerManager, 'initialize' as any);
      
      // Mock successful initialization
      mockFS.readFile.mockResolvedValue(JSON.stringify(MOCK_CROSSREF_ENTRIES));
      mockMatter.mockReturnValue({
        orig: "",
        language: "",
        matter: "",
        stringify: jest.fn(),
        data: { tag: 'test' },
        content: 'content'
      } as any);

      await trackerManager.refresh();
      
      expect(initializeSpy).toHaveBeenCalled();
    });
  });
});