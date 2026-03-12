

# Add In-App Help Guide for Approval Workflows

## What We'll Build

A help button (HelpCircle icon) next to the "Approval Workflows" title that opens a dialog/sheet with a clear, step-by-step explanation of how the feature works -- including what workflows are, how to configure them, how approval modes differ, and how rules connect workflows to expenses.

## Implementation

### 1. Add a Help Dialog to `ApprovalWorkflowsConfig.tsx`

- Import `HelpCircle` from lucide-react and `Dialog`/`DialogContent`/`DialogHeader` from the UI library
- Add a `HelpCircle` button next to the card title ("Approval Workflows")
- On click, open a `Dialog` containing structured help content:

**Help Content Sections:**
1. **What are Approval Workflows?** -- Named approval chains that define who approves expenses and in what order
2. **How to Create a Workflow** -- Click Add, name it, choose mode, then expand to add steps
3. **Approval Modes Explained:**
   - Sequential: Step 1 must approve before Step 2 sees it
   - Parallel (Any One): All approvers see it simultaneously; one approval is enough
   - Parallel (All Required): All approvers must approve
4. **Step Types:**
   - Manager: The submitter's direct manager at that hierarchy level
   - Specific User: A named person (e.g., Finance Head)
   - Hierarchy Level: Manager at level N in the reporting chain
5. **How Workflows Connect to Expenses** -- Via Approval Rules (amount/category conditions route to specific workflows). If no rule matches, the default workflow is used.
6. **Example Setup** -- A practical example: "Manager + Finance" workflow with 2 sequential steps

The content will use simple language, small icons, and visual hierarchy (headings, badges, a simple ASCII flow diagram) so non-technical admins can understand it.

### Files Modified
| File | Change |
|------|--------|
| `src/components/expenses/ApprovalWorkflowsConfig.tsx` | Add HelpCircle button + Dialog with help content |

