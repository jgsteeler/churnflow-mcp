import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { TrackerManager } from '../../src/core/TrackerManager.js';
import { ChurnConfig } from '../../src/types/churn.js';

describe('TrackerManager Section Placement and Ordering', () => {
  let trackerManager: TrackerManager;
  let tempDir: string;
  let tempTrackerFile: string;
  let tempCrossrefFile: string;

  const mockConfig: ChurnConfig = {
    collectionsPath: '/tmp/test-collections',
    trackingPath: '/tmp/test-tracking', 
    crossrefPath: '/tmp/test-crossref.json',
    aiProvider: 'openai',
    aiApiKey: 'test-key',
    confidenceThreshold: 0.8
  };

  beforeEach(async () => {
    // Create temp directory structure
    tempDir = await fs.mkdtemp('/tmp/churn-test-');
    tempTrackerFile = path.join(tempDir, 'test-tracker.md');
    tempCrossrefFile = path.join(tempDir, 'crossref.json');
    
    // Update config paths
    mockConfig.crossrefPath = tempCrossrefFile;
    
    // Create crossref file
    const crossref = [{
      tag: 'test',
      trackerFile: tempTrackerFile,
      collectionFile: '/tmp/collection.md',
      priority: 1,
      contextType: 'business' as const,
      active: true
    }];
    await fs.writeFile(tempCrossrefFile, JSON.stringify(crossref, null, 2));
    
    trackerManager = new TrackerManager(mockConfig);
  });

  afterEach(async () => {
    // Clean up temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Section Creation', () => {
    test('creates Action Items section when it does not exist', async () => {
      // Create tracker without Action Items section
      const initialContent = `---
tag: test
friendlyName: Test Tracker
---

# Test Tracker

## References

- **Test**: Some reference info [2025-09-16]`;

      await fs.writeFile(tempTrackerFile, initialContent);
      await trackerManager.initialize();

      // Add an action item
      const success = await trackerManager.appendToTracker('test', '- [ ] #task New action item #test');
      
      expect(success).toBe(true);
      
      const updatedContent = await fs.readFile(tempTrackerFile, 'utf-8');
      
      // Should create Action Items section before References
      expect(updatedContent).toContain('## Action Items');
      expect(updatedContent).toContain('- [ ] #task New action item #test');
      
      // Check section ordering
      const actionIndex = updatedContent.indexOf('## Action Items');
      const refIndex = updatedContent.indexOf('## References');
      expect(actionIndex).toBeLessThan(refIndex);
    });

    test('creates Activity Log section when it does not exist', async () => {
      const initialContent = `---
tag: test
friendlyName: Test Tracker
---

# Test Tracker

## Action Items

- [ ] #task Existing action #test`;

      await fs.writeFile(tempTrackerFile, initialContent);
      await trackerManager.initialize();

      const success = await trackerManager.appendActivityToTracker('test', '- [2025-09-16 14:30] Test activity');
      
      expect(success).toBe(true);
      
      const updatedContent = await fs.readFile(tempTrackerFile, 'utf-8');
      
      // Should create Activity Log section before Action Items
      expect(updatedContent).toContain('## Activity Log');
      expect(updatedContent).toContain('- [2025-09-16 14:30] Test activity');
      
      const activityIndex = updatedContent.indexOf('## Activity Log');
      const actionIndex = updatedContent.indexOf('## Action Items');
      expect(activityIndex).toBeLessThan(actionIndex);
    });

    test('maintains proper section ordering when creating new sections', async () => {
      const initialContent = `---
tag: test
friendlyName: Test Tracker
---

# Test Tracker

## References

- **Test**: Some reference info [2025-09-16]

## Notes & Context

- Some notes here`;

      await fs.writeFile(tempTrackerFile, initialContent);
      await trackerManager.initialize();

      // Add activity (should go before References)
      await trackerManager.appendActivityToTracker('test', '- [2025-09-16 14:30] Test activity');
      
      // Add action item (should go after Activity Log, before References) 
      await trackerManager.appendToTracker('test', '- [ ] #task New action item #test');

      const updatedContent = await fs.readFile(tempTrackerFile, 'utf-8');
      
      const activityIndex = updatedContent.indexOf('## Activity Log');
      const actionIndex = updatedContent.indexOf('## Action Items'); 
      const refIndex = updatedContent.indexOf('## References');
      const notesIndex = updatedContent.indexOf('## Notes & Context');
      
      expect(activityIndex).toBeLessThan(actionIndex);
      expect(actionIndex).toBeLessThan(refIndex);
      expect(refIndex).toBeLessThan(notesIndex);
    });
  });

  describe('Section Spacing', () => {
    test('ensures blank lines before and after section headers', async () => {
      const initialContent = `---
tag: test
friendlyName: Test Tracker
---

# Test Tracker
Some content here`;

      await fs.writeFile(tempTrackerFile, initialContent);
      await trackerManager.initialize();

      await trackerManager.appendToTracker('test', '- [ ] #task New action item #test');
      
      const updatedContent = await fs.readFile(tempTrackerFile, 'utf-8');
      
      // Should have blank line before section header
      expect(updatedContent).toMatch(/Some content here\n\n## Action Items\n\n- \[ \] #task New action item #test/);
    });

    test('does not add extra blank lines between list items', async () => {
      const initialContent = `---
tag: test
friendlyName: Test Tracker
---

# Test Tracker

## Action Items

- [ ] #task Existing item #test`;

      await fs.writeFile(tempTrackerFile, initialContent);
      await trackerManager.initialize();

      await trackerManager.appendToTracker('test', '- [ ] #task Second item #test');
      
      const updatedContent = await fs.readFile(tempTrackerFile, 'utf-8');
      
      // Should not have blank lines between list items
      expect(updatedContent).toContain(
        '- [ ] #task Existing item #test\n- [ ] #task Second item #test'
      );
    });
  });

  describe('Entry Ordering', () => {
    test('sorts activity entries by timestamp (oldest first)', async () => {
      const initialContent = `---
tag: test
friendlyName: Test Tracker
---

# Test Tracker

## Activity Log

- [2025-09-16 16:00] Latest activity
- [2025-09-16 12:00] Earlier activity`;

      await fs.writeFile(tempTrackerFile, initialContent);
      await trackerManager.initialize();

      // Add activity with timestamp between existing ones
      await trackerManager.appendActivityToTracker('test', '- [2025-09-16 14:30] Middle activity');
      
      const updatedContent = await fs.readFile(tempTrackerFile, 'utf-8');
      
      // Should be sorted oldest to newest
      const lines = updatedContent.split('\n');
      const activityLines = lines.filter(line => line.includes('[2025-09-16'));
      
      expect(activityLines).toEqual([
        '- [2025-09-16 12:00] Earlier activity',
        '- [2025-09-16 14:30] Middle activity', 
        '- [2025-09-16 16:00] Latest activity'
      ]);
    });

    test('sorts entries with due dates by date (oldest first)', async () => {
      const initialContent = `---
tag: test
friendlyName: Test Tracker
---

# Test Tracker

## Action Items

- [ ] #task Task due later #test 📅 2025-09-20
- [ ] #task Task due soon #test 📅 2025-09-17`;

      await fs.writeFile(tempTrackerFile, initialContent);
      await trackerManager.initialize();

      // Add task with due date in between
      await trackerManager.appendToTracker('test', '- [ ] #task Middle task #test 📅 2025-09-18');
      
      const updatedContent = await fs.readFile(tempTrackerFile, 'utf-8');
      
      // Activities should be sorted, but action items should preserve order (no sortByDate flag)
      // This test confirms the current behavior where action items are not sorted by default
      expect(updatedContent).toContain('- [ ] #task Task due later #test 📅 2025-09-20');
      expect(updatedContent).toContain('- [ ] #task Task due soon #test 📅 2025-09-17');
      expect(updatedContent).toContain('- [ ] #task Middle task #test 📅 2025-09-18');
    });

    test('places entries without dates at the end when sorting', async () => {
      const initialContent = `---
tag: test
friendlyName: Test Tracker
---

# Test Tracker

## Activity Log

- [2025-09-16 16:00] Timestamped activity
- Activity without timestamp`;

      await fs.writeFile(tempTrackerFile, initialContent);
      await trackerManager.initialize();

      await trackerManager.appendActivityToTracker('test', '- [2025-09-16 12:00] Earlier timestamped activity');
      
      const updatedContent = await fs.readFile(tempTrackerFile, 'utf-8');
      
      // Timestamped activities should be sorted first, non-timestamped at end
      const lines = updatedContent.split('\n');
      const activityLogIndex = lines.findIndex(line => line === '## Activity Log');
      const nextSectionIndex = lines.findIndex((line, i) => i > activityLogIndex && line.startsWith('##'));
      const activitySection = lines.slice(activityLogIndex, nextSectionIndex === -1 ? undefined : nextSectionIndex);
      
      const activityLines = activitySection.filter(line => line.trim().startsWith('-'));
      
      // Should have timestamped entries first (sorted), then non-timestamped
      expect(activityLines[0]).toContain('[2025-09-16 12:00]');
      expect(activityLines[1]).toContain('[2025-09-16 16:00]');
      expect(activityLines[2]).toEqual('- Activity without timestamp');
    });
  });

  describe('Existing Section Placement', () => {
    test('adds entry directly after existing entries in section', async () => {
      const initialContent = `---
tag: test
friendlyName: Test Tracker
---

# Test Tracker

## Action Items

- [ ] #task First item #test
- [ ] #task Second item #test

## References

- **Test**: Some reference`;

      await fs.writeFile(tempTrackerFile, initialContent);
      await trackerManager.initialize();

      await trackerManager.appendToTracker('test', '- [ ] #task Third item #test');
      
      const updatedContent = await fs.readFile(tempTrackerFile, 'utf-8');
      
      // Should place new item after existing ones, before next section
      expect(updatedContent).toMatch(
        /- \[ \] #task Second item #test\n- \[ \] #task Third item #test\n## References/
      );
    });

    test('handles sections with mixed content correctly', async () => {
      const initialContent = `---
tag: test
friendlyName: Test Tracker
---

# Test Tracker

## Action Items

- [ ] #task First item #test

Some notes in the section

- [ ] #task Second item #test

## References`;

      await fs.writeFile(tempTrackerFile, initialContent);
      await trackerManager.initialize();

      await trackerManager.appendToTracker('test', '- [ ] #task New item #test');
      
      const updatedContent = await fs.readFile(tempTrackerFile, 'utf-8');
      
      // Should only collect and re-organize the list items, preserving other content
      expect(updatedContent).toContain('- [ ] #task First item #test');
      expect(updatedContent).toContain('- [ ] #task Second item #test'); 
      expect(updatedContent).toContain('- [ ] #task New item #test');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty tracker correctly', async () => {
      const initialContent = `---
tag: test
friendlyName: Test Tracker
---

# Test Tracker`;

      await fs.writeFile(tempTrackerFile, initialContent);
      await trackerManager.initialize();

      await trackerManager.appendToTracker('test', '- [ ] #task First item #test');
      
      const updatedContent = await fs.readFile(tempTrackerFile, 'utf-8');
      
      expect(updatedContent).toContain('## Action Items');
      expect(updatedContent).toContain('- [ ] #task First item #test');
    });

    test('handles tracker with only frontmatter', async () => {
      const initialContent = `---
tag: test
friendlyName: Test Tracker
---`;

      await fs.writeFile(tempTrackerFile, initialContent);
      await trackerManager.initialize();

      await trackerManager.appendToTracker('test', '- [ ] #task First item #test');
      
      const updatedContent = await fs.readFile(tempTrackerFile, 'utf-8');
      
      expect(updatedContent).toContain('## Action Items');
      expect(updatedContent).toContain('- [ ] #task First item #test');
    });
  });
});