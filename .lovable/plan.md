# Fix KPI & Tiers on target-based gamification activities

## What is actually broken (verified)

1. **Tier rows reset while you type.** In `ActivityForm.tsx` the tier list is rebuilt on *every* render (the effect at lines 75-81 depends on a list that is recreated each render). So every keystroke in the "%" or "points" box, and every "Add tier" click, is immediately overwritten by the default row (80% → 5 points). This alone explains "can't edit", "can't add", and "nothing saves".
2. **Nothing has ever been saved.** The database currently holds **0 tier rows** and **0 target-based activities** — confirming no save has ever completed.
3. **Even a saved setup would award nothing.** The monthly award job reads each rep's achievement % from the period-target table, and that table is **empty** (0 rows). With no achievement data there is nothing to score, so no points are ever issued.
4. **The KPI list itself is fine.** 5 active KPIs exist and the dropdown shows all 5. In the screenshot the open dropdown is simply covering the tier rows underneath. Access rules and table permissions on the KPI, activity and tier tables are all correct.

## The fix

### 1. Stop the tier list from resetting
- Load saved tiers into the form **once per dialog open**, not on every render (stabilise the effect and its input list).
- Keep numbers editable: allow an empty box while typing instead of forcing it to a number on each keystroke, and only convert on save.
- Sort tiers by threshold and block obvious mistakes on save: no duplicate thresholds, threshold between 1 and 500, points greater than 0.

### 2. Make save trustworthy
- Replace the delete-then-insert of tiers with a single grouped write, so a failure can no longer leave an activity with its old tiers wiped and nothing in their place.
- After a successful save, refresh both the activity list and the tier list so reopening the record shows exactly what was stored.

### 3. Make the KPI/tier block readable
- Give the KPI dropdown list a fixed max height so it no longer covers the tier editor, and move the tier editor into its own bordered block with a short line explaining the rule ("rep hits 90% of their monthly KPI target → award these points, highest matching tier only").

### 4. Points actually being awarded
The award job is wired correctly but has no achievement data to read. Two follow-ups, to confirm before I build them:
- Populate the period-target table from the Targets module (achievement % per rep per KPI per month), or
- Change the award job to compute achievement % live from targets vs. actuals at period close.

I will implement steps 1-3 now and treat step 4 as a separate change once you tell me which of the two you want — populating from Targets is the smaller, safer option.

## Technical notes

- Files: `src/modules/gamification/ActivityForm.tsx`, `src/modules/gamification/hooks.ts`.
- Root cause of the reset loop: `const { data: existingTiers = [] } = useActivityTiers(...)` returns a fresh `[]` identity on each render while the query is disabled/empty, and that value is an effect dependency that calls `setTiers`.
- No database migration is needed for steps 1-3; RLS (`is_system_admin`) and grants on `activity_tiers`, `gamification_actions` and `target_kpi_definitions` are already correct.
- Step 4 would touch `user_period_targets` population or `gam_evaluate_target_tiers`, and would need a migration.
