# Poem illustration fails to load from a local Supabase stack

- Change: `add-poem-creation`
- Called from: `web-qa`
- First seen: 2026-10-29
- Limit in force: `maxFixAttempts: 2`

## Failure

Gate 3 F2: on `/account/poems/<id>` the illustration of a poem created with one is broken. The
browser's `/_next/image?url=http://127.0.0.1:54321/storage/v1/object/public/poem-illustrations/…&w=1920&q=60`
request answers 400 "url parameter is not allowed".

## Reproduce

With the local stack and `npm run dev` running, request the optimizer for an uploaded illustration:
`curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000/_next/image?url=<encoded public URL>&w=1920&q=60"`
→ `400`, twice in a row; the same public URL fetched directly → `200`.

## Attempt 1 — 2026-10-29

- Isolated to: `src/features/poems/components/PoemView/PoemView.tsx` renders `next/image` without
  `unoptimized`. Next 16 refuses to optimize images from local IPs; `AuthorPhoto` already avoids it
  with `isUnoptimizableImage` (local hosts and `blob:`), which lives inside `authors`' component folder.
- Hypothesis: the optimizer rejects the `127.0.0.1` host; the hosted Supabase URL would be optimized
  normally, so the defect shows only on the local stack, but it breaks every local poem page with an
  illustration (both the owner's and the public one).
- Expected effect: `PoemView` passes `unoptimized` for a local-host URL, so the `<img>` points straight
  at the Storage URL and loads (200); for a hosted `https://` URL it still goes through `/_next/image`.
  The helper moves to `shared/lib/image-file/` (its second consumer, architecture.md's rule) and
  `AuthorPhoto` keeps its behaviour.
- What actually happened: the public poem page for poem `ca224b82-…` now renders
  `<img src="http://127.0.0.1:54321/storage/v1/object/public/poem-illustrations/…png">`, which answers
  200; `PoemView.test.tsx` pins both cases (a local-stack URL served as is, a hosted URL through
  `/_next/image`), and the moved helper's table test runs from `shared/lib/image-file/tests/`.
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2
- Spec case: 1 regression — poem-management FR-9 already says a poem with an illustration shows it;
  the local-stack path broke it. Pinned by `PoemView.test.tsx` ("serves a local-stack illustration
  straight from Storage").
