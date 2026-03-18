

## Remove All Hardcoded Supabase URLs — Full Migration-Ready Fix

### Summary
7 files contain hardcoded Supabase project URLs/keys. Two different projects are hardcoded (`aoxdosjkwqyuvccuwhzc` and `etabpbfokzhhfuybeieu`). All will be replaced with environment variable references so the app works with any Supabase backend without code changes.

### Complete File-by-File Changes

**1. `src/integrations/supabase/client.ts`** — Use env vars instead of hardcoded strings
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

**2. `src/utils/storageUtils.ts`** — Derive storage prefix from env
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const STORAGE_URL_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/`;
```

**3. `src/pages/Operations.tsx`** (3 occurrences) — Replace all 3 hardcoded fallback URLs
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
// then use `${SUPABASE_URL}/storage/v1${signedUrlData.signedUrl}`
```

**4. `src/components/profile/InstagramSocialFeed.tsx`** — Fix `getStorageUrl`
```typescript
const getStorageUrl = (path: string) => {
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/social-posts/${path}`;
};
```

**5. `src/components/profile/SocialFeed.tsx`** — Fix hardcoded `etab...` URL in image src
```typescript
src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/social-posts/${post.image_url}`}
```

**6. `src/hooks/useReportVoiceChat.ts`** — Replace hardcoded `etab...` URL AND anon key (this is pointing to a completely wrong project)
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

**7. `supabase/functions/send-invoice-whatsapp/index.ts`** — Use Deno env (auto-injected by Supabase)
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const invoiceUrl = pdfUrl || `${supabaseUrl}/storage/v1/object/public/invoices/public/${invoiceNumber}.pdf`;
```

### Files NOT changed (already correct)
- `supabase/config.toml` — `project_id` is managed by Supabase CLI, leave as-is
- `.env` — already uses env vars correctly, auto-populated by Lovable
- `src/service-worker.ts` — uses `.endsWith('.supabase.co')` for route matching, not a specific project ID — correct as-is
- `src/pages/CompetencyAdmin.tsx` — contains `YOUR_PROJECT_REF` placeholder in a SQL comment, not actual code — no change needed

### Important Note on `useReportVoiceChat.ts`
This file currently points to a **completely different Supabase project** (`etabpbfokzhhfuybeieu`). After the fix, it will call edge functions (`elevenlabs-tts-stream`, `report-voice-assistant`) on the **connected** project. You need to ensure those edge functions exist on your current project, or the voice chat feature will not work. If they only exist on the other project, they need to be migrated.

### Result After This Fix
- Zero hardcoded Supabase URLs in the codebase
- Switching projects = changing `.env` values only
- Clone/remix works out of the box with any Supabase backend

