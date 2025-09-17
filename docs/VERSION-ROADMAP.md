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

### **v0.3.2** - ADHD Dashboard & Task Management *(Current Work)*
**Status**: COMPLETED ✅  
**Type**: MINOR (major new features, backward compatible)  
**Scope**: Complete dashboard and task completion system  

**Features**:
- ✅ **Interactive Brain Dump**: `dump` command for frictionless multi-thought capture
- ✅ **What's Next Dashboard**: `next` command with ADHD-friendly priority recommendations  
- ✅ **Complete Task List**: `tasks` command showing all open tasks across trackers
- ✅ **Task Completion**: `done "task"` command to mark tasks complete and update trackers
- ✅ **Obsidian Tasks Compatibility**: Full parsing of Obsidian Tasks formats (@waiting, @urgent, 📅 dates)
- ✅ **Shell Integration**: Global aliases (dump, next, tasks, done) available anywhere
- ✅ **Smart Filtering**: Context-aware task filtering and @waiting task exclusion
- ✅ **ADHD-Optimized UI**: Colored output, urgency scores, time estimates, due date awareness

---

### **v0.3.3** - Complete Task Management Suite *(ACTUAL - Sep 17, 2025)*
**Status**: ✅ COMPLETED (The "Sneaky Feature" that changed everything!)  
**Type**: MINOR (major new feature set, backward compatible)  
**Scope**: Comprehensive task lifecycle management with `change` command  

**Features Actually Delivered**:
- ✅ **`change` Command**: Intuitive alias for task editing (shorter than `edit`)
- ✅ **7 Edit Operations**: Title, priority, due date, tags, move, close, delete
- ✅ **Move Between Trackers**: Smart tag updates and atomic operations
- ✅ **Close Tasks**: Alternative to `done` command with completion tracking
- ✅ **Delete Tasks**: Safe permanent removal with double confirmation
- ✅ **Interactive Task Picker**: Top 20 urgent tasks (ADHD-friendly)
- ✅ **Visual Priority System**: Color-coded indicators (🔴🟡🟢)
- ✅ **Context Icons**: Business (💼), Project (🚀), Personal (🏠), System (⚙️)
- ✅ **Fixed Front Matter Issues**: Resolved all "undefined" tracker problems
- ✅ **Shell Aliases**: `change` and `finish` commands available system-wide

**Impact**: Transforms ChurnFlow into complete task lifecycle management system

---

### **v0.3.4** - Review System Integration *(NEXT UP)*
**Type**: MINOR (integration fix, critical for review workflow)  
**Scope**: Connect CaptureEngine to actually use ReviewManager for flagging items

**Current Issue**: 
- ✅ ReviewManager (v0.3.1) - Core infrastructure complete
- ✅ Dashboard System (v0.3.2) - User interface ready
- ✅ Task Management (v0.3.3) - Complete editing system ready
- ❌ **Missing Link**: CaptureEngine writes review items directly to trackers instead of using ReviewManager

**Planned Features**:
- 🔗 Integrate CaptureEngine with ReviewManager for low-confidence items
- 🔗 Replace direct tracker writing with ReviewManager.flagItemForReview()
- 🔗 Update confidence scoring to use ReviewManager thresholds
- 🔗 Ensure review items appear in CLI review interface
- 🔗 Test end-to-end workflow: capture → review → action → edit with `change`

**Implementation Considerations**:
- Modify CaptureEngine to detect review-worthy items
- Route low-confidence captures through ReviewManager
- Maintain backward compatibility for high-confidence items
- Update confidence threshold configuration
- **New**: Leverage v0.3.3 edit capabilities in review workflow

---

### **v0.3.5** - Context-Aware Dashboard Views
**Type**: MINOR (new dashboard modes, backward compatible)  
**Scope**: Situational task recommendations for different contexts

**Planned Features**:
- 🟡 **Quick Tasks**: `next quick` - Show only tasks ≤ 5 minutes for micro-breaks
- 🟡 **Errand Mode**: `next errands` - Location-based tasks (bank, store, etc.) for lunch breaks
- 🟡 **Away Mode**: `next lunch` - Tasks you can do away from desk/computer
- 🟡 **Low Energy**: `next energy low` - Easy tasks for when you're tired/unfocused
- 🟡 **Review Chunks**: `next review` - Bite-sized review sessions (5-10 items)
- 🟡 **Tasks by Tracker**: Enhanced `tasks tracker [name]` with better filtering
- 🟡 **Context Detection**: Smart tag recognition (#errand, #call, #email, #admin)
- 🟡 **Time-Based Filtering**: Filter by estimated duration ranges

**Implementation Considerations**:
- **Depends on v0.3.4** - Requires working review system for review chunks
- Extend DashboardManager with context-specific filtering
- Add location and energy level metadata to task parsing
- Create task classification system for activities (desk vs mobile)
- Implement smart tag detection for context inference
- **Enhanced**: Leverage v0.3.3 task editing for context-aware task management

---

### **v0.3.6** - Inferred Due Dates
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

### **v0.3.7** - CrossRef Validation & Initialization
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
- **Enhanced**: Integration with v0.3.3 task editing for crossref management

---

### **v0.3.8** - Enhanced MCP Server Features
**Type**: MINOR (new MCP tools, backward compatible)  
**Scope**: Extended MCP server capabilities  

**Planned Features**:
- 🔧 MCP tools for dashboard workflows (`get_next_tasks`, `complete_task`)
- 🔧 MCP tools for context-aware filtering
- 🔧 MCP tools for due date management
- 🔧 MCP tools for crossref validation
- 🔧 **NEW**: MCP tools for task editing (`change_task`, `move_task`)
- 🔧 Enhanced error handling and responses
- 🔧 Performance optimizations for AI assistant usage

**Implementation Considerations**:
- New MCP tool definitions and schemas
- Integration with CLI dashboard interface
- **Enhanced**: Full v0.3.3 task management suite via MCP
- Async operation handling for complex workflows
- Enhanced tool metadata and documentation

---

### **v0.3.9** - Comprehensive Testing & 80% Coverage
**Type**: PATCH (quality improvements, no new features)  
**Scope**: Testing infrastructure and quality assurance  

**Planned Features**:
- 🧪 CLI integration testing (0% → 80% coverage)
- 🧪 **NEW**: Task management testing (v0.3.3 edit operations)
- 🧪 MCP server testing (0% → 75% coverage)
- 🧪 Core logic improvements (87% → 90% coverage)
- 🧪 Performance testing and optimization
- 🧪 Error handling validation
- 🧪 Documentation completeness

**Implementation Considerations**:
- Jest configuration for CLI testing
- **NEW**: Mock frameworks for interactive task editing
- MCP protocol testing utilities
- Mock frameworks for interactive testing
- Coverage reporting and monitoring

---

### **v0.4.0** - Voice Memo Capture System
**Type**: MINOR (major new feature, backward compatible)  
**Scope**: Mobile voice capture integration for away-from-computer productivity  

**Planned Features**:
- 🎤 **Voice Memo Integration**: Seamless capture from phone/iPad voice memos
- 🎤 **Shared Folder Sync**: Auto-process voice files from shared directory
- 🎤 **Email Integration**: Voice memo → email → ChurnFlow processing
- 🎤 **Speech-to-Text**: Convert voice memos to text for AI processing
- 🎤 **Mobile Workflow**: Capture while driving, walking, away from desk
- 🎤 **Audio Transcription**: High-quality voice-to-text conversion
- 🎤 **Batch Processing**: Handle multiple voice memos in queue
- 🎤 **Quality Control**: Confidence scoring for transcription accuracy

**Implementation Considerations**:
- Speech-to-text API integration (OpenAI Whisper, Google Speech, etc.)
- File system watching for shared folder monitoring
- Email parsing and attachment handling
- Audio format support (m4a, mp3, wav)
- Mobile app integration strategies
- Transcription confidence thresholds

**Business Impact**:
- **Mobile Productivity**: Capture thoughts while driving, walking, in meetings
- **Zero Friction**: No need to type on phone, just speak naturally
- **ADHD-Friendly**: Eliminates mobile typing barriers
- **Complete Coverage**: Never lose a thought regardless of location

---

### **v0.5.0** - Smart Sync System
**Type**: MINOR (major automation feature, backward compatible)  
**Scope**: Intelligent tracker synchronization and collection maintenance  

**Planned Features**:
- 🤖 **Learning Sync Rules**: System learns how to sync different tracker types
- 🤖 **Context-Aware Closing**: Smart project completion (jobs, expenses, revenue)
- 🤖 **Automated Analysis**: Ongoing tracker reports and insights
- 🤖 **Template System**: Define sync patterns once, apply automatically
- 🤖 **Graceful Status Updates**: Context-aware status changes without breaking workflows
- 🤖 **Revenue/Expense Routing**: Automatic financial data organization
- 🤖 **Milestone Detection**: Recognize project completion patterns
- 🤖 **Chunked Maintenance**: Break large syncs into manageable pieces

**Implementation Considerations**:
- Machine learning for sync pattern recognition
- Template definition system for different tracker types
- Financial data routing and categorization
- Project lifecycle detection algorithms
- Incremental sync processing
- User preference learning and adaptation

**Business Impact**:
- **Eliminates Weekly Admin**: No more 3-hour weekend sync sessions
- **Reduces Cognitive Load**: System handles routine maintenance automatically
- **Financial Intelligence**: Automatic expense/revenue categorization
- **Project Intelligence**: Smart project completion workflows
- **Time Recovery**: Hours per week returned to productive work

---

## 🚀 **Implementation Timeline** *(AGGRESSIVE - Based on Actual Velocity)*

### 🔥 **REALITY CHECK**: We're moving FAST!
- **v0.3.2** (Dashboard): Completed in 1 day
- **v0.3.3** (Task Management): Completed in 1 morning session (630+ lines!)
- **Actual velocity**: ~1 minor version per day when focused

### Immediate Actions (This Session - Sep 17):
1. **Complete v0.3.3** - Complete Task Management Suite ✅
2. **Update roadmap documentation** - Reflect new aggressive timeline ✅
3. **Start v0.3.4** - Review Integration (same session if energy permits)

### 🚀 **Next 2 Weeks (Core Platform Completion)**:
- **Today (Sep 17)**: Complete v0.3.3 ✅ + Start v0.3.4 (Review Integration)
- **Tomorrow (Sep 18)**: Finish v0.3.4 + Start v0.3.5 (Context-Aware Views)
- **Day 3 (Sep 19)**: Complete v0.3.5 + Start v0.3.6 (Due Dates)
- **Day 4 (Sep 20)**: Complete v0.3.6 + Start v0.3.7 (CrossRef Validation)
- **Day 5 (Sep 21)**: Complete v0.3.7 + Start v0.3.8 (Enhanced MCP)
- **Week 2**: Complete v0.3.8 + v0.3.9 (Testing) + v0.4.0 planning

### 🚀 **Major Feature Releases (Next 2-4 Weeks)**:
- **Week 3**: Implement v0.4.0 (Voice Memo Capture) 🎤
- **Week 4**: Implement v0.5.0 (Smart Sync System) 🤖
- **Week 5+**: v0.6.0+ Advanced AI features, Polish, Market prep

### 🏆 **Rationale for Aggressive Timeline**:
- **Proven Velocity**: 630+ lines of production code in single morning
- **Clear Architecture**: Foundation is solid, features build incrementally  
- **ADHD Hyperfocus**: Riding the momentum wave while it's strong
- **Simple Scope**: Each version has clear, bounded objectives
- **No Dependencies**: Features are largely independent and additive

---

## 📊 **Version Impact Assessment**

### User Experience Impact:
- **v0.3.1**: Core infrastructure (no user-visible changes)
- **v0.3.2**: **MASSIVE** - Complete ADHD productivity workflow (dump, next, tasks, done)
- **v0.3.3**: **CRITICAL** - Review system integration (end-to-end capture workflow)
- **v0.3.4**: Context-aware recommendations (situational task filtering + review chunks)
- **v0.3.5**: Smarter capture with due dates (major UX enhancement)
- **v0.3.6**: System reliability (operational improvement)
- **v0.3.7**: AI assistant features (expanded capabilities)
- **v0.3.8**: Quality & reliability (stability improvement)

### Development Complexity *(Updated for Aggressive Timeline)*:
- **v0.3.1**: ✅ Complete (retrospective versioning only)
- **v0.3.2**: ✅ Complete (dashboard system ready)
- **v0.3.3**: ✅ Complete (630+ lines in 1 morning - BEAST MODE!)
- **v0.3.4**: 🟢 **1-2 Hours** (simple integration work, critical path)
- **v0.3.5**: 🟡 **Half Day** (dashboard filtering extensions)
- **v0.3.6**: 🟡 **Half Day** (NLP date parsing with existing libraries)
- **v0.3.7**: 🟢 **1-2 Hours** (file system operations - straightforward)
- **v0.3.8**: 🟡 **Half Day** (MCP integration - extend existing patterns)
- **v0.3.9**: 🔴 **1-2 Days** (comprehensive testing - most complex)

### Business Value:
- **v0.3.1**: Foundation for all review features
- **v0.3.2**: **GAME CHANGER** - Complete ADHD-friendly productivity system
- **v0.3.3**: **CRITICAL** - Review system integration (complete capture workflow)
- **v0.3.4**: Enhanced situational awareness (5-min tasks, errands, review chunks)
- **v0.3.5**: Major ADHD-friendly enhancement (automatic date handling)
- **v0.3.6**: Professional deployment readiness
- **v0.3.7**: Full AI assistant ecosystem support
- **v0.3.8**: Production-grade reliability

---

*This roadmap properly sequences semantic versions while maintaining backward compatibility and logical feature progression. Each version builds on previous work while adding meaningful capabilities for ADHD-friendly productivity workflows.*