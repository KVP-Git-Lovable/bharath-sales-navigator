
# AI-Powered Project Management -- Making Your Tool Intelligent

This plan introduces 10 AI capabilities across the entire PM module, turning it from a standard task tracker into a smart project management assistant. All AI calls use the existing Lovable AI Gateway pattern (already proven with sprint-summary).

---

## 1. AI Auto-Generate Sub-Tasks

**Where:** Task Detail Panel + Create Task Modal (button: "Generate Sub-tasks with AI")

**How it works:**
- User creates a task with a title (and optionally a description)
- Clicks "AI: Break Down" button
- AI analyzes the title/description and generates 3-7 actionable sub-tasks with estimated hours and priorities
- User reviews, edits, and confirms before bulk-creating

**Edge Function:** `pm-ai-assistant` (single multi-purpose edge function for all PM AI features)

---

## 2. AI Auto-Fill Description

**Where:** Create Task Modal + Task Detail Panel (button next to description field)

**How it works:**
- User types a task title, clicks "AI: Write Description"
- AI generates acceptance criteria, scope, and technical notes based on the title, project context, and section name
- Inserts as editable text the user can refine

---

## 3. AI Risk Predictor (Auto-Detect Risks)

**Where:** Risks Panel -- new "Scan for Risks" button

**How it works:**
- AI receives full project snapshot: all tasks (statuses, due dates, hours), resources (utilization, budget), milestones, and existing risks
- Predicts new risks such as: schedule overrun, effort overrun, resource bottleneck, scope creep, milestone at risk
- Each predicted risk has a title, description, probability, impact, and suggested mitigation
- User can accept (creates risk entry) or dismiss each prediction
- Predicted risks are visually tagged with an "AI Predicted" badge

---

## 4. Schedule and Effort Overrun Alerts

**Where:** Overview tab -- new "AI Health Check" card; also inline warnings on Work Plan and Board

**How it works:**
- AI analyzes each task: compares logged_hours vs estimated_hours (effort overrun) and current date vs due_date with remaining work (schedule overrun)
- Tasks flagged with warning indicators: amber for at-risk, red for overrun
- A summary card in Overview shows: "3 tasks likely to overrun schedule, 2 tasks exceeding effort budget"
- Clicking each alert navigates to the task

---

## 5. Resource Risk and Workload Balancing

**Where:** Resources Panel -- new "AI Workload Analysis" button

**How it works:**
- AI reviews resource allocation: hours logged vs budget, number of concurrent tasks, utilization percentage
- Highlights: over-allocated resources (>100% utilization), under-utilized resources, single-point-of-failure risks (one person on critical tasks)
- Suggests rebalancing recommendations

---

## 6. AI-Powered Knowledge Assistant (Task-Level)

**Where:** Task Detail Panel -- new "Ask Knowledge Base" button in the details tab

**How it works:**
- When viewing a task, user can ask: "How did we handle this before?" or "What guidelines apply?"
- AI searches the project's Knowledge Base documents (pm_knowledge_documents) by name and description
- Combines relevant knowledge entries with the task context to provide targeted suggestions
- Example: Task is "Set up CI/CD pipeline" -- AI finds a knowledge doc named "DevOps Standards" and surfaces relevant excerpts and recommendations

---

## 7. Smart Knowledge Suggestions (Proactive)

**Where:** Knowledge Panel -- new "AI: Suggest Missing Knowledge" button

**How it works:**
- AI analyzes the project's tasks, sections, and existing knowledge documents
- Identifies gaps: "Your project has 12 tasks about API integration but no knowledge document about API standards"
- Suggests document titles and descriptions to create

---

## 8. AI Idea Evaluator

**Where:** Ideas Panel -- "AI: Evaluate" button on each idea card

**How it works:**
- AI assesses the idea against project goals, current workload, and team capacity
- Returns: feasibility score, effort estimate, impact assessment, and recommendation (implement now / park for later / needs more detail)

---

## 9. AI Support Triage

**Where:** Support Panel -- automatic on creation

**How it works:**
- When a support request is created, AI auto-suggests priority level and category
- Scans existing resolved support tickets for similar issues and suggests solutions
- Adds an "AI Suggestion" field to the support card

---

## 10. AI Project Overview Summary

**Where:** Overview tab -- "Generate AI Report" button

**How it works:**
- AI creates a comprehensive project health narrative covering: progress trends, risk exposure, resource health, milestone status, and recommended actions
- Exportable as part of stakeholder reports

---

## Technical Architecture

### Single Multi-Purpose Edge Function

Instead of creating 10 separate functions, one `pm-ai-assistant` edge function handles all requests with a `type` parameter:

```text
POST /pm-ai-assistant
Body: { type: "generate_subtasks" | "write_description" | "predict_risks" | "health_check" | "workload_analysis" | "knowledge_query" | "knowledge_gaps" | "evaluate_idea" | "triage_support" | "project_summary", projectId, ...context }
```

Each type builds a different prompt with relevant project data fetched server-side.

### Database Changes

- Add `ai_generated` boolean column to `pm_risks` table (to tag AI-predicted risks)
- Add `ai_suggestion` text column to `pm_support_requests` table
- Add `ai_evaluation` text column to `pm_ideas` table
- New table `pm_ai_insights` to store cached AI analysis results (project_id, insight_type, content, created_at, expires_at)

### UI Pattern (Consistent Across All Features)

- Sparkles icon button triggers AI analysis
- Loading state with animated sparkle
- Results appear in a collapsible card with green border (matching sprint AI summary pattern)
- User can accept, dismiss, or regenerate

### Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `supabase/functions/pm-ai-assistant/index.ts` | Multi-purpose AI edge function |
| Create | `src/hooks/usePMAI.ts` | React hook for all PM AI calls |
| Create | `src/components/pm/AISubtaskGenerator.tsx` | Sub-task generation UI |
| Create | `src/components/pm/AIDescriptionWriter.tsx` | Description auto-fill UI |
| Create | `src/components/pm/AIRiskPredictor.tsx` | Risk prediction UI |
| Create | `src/components/pm/AIHealthCheck.tsx` | Overrun alerts card |
| Create | `src/components/pm/AIWorkloadAnalysis.tsx` | Resource risk analysis UI |
| Create | `src/components/pm/AIKnowledgeAssistant.tsx` | Task-level knowledge Q&A |
| Modify | `src/components/pm/TaskDetailPanel.tsx` | Add AI buttons for subtasks, description, knowledge |
| Modify | `src/components/pm/CreateTaskModal.tsx` | Add AI description button |
| Modify | `src/components/pm/RisksPanel.tsx` | Add "Scan for Risks" AI button |
| Modify | `src/components/pm/ResourcesPanel.tsx` | Add workload analysis button |
| Modify | `src/components/pm/IdeasPanel.tsx` | Add evaluate button per idea |
| Modify | `src/components/pm/SupportPanel.tsx` | Add AI triage on create |
| Modify | `src/components/pm/KnowledgePanel.tsx` | Add "Suggest Missing Knowledge" + task-level assistant |
| Modify | `src/components/pm/ProjectOverview.tsx` | Add AI health check + summary cards |
| Migration | DB schema | Add columns and pm_ai_insights table |

### Implementation Priority (Recommended Build Order)

1. Edge function (`pm-ai-assistant`) + `usePMAI` hook -- foundation for everything
2. AI Sub-task Generator + Description Writer -- highest daily-use value
3. AI Risk Predictor + Health Check (overrun alerts) -- key differentiator
4. Resource Workload Analysis -- completes the risk picture
5. Knowledge Assistant (task-level Q&A) -- knowledge differentiator
6. Smart Knowledge Gaps + Idea Evaluator + Support Triage + Project Summary -- polish features
