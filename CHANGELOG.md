# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2025-09-21

### 🎉 Major Features Added

#### SQLite Database Integration
- **Full database integration** alongside existing file-based workflow
- **Dual storage system**: Captures save to both markdown files AND SQLite database
- **Optional database**: System works perfectly in file-only mode when database not set up
- **Proper architecture**: Database setup separated from capture operations

#### Database Features
- **Full-text search (FTS5)**: Search across all captures with ranking and relevance scoring
- **Analytics dashboard**: Track inbox, active, completed, and overdue items with real-time statistics
- **AI learning patterns**: Context inference improves over time with user feedback and pattern recognition
- **ADHD-friendly review system**: Intelligent prioritization of items needing review based on multiple factors
- **Context management**: Auto-create and manage contexts from tracker usage patterns

#### Database Commands
- `npm run db:setup` - Initial database setup with schema, indexes, and seed data
- `npm run db:reset` - Reset database (deletes all data and recreates tables)
- `npm run db:studio` - Open Drizzle Studio database browser for visual exploration
- `npm run db:generate` - Generate database migrations from schema changes

### 🔧 Technical Improvements

#### Architecture
- **Clean separation of concerns**: Database setup operations completely separated from capture business logic
- **Non-blocking database**: Capture operations succeed even if database operations fail
- **Graceful degradation**: Clear messaging and fallback when database unavailable
- **Proper error handling**: Database errors don't break existing file-based workflow

#### Database Schema
- **ISO date strings**: Consistent timestamp handling throughout (no more Unix timestamps)
- **Proper typing**: Full TypeScript integration with Drizzle ORM and type-safe queries
- **FTS integration**: Fixed trigger and column naming issues that caused SQLite datatype mismatches
- **Context-aware storage**: Captures properly linked to inferred contexts with relationship tables
- **Learning patterns**: AI improvement data stored for better context inference over time

#### Testing
- **Comprehensive test suite**: 10 new database tests covering all CRUD operations
- **Test isolation**: Temporary databases for each test with automatic cleanup
- **End-to-end testing**: Verified complete capture flow with dual storage system
- **Jest integration**: All tests passing with proper ESM configuration

### 🐛 Bug Fixes

#### Database Issues Resolved
- **SQLite datatype mismatch**: Fixed FTS table column naming conflicts (contextTags vs context_tags)
- **Timestamp handling**: Consistent ISO date strings instead of problematic Unix timestamps
- **Schema conflicts**: Resolved trigger and virtual table issues that prevented inserts
- **Type safety**: Fixed TypeScript integration with Drizzle queries and proper return types
- **FTS triggers**: Fixed rowid issues and column mapping in full-text search triggers

#### Capture Flow Improvements
- **Emergency fallback**: Better error handling in capture failure scenarios with graceful degradation
- **Database availability**: System properly detects and handles missing database setup
- **File operation reliability**: Improved tracker writing with better error messages and validation

### 📋 User Experience

#### Improved Workflow
- **Clear setup process**: Explicit `npm run db:setup` for database features (one-time operation)
- **Helpful error messages**: "Database not set up. Run: npm run db:setup" with clear guidance
- **Optional features**: Database features enhance but don't replace existing file workflow
- **Backwards compatibility**: Existing file-based workflow completely unchanged

#### Enhanced Capture Experience
- **Dual confirmation**: Clear indication when items saved to both files and database
- **Database feedback**: Success/failure messaging for database operations
- **File-first approach**: File operations remain primary, database provides enhancement features
- **Non-blocking saves**: Database failures don't prevent successful file captures

### 📚 Documentation

#### New Documentation
- **DATABASE.md**: Comprehensive 118-line database setup and usage guide
- **Architecture diagrams**: Clear explanation of dual storage system and data flow
- **Troubleshooting guide**: Common issues, error messages, and step-by-step solutions
- **Development workflow**: Instructions for schema changes, testing, and maintenance

#### Improved Help
- **CLI help messages**: Better guidance for database setup and usage commands
- **Setup instructions**: Clear step-by-step database setup process for new users
- **Feature documentation**: Detailed explanation of what database features enable
- **Migration guide**: Instructions for existing users to adopt database features

### ⚠️ Breaking Changes
None. This release is fully backwards compatible. All existing file-based workflows continue to work without any modification required.

### 🔄 Migration Guide

#### For New Users
1. Clone repository: `git clone <repo>`
2. Install dependencies: `npm install`
3. Setup database: `npm run db:setup` (optional, enables advanced features)
4. Start capturing: `npm run cli capture "your thoughts"`

#### For Existing Users
1. Pull latest changes: `git pull`
2. Update dependencies: `npm install`
3. Setup database: `npm run db:setup` (optional, to enable new database features)
4. Continue using existing workflow - nothing changes in your daily usage!

### 📊 Statistics
- **Files added**: 15+ new files for complete database integration
- **Tests added**: 10 comprehensive database tests with full coverage
- **Architecture**: Clean separation of setup vs operations (major code smell resolved)
- **Performance**: Non-blocking database operations with graceful fallback
- **Reliability**: File system workflow remains 100% functional without database
- **Code quality**: Zero breaking changes, full backwards compatibility maintained

### 🏆 Key Achievement
**Production-Ready Database Integration** - ChurnFlow now provides optional advanced database features (search, analytics, AI learning) while maintaining 100% compatibility with existing markdown-based workflows. The clean architecture separates database setup from capture operations, resolving code smells and providing a solid foundation for future advanced features.

## [0.3.4] - 2025-09-17

### 🎯 CRITICAL INTEGRATION: Complete Review System Workflow
**Connects CaptureEngine to ReviewManager, enabling the complete ADHD-friendly capture → review → action workflow**

### ✨ Added
- **ReviewManager Integration in CaptureEngine** - Low-confidence captures now route through ReviewManager instead of direct tracker writing
  - Replaces `routeToReview()` direct tracker writing with proper `ReviewManager.flagItemForReview()`
  - Automatic keyword extraction and metadata generation for enhanced review workflows
  - Confidence-based routing: < 0.7 threshold → ReviewManager, ≥ 0.7 → direct placement
  - Action items require higher confidence (0.8+) due to stricter validation criteria
- **Enhanced Review Metadata** - Comprehensive item preparation for human review
  - Keywords automatically extracted using `InferenceEngine.extractKeywords()`
  - Default urgency, type classification, and editable field configuration
  - Review status logic: "pending" vs "flagged" based on confidence levels
- **Graceful Fallback System** - Robust error handling ensures no thoughts are lost
  - If ReviewManager fails, automatically falls back to old tracker-writing behavior
  - Emergency capture maintains data integrity even during system failures

### 🔗 Fixed Integration Gaps
- **Broken Review Workflow** - Previously, low-confidence items bypassed ReviewManager infrastructure
- **CLI Review Command Isolation** - Review items weren't accessible via `npm run cli review`
- **Incomplete ADHD Workflow** - The capture → review → action → edit cycle was disconnected
- **Unutilized Review Metadata** - Confidence scoring and metadata weren't being leveraged

### 🧪 Testing & Quality
- **5 Comprehensive Integration Tests** - Complete end-to-end workflow validation
  - Low-confidence routing through ReviewManager
  - High-confidence bypass for direct placement
  - Keyword extraction and metadata preparation
  - Error handling and fallback scenarios
  - Configuration threshold validation
- **All 161 Existing Tests Pass** - Zero breaking changes to existing functionality
- **Manual End-to-End Validation** - Confirmed complete workflow integration

### 🧠 ADHD-Optimized Results
- **Complete Workflow** - Now supports full capture → review → action → edit cycle
- **Human Oversight** - Low-confidence captures properly flagged for human review
- **Trust & Control** - Users can review and refine AI routing decisions
- **Zero Cognitive Overhead** - High-confidence items still bypass review for instant placement
- **Enhanced Metadata** - Keywords and context preserved for better review decisions

### 🔧 Technical Implementation
```typescript
// Before: Direct tracker writing bypassed ReviewManager
const success = await this.appendToReviewTracker(reviewEntry);

// After: Proper ReviewManager integration with metadata
const reviewItem = this.reviewManager.flagItemForReview(
  input.text,
  inference?.confidence || 0.1,
  inference?.primaryTracker || 'review',
  'actions',
  'capture',
  {
    keywords: this.inferenceEngine.extractKeywords(input.text),
    urgency: 'medium',
    type: inference?.generatedItems?.[0]?.itemType || 'review',
    editableFields: ['tracker', 'priority', 'tags', 'type']
  }
);
```

### 📈 Impact Metrics
- **Complete Integration** - CaptureEngine now properly utilizes all ReviewManager infrastructure
- **Enhanced CLI Access** - Review items accessible via `npm run cli review` command
- **Maintained Performance** - High-confidence items continue direct routing for zero friction
- **Production Ready** - Comprehensive error handling and fallback mechanisms

### 🏆 Key Achievement
**Complete Review System Integration** - ChurnFlow now provides the complete ADHD-friendly productivity workflow from capture to review to action. Low-confidence captures are properly flagged for human oversight while maintaining zero-friction direct placement for high-confidence items. This completes the critical missing link in the productivity system, ensuring users can trust AI decisions while maintaining control over their workflow.

## [0.3.3] - 2025-09-17

### 🎯 MAJOR FEATURE: Complete Task Management Suite
**Transforms ChurnFlow into a comprehensive task lifecycle management system with the new `change` command**

### ✨ Added
- **`change` Command** - Intuitive alias for task editing (shorter than `edit`)
  - `npm run cli change "task"` - Search and edit specific tasks
  - `npm run cli change` - Interactive task picker from top 20 urgent tasks
  - Shell alias: `change "task"` - Available system-wide
  - Same functionality as `edit` but with better UX and cleaner command name
- **Complete Task Editing** - 7 comprehensive edit options for any task
  - ✏️ Edit title while preserving formatting and tags
  - ⚖️ Change priority (High ⏫, Medium 🔼, Low 🔽, or remove)
  - 📅 Update due date (custom, today, tomorrow, next week, or remove)
  - 🏷️ Edit tags with smart hashtag management
  - 🚚 Move to different tracker with intelligent tag updates
  - ✅ Close (mark as completed) with automatic completion dates
  - 🗑️ Delete permanently with double confirmation safety
- **Interactive Task Management** - Enhanced picker and selection system
  - Priority indicators (🔴🟡🟢) for visual clarity
  - Context icons (💼 Business, 🚀 Project, 🏠 Personal, ⚙️ System)
  - Smart task picker shows most urgent items first (prevents overwhelm)
  - Multiple task disambiguation with clear tracker context

### 🚚 Enhanced - Move Between Trackers
- **Smart Tracker Selection** - Context-aware tracker picker with friendly names
- **Intelligent Tag Updates** - Automatically updates #tags to match new tracker
- **Atomic Operations** - Safe remove-from-source, add-to-target with rollback
- **Move Confirmation** - Clear summary showing from/to trackers and updated line
- **Error Recovery** - Automatic rollback if target tracker append fails

### ✅ Enhanced - Close Tasks  
- **Same as `done` Command** - Alternative path to mark tasks complete
- **Completion Tracking** - Adds `✅ YYYY-MM-DD` completion dates
- **Task Removal** - Completed tasks disappear from active task lists
- **File Updates** - Direct tracker file updates (- [ ] → - [x])

### 🗑️ Enhanced - Delete Tasks Safely
- **Double Confirmation** - Two separate confirmations with clear warnings
- **Safety Messaging** - Red text warnings about permanent deletion
- **Default Protection** - Both confirmations default to "No" for safety
- **Complete Removal** - Tasks entirely removed from tracker files
- **Clear Feedback** - Confirmation of successful deletion

### 🔧 Technical Improvements
- **Enhanced TrackerManager** - Added `getCrossrefEntries()` method for external access
- **Proper File Path Resolution** - Uses crossref data to find correct tracker files
- **Fixed Front Matter Issues** - Added missing front matter to 7 tracker files
- **Robust Error Handling** - Comprehensive try-catch with user-friendly messages
- **Shell Integration** - Added `change` alias alongside existing `finish` alias

### 💡 ADHD-Optimized UX
- **Task Picker Limits** - Shows top 20 tasks by urgency (prevents overwhelm)
- **Visual Priority Indicators** - Color-coded priority for instant recognition
- **Clear Before/After** - Shows old vs new task lines for all edits
- **Safety Confirmations** - Destructive actions require explicit confirmation
- **Consistent Patterns** - Same interaction flows across all edit options
- **Momentum Building** - Quick edit access from any CLI screen

### 📈 Impact Metrics
- **7 Edit Operations** - Complete task lifecycle management in single interface
- **630+ Lines Added** - Comprehensive feature implementation
- **All Trackers Fixed** - Front matter issues resolved for undefined tasks
- **Shell Aliases** - `change` and `finish` commands available system-wide
- **Zero Breaking Changes** - All existing functionality preserved and enhanced

### 🏆 Key Achievement
**Complete Task Management System** - ChurnFlow now provides comprehensive task lifecycle management from a single `change` command interface. Users can edit, move, complete, and delete tasks with ADHD-friendly workflows, eliminating the need to manually open and edit tracker files. This completes the productivity loop with zero-friction task management that adapts to changing priorities and contexts.

## [0.3.2] - 2025-09-17

### 🎯 MAJOR BREAKTHROUGH: Complete ADHD Dashboard & Task Management System
**Transforms ChurnFlow from capture tool into complete ADHD productivity system**

### ✨ Added
- **Interactive Brain Dump** - `dump` command for frictionless multi-thought capture
  - Real-time processing and routing feedback for each thought
  - Zero-friction workflow: type thoughts, press enter, repeat until done
  - Automatic exit on empty input or "quit" command
  - Live capture statistics and confidence reporting
  - Emergency backup ensures no thoughts are lost
- **What's Next Dashboard** - `next` command with ADHD-friendly priority recommendations
  - Eliminates analysis paralysis with focused 3-4 item recommendations
  - Real-time urgency scoring based on due dates and priorities
  - Smart categorization: Most Urgent, High Impact, Quick Win, Review Chunk
  - Time estimates and impact analysis for informed decisions
- **Complete Task List** - `tasks` command showing all open tasks across trackers
  - Comprehensive view of all actionable items (73+ tasks managed)
  - Filtering by tracker: `tasks gsc-ai`, `tasks all`
  - Urgency-based sorting with priority indicators
  - Time estimates and due date awareness
- **Task Completion System** - `done "task"` command to mark tasks complete
  - Intelligent task matching with disambiguation
  - Direct file updates (- [ ] → - [x] with completion date)
  - Closes the productivity loop with zero friction
  - Automatic dashboard refresh after completion
- **Global Shell Integration** - All commands available system-wide
  - `dump`, `next`, `tasks`, `done` aliases work from anywhere
  - Zero cognitive overhead to access productivity tools

### 🧠 ADHD-Optimized Design
- **Eliminates Analysis Paralysis** - Clear 3-4 focused recommendations, never overwhelming
- **Zero Cognitive Overhead** - No quotes, syntax, or command memorization needed
- **Complete Workflow** - Capture → Prioritize → Execute → Complete cycle
- **Smart Filtering** - Excludes @waiting tasks from actionable recommendations
- **Visual Clarity** - Color-coded priorities, clean output, distraction-free interface
- **Momentum Building** - Always includes "Quick Win" options for low-energy moments

### 🔧 Technical Achievements
- **DashboardManager Class** - Sophisticated task analysis and scoring system
  - Multi-factor urgency scoring (priority + due dates + context)
  - Impact analysis based on business vs personal context
  - Time estimation using NLP analysis of task complexity
  - Smart task categorization and filtering algorithms
- **Obsidian Tasks Compatibility** - Full parsing of existing task formats
  - Supports @waiting, @urgent, @high, @low tags
  - Parses 📅 YYYY-MM-DD and ⏳ due date formats
  - Intelligent title cleaning removing metadata while preserving meaning
  - Seamless migration path from Obsidian workflows
- **Production-Grade File Operations** - Robust task completion workflow
  - Safe file reading/writing with comprehensive error handling
  - Task matching with fuzzy search and disambiguation
  - Atomic operations ensuring data integrity

### 📈 Impact Metrics
- **73+ Tasks Managed** - Successfully parsing and organizing extensive task lists
- **15 Trackers Integrated** - Complete system coverage across all life domains
- **161 Tests Passing** - Production-ready quality with comprehensive test coverage
- **4 Core Commands** - Complete workflow in minimal, memorable interface

### 🏆 Key Achievement
**Complete ADHD Productivity System** - ChurnFlow now solves the core ADHD productivity problems: thought capture friction, analysis paralysis, incomplete workflows, and system maintenance overhead. Users can capture thoughts instantly, see exactly what to work on next, view all options when needed, and close the loop by marking tasks complete - all with zero friction and maximum cognitive efficiency.

## [0.3.1] - 2025-09-17

### 🎯 Major Feature: Core Review Process System
**Implemented by GitHub Copilot agent - comprehensive human oversight for AI-driven task management**

### ✨ Added
- **ReviewManager Class** - Complete review workflow management with ADHD-friendly interface
- **Two-Tier Review System** - Auto-placed items (high confidence) vs. Review Queue (low confidence)
- **ReviewableItem Interface** - Comprehensive metadata and review lifecycle management
- **Review Actions** - Accept, edit-priority, edit-tags, edit-type, move, reject workflows
- **Confidence-Based Flagging** - Intelligent review requirements based on AI confidence
- **Batch Operations** - Process multiple review items efficiently
- **Review Status Dashboard** - Clear indicators for items needing attention

### 🚀 Enhanced
- **InferenceEngine** - Extended with review confidence scoring and keyword extraction
  - `calculateInferenceConfidence()` - Multi-factor confidence assessment
  - `shouldFlagForReview()` - Intelligent review requirement logic
  - `extractKeywords()` - Context-aware keyword extraction
  - `generateReviewMetadata()` - Complete review item preparation
- **Type System** - Extended with comprehensive review interfaces
  - `ReviewableItem`, `ReviewAction`, `ReviewStatus`, `ReviewSource` interfaces
  - `ReviewConfig` for system configuration
  - Integration with existing `ChurnConfig`

### 📚 Documentation
- **REVIEW-SYSTEM.md** - Complete 275-line system documentation
  - API reference and usage examples
  - Configuration options and workflows
  - Integration patterns and best practices

### 🧪 Testing & Quality
- **161 Tests Passing** - All existing functionality maintained
- **Comprehensive Review Tests** - 20 new tests covering all review workflows
- **100% TypeScript Compliance** - Clean compilation with full type safety
- **Core Logic Coverage** - 87% coverage on business logic

### 🎯 ADHD-Friendly Design
- **Human Oversight** - Ensures all captured items receive appropriate attention
- **Easy Corrections** - Simple workflows to fix AI routing mistakes
- **Confidence Transparency** - Clear indicators of AI certainty levels
- **Batch Processing** - Efficient review of multiple items
- **Flexible Workflows** - Support for different review preferences

### 🏆 Key Achievement
**Complete Review Infrastructure** - ChurnFlow now provides the crucial human oversight layer for AI-driven productivity, ensuring users can trust and refine AI decisions while maintaining ADHD-friendly workflows.

## [0.3.0] - 2025-09-16

### 🎆 Major Feature: GitHub Copilot Integration
- **Production MCP Server** - Full Model Context Protocol implementation with 3 AI assistant tools
- **GitHub Copilot Ready** - Seamless integration with comprehensive setup documentation
- **AI Assistant Tools**:
  - `capture` - ADHD-friendly multi-item capture with smart routing
  - `status` - System status and tracker information
  - `list_trackers` - Available trackers with context filtering

### ✨ Added
- **MCP Server Implementation** (`src/index.ts`) - Production-ready server using @modelcontextprotocol/sdk
- **Configuration Loading** - Smart config loading with fallback for development environments
- **Error Handling** - Comprehensive MCP-compliant error responses with graceful fallbacks
- **GitHub Copilot Documentation** - Complete setup guide (MCP-SETUP.md) with examples
- **Example Configurations** - Ready-to-use GitHub Copilot configuration templates

### 🚀 Enhanced
- **Semantic Versioning** - Proper minor version bump for new functionality
- **Cross-Interface Support** - Same functionality available via CLI and AI assistants
- **Backward Compatibility** - All v0.2.2 features maintained and enhanced
- **Documentation Overhaul** - Major README.md update highlighting AI assistant integration

### 📚 Documentation
- **README.md** - Complete rewrite showcasing GitHub Copilot integration and v0.3.0 features
- **MCP-SETUP.md** - Comprehensive GitHub Copilot setup guide with troubleshooting
- **DEV-NOTES.md** - Updated for v0.3.0 status and v0.3.1 planning
- **DEVELOPMENT-TRACKERS.md** - Process documentation for maintaining external trackers
- **v0.3.1-PLAN.md** - Future roadmap with AI assistant + CLI review workflows

### 🧪 Testing & Quality
- **122 Tests Maintained** - All existing functionality preserved with full test coverage
- **Production Validation** - MCP server startup verification and build success
- **TypeScript Clean** - Full compilation without errors or warnings

### 🎯 Business Impact
- **Market Differentiation** - First ADHD-friendly productivity system with AI assistant integration
- **Enterprise Ready** - Production-grade implementation with comprehensive documentation
- **Competitive Advantage** - GitHub Copilot users gain access to ADHD-optimized productivity tools

### 🏆 Key Achievement
**Complete AI Assistant Integration** - ChurnFlow now provides ADHD-friendly productivity capabilities to any MCP-compatible AI assistant, starting with GitHub Copilot. This represents a major step forward in making productivity tools accessible and brain-friendly for neurodivergent users.

## [0.2.2] - 2025-09-16

### ✨ Added
- **FormattingUtils class** - Comprehensive formatting standardization system
  - ISO date formats (2025-09-16) and timestamps (2025-09-16 14:30)
  - Priority indicators with emojis (🚨 ⏫ 🔼 🔻)
  - Consistent entry templates for all item types
  - Validation and standardization methods

### 🎯 Enhanced
- **Section Placement System** - Perfect placement of entries in tracker sections
  - Automatic section creation with proper ordering
  - Activity Log → Action Items → Review → References → Someday → Notes
  - Proper spacing rules (1 blank line before/after headers, none between items)
  - Chronological sorting for activities (oldest first)
  
- **InferenceEngine** - Now uses FormattingUtils for consistent output
  - All AI-generated entries follow standardized formats
  - Improved multi-item capture with Doug welder example compatibility
  - Enhanced confidence scoring and review routing

- **TrackerManager** - Enhanced with formatting validation and section management
  - Proper section ordering and placement logic
  - Formatting validation prevents inconsistencies
  - Robust handling of mixed content and edge cases

### 🧪 Testing
- **122 comprehensive tests** across 6 test suites
- New FormattingUtils test suite (52 tests)
- TrackerManager section placement tests (12 tests)
- Updated legacy tests for new formatting standards
- All tests passing with complete coverage

### 🔧 Technical
- Complete TypeScript build success
- Enhanced type definitions in churn.ts
- Improved error handling and validation
- ADHD-friendly brain dump consistency maintained

### 📚 Documentation
- Updated DEV-NOTES.md with v0.2.2 completion status
- Added comprehensive v0.2.3-PLAN.md for Review Process system
- Detailed implementation notes and testing guidance

### 🏆 Key Achievement
**Complete formatting consistency** with perfect section placement - ensuring all captured items are properly formatted and placed exactly where they belong in tracker files.

## [0.2.1] - 2025-09-14

### Added
- **Multi-item capture functionality**: Single input can now generate multiple items across different trackers
- **Activity item type**: New item type for capturing context and updates (goes to Activity Log)
- **Task completion detection**: AI can identify when captures indicate completed tasks
- **Cross-tracker routing**: Items from one capture can be distributed to multiple relevant trackers
- **Comprehensive test suite**: 14 test cases covering multi-item scenarios, edge cases, and fallbacks

### Changed
- **InferenceEngine**: Updated to support multiple item generation from single capture
- **CaptureEngine**: Enhanced to process and route multiple items per capture
- **CLI output**: Now shows detailed breakdown of generated items and task completions
- **Type definitions**: Extended to support multi-item results and task completions

### Enhanced
- **ADHD-friendly capture**: Single brain dump can now generate multiple actionable items
- **AI prompts**: Updated system prompts to guide multi-item extraction
- **Error handling**: Robust fallbacks ensure no thoughts are lost even with complex inputs

## [0.2.0] - 2025-09-14

### Added
- Command-line interface (CLI) with capture, status, and help commands
- Shell alias support for easy system-wide access via `churn` command
- Missing `churn-system-tracker.md` for system tasks and review queue fallback
- Enhanced error handling and fallback mechanisms

### Changed  
- Updated AI model from `gpt-4` to `gpt-4o-mini` for better availability and cost efficiency
- Improved confidence-based routing for review items
- Better system initialization with 15 active trackers

### Fixed
- Missing `crossref.json` file preventing system initialization
- YAML parsing errors in tracker files
- Review queue routing now properly uses churn-system tracker as fallback

## [0.1.1] - 2025-01-14

### Added
- Core capture engine with ADHD-friendly AI routing
- TrackerManager for reading and parsing existing Churn system
- InferenceEngine with OpenAI integration for context detection
- CaptureEngine orchestrating the full capture workflow
- Type definitions for all core Churn system components
- Smart fallback system for low-confidence captures
- Emergency capture ensuring no thoughts are lost
- Comprehensive error handling and logging

## [0.1.0] - 2025-01-14

### Added
- Project initialization
- Basic project structure for ChurnFlow MCP server