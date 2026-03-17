## Plan: Add descriptive notes under Activity Details metrics

Add small-font description text below each metric label in `src/components/status/LicenseDetailsSection.tsx`.

### Changes

`**src/components/status/LicenseDetailsSection.tsx**`

Update the `stats` array to include a `note` field for each metric:

- Users: "No. of unique users who logged-in to the app during this period"
- Retailers: "No. of retailers newly created during the period"
- Orders: "No. of orders newly created during this period"
- Visits: "No. of new visits created during this period"

In the render, add a `<p>` with small muted text below the existing label `<p>` to display the note.