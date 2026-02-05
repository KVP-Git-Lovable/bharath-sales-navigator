
# Update Total Quantity Styling in Productivity Section

## Problem
The "Total Quantity" and KG value in the Productivity section uses a smaller `BusinessSummaryCard` component, while "Total Order Value" uses a large gradient banner card with prominent typography. The user wants both to have consistent, prominent styling.

## Solution
Create a new gradient banner card for "Total Quantity" that matches the visual style of the "Total Order Value" banner.

## Implementation

### File to Modify
`src/components/analytics/SupervisorReport.tsx`

### Changes

#### 1. Add a New "Total Quantity" Banner Card
Create a second gradient banner card positioned next to or below the "Total Order Value" banner with matching styling:

- Background: `bg-gradient-to-r from-orange-600 to-orange-500` (using orange to match the quantity icon color theme)
- Title: `text-sm opacity-90` - "Total Quantity"
- Main Value: `text-3xl md:text-4xl font-bold` - The KG value prominently displayed
- Subtext: `text-xs opacity-75` - Date range

#### 2. Layout Options
Two banner cards side-by-side in a grid layout:
- On desktop: Two equal-width cards in a row
- On mobile: Stack vertically

#### 3. Code Structure
```tsx
{/* Two-column banner layout */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Total Order Value Banner */}
  <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg">
    <CardContent className="p-6">
      <div>
        <p className="text-sm opacity-90">Total Order Value</p>
        <p className="text-3xl md:text-4xl font-bold">
          ₹{...} Lac
        </p>
        <p className="text-xs opacity-75 mt-1">
          {date range}
        </p>
      </div>
    </CardContent>
  </Card>

  {/* Total Quantity Banner - NEW with matching style */}
  <Card className="bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg">
    <CardContent className="p-6">
      <div>
        <p className="text-sm opacity-90">Total Quantity</p>
        <p className="text-3xl md:text-4xl font-bold">
          {kg value} KG
        </p>
        <p className="text-xs opacity-75 mt-1">
          {date range}
        </p>
      </div>
    </CardContent>
  </Card>
</div>
```

#### 4. Remove from BusinessSummaryCard Grid
Remove the "Total Qty" entry from the 6-card grid since it will now be displayed in the prominent banner.

## Visual Result
- Two equally-styled banner cards at the top of the Productivity section
- "Total Order Value" in primary/blue gradient (left/top)
- "Total Quantity" in orange gradient (right/bottom)
- Both using large `text-3xl/text-4xl` fonts for values
- Consistent date range subtext
- Responsive: side-by-side on desktop, stacked on mobile
