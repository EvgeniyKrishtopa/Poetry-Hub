# Own poem page shows the 404 right after a create, in the dev server only

- Change: `add-poem-creation`
- Called from: `web-qa`
- First seen: 2026-10-29
- Limit in force: `maxFixAttempts: 2`

## Failure

Gate 3 F1: right after creating a poem with an illustration, `/account/poems/<new id>` showed the
not-found page («Страница не найдена») with no success notice; navigating to the same URL a few
seconds later rendered the poem. The tester's create without an illustration did not show it.

## Reproduce

A Playwright probe (session scratchpad, not in the repo): sign in as `author1@example.test`, fill the
add form, submit, wait for `/account/poems/<uuid>`, then sample the visible `main` at 0, 300, 1000 and
3000 ms and fetch the own page, `/account/poems` and the public poem page with the same cookies.

- Against the running `npm run dev` (port 3000, up about 5 hours with many hot reloads): the 404
  showed 3 of 3 runs with an illustration and 2 of 2 without one, so the illustration is not the
  trigger. 243 ms after the redirect the list and the public poem page already held the new poem
  while the own page still answered not-found; at 934 ms the own page was right. A reload showed
  the poem.
- Against `npm run build && next start -p 3100` from the same working tree: 4 of 4 runs (with and
  without an illustration) landed on the poem with «Поздравляем, Ваше произведение успешно добавлено.»
  at 300 ms and 3000 ms, and the own page was right on the first fetch (41-52 ms).

A side note from isolating it: checking pages with `curl … | grep -oE '…|Страница не найдена' | head -1`
is misleading. Every page's RSC payload carries the not-found screen's text, ahead of the streamed
content, so that grep "finds" a 404 on working pages. Check for the expected content instead.

## Attempt 1 — 2026-10-29

- Isolated to: an environment condition — the long-running dev server. The same code built for
  production has no window where the own page is stale; `updateTag` behaves as documented there
  (the next request waits for fresh data). The list and the public page, which read the same
  `poems:<authorId>` entry, were fresh in dev too, so the stale read is specific to the dev server's
  handling of `/account/poems/[poemId]` right after the action, not to the cache tag.
- Hypothesis: not a defect in this codebase; no fix attempted.
- Expected effect: none (no code change).
- What actually happened: no attempt spent.
- Verdict: —

## Outcome

- Not a defect — external cause: dev-server only; production build passes 4/4 for the same flow.
  Not verified on a freshly restarted dev server (the running one belongs to the user and was not
  restarted). If it shows on a fresh `npm run dev`, reopen this record.
- Spec case: skipped, because phase 2 ruled the cause environmental.
