# ChurnFlow MCP Version Roadmap

## Current Situation Analysis

### What Actually Happened:
1. **v0.3.0** (Sep 16): MCP Server implementation (CORRECT - new major interface)
2. **Core Review System** (by GitHub Copilot): Merged into develop but not versioned (NEEDS CORRECTION)
3. **CLI Review Interface** (current work): Added to feature branch (NEEDS VERSIONING)

### Semantic Versioning Correction Needed:
The core Review Process system was a **significant new feature** that should have been a **MINOR version bump**.

---

## 📋 **Corrected Version Roadmap**

### **v0.3.1** - Review Process Core System *(Retroactive)*
**Status**: Implemented but needs proper versioning  
**Type**: MINOR (new features, backward compatible)  
**Scope**: Core review infrastructure implemented by GitHub Copilot  

**Features**:
- ✅ ReviewManager class with comprehensive review workflows
- ✅ ReviewableItem interface and review actions (accept, edit, move, reject)
- ✅ Two-tier review system (auto-placed vs. review queue)
- ✅ InferenceEngine confidence scoring and review flagging
- ✅ Comprehensive documentation (REVIEW-SYSTEM.md)
- ✅ 161 tests passing with full core review coverage

---

### **v0.3.2** - CLI Review Interface *(Current Work)*
**Status**: In progress (feature/review-cli branch)  
**Type**: MINOR (new interface, backward compatible)  
**Scope**: Interactive CLI commands for review workflows  

**Features**:
- 🔄 Interactive `churn review` and `churn review [tracker]` commands
- 🔄 Enhanced `churn status` with review indicators
- 🔄 Full review action support (accept, edit-priority, edit-tags, edit-type, move, reject)
- 🔄 ADHD-friendly colored output and user flows
- 🔄 Dependencies: inquirer, chalk, @types/inquirer

---

### **v0.3.3** - Review System Integration
**Type**: MINOR (integration fix, critical for review workflow)  
**Scope**: Connect CaptureEngine to actually use ReviewManager for flagging items

**Current Issue**: 
- ✅ ReviewManager (v0.3.1) - Core infrastructure complete
- ✅ CLI Review Interface (v0.3.2) - User interface ready
- ❌ **Missing Link**: CaptureEngine writes review items directly to trackers instead of using ReviewManager

**Planned Features**:
- 🔗 Integrate CaptureEngine with ReviewManager for low-confidence items
- 🔗 Replace direct tracker writing with ReviewManager.flagItemForReview()
- 🔗 Update confidence scoring to use ReviewManager thresholds
- 🔗 Ensure review items appear in CLI review interface
- 🔗 Test end-to-end workflow: capture → review → action

**Implementation Considerations**:
- Modify CaptureEngine to detect review-worthy items
- Route low-confidence captures through ReviewManager
- Maintain backward compatibility for high-confidence items
- Update confidence threshold configuration

---

### **v0.3.4** - Inferred Due Dates
**Type**: MINOR (new feature, backward compatible)  
**Scope**: AI inference of due dates from capture text

**Planned Features**:
- 📅 AI detection of time references ("by Friday", "next week", "in 3 days")
- 📅 Automatic due date assignment to action items
- 📅 Review interface for due date confirmation/editing
- 📅 Calendar integration and date validation
- 📅 Smart handling of relative dates and context

**Implementation Considerations**:
- Natural language date parsing (chrono-node or similar)
- Integration with existing FormattingUtils date handling
- Review workflow updates for date editing
- Confidence scoring for date inferences

---

### **v0.3.5** - CrossRef Validation & Initialization
**Type**: MINOR (new feature, backward compatible)  
**Scope**: Smart crossref validation and archive handling  

**Planned Features**:
- 🔍 `churn validate` command to check crossref integrity
- 🔍 Detection of archived/missing tracker files
- 🔍 Interactive cleanup of inactive crossref entries
- 🔍 Initialization wizard for new Churn systems
- 🔍 Health check reporting and suggestions

**Implementation Considerations**:
- File system validation utilities
- Interactive prompts for crossref cleanup
- Backup/restore functionality for crossref changes
- Integration with existing TrackerManager error handling

---

### **v0.3.6** - Enhanced MCP Server Features
**Type**: MINOR (new MCP tools, backward compatible)  
**Scope**: Extended MCP server capabilities  

**Planned Features**:
- 🔧 MCP tools for review workflows (`review_items`, `process_review`)
- 🔧 MCP tools for due date management
- 🔧 MCP tools for crossref validation
- 🔧 Enhanced error handling and responses
- 🔧 Performance optimizations for AI assistant usage

**Implementation Considerations**:
- New MCP tool definitions and schemas
- Integration with CLI review interface
- Async operation handling for complex workflows
- Enhanced tool metadata and documentation

---

### **v0.3.7** - Comprehensive Testing & 80% Coverage
**Type**: PATCH (quality improvements, no new features)  
**Scope**: Testing infrastructure and quality assurance  

**Planned Features**:
- 🧪 CLI integration testing (0% → 80% coverage)
- 🧪 MCP server testing (0% → 75% coverage)
- 🧪 Core logic improvements (87% → 90% coverage)
- 🧪 Performance testing and optimization
- 🧪 Error handling validation
- 🧪 Documentation completeness

**Implementation Considerations**:
- Jest configuration for CLI testing
- MCP protocol testing utilities
- Mock frameworks for interactive testing
- Coverage reporting and monitoring

---

## 🚀 **Implementation Timeline**

### Immediate Actions (This Session):
1. **Retroactively version v0.3.1** - Update package.json and CHANGELOG
2. **Complete v0.3.2** - Finish CLI review interface
3. **Update roadmap documentation** - Align all plans with new versioning

### Next 7 Weeks (1 version per week):
- **Week 1**: Complete v0.3.2 (CLI Review) ✅
- **Week 2**: Implement v0.3.3 (Review Integration) 
- **Week 3**: Implement v0.3.4 (Due Dates) 
- **Week 4**: Implement v0.3.5 (CrossRef Validation)
- **Week 5**: Implement v0.3.6 (Enhanced MCP)
- **Week 6**: Implement v0.3.7 (Testing & Coverage)
- **Week 7**: Polish and v0.4.0 planning

---

## 📊 **Version Impact Assessment**

### User Experience Impact:
- **v0.3.1**: Core infrastructure (no user-visible changes)
- **v0.3.2**: New CLI commands (significant UX improvement)
- **v0.3.3**: **CRITICAL** - Makes review system actually work (end-to-end functionality)
- **v0.3.4**: Smarter capture with due dates (major UX enhancement)
- **v0.3.5**: System reliability (operational improvement)
- **v0.3.6**: AI assistant features (expanded capabilities)
- **v0.3.7**: Quality & reliability (stability improvement)

### Development Complexity:
- **v0.3.1**: ✅ Complete (retrospective versioning only)
- **v0.3.2**: ✅ Complete (CLI interface ready)
- **v0.3.3**: 🟢 Low complexity (integration work, critical path)
- **v0.3.4**: 🟡 Medium complexity (NLP date parsing)
- **v0.3.5**: 🟢 Low complexity (file system operations)
- **v0.3.6**: 🟡 Medium complexity (MCP integration)
- **v0.3.7**: 🔴 High complexity (comprehensive testing)

### Business Value:
- **v0.3.1**: Foundation for all review features
- **v0.3.2**: Direct user productivity improvement (CLI ready)
- **v0.3.3**: **CRITICAL** - Makes the review system actually functional end-to-end
- **v0.3.4**: Major ADHD-friendly enhancement (automatic date handling)
- **v0.3.5**: Professional deployment readiness
- **v0.3.6**: Full AI assistant ecosystem support
- **v0.3.7**: Production-grade reliability

---

*This roadmap properly sequences semantic versions while maintaining backward compatibility and logical feature progression. Each version builds on previous work while adding meaningful capabilities for ADHD-friendly productivity workflows.*