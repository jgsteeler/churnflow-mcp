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

// New multi-item response format
export const MOCK_MULTI_ITEM_RESPONSE = {
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
};

export const MOCK_SINGLE_ITEM_RESPONSE = {
  primaryTracker: 'project-55',
  confidence: 0.85,
  overallReasoning: 'Simple action item for project development',
  generatedItems: [
    {
      tracker: 'project-55',
      itemType: 'action',
      priority: 'high',
      content: '- [ ] #task Fix the bug in user authentication module.',
      reasoning: 'Clear actionable task for project'
    }
  ],
  taskCompletions: [],
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
  system: 'Update the crossref registry with new tracker mappings',
  
  // Multi-item capture scenarios
  dougWelder: 'Doug picked up his welder today. He paid me 200 dollars cash and mentioned he has a leaf vacuum that needs fixing and also has a Ford 8n tractor that might need some work.',
  
  // Activity updates
  clientMeeting: 'Met with Johnson Corp today. They approved the Phase 2 proposal for $15K. Need to schedule kickoff for next week and update the contract.',
  
  // Task completion scenarios
  projectComplete: 'Finished the website redesign project. Client is happy with the results. Invoice sent for final payment of $3500.',
  
  // Mixed context items
  weekendUpdate: 'Fixed the deck railing finally. Also need to call mom about thanksgiving and schedule oil change for the truck.',
  
  // Edge cases
  vague: 'Something about the thing we discussed',
  empty: '',
  tooLong: 'This is a really long capture that contains way too much information and probably should be broken down into smaller pieces but sometimes people with ADHD just need to brain dump everything at once and that is totally okay because the system should handle it gracefully and route things appropriately without getting overwhelmed.',
  
  // Reference scenarios  
  importantInfo: 'Doug mentioned his leaf vacuum is a Craftsman model 25cc and it needs a new carburetor. Parts should cost around $45 from Home Depot.',
  
  // Review scenarios
  decision: 'Should we expand into mobile app development? Market research shows demand but need to evaluate team capacity and competition.'
};
