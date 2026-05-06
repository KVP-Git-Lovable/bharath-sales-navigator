
## Fix

In `src/components/ActivityEventsTable.tsx` (line 349), replace the placeholder toast with navigation to the existing Event Summary page:

```tsx
onClick={() => activity.visit_id && navigate(`/event/${activity.visit_id}/summary`)}
```

The `EventSummary.tsx` page and `/event/:id/summary` route already exist from the earlier implementation — only this onClick stub was left behind.
