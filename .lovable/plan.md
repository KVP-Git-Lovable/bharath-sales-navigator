

# Privacy Policy Page for QuickApp.AI

## Current State
The "Privacy Policy" link in the footer (`WebsiteFooter.tsx` line 169) points to `href="#"` — it goes nowhere. We need to create a dedicated `/privacy-policy` route with proper content.

## What We'll Build

**1. New page:** `src/pages/website/PrivacyPolicyPage.tsx`
- Uses `WebsiteHeader` and `WebsiteFooter` for consistent layout
- Professional, readable privacy policy content

**2. Route registration** in the app router

**3. Update footer link** from `href="#"` to `/privacy-policy`

## Privacy Policy Content Sections

1. **Introduction** — Who we are (QuickApp.AI / parent company), effective date, scope of policy
2. **Information We Collect**
   - Account data (name, email, phone, company)
   - Field sales data (GPS location, visit logs, orders, attendance, photos)
   - Device data (device type, OS, browser, IP address)
   - Usage analytics (feature usage, session duration)
3. **How We Use Your Information** — Service delivery, AI features, analytics, communication, security
4. **Data Sharing & Third Parties** — Supabase (hosting), Google Maps (location), WhatsApp (notifications); no selling of data
5. **Data Storage & Security** — Encryption at rest/transit, ISO 27001 compliance, Supabase infrastructure, offline data handling
6. **GPS & Location Data** — Why collected (attendance, visit verification, route optimization), when collected, user control
7. **Photo & Image Data** — Stock photos, competition photos, board scanning — processed for AI insights, retention policy
8. **Cookies & Tracking** — Session cookies, analytics, PWA storage
9. **Data Retention** — How long data is kept, deletion upon account termination
10. **Your Rights** — Access, correction, deletion, data portability, consent withdrawal (aligned with Indian IT Act & GDPR for international users)
11. **Children's Privacy** — Not intended for under-18 users
12. **Changes to This Policy** — Notification of updates
13. **Contact Us** — hello@quickapp.ai, +91 63616 80976, Bangalore, India

## Technical Details

- **New file:** `src/pages/website/PrivacyPolicyPage.tsx` — styled with Tailwind, uses prose-like layout with section headings and bullet lists
- **Router:** Add route `/privacy-policy` pointing to the new page
- **Footer update:** Change `href="#"` to `href="/privacy-policy"` (line 169 in `WebsiteFooter.tsx`)
- **DemoRequestPage:** Update privacy mention (line 401) to link to `/privacy-policy`

