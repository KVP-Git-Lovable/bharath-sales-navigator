
# Language Selection in Profile - Implementation Plan

## Overview
Add a language preference option to the user profile page that allows users to select the display language for the Home page Menu bar and the Visits (My Visit) page. The selected language will persist in both localStorage and the user's Supabase profile.

## Current State Analysis

### Existing Infrastructure
1. **i18n Configuration**: Already set up in `src/i18n/config.ts` with support for 6 languages:
   - English (en)
   - Hindi (hi)
   - Kannada (kn)
   - Tamil (ta)
   - Telugu (te)
   - Gujarati (gu)

2. **Database Support**: The `profiles` table already has a `preferred_language` column (varchar type).

3. **LanguageSelector Component**: Exists at `src/components/LanguageSelector.tsx` but is currently a header dropdown. We need to add a similar selector to the profile page.

4. **Translation Files**: All 6 languages have translation files in `src/i18n/locales/[lang]/common.json` with keys for:
   - Navigation menu items (`nav.*`)
   - Visit page content (`visits.*`)
   - Common actions (`common.*`)
   - Retailer forms (`retailer.*`)
   - Order entry (`order.*`)

## Implementation Details

### 1. Create Profile Language Settings Component
**New File**: `src/components/profile/LanguageSettings.tsx`

This component will:
- Display current language selection with a visual indicator
- Show all 6 available languages in a card-based grid layout
- Allow users to select their preferred language
- Save the selection to both localStorage and Supabase profiles table
- Show a success toast on language change
- Include descriptive text explaining what areas are affected (Menu bar, Visits page)

UI Design:
- Section header: "Language Preferences" with a Globe icon
- Subtitle: "Choose your preferred language for the app interface"
- Grid of language cards (2 columns on mobile, 3 on larger screens)
- Each card shows: Native language name + English name
- Selected language highlighted with primary color border and checkmark

### 2. Integrate into User Profile Page
**Modify**: `src/pages/UserProfile.tsx`

Add the LanguageSettings component as a new section in the "About" tab, positioned after the "Address" section and before "Social Links".

### 3. Load User's Language Preference on App Start
**Modify**: `src/main.tsx` or `src/App.tsx`

Ensure the user's saved language preference is loaded from:
1. First check localStorage (for immediate load)
2. Then sync with Supabase profile when user is authenticated
3. Update i18n if the stored preference differs from current

### 4. Sync Language on Login
**Modify**: `src/hooks/useAuth.ts` (if exists) or create a new hook

When user logs in, fetch their `preferred_language` from the profiles table and apply it.

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/profile/LanguageSettings.tsx` | Create | New component for language selection in profile |
| `src/pages/UserProfile.tsx` | Modify | Import and add LanguageSettings component to About tab |
| `src/App.tsx` | Modify | Add language preference sync on app load when user is authenticated |

## Technical Implementation

### LanguageSettings Component Structure
```text
+------------------------------------------+
|  Language Preferences          [Globe]   |
|  Choose your preferred language          |
+------------------------------------------+
|  +------------+  +------------+          |
|  | English    |  | हिंदी      |          |
|  | English  ✓ |  | Hindi      |          |
|  +------------+  +------------+          |
|  +------------+  +------------+          |
|  | ಕನ್ನಡ      |  | தமிழ்      |          |
|  | Kannada    |  | Tamil      |          |
|  +------------+  +------------+          |
|  +------------+  +------------+          |
|  | తెలుగు     |  | ગુજરાતી    |          |
|  | Telugu     |  | Gujarati   |          |
|  +------------+  +------------+          |
+------------------------------------------+
```

### Language Change Flow
1. User taps on a language card
2. Call `i18n.changeLanguage(langCode)` to update UI immediately
3. Save to localStorage: `localStorage.setItem('preferredLanguage', langCode)`
4. If user is authenticated, update Supabase: `profiles.preferred_language`
5. Show success toast: "Language changed to [Language Name]"

### App Startup Language Sync
1. i18n loads with localStorage preference (already configured)
2. When user authenticates, fetch profile with `preferred_language`
3. If profile language differs from current i18n language, update i18n
4. Sync localStorage if needed

## UI/UX Considerations
- Language selection should be immediate (no save button needed)
- Visual feedback with checkmark on selected language
- Cards should be touch-friendly with adequate padding
- Native language name displayed prominently (for users who may not read English)
- English name as secondary text for clarity

## No Database Changes Required
The `preferred_language` column already exists in the profiles table, so no migration is needed.
