
Goal: Make the email in `/status` profile dialog always appear in a single line, fully readable, and keep the card visually more rectangular.

1) Root-cause assessment
- Current `ProfileInfoItem` uses `break-all`, which forces awkward wrapping across lines.
- The profile details use a 2-column grid; email is constrained to half-width on `sm+`, causing line breaks.
- Dialog width is only `sm:max-w-lg`, which is still tight for long corporate email IDs.

2) UI changes to implement (single-file, targeted)
- File: `src/components/status/ActivityLoggingSection.tsx`
- Update `ProfileInfoItem` to support per-field text behavior:
  - Add optional props like `valueClassName` and `containerClassName`.
  - Replace hardcoded `break-all` with a sane default (`break-words`) for normal fields.
- Email field rendering:
  - Make Email card span full row: add `sm:col-span-2`.
  - Force single-line email text: `whitespace-nowrap`.
  - Keep it neat/readable without clipping:
    - preferred: avoid truncation entirely by giving width (`sm:col-span-2` + wider dialog),
    - fallback safety for very long IDs: add subtle horizontal scroll on value container (`overflow-x-auto`) rather than wrapping to next line.
- Dialog width:
  - Increase from `sm:max-w-lg` to `sm:max-w-2xl` (or at least `xl:max-w-3xl` if needed by design), making the profile card more rectangular and reducing wrap pressure.

3) Styling behavior after change
- Email always stays on one line.
- No hidden/truncated characters.
- Other fields keep clean wrapping behavior (no ugly character-by-character breaks).
- Overall dialog appears wider and more legible.

4) Validation checklist
- Open `/status` → Activity Logging → click user name.
- Verify long emails (including dots, underscores, long domains) display in one line.
- Confirm no truncation and no line-break into next line for email.
- Confirm dialog looks rectangular on desktop and still usable on smaller screens.
- Verify non-email fields (manager names, role, designation) remain neatly readable.

Technical notes
- No backend/schema changes required.
- No changes needed in shared `Dialog` component unless we want a global dialog width standard; this fix should remain localized to the profile card usage.
