#!/usr/bin/env tsx
/**
 * Test script for ChurnFlow Database functionality
 * Run with: npx tsx src/storage/test-db.ts
 */

import { DatabaseManager } from './DatabaseManager.js';
import { NewCapture, NewContext } from './schema.js';

async function testDatabase() {
  console.log('🧪 Testing ChurnFlow Database System\n');

  const db = new DatabaseManager({ dbPath: './test-churnflow.db' });
  
  try {
    // Initialize database
    await db.initialize();
    
    // Get existing context or create new one
    console.log('📁 Getting test context...');
    let workContext = await db.getContextByName('work');
    if (!workContext) {
      workContext = await db.createContext({
        name: 'work-test',
        displayName: 'Work Test',
        description: 'Test work context',
        keywords: JSON.stringify(['work', 'business', 'project']),
        patterns: JSON.stringify([]),
        priority: 10,
      });
      console.log('✅ Created context:', workContext.displayName);
    } else {
      console.log('✅ Using existing context:', workContext.displayName);
    }

    // Test capture creation
    console.log('\n📝 Creating test captures...');
    
    const captures: NewCapture[] = [
      {
        content: 'Call client about project deadline',
        captureType: 'action',
        priority: 'high',
        status: 'inbox',
        contextId: workContext.id,
      },
      {
        content: 'Research new productivity tools',
        rawInput: 'maybe look into new productivity tools',
        captureType: 'someday',
        priority: 'low',
        status: 'someday',
        contextId: workContext.id,
        confidence: 0.3,
        aiReasoning: 'Low priority research task, good for someday/maybe',
        tags: JSON.stringify(['research', 'tools']),
        keywords: JSON.stringify(['research', 'productivity', 'tools']),
      },
      {
        content: 'Read article about ADHD productivity techniques',
        captureType: 'reference',
        priority: 'medium',
        status: 'inbox',
        tags: JSON.stringify(['adhd', 'productivity', 'reference']),
        keywords: JSON.stringify(['adhd', 'productivity', 'techniques']),
      }
    ];

    for (const capture of captures) {
      const created = await db.createCapture(capture);
      console.log(`✅ Created ${capture.captureType}: ${created.content.substring(0, 50)}...`);
    }

    // Test dashboard stats
    console.log('\n📊 Dashboard Stats:');
    const stats = await db.getDashboardStats();
    console.log('  📥 Inbox:', stats.inbox);
    console.log('  🎯 Active:', stats.active);
    console.log('  ✅ Completed:', stats.completed);
    console.log('  👀 Needing Review:', stats.needingReview);
    console.log('  ⚠️ Overdue:', stats.overdue);

    // Test review system
    console.log('\n🔍 Items needing review:');
    const needsReview = await db.getCapturesNeedingReview(5);
    for (const item of needsReview) {
      console.log(`  • [${item.priority.toUpperCase()}] ${item.content.substring(0, 60)}...`);
      console.log(`    Status: ${item.status} | Type: ${item.captureType}`);
    }

    // Test search
    console.log('\n🔍 Testing search for "productivity":');
    const searchResults = await db.searchCaptures('productivity', 3);
    for (const result of searchResults) {
      console.log(`  • ${result.content.substring(0, 60)}...`);
    }

    // Test marking items as reviewed
    if (needsReview.length > 0) {
      console.log('\n✅ Marking first item as reviewed...');
      const success = await db.markCaptureReviewed(
        needsReview[0].id, 
        'Reviewed during testing'
      );
      console.log('  Review marked:', success ? '✅ Success' : '❌ Failed');
    }

    // Test updating capture status
    if (captures.length > 0) {
      console.log('\n🎯 Moving first capture to active...');
      const firstCapture = await db.getCaptureById(needsReview[0]?.id || '');
      if (firstCapture) {
        const updated = await db.updateCapture(firstCapture.id, { 
          status: 'active',
          lastReviewedAt: new Date().toISOString() 
        });
        console.log('  Status updated:', updated ? '✅ Success' : '❌ Failed');
      }
    }

    // Test next actions
    console.log('\n🚀 Next Actions:');
    const nextActions = await db.getNextActions(3);
    for (const action of nextActions) {
      console.log(`  • [${action.priority.toUpperCase()}] ${action.content.substring(0, 60)}...`);
    }

    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await db.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the test
testDatabase().catch(console.error);