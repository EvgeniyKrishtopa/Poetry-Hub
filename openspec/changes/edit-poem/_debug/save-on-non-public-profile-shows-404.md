# A save after the profile stopped being public shows the 404 page instead of the alert

- Change: `edit-poem`
- Called from: `web-qa`
- First seen: 2026-11-04
- Limit in force: `maxFixAttempts: 2`

## Failure

FR-10 "Profile no longer public": on the edit page with a change, the author's profile stops being
public meanwhile (a name cleared), then the author saves. Expected: the failure alert «Чтобы
сохранять изменения, укажите имя и фамилию в профиле автора.» above the form, focus on it, every
value kept, URL unchanged. Observed: the page turns into the 404 screen («Страница не найдена») at
`/account/poems/<id>/edit`.

## Reproduce

1. Sign in as `author1@example.test` (local seed), create a poem, open `/account/poems/<id>/edit`,
   change the title.
2. Make the profile non-public in the local database:
   `update public.author_profiles set first_name = null where id = '10000000-0000-4000-8000-000000000001'`.
3. Click «Сохранить изменения» → the 404 screen. Restore: `set first_name = 'Мария'`.

Did not reproduce twice in a row. The second and third runs, the third repeating the first's exact
sequence (create a poem, its edit link, change, clear the name, save), both showed the alert above
the form with focus on it, the title kept, the URL unchanged, and the stored row unchanged.

What set the first run apart: a pause of more than an hour between typing the change and the save
(a session usage limit), so the local access token (1 hour) had expired by the save. Unconfirmed
hypothesis: the save's session check refreshed the token and set the auth cookies inside the Server
Action, which makes Next re-render the current page in the action's response; that re-render reads
the own poem, which `getOwnPoem` reports as not found for a non-public profile, so the page became
the 404 screen. The same re-render on a save that keeps the profile public gives the same stored
values and the same form key, so it would go unnoticed there.

Degrades acceptably: nothing was stored or uploaded, and the 404 screen is the page a fresh visit
shows for a non-public profile anyway. What is lost is the hint naming the fix and the draft.

## Outcome

- Flake — no fix attempted (1 of 3 runs; the condition that differed, an access token expiring
  between the change and the save, was not reproduced on purpose)
- Spec case: skipped, because no fix was made
- Follow-up: if it matters, reproduce it with an expired access token (for example a shorter
  `jwt_expiry` in `supabase/config.toml` for one run) before deciding on a fix
