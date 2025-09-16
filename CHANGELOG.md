# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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