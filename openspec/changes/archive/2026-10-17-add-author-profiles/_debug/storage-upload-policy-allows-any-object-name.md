# The photo upload policy allows any object name inside the owner's folder

- Change: `add-author-profiles`
- Called from: `code-review` (deep review DR-05, PLAUSIBLE; the user chose to fix it, group 1, commit 434db78)
- First seen: 2026-10-15
- Limit in force: `maxFixAttempts: 2`

## Failure

The `storage.objects` insert policy checks only that the first folder segment names a profile the caller owns. Through the Storage API a user can upload any number of objects under `<own profile id>/` with any name, subfolders, `..` segments or extension (`page.html`), as long as the declared content type is PNG or JPEG. Other authors' files stay safe, but the public bucket can host arbitrary content that no profile references. The table's `photo_path` check already pins the format `<id>/<uuid>.png|jpg`; the upload path does not.

## Reproduce

Against the local stack, inside `BEGIN … ROLLBACK`: create a user and their profile, then as `authenticated` (own JWT claims) insert into `storage.objects` (`bucket_id = 'author-photos'`, `name = '<own profile id>/page.html'`).

Result: the insert succeeds. Reproduced twice in a row.

## Attempt 1 — 2026-10-15

- Isolated to: `supabase/migrations/20261015160958_author_profiles.sql`, policy "owners upload author photos".
- Hypothesis: the policy's `exists` subquery compares only `(storage.foldername(name))[1]` with the profile id and never checks the rest of the name.
- Expected effect: with the subquery also requiring `name ~ ('^' || p.id::text || '/[0-9a-f-]{36}\.(png|jpg)$')`, the reproduction's insert fails with 42501, and so do `<own id>/../x.png` and `<own id>/sub/<uuid>.png`. A correctly named upload into the own folder still succeeds (the existing positive pgTAP case) and the existing 31 cases still pass.
- What actually happened: the three new upload cases (`page.html`, dot segments, subfolder) failed against the old migration (tests 31–33) and pass after the fix; the correctly named owner upload still succeeds; 41/41 pass. The reproduction's insert now fails with `new row violates row-level security policy for table "objects"`.
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2
- Spec case: 3 no criterion covered — no requirement constrained the uploaded object's name. Added a scenario under "Database integrity under direct writes" (FR-5, added by defect fix).
- Criterion touched: `FR-5`
