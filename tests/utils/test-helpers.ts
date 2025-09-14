/**
 * Test utilities and helpers for ChurnFlow testing
 */

import { ChurnConfig, CrossrefEntry, TrackerFrontmatter } from '../../src/types/churn.js';

export const TEST_CONFIG: ChurnConfig = {
  collectionsPath: '/test/collections',
  trackingPath: '/test/tracking',
  crossrefPath: '/test/fixtures/mock-crossref.json',
  aiProvider: 'openai',
  aiApiKey: 'test-api-key',
  confidenceThreshold: 0.7
};

export const MOCK_FRONTMATTER: TrackerFrontmatter = {
  tag: 'test-tracker',
  friendlyName: 'Test Tracker',
  collection: 'test-collection',
  contextType: 'project',
  mode: 'active',
  iterationType: 'weekly',
  iterationStarted: '2024-01-01',
  syncDefault: 'auto',
  syncModes: ['manual', 'auto'],
  reloadCarryForwardAll: false,
  reloadFocusItemCount: 5,
  reloadCarryForwardTags: ['test', 'urgent'],
  active: true,
  priority: 1
};

export const MOCK_CROSSREF_ENTRIES: CrossrefEntry[] = [
  {
    tag: 'gsc-ai',
    trackerFile: '/test/fixtures/mock-tracker.md',
    collectionFile: '/test/collections/gsc-ai.md',
    priority: 1,
    contextType: 'business',
    active: true
  },
  {
    tag: 'project-55',
    trackerFile: '/test/project-55-tracker.md',
    collectionFile: '/test/collections/project-55.md',
    priority: 1,
    contextType: 'project',
    active: true
  },
  {
    tag: 'inactive-test',
    trackerFile: '/test/inactive-tracker.md',
    collectionFile: '/test/collections/inactive.md',
    priority: 1,
    contextType: 'project',
    active: false
  }
];

export const MOCK_TRACKER_CONTENT = `# Test Tracker

## Action Items
- [ ] #task Test action item
- [ ] #urgent Important task
- [x] #completed Finished task

## Activity Log
- Recent activity item 1
- Recent activity item 2

## References
- Important reference 1
- Important reference 2`;

export const MOCK_AI_RESPONSE = {
  inferredTracker: 'gsc-ai',
  itemType: 'action' as const,
  priority: 'high' as const,
  confidence: 0.95,
  reasoning: 'High confidence match based on business context keywords',
  formattedEntry: '- [ ] #task Test AI generated entry 📅 2024-01-15',
  requiresReview: false
};

/**
 * Create a minimal mock OpenAI response
 */
export function createMockOpenAIResponse(content: any) {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify(content)
        }
      }
    ]
  };
}

/**
 * Create a mock fs module for testing file operations
 */
export function createMockFS() {
  return {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn()
  };
}

/**
 * Create mock logger for suppressing console output during tests
 */
export function createMockLogger() {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  };
}

export const SAMPLE_CAPTURE_INPUTS = {
  business: 'Need to follow up with the client about the AI implementation proposal',
  personal: 'Remember to change the oil in the tractor this weekend',
  project: 'Add error handling to the capture engine module',
  system: 'Update the crossref registry with new tracker mappings'
};