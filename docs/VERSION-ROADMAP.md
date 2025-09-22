# ChurnFlow MCP Version Roadmap

## Current Status: v0.4.0 Database Integration Complete 🎉

**All completed versions documented in CHANGELOG.md**

---

## 📋 **Future Version Roadmap** *(Undone v0.3.x Features Migrated)*

### **v0.4.1** - MVP Refinements *(Current Feature Branch)*
**Type**: PATCH (bug fixes and small improvements)  
**Scope**: Fix issues discovered during v0.4.0 usage

**Issues to Address**:
- 🐛 Fix priority indicators appearing on activity log entries (should be activity-only)
- 🐛 Other refinements discovered during MVP usage
- 🔧 Small capture flow improvements
- 📋 Review and polish database integration edge cases

---

### **v0.4.2** - Database Migrations System
**Type**: MINOR (new migration infrastructure, backward compatible)  
**Scope**: Proper database schema evolution without data loss

**Features**:
- 🔄 **Drizzle Migrations**: Proper migration workflow like Entity Framework Core
- 🔄 **Schema Evolution**: Add columns and modify tables without losing data
- 🔄 **Migration Commands**: `npm run db:generate`, `npm run db:migrate` workflows
- 🔄 **Version Tracking**: Database schema versioning and rollback support
- 🔄 **Data Safety**: Ensure no data loss during schema changes
- 🔄 **Development Workflow**: Easy schema iteration during development

**Implementation**:
- Update DatabaseManager to use proper migrations instead of manual table creation
- Establish migration workflow for future schema changes
- Ensure existing v0.4.0 databases can migrate forward safely

---

### **v0.4.3** - Capture Input Refinements
**Type**: MINOR (enhanced capture processing)  
**Scope**: Improve capture quality and AI inference

**Features**:
- ✨ **Enhanced AI Processing**: Better context inference and item generation
- ✨ **Input Validation**: Improve capture text processing and edge cases
- ✨ **Priority Detection**: Better priority inference from natural language
- ✨ **Multi-item Enhancement**: Improved multi-item capture from complex inputs
- ✨ **Edge Case Handling**: Better handling of ambiguous or unusual inputs
- ✨ **Confidence Scoring**: Refined confidence algorithms for routing decisions

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

### **v0.4.4** - Context-Aware Dashboard Views *(Migrated from v0.3.5)*
**Type**: MINOR (enhanced dashboard modes with database backing)  
**Scope**: Situational task recommendations with database analytics

**Features** *(Enhanced with Database)*:
- 🟡 **Quick Tasks**: `next quick` - Database-filtered tasks ≤ 5 minutes
- 🟡 **Errand Mode**: `next errands` - Location-based tasks with usage patterns
- 🟡 **Away Mode**: `next lunch` - Tasks for away-from-desk productivity
- 🟡 **Low Energy**: `next energy low` - Easy tasks based on completion history
- 📋 **Review Chunks**: `next review` - Database-prioritized review sessions
- 📁 **Tasks by Tracker**: Enhanced filtering with database insights
- 🏷️ **Context Detection**: Smart tag recognition with AI learning patterns
- ⏱️ **Time-Based Filtering**: Duration estimates from database analytics

---

### **v0.4.5** - Inferred Due Dates *(Migrated from v0.3.6)*
**Type**: MINOR (AI-powered date detection)  
**Scope**: Automatic due date inference from natural language

**Features** *(Enhanced with Database)*:
- 📅 **AI Date Detection**: Parse "by Friday", "next week", "in 3 days" from capture text
- 📅 **Automatic Assignment**: Smart due date assignment to action items
- 📅 **Database Storage**: Store and track due dates with analytics
- 📅 **Learning Patterns**: Improve date inference based on user corrections
- 📅 **Review Interface**: Confirm/edit inferred dates during review
- 📅 **Calendar Integration**: Date validation and calendar awareness

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

### **v0.4.6** - Enhanced MCP Server Features *(Migrated from v0.3.8)*
**Type**: MINOR (database-powered MCP tools)  
**Scope**: Extended MCP server capabilities with database integration

**Features** *(Enhanced with Database)*:
- 🔧 **Dashboard MCP Tools**: `get_next_tasks`, `get_statistics`, `complete_task`
- 🔧 **Database Search Tools**: `search_captures`, `get_analytics`
- 🔧 **Context-Aware Tools**: Database-backed filtering and recommendations
- 🔧 **Task Management Tools**: `change_task`, `move_task` with database sync
- 🔧 **Review Tools**: Database-powered review prioritization via MCP
- 🔧 **Learning Tools**: Access AI learning patterns and insights
- 🔧 **Performance**: Optimized database queries for AI assistant usage

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

### **v0.5.0** - Voice Memo Capture System *(Migrated from v0.4.0)*
**Type**: MINOR (major new feature with database integration)  
**Scope**: Mobile voice capture with database storage and analytics

**Features** *(Enhanced with Database)*:
- 🎤 **Voice Memo Integration**: Seamless capture with database storage
- 🎤 **Database Storage**: Voice transcriptions stored with metadata
- 🎤 **Speech-to-Text**: OpenAI Whisper integration with confidence scoring
- 🎤 **Mobile Workflow**: Database-backed voice capture from anywhere
- 🎤 **Audio Analytics**: Track voice capture patterns and success rates
- 🎤 **Learning Integration**: Voice patterns improve AI context inference
- 🎤 **Search Integration**: Voice transcriptions included in FTS search
- 🎤 **Quality Tracking**: Database analytics on transcription accuracy

---

### **v0.6.0** - Smart Sync System *(Migrated from v0.5.0)*
**Type**: MINOR (intelligent automation with database analytics)  
**Scope**: Database-powered tracker synchronization and collection maintenance

**Features** *(Enhanced with Database)*:
- 🤖 **Learning Sync Rules**: Database analytics learn optimal sync patterns
- 🤖 **Smart Project Completion**: Database-tracked project lifecycle management
- 🤖 **Automated Insights**: Database-powered reports and trend analysis
- 🤖 **Pattern Recognition**: AI learns from database history for better automation
- 🤖 **Financial Intelligence**: Database categorization of expenses/revenue
- 🤖 **Milestone Detection**: Database analytics recognize completion patterns
- 🤖 **Maintenance Analytics**: Database-optimized sync scheduling
- 🤖 **User Adaptation**: Database learning improves automation over time

**Business Impact**:
- **Eliminates Weekly Admin**: Database automation replaces manual sync sessions
- **Intelligent Insights**: Database analytics provide actionable intelligence
- **Time Recovery**: Hours per week returned to productive work

---

## 🚀 **Implementation Timeline** *(Updated for v0.4.x Sequence)*

### 🎉 **Achievement**: v0.4.0 Database Integration Complete!
- **v0.4.0** (Sep 21): SQLite database integration with FTS, analytics, AI learning ✅
- **Clean Architecture**: Database setup separated from capture operations
- **Dual Storage**: Files + database with graceful fallback
- **176+ Tests**: Comprehensive test coverage including database

### 🎯 **Next Steps (MVP Refinement Phase)**:
- **v0.4.1**: MVP refinements (current feature branch) - Fix priority indicators on activities, etc.
- **v0.4.2**: Database migrations system - Proper schema evolution without data loss
- **v0.4.3**: Capture input refinements - Enhanced AI processing and edge cases

### 🚀 **Feature Enhancement Phase (v0.4.4+)**:
- **v0.4.4**: Context-aware dashboard views with database backing
- **v0.4.5**: Inferred due dates with AI learning patterns
- **v0.4.6**: Enhanced MCP server with database-powered tools

### 🎤 **Major Feature Releases**:
- **v0.5.0**: Voice memo capture system with database integration
- **v0.6.0**: Smart sync system with database analytics
- **v0.7.0+**: Advanced AI features, mobile app, community features

---

## 🏆 **Roadmap Principles**

### 💪 **Database-First Architecture**:
- All future features leverage SQLite database foundation
- Dual storage (files + database) ensures backwards compatibility
- Database analytics and learning enhance every feature
- Clean migrations enable safe schema evolution

### 🧠 **ADHD-Focused Development**:
- MVP refinements based on real usage patterns
- Incremental improvements over major rewrites
- Database insights drive UX optimizations
- Maintain zero-friction capture workflow

### 🚀 **Proven Velocity**:
- v0.4.0 database integration completed in focused sessions
- Each version builds incrementally on solid foundation
- Database infrastructure enables rapid feature development
- Clear, bounded objectives for each release

---

*This roadmap reflects the new database-powered architecture while maintaining the proven ADHD-friendly productivity workflow. All future features are enhanced by SQLite foundation and analytics capabilities.*

*Last updated: 2025-09-22 00:07*
