

# Complete Hindi Translation Implementation Plan

## Problem Summary
The application has translation infrastructure set up (`i18next`) but many UI components use hardcoded English strings instead of translation keys. This results in an inconsistent experience when Hindi (or any other language) is selected.

## Scope of Changes

### What Will Be Translated
- Navigation menu items (Navbar)
- All button labels and headers
- Status labels (Planned, Pending, Productive, etc.)
- Page titles and section headers
- Dialog titles and messages
- Attendance page labels

### What Will NOT Be Translated (per user requirements)
- Retailer names (user-entered data)
- Beat names (user-entered data)
- Invoice content (must remain in English)

---

## Files to Modify

### 1. Translation Files (Add Missing Keys)

#### `src/i18n/locales/en/common.json`
Add the following new keys:

```text
nav section:
- "target": "Target"
- "targetVsActual": "Target Vs Actual"  
- "beats": "Beats"
- "institutionalSales": "Institutional Sales"
- "distributorMaster": "Distributor Master"
- "primaryOrders": "Primary Orders"
- "competitionMaster": "Competition Master"
- "gamification": "Gamification"
- "packingList": "Packing List"
- "deliveries": "Deliveries"
- "competency": "Competency"
- "recycleBin": "Recycle Bin"
- "adminControls": "Admin Controls"
- "navigation": "Navigation"

visits section:
- "autoPlan": "Auto Plan"
- "planning": "Planning..."
- "retailers": "Retailers"
- "summary": "Summary"
- "pendingVisits": "Pending Visits"
- "pointsEarned": "Points Earned"
- "recent": "Recent"

attendance section (NEW):
- "title": "Attendance"
- "subtitle": "Track your daily attendance and working hours"
- "thisMonth": "This Month"
- "presentDays": "Present Days"
- "absentDays": "Absent Days"
- "startMyDay": "Start My Day"
- "endMyDay": "End My Day"
- "dayStarted": "Day Started"
- "dayEnded": "Day Ended"
- "startingDay": "Starting Day..."
- "endingDay": "Ending Day..."
- "gpsTrackingActive": "GPS tracking active"
- "gpsTrackingWillStart": "GPS tracking will start at 9 AM"
- "marketHours": "Market Hours"
- "recentAttendance": "Recent Attendance"
- "leaves": "Leaves"
- "holidays": "Holidays"
- "tapToViewDates": "Tap to view dates"
- "noPresentDays": "No present days recorded"
- "noAbsentDays": "No absent days recorded"
- "currentMonth": "Current Month"
- "currentWeek": "Current Week"
- "lastMonth": "Last Month"
```

#### `src/i18n/locales/hi/common.json`
Add Hindi translations for all new keys:

```text
nav section:
- "target": "लक्ष्य"
- "targetVsActual": "लक्ष्य बनाम वास्तविक"
- "beats": "बीट्स"
- "institutionalSales": "संस्थागत बिक्री"
- "distributorMaster": "वितरक मास्टर"
- "primaryOrders": "प्राथमिक ऑर्डर"
- "competitionMaster": "प्रतिस्पर्धा मास्टर"
- "gamification": "गेमिफिकेशन"
- "packingList": "पैकिंग सूची"
- "deliveries": "डिलीवरी"
- "competency": "दक्षता"
- "recycleBin": "रीसायकल बिन"
- "adminControls": "एडमिन नियंत्रण"
- "navigation": "नेविगेशन"

visits section:
- "autoPlan": "ऑटो प्लान"
- "planning": "योजना बना रहे हैं..."
- "retailers": "रिटेलर"
- "summary": "सारांश"
- "pendingVisits": "लंबित विज़िट"
- "pointsEarned": "अर्जित अंक"
- "recent": "हाल का"

attendance section (NEW):
- "title": "उपस्थिति"
- "subtitle": "अपनी दैनिक उपस्थिति और कार्य घंटे ट्रैक करें"
- "thisMonth": "इस महीने"
- "presentDays": "उपस्थित दिन"
- "absentDays": "अनुपस्थित दिन"
- "startMyDay": "मेरा दिन शुरू करें"
- "endMyDay": "मेरा दिन समाप्त करें"
- "dayStarted": "दिन शुरू हुआ"
- "dayEnded": "दिन समाप्त हुआ"
- "startingDay": "दिन शुरू हो रहा है..."
- "endingDay": "दिन समाप्त हो रहा है..."
- "gpsTrackingActive": "जीपीएस ट्रैकिंग सक्रिय"
- "gpsTrackingWillStart": "जीपीएस ट्रैकिंग सुबह 9 बजे शुरू होगी"
- "marketHours": "मार्केट घंटे"
- "recentAttendance": "हाल की उपस्थिति"
- "leaves": "छुट्टियाँ"
- "holidays": "अवकाश"
- "tapToViewDates": "तारीखें देखने के लिए टैप करें"
- "noPresentDays": "कोई उपस्थित दिन दर्ज नहीं"
- "noAbsentDays": "कोई अनुपस्थित दिन दर्ज नहीं"
- "currentMonth": "वर्तमान महीना"
- "currentWeek": "वर्तमान सप्ताह"
- "lastMonth": "पिछला महीना"
```

### 2. Component Files to Update

#### `src/components/Navbar.tsx`
**Changes:**
- Replace hardcoded strings with `t()` function calls
- Navigation items with hardcoded labels:
  - Line 79: `"Visits"` → `t('nav.myVisit')`
  - Line 81: `"Target"` → `t('nav.target')`
  - Line 82: `"Target Vs Actual"` → `t('nav.targetVsActual')`
  - Line 84: `"Institutional Sales"` → `t('nav.institutionalSales')`
  - Line 85: `"Distributor Master"` → `t('nav.distributorMaster')`
  - Line 86: `"Primary Orders"` → `t('nav.primaryOrders')`
  - Line 89: `"Beats"` → `t('nav.beats')`
  - Line 90: `"Competition Master"` → `t('nav.competitionMaster')`
  - Line 92: `"Expenses"` → `t('nav.expenses')`
  - Line 97: `"Gamification"` → `t('nav.gamification')`
  - Line 102: `"Packing List"` → `t('nav.packingList')`
  - Line 107: `"Deliveries"` → `t('nav.deliveries')`
  - Line 112: `"Competency"` → `t('nav.competency')`
  - Line 113: `"Recycle Bin"` → `t('nav.recycleBin')`
  - Line 271: `"Logout"` → `t('nav.logout')`
  - Line 280: `"Admin Controls"` → `t('nav.adminControls')`
  - Line 302: `"Navigation"` → `t('nav.navigation')`

#### `src/pages/MyVisits.tsx`
**Changes:**
- Add `useTranslation` hook usage for all UI labels
- Button labels to translate:
  - Line 1228: `"Auto Plan"` / `"Planning..."` → `t('visits.autoPlan')` / `t('visits.planning')`
  - Line 1232: `"All Beat"` → `t('visits.journeyPlan')`
  - Line 1236: `"Retailers"` → `t('visits.retailers')`
  - Line 1240: `"Summary"` → `t('visits.summary')`
  - Line 1251: `"Timeline"` → `t('visits.timeline')`
  - Line 1255: `"GPS Track"` → `t('visits.gpsTrack')`
  - Line 1259: `"Van Stock"` → `t('visits.vanStock')`
  - Line 1307: `"Planned Visits"` → `t('visits.plannedVisits')`
  - Line 1311: `"Pending Visits"` → `t('visits.pendingVisits')`
  - Line 1331: `"Points Earned"` → `t('visits.pointsEarned')`
  - Line 1370-1376: Sort options `"Recent"`, `"A-Z"`, `"Z-A"` → translated

#### `src/pages/Attendance.tsx`
**Changes:**
- Import `useTranslation` from `react-i18next`
- Initialize `const { t } = useTranslation('common');`
- Replace all hardcoded strings with `t()` calls:
  - Line 961: `"Attendance"` → `t('attendance.title')`
  - Line 962: Description → `t('attendance.subtitle')`
  - Line 969: `"This Month"` → `t('attendance.thisMonth')`
  - Line 988-996: Start/End day buttons → `t('attendance.*')`
  - Line 1130: `"Present Days"` → `t('attendance.presentDays')`
  - Line 1142: `"Absent Days"` → `t('attendance.absentDays')`
  - Dialog titles and content

---

## Technical Implementation Details

### Pattern to Follow
Existing working example from MyVisits:
```typescript
const { t } = useTranslation();
// Usage:
<CardTitle>{t('visits.title')}</CardTitle>
```

### Invoice Generation Exception
The invoice utility files (`src/utils/invoiceGenerator.ts` and related) will NOT be modified. All invoice content will remain hardcoded in English as requested.

---

## Summary of Changes

| File | Type | Changes |
|------|------|---------|
| `src/i18n/locales/en/common.json` | Translation | Add ~35 new keys |
| `src/i18n/locales/hi/common.json` | Translation | Add ~35 Hindi translations |
| `src/i18n/locales/kn/common.json` | Translation | Add ~35 Kannada keys (English fallback) |
| `src/i18n/locales/ta/common.json` | Translation | Add ~35 Tamil keys (English fallback) |
| `src/i18n/locales/te/common.json` | Translation | Add ~35 Telugu keys (English fallback) |
| `src/i18n/locales/gu/common.json` | Translation | Add ~35 Gujarati keys (English fallback) |
| `src/components/Navbar.tsx` | Component | ~17 string replacements |
| `src/pages/MyVisits.tsx` | Component | ~15 string replacements |
| `src/pages/Attendance.tsx` | Component | ~25 string replacements + add hook |

---

## Expected Outcome
After implementation:
1. All navigation items will display in Hindi when Hindi is selected
2. MyVisits page buttons and labels will display in Hindi
3. Attendance page will fully support Hindi
4. Retailer/beat names remain unchanged (user data)
5. Invoices remain in English only

