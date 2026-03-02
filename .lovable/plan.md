

## Beat AI Insight Engine -- Transparent, Rule-Based, Scalable

### Problem
The current "AI Insights" button dumps raw JSON from a generic `generate-recommendations` edge function. It sends minimal context to the AI and renders the response as-is with no structured display, no health score, no data transparency, and no actionable layout.

---

### Data Availability Audit

Here is what each required data category maps to in your existing database:

| Category | Data Point | Source Table / Column | Available? |
|----------|-----------|----------------------|------------|
| **A. Revenue** | MTD Revenue | `orders.total_amount` (WHERE order_date >= month start, status=confirmed) | YES |
| | Last Month Revenue | `orders.total_amount` (prev month range) | YES |
| | Last 3 Month Avg | `orders.total_amount` (3-month window) | YES |
| | Growth % | Calculated from above | YES |
| | Same Period Last Year | `orders.total_amount` (year-ago range) | YES |
| **B. Retailer Activity** | Total retailers | `retailers` WHERE beat_id = X | YES |
| | Active (ordered this month) | JOIN orders on retailer_id, this month | YES |
| | Inactive (no order 30+ days) | `retailers.last_order_date` | YES |
| | New this month | `retailers.created_at` | YES |
| | Lost (no order 60+ days) | `retailers.last_order_date` | YES |
| **C. Visit & Coverage** | Planned visits | `visits` WHERE status IN (planned, completed) | YES |
| | Completed visits | `visits` WHERE status = completed | YES |
| | Missed visits | `visits` WHERE status NOT completed, date < today | YES |
| | Coverage % | Calculated | YES |
| | Avg visits per retailer | Calculated | YES |
| **D. Conversion** | Visits with orders | JOIN visits + orders on visit_id | YES |
| | Conversion rate % | Calculated | YES |
| | Avg billing per visit | Calculated | YES |
| **E. Productivity** | Working days | `attendance` WHERE status = present | YES |
| | Orders per day | orders count / working days | YES |
| | Revenue per day | Calculated | YES |
| | Avg order value | Calculated | YES |
| | Comparison vs other beats | Query other beats for same user | YES |
| **F. SKU Penetration** | Total SKUs in catalog | `products` WHERE is_active = true | YES |
| | SKUs sold in beat | `order_items.product_id` DISTINCT | YES |
| | Top 5 SKUs | `order_items` GROUP BY product_name, SUM | YES |
| | Slow-moving SKUs | SKUs with < threshold quantity | YES |
| | Concentration risk | Top 3 SKU revenue / total | YES |

**Conclusion**: All data points are available. No new tables needed.

---

### Architecture

```text
+------------------+     +---------------------------+     +------------------+
| BeatCard button  | --> | Edge Function             | --> | Structured JSON  |
| "AI Insights"    |     | beat-health-insights      |     | Response         |
+------------------+     +---------------------------+     +------------------+
                          |                           |
                          | 1. Fetch 90-day data      |
                          | 2. Calculate all KPIs     |
                          | 3. Run rule engine         |
                          | 4. Score health 0-100     |
                          | 5. Call AI for summary    |
                          | 6. Return structured JSON |
                          +---------------------------+
```

The key difference from current approach: **KPIs are calculated server-side with real math, not guessed by AI.** The AI is only used to generate the human-readable summary and action items from the pre-computed data.

---

### Phase 1: New Edge Function `beat-health-insights`

Create `supabase/functions/beat-health-insights/index.ts`:

**Step 1 -- Data Fetching** (all queries scoped to beat's retailers):
- Retailers: total, by category, created_at, last_order_date, last_visit_date, potential
- Orders: last 90 days with order_items (product_id, product_name, quantity, total)
- Visits: last 90 days (planned_date, status, visit_id)
- Attendance: current month working days for the user
- Products: all active products (for catalog count)
- Beat plans: for coverage tracking

**Step 2 -- KPI Computation** (pure math, no AI):

```text
Revenue:
  mtd_revenue, last_month_revenue, three_month_avg, growth_pct, yoy_comparison

Retailer Activity:
  total, active, inactive_30d, new_this_month, lost_60d

Visit Coverage:
  planned, completed, missed, coverage_pct, avg_visits_per_retailer

Conversion:
  total_visits, orders_from_visits, conversion_pct, avg_billing_per_visit

Productivity:
  working_days, orders_per_day, revenue_per_day, avg_order_value

SKU Penetration:
  catalog_total, skus_sold, penetration_pct, top_5_skus, slow_moving, concentration_risk_pct
```

**Step 3 -- Rule Engine** (deterministic risk detection):

```text
Rules (each produces a risk signal if triggered):
- revenue_drop > 15%
- conversion_drop > 10%
- high_value_inactive >= 2 (category A/B retailers with no order 30+ days)
- coverage < 70%
- concentration_risk > 40% (top 3 retailers = 40%+ revenue)
- sku_penetration < 50%
```

**Step 4 -- Health Score** (weighted 0-100):

| Parameter | Weight |
|-----------|--------|
| Revenue Trend | 25% |
| Coverage | 20% |
| Conversion | 20% |
| Retailer Activity | 15% |
| Productivity | 10% |
| SKU Penetration | 10% |

Each sub-score normalized to 0-100 based on thresholds:
- Revenue: 100 if growth >= 10%, scales down, 0 if drop >= 30%
- Coverage: direct percentage (capped at 100)
- Conversion: 100 if >= 80%, scales linearly
- Retailer Activity: 100 if all active, penalize per inactive
- Productivity: relative to avg order value benchmarks
- SKU: direct penetration percentage

Status labels: 85-100 Excellent, 70-84 Stable, 50-69 Needs Attention, <50 Critical

**Step 5 -- AI Summary** (Lovable AI call with pre-computed data):
- Send all KPIs + triggered risks as structured context
- Prompt AI to generate: 1-2 sentence summary + 3-5 action items
- AI does NOT compute numbers -- it only interprets pre-computed facts

**Step 6 -- Response Format**:
```text
{
  health_score: 62,
  status: "needs_attention",
  summary: "Beat performance declining...",
  recommended_actions: ["Visit 3 inactive A-category retailers", ...],
  severity_level: "warning",
  risk_signals: ["revenue_drop", "low_coverage"],
  data_points: {
    revenue: { mtd, last_month, three_month_avg, growth_pct, yoy_pct },
    retailer_activity: { total, active, inactive_30d, new_this_month, lost_60d },
    coverage: { planned, completed, missed, coverage_pct, avg_per_retailer },
    conversion: { total_visits, orders, rate_pct, avg_billing },
    productivity: { working_days, orders_per_day, revenue_per_day, avg_order_value },
    sku_penetration: { catalog, sold, pct, top_5, slow_moving, concentration_risk }
  },
  timestamp: "2026-03-02T..."
}
```

---

### Phase 2: New UI Component `BeatInsightModal.tsx`

Replace the current raw JSON modal with a structured display:

**Default View (visible on open)**:
1. **Health Score Ring** -- circular progress showing score/100 with color-coded status badge
2. **Summary Card** -- warning/success icon + 1-2 sentence AI-generated summary
3. **Risk Signals** -- red/orange badges for each triggered risk
4. **Recommended Actions** -- numbered list of 3-5 actions with priority indicators

**Expandable Section** (collapsed by default, "View Data Points Considered" button):
- 6 collapsible accordion sections (Revenue, Retailer Activity, Coverage, Conversion, Productivity, SKU)
- Each section shows a clean table of the KPI name + value
- Uses existing Accordion component from Radix UI

**Footer**: Like/Dislike feedback buttons (reuse existing pattern) + timestamp

---

### Phase 3: Integration

**3a. Update `MyBeats.tsx`**:
- Replace the current AI Insights Dialog (lines 2178-2210) with the new `BeatInsightModal`
- The modal calls the new `beat-health-insights` edge function instead of `generate-recommendations`
- Pass beatId and userId

**3b. Update `BeatDetail.tsx`**:
- Add an "AI Health Score" section or button that opens the same `BeatInsightModal`

**3c. Update `BeatCard.tsx`**:
- Optionally show a small health score badge on the card if cached insight exists (future enhancement)

**3d. Config**:
- Add `[functions.beat-health-insights]` with `verify_jwt = false` to `config.toml`

---

### Files Summary

| Action | File | Description |
|--------|------|-------------|
| Create | `supabase/functions/beat-health-insights/index.ts` | Edge function: data fetch, KPI calc, rule engine, health score, AI summary |
| Create | `src/components/BeatInsightModal.tsx` | New structured insight display with health score, summary, expandable data |
| Create | `src/hooks/useBeatHealthInsight.ts` | Hook to call edge function and manage loading/error state |
| Modify | `src/pages/MyBeats.tsx` | Replace AI Insights dialog with BeatInsightModal |
| Modify | `src/pages/BeatDetail.tsx` | Add health insight trigger |
| Modify | `supabase/config.toml` | Register new edge function |

### Scalability
- All heavy computation happens server-side in the edge function
- Rule engine is config-driven (thresholds as constants), not hardcoded logic
- Works identically for 20 or 10,000 retailers (queries use indexed beat_id/retailer_id)
- AI call is minimal (only summary generation from pre-computed data, not raw data analysis)

