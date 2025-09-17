# Review Process System Documentation

## Overview

The Review Process System provides ADHD-friendly workflow management for ChurnFlow, ensuring that captured items receive appropriate human attention before final placement. This system addresses the core need for follow-up assurance over perfect AI routing.

## Core Components

### 1. ReviewableItem Interface

Represents items that can be flagged for review with comprehensive metadata:

```typescript
interface ReviewableItem {
  id: string;                    // Unique identifier
  content: string;               // Item content/description
  confidence: number;            // AI confidence score (0-1)
  currentSection: string;        // Target section in tracker
  currentTracker: string;        // Target tracker name
  timestamp: Date;               // When item was flagged
  source: 'capture' | 'inference'; // How item was created
  reviewStatus: 'pending' | 'flagged' | 'confirmed'; // Review lifecycle
  metadata: {
    keywords: string[];          // Extracted keywords for context
    urgency: Priority;           // Item priority level
    type: ItemType;              // Item type (action, reference, etc.)
    editableFields: string[];    // Fields available for editing
  };
}
```

### 2. ReviewAction Enum

Defines possible actions during review:

- `'accept'` - Accept item and move to tracker
- `'edit-priority'` - Change priority/urgency
- `'edit-tags'` - Modify keywords/tags
- `'edit-type'` - Change item type
- `'move'` - Move to different tracker
- `'reject'` - Remove from system

### 3. ReviewManager Class

Central management class for review workflows:

#### Key Methods

**Flagging Items**
```typescript
flagItemForReview(
  content: string,
  confidence: number,
  tracker: string,
  section: string,
  source: ReviewSource,
  metadata?: Partial<ReviewMetadata>
): ReviewableItem
```

**Processing Actions**
```typescript
processReviewAction(
  itemId: string,
  action: ReviewAction,
  newValues?: {
    tracker?: string;
    priority?: Priority;
    tags?: string[];
    type?: ItemType;
    content?: string;
  }
): Promise<boolean>
```

**Batch Operations**
```typescript
batchProcessReview(
  actions: Array<{
    itemId: string;
    action: ReviewAction;
    newValues?: any;
  }>
): Promise<{
  success: number;
  failed: number;
  results: Array<{
    itemId: string;
    success: boolean;
    error?: string;
  }>;
}>
```

**Status Queries**
```typescript
getItemsNeedingReview(tracker?: string): ReviewableItem[]
getReviewStatus(): {
  pending: number;
  flagged: number;
  confirmed: number;
  total: number;
}
```

### 4. InferenceEngine Extensions

New methods supporting review functionality:

**Confidence Calculation**
```typescript
calculateInferenceConfidence(
  input: CaptureInput,
  trackerMatch: boolean,
  keywordMatches: number,
  contextClarity: number
): number
```

**Review Flagging**
```typescript
shouldFlagForReview(confidence: number, itemType: ItemType): boolean
```

**Keyword Extraction**
```typescript
extractKeywords(text: string): string[]
```

**Metadata Generation**
```typescript
generateReviewMetadata(
  input: CaptureInput,
  inferredType: ItemType,
  inferredPriority: Priority
): ReviewMetadata
```

## Two-Tier Review System

### Auto-Placed Items (High Confidence)
- Items with confidence ≥ threshold are placed directly in trackers
- Flagged with `reviewStatus: 'flagged'` for easy validation
- Can be quickly accepted or modified through review interface

### Review Queue (Low Confidence)
- Items with confidence < threshold go to special `## Review Queue` section
- Status set to `reviewStatus: 'pending'` requiring explicit decision
- Must be processed before final placement

## Configuration

Review system behavior is configured through the `ReviewConfig` interface:

```typescript
interface ReviewConfig {
  autoReviewThreshold: number;    // Confidence level for auto-placement (default: 0.8)
  requireReviewThreshold: number; // Confidence level requiring review (default: 0.5)
  defaultBatchSize: number;       // Default items per batch operation (default: 10)
  colorOutput: boolean;           // Enable colored CLI output (default: true)
  showConfidenceScores: boolean;  // Show confidence in UI (default: true)
}
```

Add to ChurnFlow config:
```json
{
  "review": {
    "autoReviewThreshold": 0.8,
    "requireReviewThreshold": 0.5,
    "defaultBatchSize": 10,
    "colorOutput": true,
    "showConfidenceScores": true
  }
}
```

## Usage Examples

### Basic Review Workflow

```typescript
// Initialize review manager
const reviewManager = new ReviewManager(config, trackerManager);

// Flag an item for review
const reviewItem = reviewManager.flagItemForReview(
  'Complete project documentation',
  0.6,
  'work-tracker',
  'actions',
  'capture',
  {
    keywords: ['project', 'documentation'],
    urgency: 'high',
    type: 'action'
  }
);

// Process review actions
await reviewManager.processReviewAction(reviewItem.id, 'edit-priority', {
  priority: 'critical'
});

await reviewManager.processReviewAction(reviewItem.id, 'accept');
```

### Batch Processing

```typescript
const actions = [
  { itemId: 'item1', action: 'accept' },
  { itemId: 'item2', action: 'edit-priority', newValues: { priority: 'high' } },
  { itemId: 'item3', action: 'move', newValues: { tracker: 'personal' } }
];

const result = await reviewManager.batchProcessReview(actions);
console.log(`Processed: ${result.success} successful, ${result.failed} failed`);
```

### Status Monitoring

```typescript
// Get review status for dashboard
const status = reviewManager.getReviewStatus();
console.log(`Review Queue: ${status.pending} pending, ${status.flagged} flagged`);

// Get items needing attention
const pendingItems = reviewManager.getItemsNeedingReview();
const workItems = reviewManager.getItemsNeedingReview('work-tracker');
```

## ADHD-Friendly Design Principles

1. **Visual Clarity**: Clear status indicators and confidence scores
2. **Minimal Cognitive Load**: Simple, predictable actions
3. **Flexible Correction**: Easy to fix AI routing mistakes
4. **Batch Operations**: Process multiple items efficiently
5. **Dashboard Integration**: Quick status overview
6. **Universal Access**: Review all items, not just low-confidence ones

## Integration Points

### With TrackerManager
- Uses `appendToTracker()` for final item placement
- Respects tracker section formatting and ordering

### With InferenceEngine
- Confidence scoring influences review requirements
- Keyword extraction provides review metadata
- Review flagging based on confidence thresholds

### With CaptureEngine
- Items requiring review are automatically flagged
- Emergency capture can route to review queue
- Batch capture supports review workflow

## Future Enhancements (v0.3.2+)

- Machine learning from review decisions
- Calendar integration for review sessions
- Voice capture with review queue routing
- Mobile-friendly review interface
- Advanced batch operations and automation

## Testing

The review system includes comprehensive test coverage:

- **ReviewManager**: 21 tests covering all operations
- **InferenceEngine**: 12 additional tests for review methods
- **Type Definitions**: 6 tests for new interfaces
- **Integration**: End-to-end workflow validation

Run tests: `npm test -- --testNamePattern="Review"`