# ChurnFlow Development Notes

## Current Status: v0.2.1 Multi-Item Capture ✅ COMPLETE

**Major Achievement**: Single captures now generate multiple items across trackers!

### What Works Perfectly:
- Doug welder example: "Doug picked up his welder. Paid me $200. Mentioned leaf vacuum needs fixing and Ford 8n tractor work."
  - ✅ Activity: Doug pickup & payment (gsc-dev Activity Log)
  - ✅ Action: Record $200 income (gsc-dev Actions)  
  - ✅ Someday: Fix leaf vacuum (outdoor-maintenance)
  - ✅ Review: Ford 8n tractor evaluation (outdoor-maintenance)
  - ✅ Task completion detection: Welder project done
- Comprehensive test suite (14 tests)
- Cross-tracker routing
- ADHD-friendly brain dumps

---

## Next Version: v0.2.2 - Formatting Consistency

### 🎯 Primary Goal: Standardize ALL Formatting Rules

**Issues Identified:**
- Inconsistent date formats across different item types
- Mixed checkbox styles (`- [ ]` vs `- [x]`)
- Varying header structures between trackers
- Timestamp formats not standardized
- Activity log entries need consistent formatting
- Action items need consistent tag structure

### 📋 Formatting Rules to Define:

#### Item Entry Formats:
```markdown
# Action Items
- [ ] #tag-name [YYYY-MM-DD] Specific actionable task description
- [x] #tag-name [YYYY-MM-DD] Completed task ✅ YYYY-MM-DD

# Activity Log  
- [YYYY-MM-DD HH:MM] Context/update description with relevant details

# References
- [YYYY-MM-DD] #reference Important information or context to remember

# Someday Items
- [ ] #someday [captured-YYYY-MM-DD] Future possibility or idea to consider

# Review Items  
- [ ] #review [YYYY-MM-DD] Item requiring human decision or evaluation
```

#### Tracker Header Standards:
```markdown
# [Tracker Name] — Tracker — [Month YYYY]

## Activity Log
[Recent activities first]

## Action Items  
[Active tasks]

## References
[Important context]

## Review Queue
[Items needing decisions]
```

#### Date/Time Standards:
- **Timestamps**: `YYYY-MM-DD HH:MM` (24h format)
- **Due dates**: `📅 YYYY-MM-DD` 
- **Completion**: `✅ YYYY-MM-DD`
- **Capture date**: `[YYYY-MM-DD]` at start of entry

### 🔧 Implementation Tasks for v0.2.2:
1. **Define formatting constants** in types/churn.ts
2. **Update InferenceEngine** to use standardized formats
3. **Enhance TrackerManager** with formatting utilities
4. **Add formatting validation** to prevent inconsistencies  
5. **Update all generated entries** to use new standards
6. **Add tests** for formatting consistency
7. **Migration tool** to standardize existing entries (optional)

---

## Future Development Decision Point

### Option A: Voice Capture (v0.2.3)
**Benefits:**
- Ultimate ADHD-friendly interface
- Hands-free capture while working
- Natural speech-to-multi-item processing
- Mobile accessibility

**Challenges:**
- Speech-to-text integration complexity
- Audio processing requirements
- Platform-specific implementations

### Option B: Review Process (v0.2.3)  
**Benefits:**
- Complete the capture → review → action workflow
- Handle low-confidence AI suggestions
- Manual review interface for complex decisions
- Task completion workflow

**Challenges:**
- UI/interface design decisions
- Review queue management
- Decision tracking and follow-up

### 💭 Recommendation:
Consider **Review Process first** because:
1. Completes the core workflow loop
2. Handles current low-confidence captures better
3. Provides foundation for voice capture refinement
4. Less technical complexity than audio processing

---

## Development Environment Notes

### Current Setup:
- ✅ ChurnFlow v0.2.1 with multi-item capture
- ✅ 15 active trackers loaded
- ✅ Shell alias `churn capture "..."` working globally
- ✅ Comprehensive test coverage
- ✅ Git-flow workflow established

### Testing Commands:
```bash
# Test multi-item capture
churn capture "Complex scenario with multiple actionable items"

# Check system status
churn status

# Run tests
npm test -- tests/core/InferenceEngine.test.ts
```

### Weekly Review Workflow Test:
Use ChurnFlow CLI during your weekly collection review to:
1. Test real-world capture scenarios
2. Identify formatting inconsistencies  
3. Document edge cases for v0.2.2
4. Validate multi-item routing accuracy

---

## Session Goals Summary:
1. ✅ **v0.2.1 Complete**: Multi-item capture pushed to repository
2. 🎯 **Next Session**: v0.2.2 formatting consistency
3. 🤔 **Decision Needed**: Voice capture vs Review process for v0.2.3
4. 📋 **Test**: Use CLI during weekly review to gather real usage data

---

*Notes captured: 2025-09-14 22:52*  
*Status: Ready for v0.2.2 development*