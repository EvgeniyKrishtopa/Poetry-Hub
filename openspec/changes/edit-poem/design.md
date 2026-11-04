# Design

## Context

See proposal.md (Why). Current state the design builds on:

- `poems` follows ADR 0005: RLS plus select-only column grants, no insert/update/delete grant or
  policy. Writes go through `security definer` functions: `create_my_poem()` and
  `delete_my_poem(poem_id)`, both resolving the owner with `auth.uid()` and
  `my_author_profile_id()` (`20261028160000_poems.sql`, `20261029170000_delete_my_poem.sql`).
- The table's checks already reject a blank or over-long title or text, a malformed genre id, and
  an illustration path outside `<author_id>/<uuid>.(png|jpg)`. The `poem-illustrations` bucket lets
  the owner of a public profile upload into their own folder and lets an owner remove their own
  objects.
- `poem-management` has two write paths: `createPoemAction` → `poem-writes.ts` and
  `deletePoemAction` → `poem-delete.ts`, sharing `write-log.ts` (NFR-10 logging),
  `illustration-cleanup.ts` (best-effort file removal), and `expire-poems-tag.ts`.
- `NewPoemForm` (client, ~270 lines) holds the drafts, the browser check with `poemFormSchema`,
  the focus rules, the illustration draft (`useImageDraft`), the create call, and its outcomes.
  `IllustrationField` renders the picker, the error, the preview, and «Убрать иллюстрацию».
- `consume_write_allowance(scope)` (ADR 0007, `20261017093000_write_rate_limits.sql`) counts one
  attempt per user and scope in a fixed window: `profile_write` 10 per minute, `photo_upload` 5 per
  hour. Only `authors` calls it today, through its own DAL.
- One cached read per author, tag `poemsTag(authorId)`, serves the public author page, the public
  poem page, `/account/poems`, and `/account/poems/<id>` (author-poems NFR-4). An action that calls
  `updateTag` answers with the current route re-rendered.
- With Cache Components, Next keeps a few recently visited routes mounted in a hidden `Activity`:
  state is kept, effects are cleaned up on hide and re-run on reveal (Next docs, `cacheComponents`,
  "Navigation with Activity"). `useOneTimeValue` (shared) already handles a notice on a revealed page.
- The delete flow added the session-expired store (`shared/lib/one-time-notice`) read by `/login`,
  and the deleted-notice store read by `/account/poems`. Signing in redirects to `/`.
- No flow retries a failed write on its own; no flow detects an offline browser (the contact form
  only logs `navigator.onLine`).

## Goals / Non-Goals

Goals: an owner-only update a direct API call can't widen; one form for create and edit, not two
copies; change detection on the stored form of the values; the old illustration file never
outlives its replacement on a successful save; offline handling written once and used by three
forms; no new import direction between features.

Non-goals: optimistic concurrency between tabs, version history, automatic retries, blocking the browser's Back/Forward, offline queueing.

## Decisions

### D1 — Module layout (NFR-2, NFR-3)

```
src/app/(authorized)/account/poems/[poemId]/edit/page.tsx      # new, thin: EditPoemPage
src/app/@breadcrumbs/account/poems/[poemId]/edit/page.tsx      # new, thin: the trail (D12)

src/features/poem-management/
├── actions/
│   └── update-poem.actions.ts           # new: updatePoemAction ("use server") (D3)
├── dal/
│   ├── poem-update.ts                   # new: updateOwnPoem (D3)
│   ├── poem-edit-allowance.ts           # new: consumePoemEditAllowance (D3)
│   └── poem-writes.ts                   # uploadIllustration shared with poem-update.ts (moved as is)
├── model/
│   ├── poem-form.schema.ts              # + updatePoemInputSchema; normalizeTitle/normalizeText exported
│   ├── poem-form-values.ts              # new: PoemFormValues, IllustrationState, isPoemFormChanged (D5)
│   ├── poem-management.constants.ts     # + UPDATE_POEM_STATUS, ILLUSTRATION_CHANGE, EDIT_SEGMENT
│   ├── poem-management.types.ts         # + UpdatePoemResult, UpdateOwnPoemResult, IllustrationChange
│   ├── poem-management-messages.ts      # + EDIT_POEM_COPY, trail label (the offline text lives in ConnectionNotice only)
│   ├── poem-paths.ts                    # + editPoemPath(poemId)
│   └── created-poem-notice-ui.store.ts  # holds { poemId, kind: "created" | "saved" } (D7; name kept, see Risks)
└── components/
    ├── PoemForm/                        # new home of the shared form parts (D4)
    │   ├── use-poem-form.ts             #   drafts, browser check, change detection
    │   ├── use-poem-form-focus.ts       #   field ids, focus requests, the editor's remount key
    │   ├── PoemFormFields.tsx           #   title, text, genre, illustration
    │   ├── GenreSelect.tsx              #   moved from NewPoemForm/
    │   └── IllustrationField.tsx        #   moved; + stored illustration preview and labels (D6)
    ├── NewPoemForm/                     # create: composes PoemForm parts + createPoemAction
    ├── EditPoemForm/                    # new, client: composes PoemForm parts, the save hook, and the guard (D4, D7, D10)
    │   ├── use-save-poem.ts             #   the update call and its outcomes: stores, navigation, alert, offline (D7)
    │   └── use-leave-guard.ts           #   link-click, beforeunload, and sign-out question guard (D10)
    ├── EditPoemPage/                    # new, server: heading in the shell, Suspense (D6)
    ├── EditPoemContent/                 # new, server: session, own poem, genres, form (D6)
    ├── EditPoemButton/                  # new, server: ButtonLink to the edit page (D6)
    ├── LeaveBlockedDialog/              # new, client: the "save first" dialog (D10)
    ├── CreatedPoemNotice/               # shows the created or the saved text (D7)
    └── OwnPoemContent/                  # renders EditPoemButton next to DeletePoemButton

src/features/authors/components/
├── AuthorProfileEditor/                 # renders ConnectionNotice above the fields (D8)
├── FieldEditActions/                    # «Сохранить» disabled while offline or slow (D8)
└── FieldActions/                        # «Удалить» disabled while offline or slow (D8)

src/features/breadcrumbs/model/match-route.ts   # + the own-poem-edit match (D12)
src/features/auth/components/SignOutButton/     # calls the wrapper instead of the action (D10)
└── sign-out-with-confirmation.ts                #   client wrapper: ask, then signOutAction (D10)
src/features/auth/model/                         # + SIGN_OUT_STATUS, the wrapper's result type (D10)

src/shared/
├── lib/network/use-connection-status.ts # new: online | slow | offline as a hook (D8)
├── lib/leave-guard/leave-block.store.ts # new: Zustand, the active guard's askToLeave; askBeforeLeaving() for sign-out (D10)
├── lib/leave-guard/leave-guard.constants.ts # new: LEAVE_ANSWER (leave | stay | dismissed) (D10)
└── ui/ConnectionNotice/                 # new: the offline or slow Alert (D8)
```

Import direction is unchanged: `app → breadcrumbs → poem-management → poems → authors → auth →
shared`; `authors` takes only `shared` for the offline parts, `auth` only `shared` for the
leave-block store. `poem-management/index.ts` adds
`EditPoemPage`, `editPoemPath` and the trail label (the route file and `breadcrumbs` need them).

Why `PoemForm/` parts and not a `mode` prop on one form: the two forms differ in their action, their
outcomes (navigate after create; the guard, the change detection, and the back link on edit), and
their failure position. A flag would branch in most of the component; a hook plus a fields
component keeps the shared part shared and each form short (Gate 4's "god component" check).

Why the connection status goes to `shared/`: it has three consumers in two features (edit form, add
form, profile editor), and `authors` can't import `poem-management`. The leave guard hook has one
consumer, the edit form (`auth` reaches it only through the shared leave-block store, D10), so it stays in `poem-management` next to it (architecture.md: no `shared/`
abstraction before a second feature needs it; Gate 1 C2). It takes the allowed paths from its
caller and knows nothing about poems, so moving it later is a file move.

### D2 — The update operation in the database (NFR-1, FR-4, FR-6, FR-7, FR-10)

New migration `supabase/migrations/<ts>_update_my_poem.sql`, ADR 0005's pattern: still no update
grant or policy on `poems`.

```sql
create function public.update_my_poem(
  poem_id uuid, title text, text text, genre_id text,
  keep_illustration boolean, illustration_path text
)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  profile uuid;
  old_path text;
begin
  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  profile := public.my_author_profile_id();

  select p.illustration_path into old_path
  from public.poems p
  where p.id = update_my_poem.poem_id
    and p.author_id = profile
    and public.is_public_author_profile(profile)
  for update;
  if not found then
    return jsonb_build_object('status', 'not-found');
  end if;

  update public.poems p set
    title = update_my_poem.title,
    text = update_my_poem.text,
    genre_id = update_my_poem.genre_id,
    illustration_path = case when update_my_poem.keep_illustration then p.illustration_path
                             else update_my_poem.illustration_path end
  where p.id = update_my_poem.poem_id;

  return jsonb_build_object(
    'status', 'updated',
    'author_id', profile,
    'replaced_path', case when update_my_poem.keep_illustration then null else old_path end
  );
end;
$$;
revoke execute on function public.update_my_poem(uuid, text, text, text, boolean, text) from public, anon;
grant execute on function public.update_my_poem(uuid, text, text, text, boolean, text) to authenticated;
```

- **Owner and public profile from the session only**: no author argument. Another author's poem,
  an unknown id, and a non-public own profile all answer `not-found` (the owner's pages are a 404
  then too, FR-7 of add-poem-creation).
- **Only title, text, genre, illustration change**: `id`, `author_id`, `created_at` are not in the
  `set` list, so no call can move a poem to another author or re-date it.
- **`keep_illustration`** separates "leave it" from "set it to null" without a magic path value. A
  null flag raises (22004) instead of reading as a removal (Gate 4 CR-01, 2026-11-03).
  With `false`, `illustration_path` is the new path (replace) or `null` (remove); the table's own
  check rejects a path outside the author's folder (23514 → `unknown`).
- **`replaced_path`**: the old path when the illustration changed and there was one, so the action
  removes that file after the row no longer points at it (D3 step 10). Read under `for update`, so
  two concurrent saves can't both see the same old path as theirs to remove.
- No `poem_creations` row: an update isn't a creation (ADR 0010).

**Edit limit (FR-7).** The same migration widens `write_rate_limits.scope`'s check to
`('profile_write', 'photo_upload', 'poem_edit')` and replaces `consume_write_allowance` with the
limits list plus `('poem_edit', 10, interval '1 minute')`. One scope for every save, with or
without an upload: a replace removes the old file, so Storage use doesn't grow with saves, and 10
per minute bounds uploads and cache expiries the way `profile_write` does for profiles. The limit
is per signed-in user (`auth.uid()`), which is what "per client" means here: an address-based limit
would let one account bypass it from two networks and would block a shared network's readers.

As in ADR 0007, the limit is enforced by the action before any upload, not inside
`update_my_poem`: what it protects is the cache expiry and the upload, which only the action does.
A direct `update_my_poem` call can change only the caller's own poem and expires nothing. ADR
0007's scope list gains `poem_edit` (a status-line note, not a new ADR).

Down migration (header comment, never auto-run): drop `update_my_poem`, restore the previous
`consume_write_allowance` body, delete `poem_edit` rows, and restore the scope check.

### D3 — Update DAL and action (FR-4 – FR-10, NFR-5)

`dal/poem-edit-allowance.ts`: `consumePoemEditAllowance(): Promise<{ ok: true } | { ok: false;
failure: "too-many-saves" | ServiceFailure }>` — the RPC with `scope: "poem_edit"`, a boolean
parse, `write-log.ts` logging. Its own module, not `authors`' `consumeWriteAllowance`: that one maps
its scopes to profile failure kinds and isn't in `authors`' public API; exporting it would tie the
two features' failure types together for ten lines.

`dal/poem-update.ts` (server-only, cookie client) owns "upload, write the row, remove the new
upload if the row wasn't written", as `createOwnPoem` does for create, so the two write paths keep
one cleanup rule per layer (Gate 1 P1):

```ts
type UpdateOwnPoemInput = {
  authorId: string; poemId: string; title: string; text: string; genreId: string | null;
  illustration: { kind: "keep" } | { kind: "remove" } | { kind: "replace"; file: PoemIllustration };
};
type UpdateOwnPoemResult =
  | { ok: true; status: "updated"; replacedPath: string | null }
  | { ok: true; status: "not-found" }
  | { ok: false; failure: ServiceFailure };
updateOwnPoem(input: UpdateOwnPoemInput): Promise<UpdateOwnPoemResult>
```

Inside: `replace` → `uploadIllustration` (from `poem-writes.ts`); an upload failure returns the
failure and calls no RPC. Then `update_my_poem` with `keep_illustration = kind === "keep"` and the
new path or `null`; a Zod parse of the answer. Anything but `updated` with a new upload → the upload
removed best-effort, then the result. The answer's `author_id` is checked against `input.authorId`
(a mismatch is `unknown` and logged), so the action expires the tag of the author it already
resolved.

`updatePoemAction` (next-safe-action, `updatePoemInputSchema` = `{ poemId: string, title: string,
text: string, genreId: string, illustrationChange: "keep" | "remove" | "replace", illustration?:
File }`, types only), in order — the create action's order with the limit where create has its
own:

1. `poemId` not a lowercase-hex UUID → `{ status: "not-found" }`, nothing else runs.
2. Field rules (`poemFormSchema`) → `invalid` with field errors; `replace` without a non-empty file
   → `invalid` on `illustration` with «Обязательное поле.» (`POEM_FIELD_ERRORS.required`; only a
   bypassed form sends it, so no new copy, decided 2026-11-03), reported together with any field-rule
   errors. Nothing counted.
3. Session (`getSessionState`): `signed-out` → `failed: unauthenticated`; `unknown` →
   `failed: unavailable`.
4. `consumePoemEditAllowance()` → `failed: too-many-saves` or the failure. From here every attempt
   has counted, as in the profile editor.
5. `getOwnPublicAuthor()`: the upload folder and the cache tag. A read failure → `failed` with its
   kind. Not public → `failed: not-public`: the edit page is a 404 for a non-public profile, so
   only a profile changed in another tab gets here; «Произведение уже удалено.» would be false
   (Gate 1 P2), so the alert names the fix instead (spec-clarify, 2026-11-03).
6. Genre check (the create action's `checkGenre`, moved to a module both actions use): genres
   can't be read → `failed: unavailable`; the genre is no longer listed → `invalid` on `genreId`.
7. `replace` → the create action's `checkIllustration` (size and sniffed type) → `invalid` on
   `illustration`.
8. `updateOwnPoem(...)` (above): an upload failure → `failed` with its kind, no row touched;
   `not-found` → `not-found`; any other failure → `failed` (a rejected JWT classifies as
   `unauthenticated`).
9. `updated` → `expirePoemsTag(authorId)`; then `replacedPath !== null` →
   `removeIllustrationBestEffort(replacedPath)`. Neither failure changes the result.
10. Return `{ status: "saved" }`.

Every failure after step 4 has counted one attempt; that is the profile editor's rule, and the
limit message says when the author can try again.

```ts
type UpdatePoemResult =
  | { status: "saved" }
  | { status: "invalid"; fieldErrors: PoemFieldErrors }
  | { status: "not-found" }
  | { status: "failed"; failure: ServiceFailure | "too-many-saves" | "not-public" };
```

Why the old file after the row: the delete flow's reason — a row pointing at a removed file shows a
broken image; a leftover file only costs storage. Why upload before the row: the row must never
point at a file that isn't there.

Logs: `write-log.ts`, operation names `check edit limit`, `update poem`, `upload illustration`,
`remove illustration` — operation and kind only (NFR-5).

### D4 — One form for create and edit (NFR-3)

`NewPoemForm`'s logic splits into:

- `use-poem-form.ts` (`usePoemForm(initial: PoemFormValues, genres)`): the four drafts, the genre
  options (with the "genre removed" pruning), the illustration state (D6), field errors, focus
  requests and their effect, `validate()` (the browser check), `showFieldErrors`, `focusAlert`, and
  `isChanged` (D5). It holds no action and no navigation.
- `use-poem-form-focus.ts` (`usePoemFormFocus`, review of group 3): one responsibility split out of
  `usePoemForm` — the field ids, the focus request and its effect, and the editor's remount key. It
  holds no field values. `usePoemForm` composes it and returns everything only the markup needs
  (field ids, editor and picker keys) as one `rendering` object, apart from the form's data.
- `PoemFormFields.tsx`: renders title, `MarkdownEditor`, `GenreSelect`, `IllustrationField` from
  the hook's values, with the picker labels as props.
- `NewPoemForm`: `usePoemForm(EMPTY_VALUES)`, the fields, the failure alert above the submit
  button (unchanged), the create call and its outcomes (unchanged). Its existing tests stay as
  they are and must stay green in the same group (no behaviour change).
- `EditPoemForm`: `usePoemForm(stored)`, `useSavePoem` (the update call and every outcome, D7),
  `useLeaveGuard` (D10), and rendering only: the offline notice and the failure alert above the
  form, the fields, then «Сохранить изменения» with «Отменить изменения», or the back link (D5), and
  `LeaveBlockedDialog`.
  The outcomes live in the hook so the component stays a composition (Gate 1 P4).

### D5 — Change detection (FR-3)

`model/poem-form-values.ts`:

```ts
interface PoemFormValues { title: string; text: string; genreId: string; illustration: IllustrationState }
type IllustrationState =
  | { kind: "stored"; url: string }        // the poem's illustration, untouched
  | { kind: "none" }                       // no illustration (never had one, or removed)
  | { kind: "new"; draft: ImageDraft };    // a newly picked file
function isPoemFormChanged(stored: PoemFormValues, draft: PoemFormValues): boolean
```

Changed when any of: `normalizeTitle(draft.title) !== normalizeTitle(stored.title)`;
`normalizeText(...)` differs the same way (the exact transforms of `poemFormSchema`, exported, so
"what would be stored" has one definition); `draft.genreId !== stored.genreId`; or the illustration
state's kind differs from the stored one (`stored` → `none` or `new`; `none` → `new`). A newly
picked file always counts as a change, even if its bytes match the stored file: the browser can't
compare them without downloading it, and re-uploading the same picture is harmless. A file the
picker rejected doesn't count (its error shows and the form can't be sent anyway, FR-5).

`isChanged` is derived on every render, never stored. While `false`: the submit button is not
rendered and a `ButtonLink` «Вернуться на страницу произведения» to `ownPoemPath(poemId)` is in its
place. While `true`: «Сохранить изменения» (`type="submit"`) and a `ghost` «Отменить изменения»
are there instead. While sending, the save button stays and reads «Сохранение…», and the discard
button is disabled with the rest of the fieldset.

**Discard (spec-clarify, 2026-11-03).** `usePoemForm` exposes `reset()`: drafts back to `initial`,
field errors and the failure cleared, the illustration back to the initial state (the `stored`
preview needs no file, only its URL), the editor and picker keys bumped so the textarea and the
file input forget their own state. No request, no confirmation: nothing on the server changes. The
form is unchanged right after, so focus goes to the back link that replaces the buttons (a focus
request the hook already knows how to run).

### D6 — Edit page and stored values (FR-1, FR-2, FR-4)

- `EditPoemButton` (server): a `ButtonLink` (default `primary` variant) «Редактировать
  произведение», `href={editPoemPath(poemId)}` — a link, since it only navigates. `OwnPoemContent` renders it
  and `DeletePoemButton` in one wrapping row with an 8 px gap, edit first.
- `EditPoemPage` (server): `<h1>` «Редактирование произведения» in the static shell, then
  `Suspense` with `NewPoemSkeleton`'s form skeleton (renamed `PoemFormSkeleton`).
- `EditPoemContent` (server): `requireSession()` (unknown → `SessionUnavailableAlert`);
  `getOwnPoem(id)`: `not-found` → `notFound()`, `unavailable` → throw (the route's `error.tsx`), the
  owner's poem page's rules; `listPoemGenres()`: failure → the add page's genres alert, no form.
- Stored values: title and text as stored; genre `NO_GENRE` for `null`, the id when it is in the
  current genre list, otherwise `GENRE_PLACEHOLDER` («—»), so the author must pick a genre to save
  (the create rule: a genre that no longer exists can't be chosen). Illustration
  `{ kind: "stored", url }` or `{ kind: "none" }`.
- The form is keyed by a digest of the stored values (`sha-256` of title, text, genre, illustration
  url, computed in `EditPoemContent`). The action's re-render after a save brings new stored values,
  so the form remounts fresh and unchanged instead of comparing an old draft against new values.
- `IllustrationField` gains: a `stored` preview (`next/image` of the public URL, 16:9 like the
  draft preview); picker label «Заменить иллюстрацию» while any preview shows, «Выбрать
  иллюстрацию» otherwise; remove label as a prop — «Убрать иллюстрацию» on create (unchanged),
  «Удалить иллюстрацию» on edit, for a stored and a newly picked file alike. Removing a new file
  ends in `{ kind: "none" }`, not back at the stored one.
- **Labels per form (group 3, 2026-11-03).** The three button texts are one `IllustrationLabels`
  prop (`choose`, `replace`, `remove`), so the «Заменить» rule applies only where a form asks for
  it: the add form passes «Выбрать иллюстрацию» for both picker texts and keeps «Убрать
  иллюстрацию», so it shows no visible change (group 3's promise). The edit page's order (preview
  above the picker row, «Удалить» beside the picker, ui-plan) is added with `EditPoemForm` in
  group 5; until then the field keeps the add form's order.
- **Decided in group 5 (group 3 review, CR-01; 2026-11-04).** With a stored illustration, a
  rejected new pick shows the stored preview, the error, and «Удалить иллюстрацию». That button
  does what it says: it clears the error and removes the stored illustration too
  (`removeIllustration` unchanged), as FR-4 reads. The author gets it back with «Отменить
  изменения», which the removal makes available. Rejected alternative: a first press that only
  clears the error, which would make the button's effect depend on an error it doesn't name. An
  `EditPoemForm` test covers it. The add form is not affected (it starts with no illustration).
- **`usePoemForm(initial, genres, isPending)` (group 3).** The hook takes the caller's sending
  state as a third argument: focus waits for the fieldset to be enabled again, and the sending
  state belongs to the form that owns the action. It is generic over the form's failure type, so
  each form's alert map stays exhaustive.

### D7 — Outcomes and the saved notice (FR-6, FR-8, FR-9, FR-10)

`useSavePoem({ poemId, form, startTransition, connection })`: `submit()` keeps the create form's guard order (in-flight ref, clear the alert, browser
check, recheck the new file), then `updatePoemAction` in the form's own `useTransition` (group 5:
`usePoemForm` needs the pending state before the hook exists, so the form owns the transition and
the live connection status and passes both in); the fieldset is disabled and dimmed while pending.

| Result | Client |
| --- | --- |
| `saved` | `setPoemNotice({ poemId, kind: "saved" })`, `router.push(ownPoemPath(poemId))` |
| `invalid` | field errors, focus on the first (the create form's rules, incl. the removed genre) |
| `not-found` | `setDeletedNotice({ kind: "already-deleted" })`, `router.replace(POEM_MANAGEMENT_PATH)` |
| `failed: unauthenticated` | `markSessionExpired()`, `router.replace(SIGN_IN_PATH)`, `router.refresh()` (the delete flow's D4) |
| `failed: too-many-saves \| not-public \| unavailable \| unknown`, no data | alert above the form with that failure's text, focus on it, values kept |
| call rejected while the latest connection status is `offline` | the offline notice (D8), values kept, no alert |

- `push`, not `replace`, after a save: Back from the poem page returns to the edit page, which the
  re-render has already reset to the saved values (D6 key), so it shows the back link.
- The created-notice store becomes `{ poemId, kind: "created" | "saved" }` (one store, one
  component, two texts) rather than a second store and component for the same "once on this poem's
  page" behaviour. The poem page is usually a revealed `Activity` page here; `useOneTimeValue`
  already re-reads the store on reveal (delete-poem D5, Gate 1 P1).
- No automatic retry (D9): the alert stays until the next submit, and «Сохранить изменения» stays
  enabled.

### D8 — Offline and slow connection (FR-11)

`shared/lib/network/use-connection-status.ts` (spec-clarify, 2026-11-03: one custom hook in
`shared/`, its value read by each form component):

```ts
type ConnectionStatus = "online" | "slow" | "offline";
function useConnectionStatus(): ConnectionStatus
```

- `offline`: `navigator.onLine === false` (the `online` / `offline` window events).
- `slow`: online, and the browser's own estimate (`navigator.connection`, the Network Information
  API) reports `effectiveType` in `SLOW_EFFECTIVE_TYPES` (`"slow-2g"`, `"2g"`) or `rtt` above
  `SLOW_RTT_MS` (1000), re-read on its `change` event. Where the API doesn't exist (Safari,
  Firefox), the status is never `slow`; no probe requests are made (spec-clarify, 2026-11-03).
- `online` otherwise. The server snapshot is `"online"` (pages render online, the client corrects
  it after hydration). One `useSyncExternalStore` over both event sources; the thresholds are named
  constants in `shared/lib/network/network.constants.ts`.

`shared/ui/ConnectionNotice`: an `Alert tone="neutral"` (`role="status"`) taking the status: the
offline text for `offline`, the slow text for `slow`, nothing for `online`. The two texts live
there only (Gate 1 P3).

- Edit form and add form: the notice sits above the form; the submit button is `disabled` while the
  status isn't `online` (the fields stay editable, so nothing typed is lost). The edit form's back
  link and «Отменить изменения» are not affected (they need no request).
- Profile editor: one notice above the fields in `AuthorProfileEditor`; `FieldEditActions`'
  «Сохранить» gets `disabled={!canSave || status !== "online"}`, and `FieldActions`' «Удалить» is
  disabled the same way (spec-clarify, 2026-11-03: every profile button that sends a request).
  «Изменить» and «Отмена» stay as they are.
- A save already sending when the status turns `slow` or `offline` is not cancelled; it finishes or
  fails on its own.
- A call that rejects (`fetch` failed) while the latest `useConnectionStatus()` value is `offline`
  shows no alert. `useSavePoem` and `NewPoemForm` take that value from the hook and keep the latest
  one in a ref, read when the rejection is handled (the transition's closure holds the value from
  the render that started it); no module outside `shared/lib/network` reads `navigator.onLine`
  or `navigator.connection` (Gate 2 C2). The notice is the live `useConnectionStatus()` value only, so it goes
  when the connection returns and no "failed while offline" state is kept (spec-clarify,
  2026-11-03). A rejection while online (slow or not) shows the `unknown` alert.

### D9 — Retries (FR-8)

Existing flows, checked: create — no retry, because a lost response after a stored poem would
create a duplicate; delete — no retry, the dialog shows the failure and the author confirms again;
profile editor — no retry, the error shows under the field; contact — no retry. Only Supabase's own
auth client retries a session read internally.

Edit follows them: no automatic retry. A save is idempotent for title, text, genre, and "keep", but
a `replace` uploads a new file on every attempt (removed again on failure) and every attempt counts
against the limit; a silent retry loop would spend the author's 10 attempts unseen. The author
retries with the same button; values stay; the limit message says when.

### D10 — Leave guard (FR-13)

`components/EditPoemForm/use-leave-guard.ts` (poem-management):

```ts
function useLeaveGuard(options: {
  active: boolean;                          // EditPoemForm passes (isChanged || isPending) && !saved
  isAllowed: (pathname: string) => boolean; // the poem page and the edit page
  onBlocked: () => void;                    // opens LeaveBlockedDialog, link form
  askToLeave: () => Promise<LeaveAnswer>;   // opens LeaveBlockedDialog, sign-out form
  closePrompt: () => void;                  // closes the dialog, either form, on the guard's cleanup
}): void
```

While `active`, an effect adds:

- a `click` listener on `document` in the capture phase: for a primary-button click without
  modifier keys on an `<a href>` that is same-origin, has no `target`/`download`, and whose
  pathname isn't allowed → `preventDefault()` + `stopPropagation()` (so `next/link`'s handler never
  runs) and `onBlocked()`. Every link in the header, footer, breadcrumbs, and page body is covered
  at once, with no change to the components that render them.
- a `beforeunload` listener that calls `preventDefault()`: the browser shows its own confirmation
  on close, reload, or a typed address; its text is the browser's, and leaving stays possible.

The guard stays on while a save is sending (spec-clarify, 2026-11-03): leaving mid-save would
let the arriving `saved` result pull the author back to the poem page, and a tab closed mid-save
would leave them unsure whether it was stored. `useSavePoem` sets `saved` on a `saved` result
before `router.push`, so the guard is off for its own navigation; a failure keeps the form changed,
so the guard stays on. The hook lives in `components/EditPoemForm/use-leave-guard.ts` (D1). Both listeners are removed when `active` turns false and when the edit page is hidden by `Activity` (effects
clean up on hide), so a hidden edit page never guards another page.

Rejected: `<Link onNavigate>` — the supported Next API, but it would need a shared "unsaved"
flag read by every link component in four features. A native capture listener (laziness ladder
rung 3) does the same for every anchor from one place.

**Sign-out (spec-clarify, 2026-11-03; revised in the PR #168 review, 2026-11-03: confirm instead
of refuse).** «Выйти» is a button in `auth`, so the link listener can't see it, and `auth` can't
import `poem-management`. A tiny Zustand store in `shared/lib/leave-guard/leave-block.store.ts`
holds `{ askToLeave: (() => Promise<LeaveAnswer>) | null; setAskToLeave }` (the raw registration)
and exports `askBeforeLeaving(): Promise<LeaveAnswer>` — the safe call: the registered answer, or
`leave` when no guard is registered. Askers use only `askBeforeLeaving()`; only `useLeaveGuard`
registers. `LeaveAnswer` is one of the three values of `LEAVE_ANSWER` in
`shared/lib/leave-guard/leave-guard.constants.ts` (spec-clarify, 2026-11-03):

- `leave` — the author pressed «Выйти без сохранения»;
- `stay` — the author pressed «Продолжить редактирование», ×, or Escape; the asker puts focus back
  on its own control;
- `dismissed` — the page took over the question and focus (the guard's cleanup, or a save failure
  that arrived while the dialog was open, after the author closes it); the asker leaves focus alone.
`useLeaveGuard` registers there while active and clears it (only if still its own) on inactive,
hide, and unmount, like the listeners.

**One pending question, never left hanging (Gate 1, PR #168 review).** The registration
`useLeaveGuard` puts in the store wraps the form's `askToLeave` and keeps at most one pending
question. Its cleanup (inactive — e.g. a `saved` result arriving while the dialog is open — hide
by `Activity` after Back/Forward, unmount) answers a pending question `dismissed` and always calls
`closePrompt()`, which closes the dialog in either form (spec-clarify, 2026-11-03: the link form
too), so no dialog reappears over a returning edit page and «Выйти» never waits on a hidden page.
A second question while one is pending answers the first `dismissed`. Only `leave` signs out:
nothing signs out without a visible choice.

**A save failing while the dialog is open (spec-clarify, 2026-11-03).** The dialog stays open; the
failure alert renders behind it. When the author closes the dialog (either form, any way but
«Выйти без сохранения»), `EditPoemForm` focuses the failure alert instead of the usual target, and
a pending sign-out question is answered `dismissed`, so `SignOutButton` doesn't take focus back.

The check sits in a client wrapper around the server action, not in the button and not in the
action: `auth/components/SignOutButton/sign-out-with-confirmation.ts` (beside its only caller, as
`EditPoemForm/use-save-poem.ts`; never in `actions/`, which holds `"use server"` modules only —
there the store read would run on the server, see nothing, and skip the guard) exports
`signOutWithConfirmation(send: () => void)`. It awaits `askBeforeLeaving()` and runs `send` only on
`leave`, answering an explicit union `{ status: "sent" } | { status: "stayed" } | { status:
"dismissed" }` (from `leave`, `stay`, `dismissed`). `SIGN_OUT_STATUS`
lives in `auth/model/auth.constants.ts`, the result type in `auth/model/auth.types.ts`.
`SignOutButton` passes its existing send step as `send`: `startSignOut` around `signOutAction()`
with its current `try/catch` and failure state, so a rejected call stays the button's own failure
path, not the wrapper's. The button is therefore disabled only while the request is sending,
never while the question is open (Gate 1, PR #168 review). On `stayed` (only) `SignOutButton`
focuses its own button through a ref, and leaves focus alone on `dismissed`, as `DeletePoemButton`'s `openerRef` does: native `<dialog>`
focus restoration is not relied on (Safari doesn't focus a clicked button, and jsdom stubs the
dialog, so only an explicit `focus()` is testable; Gate 1 third pass). The server action can't make the check itself: the
unsaved draft lives only in the browser, so the server would only repeat a flag the client sent
(rejected, PR #168 review). `EditPoemForm` implements `askToLeave` by opening `LeaveBlockedDialog`
in its sign-out form and resolving with the author's choice, and `closePrompt` by closing it.

After «Выйти без сохранения» the dialog is closed and `signOutAction` runs. On success the server
tree refreshes as signed out. On failure (`{ ok: false }`, a `serverError`, or a rejected call)
`SignOutButton` shows `SIGN_OUT_FAILED_MESSAGE` (`role="alert"`, announced) exactly as on any other
page, and the form keeps its draft with the guard still on. Focus after a failed sign-out is the
button's existing behaviour, unchanged by this change.

The store holds a callback, no data; two features use it, so it sits in `shared/` beside the
session-expired store's precedent (state-management.md gets one line). The hook itself stays in
`poem-management`. A save already sending when the author confirms is not cancelled (as in D8);
Next runs one client's Server Actions one after another, so the sign-out runs after the save
returns: a `saved` result first navigates to the poem page, and the sign-out's refresh then finds
no session there, so the author lands on `/login` (web-qa and any recorded scenario expect that).

Not covered, by decision: the browser's Back/Forward (a `popstate` can't be cancelled; the draft
stays in the hidden page, FR-12), programmatic navigations (a session-expired redirect), and
leaving from the poem page while a draft is hidden on the edit page (the guard lives on the edit
page only; spec-clarify, 2026-11-03).

`LeaveBlockedDialog` (client): the shared `Dialog`, title «Есть несохранённые изменения», in one
of two forms (a `reason: "link" | "sign-out"` prop):

- link: body «Сначала сохраните изменения.», one button «Продолжить редактирование» that closes it;
- sign-out: body «Если выйти сейчас, изменения пропадут.», «Продолжить редактирование» (primary,
  focused, answers "stay") and «Выйти без сохранения» (danger, answers "leave"); the corner ×
  and Escape answer "stay".

Focus is set by hand on close, not left to the native `<dialog>`, and one place picks the target:
`EditPoemForm` (not `LeaveBlockedDialog`) saves `document.activeElement` before opening the link
form and, in the dialog's close handler, focuses the failure alert if a save failed while it was
open, or that saved element otherwise; for the sign-out form
`SignOutButton` focuses «Выйти» on a `stayed` answer (see Sign-out above). A save failure that
arrived while either form was open takes precedence: focus goes to the failure alert. `EditPoemForm` resolves `askToLeave` from the dialog's close handler, as
`DeletePoemButton`'s `handleClosed`, so the ref focus runs after the native close, never before it.

### D11 — Kept draft and freshness (FR-12, FR-14)

- FR-12 needs no code: the edit route is its own page, so Next's route `Activity` keeps the form's
  state when the author goes to the poem page and comes back, as long as the route is among the
  recently visited ones Next keeps. The leave guard keeps the author from visiting other pages while
  changed, so in the guarded case only the poem page lies between. A reload starts fresh. web-qa
  checks both link and Back/Forward round trips.
- FR-14: one `updateTag(poemsTag(authorId))` covers the public poem page, the public author page's
  list (a changed title), `/account/poems`, and the owner's poem page. The author's tab reads the
  fresh page after `router.push`; another browser's router cache shows the old page until it
  reloads (the create and delete flows' accepted limit).

### D12 — Breadcrumb trail (FR-15)

`matchOwnPoemRoute` accepts `[poemId]` and `[poemId, EDIT_SEGMENT]` (`"edit"`), the latter as
`{ kind: "own-poem-edit", poemId }`. Its trail: «Мастерская поэта» › «Управление произведениями» ›
`<title>` (link to `ownPoemPath`) › «Редактирование» (current). The title read is the same
`getOwnPoemTitle` the poem page's trail uses; not found → no trail. `EDIT_SEGMENT` and the label
come from `@/features/poem-management`'s index.

### D13 — Testing

- pgTAP (`poems.test.sql`): no role can `update poems` directly; anon can't execute
  `update_my_poem`; the owner's call changes title, text, genre and keeps `id`, `author_id`,
  `created_at`; `keep_illustration = true` keeps the path; `false` with `null` clears it and
  answers `replaced_path`; `false` with a new path in the own folder replaces it; a path in another
  author's folder is rejected; another author, an unknown id, and a non-public own profile get
  `not-found` and nothing changes. `write_rate_limits.test.sql`: `poem_edit` allows 10 per minute
  and blocks the 11th; the other scopes are unchanged.
- Vitest: `isPoemFormChanged` (each field, trimming-only edits, illustration kinds);
  `updatePoemInputSchema` and the UUID guard; `updateOwnPoem` (statuses; `keep` and `remove` upload
  nothing; an upload failure calls no RPC; the upload removed on `not-found` or an RPC failure;
  error classes; NFR-5 log content); `consumePoemEditAllowance`; the action (D3 order: nothing
  counted before step 4; no upload, Contentful call, or file read over the limit; own-profile read
  failure → `failed`, not public → `failed: not-public`; genres unavailable → `failed: unavailable`;
  upload failure → `failed` with the row untouched and no tag expired; tag before the old file;
  old-file failure still `saved`); `useSavePoem` (each outcome); `usePoemForm`; `EditPoemForm` (save and discard buttons vs link, discard restoring
  every field, each outcome's store and navigation, alert position and focus, offline and slow
  disable, guard activation incl. while sending); `NewPoemForm` tests unchanged plus the offline
  and slow rule; `IllustrationField` labels and stored preview; `useConnectionStatus`;
  `useLeaveGuard` in poem-management (allowed and blocked paths, modifier clicks, external links, `beforeunload`,
  removal on inactive); `LeaveBlockedDialog` in both forms; the leave-block store,
  `signOutWithConfirmation` (no guard → sent; stay → nothing sent; leave → sent once), the guard's
  pending question (answered `dismissed` and `closePrompt` called on inactive, hide, and unmount;
  a second question answers the first `dismissed`), and `SignOutButton` through the wrapper
  (enabled while the question is open; stayed: nothing sent, no alert, focus on «Выйти»;
  dismissed: nothing sent, focus left where it is; leave then failure: the alert, as today); a
  save failing while the dialog is open → focus on the failure alert after close; `CreatedPoemNotice` both texts; `FieldEditActions` and `FieldActions` offline and
  slow; `matchRoute` for the edit path.
- web-qa (Gate 3): edit each field and save; trimming-only edit keeps the back link; replace and
  remove the illustration (and the old file is gone); limit (11 saves in a minute); failure
  (database stopped); session expired (cookies cleared); poem deleted in a second tab; offline
  (DevTools offline) and slow (DevTools throttling to a 2G-class profile, Chromium) on the edit form,
  the add form, and the profile editor, with profile «Удалить» disabled too; «Отменить изменения»
  restoring every field and the illustration; draft kept over link and Back/Forward round trips; a
  header link blocked with the dialog; «Выйти» asking first, staying on «Продолжить
  редактирование» (keyboard: focus back on «Выйти» after it and after Escape) and signing out on
  «Выйти без сохранения»; a link click while a save is sending blocked;
  the profile no longer public at save time; reload shows the browser confirmation; public pages
  fresh after a reload; a recorded scenario for the happy path.

### Sequence diagrams

Save (form changed, «Сохранить изменения» pressed):

```mermaid
sequenceDiagram
  actor A as Author (browser)
  participant F as EditPoemForm (client)
  participant PX as proxy (session refresh)
  participant ACT as updatePoemAction
  participant AU as auth getSessionState
  participant DB as Supabase (cookie client)
  participant CF as Contentful genres (cached)
  participant ST as Storage poem-illustrations
  participant NC as Next cache
  A->>F: «Сохранить изменения»
  F->>F: browser check; invalid → field errors, stop
  F->>F: pending: «Сохранение…», fieldset disabled, guard stays on
  F->>PX: POST server action { poemId, fields, illustrationChange, file? }
  alt request rejected (network)
    F-->>A: offline notice if the latest connection status is offline, else unknown alert
  else request reaches the server
  PX->>ACT: forward with refreshed cookies
  alt poemId malformed
    ACT-->>F: not-found
  else fields invalid
    ACT-->>F: invalid (nothing counted)
  else
    ACT->>AU: getSessionState()
    alt signed-out / unknown
      ACT-->>F: failed: unauthenticated / unavailable
    else signed-in
      ACT->>DB: rpc consume_write_allowance('poem_edit')
      alt over the limit or error
        ACT-->>F: failed: too-many-saves / classified
      else allowed
        ACT->>DB: own public author (upload folder, tag)
        alt read fails
          ACT-->>F: failed: classified
        else not public (changed in another tab)
          ACT-->>F: failed: not-public
        else public
          ACT->>CF: genre still listed?
          alt genres can't be read
            ACT-->>F: failed: unavailable
          else genre gone
            ACT-->>F: invalid (genreId)
          else genre ok
            opt replace
              ACT->>ACT: check size and sniffed type
            end
            alt file rejected
              ACT-->>F: invalid (illustration)
            else file ok or no file
              opt replace (updateOwnPoem)
                ACT->>ST: upload <authorId>/<uuid>.<ext>
              end
              alt upload fails
                ACT-->>F: failed: classified (row untouched, no tag expired)
              else uploaded or no upload
                ACT->>DB: rpc update_my_poem(...)
                alt not-found or error
                  opt a file was uploaded
                    ACT->>ST: remove new file (best-effort)
                  end
                  ACT-->>F: not-found / failed
                else updated
                  DB-->>ACT: { author_id, replaced_path }
                  ACT->>NC: updateTag(poemsTag(author_id))
                  opt replaced_path
                    ACT->>ST: remove old file (failure logged only)
                  end
                  ACT-->>F: saved (+ edit route re-rendered: form remounts fresh)
                end
              end
            end
          end
        end
      end
    end
  end
  end
  alt saved
    F->>F: setPoemNotice({ poemId, saved })
    F->>A: router.push(/account/poems/<id>) → «Изменения сохранены.»
  else not-found
    F->>A: router.replace(/account/poems) → «Произведение уже удалено.»
  else failed: unauthenticated
    F->>A: router.replace(/login) → «Сессия истекла. Войдите снова.»
  else other failure
    F->>A: alert above the form, focus on it, values kept
  end
```

Leaving with unsaved changes:

```mermaid
sequenceDiagram
  actor A as Author (browser)
  participant D as document (capture listener)
  participant G as useLeaveGuard (EditPoemForm)
  participant L as next/link handler
  participant W as window (beforeunload)
  participant S as signOutWithConfirmation (auth, client)
  participant X as signOutAction (server)
  Note over G: active while the form differs from the stored poem
  A->>D: click on a header link to /authors
  D->>G: pathname allowed?
  alt the poem page or the edit page
    D->>L: click goes on → client navigation
  else any other page
    G->>D: preventDefault + stopPropagation
    G-->>A: LeaveBlockedDialog «Есть несохранённые изменения»
  end
  A->>W: close tab / reload / typed address
  W-->>A: browser's own leave confirmation (leaving stays possible)
  A->>S: «Выйти» (SignOutButton → signOutWithConfirmation)
  S->>G: askBeforeLeaving() via the leave-block store («Выйти» stays enabled)
  G-->>A: LeaveBlockedDialog, sign-out form
  alt «Выйти без сохранения»
    G-->>S: leave (dialog closed)
    S->>X: send(): SignOutButton's startSignOut → signOutAction() («Выйти» disabled while sending)
    alt { ok: true }
      X-->>A: refresh() → header shows «Войти», signed out
    else { ok: false }, serverError, or a rejected call
      X-->>A: SignOutButton shows the failure as on any page; form and guard unchanged
    end
  else «Продолжить редактирование», × or Escape
    G-->>S: stay → nothing sent, form kept
    S-->>A: SignOutButton focuses «Выйти» (ref)
  else the save failed while the dialog was open, then the author closes it
    G-->>S: dismissed → nothing sent, form kept
    G-->>A: EditPoemForm focuses the failure alert
  else guard turns off or the page is hidden while the dialog is open
    G-->>S: dismissed (closePrompt) → nothing sent, focus left as the page set it
  end
  Note over G: active while changed and while a save is sending; removed on a saved result (before the navigation) or when the page is hidden
```

## Scaffold map

Written by `opsx-scaffold` after the files existed (map approved 2026-11-03). Stub bodies only. Not
scaffolded: the migration (group 1), the `NewPoemForm` split, the `GenreSelect` / `IllustrationField`
move and the `PoemFormSkeleton` rename (task 3.1), the created-notice store's `kind` (5.2), the route
files, the breadcrumb match, `index.ts`, and the wiring into `OwnPoemContent`, `SignOutButton`,
`AuthorProfileEditor`, `FieldEditActions`, and `FieldActions` (groups 4-6). The poem-management
client stubs carry no `"use client"` yet: each gets it with its implementation, together with the
`boundaries` test's client-module list (NFR-2). Temporary `knip.jsonc` ignore entries and `@public`
tags name the task that removes each. The leave-block store was complete for the first D10 (a
four-line Zustand store, as `session-expired-notice.store.ts`; Gate 2b P1, accepted); the PR #168
review's revision replaces its API (`askToLeave`, `askBeforeLeaving`), and task 4.3 rewrites it.

| File | Responsibility | Exports |
| --- | --- | --- |
| `src/shared/lib/network/network.constants.ts` | slow-connection thresholds (D8) | `SLOW_EFFECTIVE_TYPES`, `SLOW_RTT_MS` |
| `src/shared/lib/network/use-connection-status.ts` | online / slow / offline as a hook (D8) | `useConnectionStatus`, `ConnectionStatus` |
| `src/shared/ui/ConnectionNotice/` | the offline or slow notice (D8) | `ConnectionNotice`, `ConnectionNoticeProps` |
| `src/shared/lib/leave-guard/leave-block.store.ts` | the active guard's question for «Выйти» (D10) | `useLeaveBlock`, `LeaveBlockState`, `askBeforeLeaving` |
| `src/shared/lib/leave-guard/leave-guard.constants.ts` (added in spec-clarify, 2026-11-03) | the three answers to the leave question (D10) | `LEAVE_ANSWER`, `LeaveAnswer` |
| `src/features/auth/components/SignOutButton/sign-out-with-confirmation.ts` (added in the PR #168 review) | ask, then the server sign-out (D10) | `signOutWithConfirmation` |
| `src/features/auth/model/auth.constants.ts`, `auth.types.ts` (added in the PR #168 review) | the wrapper's outcomes (D10) | `SIGN_OUT_STATUS`, `SignOutWithConfirmationResult` |
| `src/features/poem-management/model/poem-management.constants.ts` (added) | update outcomes, illustration change, edit segment | `UPDATE_POEM_STATUS`, `ILLUSTRATION_CHANGE`, `EDIT_SEGMENT` |
| `src/features/poem-management/model/poem-management.types.ts` (added) | action and DAL results (D3) | `IllustrationChange`, `UpdatePoemFailure`, `UpdatePoemResult`, `PoemEditAllowance`, `UpdateOwnPoemInput`, `UpdateOwnPoemResult` |
| `src/features/poem-management/model/poem-form.schema.ts` (added) | the update action's input, types only (D3) | `updatePoemInputSchema`, `UpdatePoemInput` |
| `src/features/poem-management/model/poem-form-values.ts` | form values and change detection (D5) | `PoemFormValues`, `IllustrationState`, `isPoemFormChanged` |
| `src/features/poem-management/model/poem-paths.ts` (added) | the edit page's path (D6) | `editPoemPath` |
| `src/features/poem-management/dal/poem-edit-allowance.ts` | the `poem_edit` limit (D3) | `consumePoemEditAllowance` |
| `src/features/poem-management/dal/poem-update.ts` | upload, `update_my_poem`, cleanup (D2, D3) | `updateOwnPoem` |
| `src/features/poem-management/actions/update-poem.actions.ts` | `"use server"` save (D3) | `updatePoemAction` |
| `src/features/poem-management/components/PoemForm/use-poem-form.ts` | shared drafts, checks, focus, discard (D4, D5) | `usePoemForm`, `PoemFormState` |
| `src/features/poem-management/components/PoemForm/PoemFormFields.tsx` + `.types.ts` | the four fields (D4) | `PoemFormFields`, `PoemFormFieldsProps` |
| `src/features/poem-management/components/EditPoemPage/` | heading and Suspense (D6) | `EditPoemPage`, `EditPoemPageProps` |
| `src/features/poem-management/components/EditPoemContent/` | session, own poem, genres, keyed form (D6) | `EditPoemContent`, `EditPoemContentProps` |
| `src/features/poem-management/components/EditPoemButton/` | «Редактировать произведение» link (D6) | `EditPoemButton`, `EditPoemButtonProps` |
| `src/features/poem-management/components/EditPoemForm/EditPoemForm.tsx` + `.types.ts` | the edit form's composition (D4) | `EditPoemForm`, `EditPoemFormProps` |
| `src/features/poem-management/components/EditPoemForm/use-save-poem.ts` | the call and its outcomes (D7) | `useSavePoem`, `SavePoem` |
| `src/features/poem-management/components/EditPoemForm/use-leave-guard.ts` | link, close, and sign-out guard (D10) | `useLeaveGuard`, `LeaveGuardOptions` |
| `src/features/poem-management/components/LeaveBlockedDialog/` | the "save first" dialog over the shared `Dialog`, link and sign-out forms (D10) | `LeaveBlockedDialog`, `LeaveBlockedDialogProps` |

`PoemFormState` is a starting contract: task 3.1/3.2 may widen it (the editor and picker keys
`reset()` bumps, a focus request for the alert) without changing the files above (Gate 2b P3).

## Risks / Trade-offs

- [Last save wins between two tabs or devices] → accepted (out of scope); each save writes every
  field, so an older tab's save overwrites a newer one. A version check can come later.
- [A capture-phase document listener can miss a link that stops propagation itself, or a
  navigation started from code] → the app has neither today besides sign-out; web-qa clicks the
  header, footer, and breadcrumb links.
- [Back/Forward and leaving from the poem page are not guarded] → the browser offers no cancellable
  hook for Back/Forward; the draft stays in the hidden page while Next keeps it. Documented in the
  proposal.
- [`navigator.onLine === true` doesn't mean the server is reachable] → a captive portal or a dead
  route still shows as online; the request then fails as `unknown` with values kept.
- [The profile turns non-public between action step 5 and `update_my_poem`] → the RPC answers
  `not-found` and the author sees «Произведение уже удалено.» though the poem exists. The window is
  one request long and needs a name cleared in another tab at that moment; accepted (Gate 2 P9).
- [`slow` comes only from Chromium's estimate] → Safari and Firefox never report `slow`; the
  estimate itself is coarse and can flicker, so a working but slow connection may block saving until
  it improves. Accepted by the user (spec-clarify, 2026-11-03).
- [Next keeps only "a few" routes in `Activity`] → a long detour can drop the draft; the guard keeps
  detours to the poem page in the guarded case.
- [The `NewPoemForm` split may change create behaviour] → no behaviour change is allowed in that
  group; its existing tests run unchanged in the same group.
- [Orphan file when removing the old illustration fails] → logged; invisible; same as the delete
  flow.
- [The connection drops after `update_my_poem` committed a replace, before its answer arrives] →
  the DAL reads that as a failed write and removes the new upload, so the saved row points at a
  missing file (a broken image until the next save). The window is one response long, and
  `createOwnPoem` has the same rule; accepted (Gate 4 CR-01, 2026-11-03).
- [Editing a poem whose genre was removed from Contentful forces a genre pick] → intended: a removed
  genre can't be stored again by the create rules either.
- [The created-notice store gains a `kind`] → its tests are updated in the same group; the created
  text and behaviour stay. Its file and component names (`created-…`) now also cover "saved"; a
  rename to a neutral name is left out to keep the diff to behaviour (Gate 1 P6, accepted).
- [`update_my_poem` accepts any well-formed path in the caller's own folder, also another own
  poem's file] → only the caller can harm their own poems, through the API, as with
  `create_my_poem` (Gate 1 P7, accepted).
- [The edit page's load has no sequence diagram] → it reuses the owner's poem page's reads and the
  add page's genre read unchanged; D6 lists every branch (Gate 1 P5, accepted).

## Migration Plan

1. Add the migration; `npx supabase db reset` locally; run pgTAP.
2. Deploy: `npx supabase db push` before the app ships (the action calls the new function and
   scope); add it to `docs/environment.md`'s deploy checklist.
3. Rollback: revert the app first, then the documented down migration.
