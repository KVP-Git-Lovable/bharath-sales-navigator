# Push notifications for Prajwal C (PWA) — diagnosis and fix

## What the data shows

Verified in production (Supabase):

1. Prajwal C (`d63ecc6f-…cdd`) has exactly **one** registered device token — an Android Chrome/PWA web token created today at **06:41:08 UTC**. Any earlier tokens for him are gone. The only other token in the table belongs to a different user (iPhone).
2. The last push actually dispatched for him was at **05:41:12 UTC** (report "Default — Sales by user & beat"). `send-push` responded `{"sent":0}` — Firebase was never called because he had **no device token at that moment**.
3. Every notification created for him after that (five "Daily Attendance Register" rows between 06:06 and 06:41) carries `metadata.push_to_phone = false`. The `dispatch_push_for_notification` trigger returns early on that flag, so **no push request was made at all** for those.
4. `push_config` is correctly set (function URL + secret) and the trigger `notifications_push_dispatch` is present and firing — the pipeline itself is intact.

Conclusion: Firebase is not failing. For his recent notifications either no push was requested (`push_to_phone:false`) or there was no token to send to. His token now exists, so the next eligible notification should reach the phone.

## Step 1 — Confirm live delivery (no code change)

Run the existing `notify_send_test_push` for Prajwal's user id and read back the `send-push` response. Expected `{"sent":1}` plus a notification on the Android PWA. If it returns an FCM error instead, that error is the real remaining issue and gets fixed first.

## Step 2 — Fix the `push_to_phone:false` gap

The scheduled-report path stamps `push_to_phone:false` on report_delivery notifications, so report alerts never reach the phone even with a registered device. Drive the flag from the subscription's own setting instead of hard-coding it, and default to sending a push when the flag is absent.

## Step 3 — Stale token hygiene

`send-push` should delete tokens Firebase reports as `UNREGISTERED` / `INVALID_ARGUMENT`, and web/native registration should refresh `last_seen_at` on every app start so a re-issued FCM token replaces the old row rather than leaving a dead one. This explains the earlier tokens vanishing and `sent:0` responses.

## Step 4 — Visibility

Add a lightweight `push_delivery_log` row per dispatch (user, token count, FCM status, error) so "did Firebase get it?" is answerable in one query instead of digging through `net._http_response`.

## Technical notes

- Trigger: `public.dispatch_push_for_notification()` on `notifications` AFTER INSERT; early-returns when `metadata.push_to_phone = 'false'` or `metadata.actor_id = user_id`.
- Edge function: `supabase/functions/send-push/index.ts`, invoked via `pg_net` with the `x-push-secret` header.
- Report notifications are inserted by the scheduled-report function, which sets `push_to_phone` in metadata.