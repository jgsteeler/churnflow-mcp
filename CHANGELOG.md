# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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