import { describe, test, expect, beforeEach } from '@jest/globals';
import { FormattingUtils } from '../../src/utils/FormattingUtils.js';
import { ItemType, Priority } from '../../src/types/churn.js';

describe('FormattingUtils v0.2.2 Tests', () => {
  
  describe('Date and Time Formatting', () => {
    test('formatDate returns ISO date format', () => {
      const testDate = new Date('2025-09-16T12:30:45Z');
      const result = FormattingUtils.formatDate(testDate);
      expect(result).toBe('2025-09-16');
    });

    test('formatTimestamp returns proper timestamp format', () => {
      const testDate = new Date('2025-09-16T12:30:45Z');
      const result = FormattingUtils.formatTimestamp(testDate);
      expect(result).toBe('2025-09-16 12:30');
    });

    test('formatDate defaults to current date when no parameter provided', () => {
      const result = FormattingUtils.formatDate();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Priority Indicators', () => {
    test('returns correct emoji for each priority level', () => {
      expect(FormattingUtils.getPriorityIndicator('critical')).toBe('🚨');
      expect(FormattingUtils.getPriorityIndicator('high')).toBe('⏫');
      expect(FormattingUtils.getPriorityIndicator('medium')).toBe('🔼');
      expect(FormattingUtils.getPriorityIndicator('low')).toBe('🔻');
    });
  });

  describe('Action Item Formatting', () => {
    test('formats basic action item correctly', () => {
      const result = FormattingUtils.formatActionItem({
        description: 'Complete the task',
        tag: 'test-tag'
      });
      expect(result).toBe('- [ ] #task Complete the task #test-tag');
    });

    test('formats action item with priority', () => {
      const result = FormattingUtils.formatActionItem({
        description: 'Urgent task',
        tag: 'urgent',
        priority: 'high'
      });
      expect(result).toBe('- [ ] #task Urgent task #urgent ⏫');
    });

    test('formats action item with due date', () => {
      const dueDate = new Date('2025-12-31T00:00:00Z');
      const result = FormattingUtils.formatActionItem({
        description: 'Year end task',
        tag: 'deadlines',
        dueDate
      });
      expect(result).toBe('- [ ] #task Year end task #deadlines 📅 2025-12-31');
    });

    test('formats completed action item', () => {
      const completionDate = new Date('2025-09-16T00:00:00Z');
      const result = FormattingUtils.formatActionItem({
        description: 'Finished task',
        tag: 'done',
        completed: true,
        completionDate
      });
      expect(result).toBe('- [x] #task Finished task #done ✅ 2025-09-16');
    });

    test('does not show due date for completed items', () => {
      const dueDate = new Date('2025-12-31T00:00:00Z');
      const completionDate = new Date('2025-09-16T00:00:00Z');
      const result = FormattingUtils.formatActionItem({
        description: 'Task was due later but finished early',
        tag: 'efficient',
        dueDate,
        completed: true,
        completionDate
      });
      expect(result).toBe('- [x] #task Task was due later but finished early #efficient ✅ 2025-09-16');
      expect(result).not.toContain('📅');
    });
  });

  describe('Activity Formatting', () => {
    test('formats activity with timestamp', () => {
      const timestamp = new Date('2025-09-16T14:30:00Z');
      const result = FormattingUtils.formatActivity('Completed important meeting', timestamp);
      expect(result).toBe('- [2025-09-16 14:30] Completed important meeting');
    });

    test('formats activity with default timestamp', () => {
      const result = FormattingUtils.formatActivity('Default timestamp activity');
      expect(result).toMatch(/^- \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\] Default timestamp activity$/);
    });
  });

  describe('Reference Formatting', () => {
    test('formats reference entry correctly', () => {
      const date = new Date('2025-09-16T00:00:00Z');
      const result = FormattingUtils.formatReference(
        'Important Document', 
        'Key insights from the quarterly review', 
        date
      );
      expect(result).toBe('- **Important Document**: Key insights from the quarterly review [2025-09-16]');
    });

    test('formats reference with default date', () => {
      const result = FormattingUtils.formatReference(
        'Meeting Notes',
        'Team sync discussion points'
      );
      expect(result).toMatch(/^- \*\*Meeting Notes\*\*: Team sync discussion points \[\d{4}-\d{2}-\d{2}\]$/);
    });
  });

  describe('Someday Item Formatting', () => {
    test('formats someday item correctly', () => {
      const captureDate = new Date('2025-09-16T00:00:00Z');
      const result = FormattingUtils.formatSomedayItem(
        'Learn new programming language',
        'learning',
        captureDate
      );
      expect(result).toBe('- [ ] #someday [2025-09-16] Learn new programming language #learning');
    });

    test('formats someday item with default capture date', () => {
      const result = FormattingUtils.formatSomedayItem('Future project idea', 'projects');
      expect(result).toMatch(/^- \[ \] #someday \[\d{4}-\d{2}-\d{2}\] Future project idea #projects$/);
    });
  });

  describe('Review Item Formatting', () => {
    test('formats review item with confidence', () => {
      const date = new Date('2025-09-16T00:00:00Z');
      const result = FormattingUtils.formatReviewItem(
        'Needs human decision',
        0.65,
        date
      );
      expect(result).toBe('- [ ] #review [2025-09-16] Needs human decision (confidence: 65%)');
    });

    test('formats review item with low confidence', () => {
      const result = FormattingUtils.formatReviewItem('Unclear routing', 0.23);
      expect(result).toMatch(/^- \[ \] #review \[\d{4}-\d{2}-\d{2}\] Unclear routing \(confidence: 23%\)$/);
    });

    test('handles zero confidence', () => {
      const result = FormattingUtils.formatReviewItem('Complete uncertainty', 0);
      expect(result).toMatch(/^- \[ \] #review \[\d{4}-\d{2}-\d{2}\] Complete uncertainty \(confidence: 0%\)$/);
    });
  });

  describe('Generic formatEntry Method', () => {
    test('formats action items correctly', () => {
      const result = FormattingUtils.formatEntry('action', 'Test action', {
        tag: 'testing',
        priority: 'high',
        includePriority: true
      });
      expect(result).toBe('- [ ] #task Test action #testing ⏫');
    });

    test('formats activity items correctly', () => {
      const result = FormattingUtils.formatEntry('activity', 'Test activity');
      expect(result).toMatch(/^- \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\] Test activity$/);
    });

    test('formats reference items correctly', () => {
      const result = FormattingUtils.formatEntry('reference', 'Important info', {
        title: 'Key Reference'
      });
      expect(result).toMatch(/^- \*\*Key Reference\*\*: Important info \[\d{4}-\d{2}-\d{2}\]$/);
    });

    test('formats someday items correctly', () => {
      const result = FormattingUtils.formatEntry('someday', 'Future idea', {
        tag: 'ideas'
      });
      expect(result).toMatch(/^- \[ \] #someday \[\d{4}-\d{2}-\d{2}\] Future idea #ideas$/);
    });

    test('formats review items correctly', () => {
      const result = FormattingUtils.formatEntry('review', 'Needs review', {
        confidence: 0.8
      });
      expect(result).toMatch(/^- \[ \] #review \[\d{4}-\d{2}-\d{2}\] Needs review \(confidence: 80%\)$/);
    });

    test('falls back to basic format for unknown types', () => {
      // @ts-ignore - testing invalid type handling
      const result = FormattingUtils.formatEntry('unknown', 'Test content');
      expect(result).toBe('- Test content');
    });
  });

  describe('Validation Methods', () => {
    describe('Date Format Validation', () => {
      test('validates correct ISO dates', () => {
        expect(FormattingUtils.validateDateFormat('2025-09-16')).toBe(true);
        expect(FormattingUtils.validateDateFormat('2025-12-31')).toBe(true);
        expect(FormattingUtils.validateDateFormat('2025-01-01')).toBe(true);
      });

      test('rejects invalid date formats', () => {
        expect(FormattingUtils.validateDateFormat('25-09-16')).toBe(false);
        expect(FormattingUtils.validateDateFormat('2025/09/16')).toBe(false);
        expect(FormattingUtils.validateDateFormat('Sep 16, 2025')).toBe(false);
        expect(FormattingUtils.validateDateFormat('not-a-date')).toBe(false);
        expect(FormattingUtils.validateDateFormat('2025-9-16')).toBe(false);
      });
    });

    describe('Timestamp Format Validation', () => {
      test('validates correct timestamps', () => {
        expect(FormattingUtils.validateTimestampFormat('2025-09-16 14:30')).toBe(true);
        expect(FormattingUtils.validateTimestampFormat('2025-12-31 23:59')).toBe(true);
        expect(FormattingUtils.validateTimestampFormat('2025-01-01 00:00')).toBe(true);
      });

      test('rejects invalid timestamp formats', () => {
        expect(FormattingUtils.validateTimestampFormat('2025-09-16 2:30')).toBe(false);
        expect(FormattingUtils.validateTimestampFormat('2025-09-16 14:30:45')).toBe(false);
        expect(FormattingUtils.validateTimestampFormat('2025-09-16T14:30')).toBe(false);
        expect(FormattingUtils.validateTimestampFormat('Sep 16 14:30')).toBe(false);
      });
    });

    describe('Tag Validation', () => {
      test('validates correct hashtags', () => {
        expect(FormattingUtils.validateHashtag('#test')).toBe(true);
        expect(FormattingUtils.validateHashtag('#test-tag')).toBe(true);
        expect(FormattingUtils.validateHashtag('#test_tag')).toBe(true);
        expect(FormattingUtils.validateHashtag('#test123')).toBe(true);
      });

      test('rejects invalid hashtags', () => {
        expect(FormattingUtils.validateHashtag('test')).toBe(false);
        expect(FormattingUtils.validateHashtag('#test tag')).toBe(false);
        expect(FormattingUtils.validateHashtag('##test')).toBe(false);
        expect(FormattingUtils.validateHashtag('#')).toBe(false);
      });

      test('validates correct context tags', () => {
        expect(FormattingUtils.validateContextTag('@next')).toBe(true);
        expect(FormattingUtils.validateContextTag('@review')).toBe(true);
        expect(FormattingUtils.validateContextTag('@high-priority')).toBe(true);
      });

      test('rejects invalid context tags', () => {
        expect(FormattingUtils.validateContextTag('next')).toBe(false);
        expect(FormattingUtils.validateContextTag('@next action')).toBe(false);
        expect(FormattingUtils.validateContextTag('@@next')).toBe(false);
        expect(FormattingUtils.validateContextTag('@')).toBe(false);
      });
    });
  });

  describe('Tag Extraction', () => {
    test('extracts hashtags and context tags from text', () => {
      const text = 'This is a #test entry with @next and #important tags plus @review';
      const result = FormattingUtils.extractTags(text);
      
      expect(result.hashtags).toContain('#test');
      expect(result.hashtags).toContain('#important');
      expect(result.contextTags).toContain('@next');
      expect(result.contextTags).toContain('@review');
    });

    test('filters out invalid tags', () => {
      const text = 'Text with #valid-tag but not # (empty) and @good-tag but not @ (empty)';
      const result = FormattingUtils.extractTags(text);
      
      expect(result.hashtags).toContain('#valid-tag');
      expect(result.hashtags).not.toContain('#'); // Empty hashtag should not be matched
      expect(result.contextTags).toContain('@good-tag');
      expect(result.contextTags).not.toContain('@'); // Empty context tag should not be matched
    });

    test('returns empty arrays when no tags found', () => {
      const text = 'Plain text with no tags at all';
      const result = FormattingUtils.extractTags(text);
      
      expect(result.hashtags).toEqual([]);
      expect(result.contextTags).toEqual([]);
    });
  });

  describe('Entry Standardization', () => {
    test('adds checkbox format to action items without it', () => {
      const entry = '- Task without checkbox';
      const result = FormattingUtils.standardizeEntry(entry, 'action');
      expect(result).toBe('- [ ] #task Task without checkbox');
    });

    test('adds #task prefix to action items without it', () => {
      const entry = '- [ ] Action without task tag';
      const result = FormattingUtils.standardizeEntry(entry, 'action');
      expect(result).toBe('- [ ] #task Action without task tag');
    });

    test('preserves existing formatting for properly formatted entries', () => {
      const entry = '- [ ] #task Properly formatted action';
      const result = FormattingUtils.standardizeEntry(entry, 'action');
      expect(result).toBe('- [ ] #task Properly formatted action');
    });

    test('normalizes whitespace', () => {
      const entry = '-   [ ]   #task    Multiple    spaces   task';
      const result = FormattingUtils.standardizeEntry(entry, 'action');
      expect(result).toBe('- [ ] #task Multiple spaces task');
    });

    test('handles non-action items correctly', () => {
      const entry = '- [2025-09-16 14:30] Activity entry';
      const result = FormattingUtils.standardizeEntry(entry, 'activity');
      expect(result).toBe('- [2025-09-16 14:30] Activity entry');
    });
  });

  describe('Entry Format Validation', () => {
    describe('Action Item Validation', () => {
      test('validates correct action item format', () => {
        const entry = '- [ ] #task Complete the project #work ⏫';
        const result = FormattingUtils.validateEntryFormat(entry, 'action');
        expect(result.isValid).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      test('identifies missing checkbox', () => {
        const entry = '- #task Task without checkbox';
        const result = FormattingUtils.validateEntryFormat(entry, 'action');
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('Action item missing checkbox');
      });

      test('identifies missing #task prefix', () => {
        const entry = '- [ ] Task without prefix #work';
        const result = FormattingUtils.validateEntryFormat(entry, 'action');
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('Action item missing #task prefix');
      });
    });

    describe('Activity Item Validation', () => {
      test('validates correct activity format', () => {
        const entry = '- [2025-09-16 14:30] Meeting completed successfully';
        const result = FormattingUtils.validateEntryFormat(entry, 'activity');
        expect(result.isValid).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      test('identifies missing timestamp', () => {
        const entry = '- Activity without timestamp';
        const result = FormattingUtils.validateEntryFormat(entry, 'activity');
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('Activity missing valid timestamp format');
      });

      test('identifies invalid timestamp format', () => {
        const entry = '- [Sep 16, 2025] Activity with bad timestamp';
        const result = FormattingUtils.validateEntryFormat(entry, 'activity');
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('Activity missing valid timestamp format');
      });
    });

    describe('Someday Item Validation', () => {
      test('validates correct someday format', () => {
        const entry = '- [ ] #someday [2025-09-16] Future project idea #projects';
        const result = FormattingUtils.validateEntryFormat(entry, 'someday');
        expect(result.isValid).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      test('identifies missing #someday tag', () => {
        const entry = '- [ ] Future idea without proper tag #ideas';
        const result = FormattingUtils.validateEntryFormat(entry, 'someday');
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('Someday item missing #someday tag');
      });
    });

    describe('Review Item Validation', () => {
      test('validates correct review format', () => {
        const entry = '- [ ] #review [2025-09-16] Needs human decision (confidence: 75%)';
        const result = FormattingUtils.validateEntryFormat(entry, 'review');
        expect(result.isValid).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      test('identifies missing #review tag', () => {
        const entry = '- [ ] Item needing review but missing tag';
        const result = FormattingUtils.validateEntryFormat(entry, 'review');
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('Review item missing #review tag');
      });
    });

    describe('General Format Validation', () => {
      test('identifies entries not starting with dash', () => {
        const entry = 'Entry without proper prefix';
        const result = FormattingUtils.validateEntryFormat(entry, 'action');
        expect(result.isValid).toBe(false);
        expect(result.issues).toContain('Entry should start with "-"');
      });
    });
  });

  describe('Section Header Generation', () => {
    test('generates correct section headers', () => {
      expect(FormattingUtils.getSectionHeader('activity')).toBe('## Activity Log');
      expect(FormattingUtils.getSectionHeader('actions')).toBe('## Action Items');
      expect(FormattingUtils.getSectionHeader('references')).toBe('## References');
      expect(FormattingUtils.getSectionHeader('review')).toBe('## Review Queue');
      expect(FormattingUtils.getSectionHeader('someday')).toBe('## Someday/Maybe');
      expect(FormattingUtils.getSectionHeader('notes')).toBe('## Notes & Context');
    });
  });
});