# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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