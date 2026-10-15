# Design

## Context

See `proposal.md` (Why, Requirements). Current state that shapes the approach:

- **Auth** (ADR 0003, ADR 0004). Sessions live in `@supabase/ssr` cookies. The proxy refreshes them on every request. `features/auth/dal/is-signed-in.ts` answers "signed in?" on the server with `getClaims()` and never throws. No browser Supabase client exists, and this change adds none.
- **Server Actions.** They are built with `next-safe-action`. Each feature has its own action client whose `handleServerError` logs only the error's `name` and returns a generic message (`features/auth/actions/action-client.ts`). Forms use `useActionState`, never `useAction`.
- **Cache Components is on.**
  - Caching is `"use cache"` + `cacheLife` + `cacheTag`.
  - Nothing inside a cache scope may read cookies.
  - A cached function returns a plain, serializable result.
  - Reading cookies outside `<Suspense>` fails the build. So every per-request read sits in a feature component inside its own Suspense boundary (`docs/code-style.md` "Route files compose").
- **`(authorized)/` has no pages and enforces nothing.** `route-groups` FR-8 forbids pages there today.
- **No `supabase/migrations/` yet.** `supabase/config.toml` exists for the local CLI stack, and `supabase` is a devDependency.
- **`next.config.ts`** has no `images` or `serverActions` settings. The Server Action body limit defaults to 1 MB. `next/image` in Next 16 refuses to optimize images from local IPs unless `images.dangerouslyAllowLocalIP` is set.

## Goals / Non-Goals

**Goals:**
- One owner-scoped table and one bucket. RLS is the last line of defense, not the only one (NFR-2).
- Per-field writes. Each write uses the action-client error policy shared with auth (`shared/lib/safe-action`), so poems can copy the pattern later.
- Public pages served from cache. Expiry is driven by the owner's writes; no time-based polling is needed for correctness.
- Business rules in pure `model/` functions: validation, visibility, image sniffing, Markdown toolbar edits, and failure mapping. Components stay thin.

**Non-Goals:**
- A browser Supabase client or direct-to-Storage uploads from the browser.
- Generated database types (`supabase gen types`). Rows are parsed with Zod at the DAL boundary, as Contentful responses already are.
- A shared toast system. The "Сохранено" notification is feature-local until a second feature needs one.
- An `updated_at` column or trigger. Nothing reads it.

## Decisions

### D1. Module layout: a new `features/authors`; `auth` gains one server-only accessor

```
src/shared/ui/TextField/            # promoted from features/auth AuthField: labelled input + error wiring (user decision 2026-10-15)
src/shared/lib/safe-action/
└── create-action-client.ts         # createActionClient({ logPrefix, genericMessage }) — one log/mask policy (Gate 1 P3)
src/features/authors/
├── actions/
│   ├── action-client.ts            # authorsActionClient = createActionClient({ logPrefix: "authors", … })
│   └── author-profile.actions.ts   # "use server": saveName, saveAbout, savePhoto, deleteField
├── dal/
│   ├── my-author-profile.ts        # getMyAuthorProfile() — per request, cookie client, owner's row
│   ├── public-authors.ts           # getPublicAuthor(id), listPublicAuthors() — "use cache"
│   └── author-profile-writes.ts    # writeOwnProfile, clearProfileField, replacePhoto, removePhoto
├── model/
│   ├── author.types.ts             # AuthorProfile, PublicAuthor, ProfileField, ProfileFailure, form states
│   ├── author.constants.ts         # NAME_MAX_LENGTH 60, ABOUT_MAX_LENGTH 1000, PHOTO_MAX_BYTES, bucket, tags
│   ├── author-profile.schema.ts    # Zod input schemas (shared by the actions and the DAL's row parsing)
│   ├── author-messages.ts          # UI copy, failure → message
│   ├── is-public-profile.ts        # FR-4 rule, mirrored by the RLS policy
│   ├── has-profile-content.ts      # a row with no content field reads as "no profile" (D3)
│   ├── compare-authors.ts          # directory order: case-insensitive last, first, then id (D5)
│   ├── profile-form-state.ts       # action result + draft → field form state
│   ├── detect-image-type.ts        # magic-byte sniffing (FR-8)
│   ├── validate-photo-file.ts      # size + type check, run in the browser before submit and again in the action
│   ├── markdown-format.ts          # toolbar edits as pure (text, selection) → (text, selection)
│   ├── classify-profile-error.ts   # PostgREST / Storage / config errors → ProfileFailure
│   └── author-cache-tags.ts        # authorsTag, authorTag(id)
├── components/                      # see D6
├── tests/
└── index.ts
```

- **`features/auth` gains `dal/current-user.ts` with `getCurrentUserId(): Promise<string | null>`.** It is server-only and never throws, and it calls `connection()` first, like `isSignedIn`. It also gains `requireUserId(): Promise<string>`, which calls `redirect("/login")` when there is no user. `isSignedIn()` becomes `(await getCurrentUserId()) !== null`, so one function owns the claims read. Both are exported from `@/features/auth`.
- **`features/authors` imports `getCurrentUserId` / `requireUserId` from `@/features/auth`,** the public API, never internals. The dependency is one-way (`authors → auth`), and `auth` never imports `authors`. *Alternative rejected:* each authors module calling `supabase.auth.getClaims()` itself. That duplicates the one place where "who is signed in" is decided, which ADR 0004 put in `auth/dal`. *Alternative rejected:* composing only in `app/`. Actions are endpoints and must resolve the user themselves (NFR-2), and an action cannot receive the user id from a route file.
- **`shared/lib/safe-action/create-action-client.ts`** (server-only) holds the error policy both features need: log `[<prefix>] action failed: <error.name>`, return the generic message, and use the `"flattened"` validation shape. `features/auth/actions/action-client.ts` is rewritten on top of it, with behavior unchanged and its existing tests still green. A second consumer now exists, which is the rule's trigger for moving code to `shared/` (`docs/architecture.md`). It also keeps the security-relevant "never log the input" policy from drifting between copies (Gate 1 P3).
- **`shared/lib/supabase/public.ts`** (server-only) adds `createSupabasePublicClient()`. It is a cookie-less `createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })`, usable inside `"use cache"` because it reads no request data. It returns an anon-role client, so RLS returns only public rows. This follows the precedent of an infrastructure client in `shared/lib` (`docs/architecture.md`).

### D2. Data model and RLS (first migration)

`supabase/migrations/<timestamp>_author_profiles.sql`:

```sql
create table public.author_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  -- A whitespace-only name written straight through PostgREST must not count as a name (FR-4). Blank means
  -- what JS trim() removes; one-argument btrim strips only U+0020 (code-review fix, 2026-10-15).
  first_name  text check (first_name is null or char_length(first_name) <= 60 and first_name !~ E'^[[:space:]\uFEFF]*$'),
  last_name   text check (last_name  is null or char_length(last_name)  <= 60 and last_name  !~ E'^[[:space:]\uFEFF]*$'),
  about       text check (about      is null or char_length(about) <= 1000 and about !~ E'^[[:space:]\uFEFF]*$'),
  about_align text not null default 'left' check (about_align in ('left', 'center', 'right')),
  -- A photo path must live in this profile's own folder, so no one can point at another author's file.
  -- The exact format, not just the first segment: `<id>/../<other>/…` would pass a prefix check and
  -- resolve to another author's file in the public URL (Gate 1 N2).
  photo_path  text check (photo_path is null or photo_path ~ ('^' || id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$')),
  created_at  timestamptz not null default now()
);

alter table public.author_profiles enable row level security;

create policy "public profiles are readable by anyone" on public.author_profiles
  for select to anon, authenticated
  using (first_name is not null and last_name is not null);
create policy "owners read their own profile" on public.author_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "owners update their own profile" on public.author_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- No insert policy: rows are created only by ensure_my_author_profile().
-- No delete policy: the app clears fields, never deletes the row (proposal Out of Scope).

-- Column privileges (Gate 1 C3, P5; code-review CR-01). The policies decide which rows; these decide
-- which columns. No client role can select or write user_id; a policy compares it without a privilege.
revoke all on public.author_profiles from anon, authenticated;
grant select (id, first_name, last_name, about, about_align, photo_path) on public.author_profiles to anon, authenticated;
grant update (first_name, last_name, about, about_align, photo_path) on public.author_profiles to authenticated;

-- "My profile" without exposing user_id: security definer, empty search_path, no user-id argument, the
-- caller from auth.uid() only; execute granted to authenticated alone.
create function public.ensure_my_author_profile() returns uuid ...;   -- insert … on conflict (user_id) do nothing; return id
create function public.my_author_profile_id() returns uuid ...;       -- the caller's id, or null
create function public.owns_author_profile(folder text) returns boolean ...;  -- for the storage policies
```

- **Column privileges close two gaps that RLS alone leaves open (Gate 1 C3).**
  - **Mass assignment.** A signed-in user calling PostgREST directly with the publishable key can update only the five content columns of their own row. They cannot touch `id`, `user_id`, or `created_at`, and cannot insert at all.
  - **The photo-path rule is a table check, not app logic.** A direct `PATCH` that sets `photo_path` to another profile's file fails the check. The check pins the whole format (`<own id>/<uuid>.png|jpg`), so dot segments can't escape the folder.
- **Explicit column lists everywhere (Gate 1 N1).** Under column grants, `select=*` and a bare `.select()` (`RETURNING *`) fail with `42501`.
  - `author.constants.ts` holds two lists:
    - `OWNER_PROFILE_COLUMNS = "id, first_name, last_name, about, about_align, photo_path"`;
    - `PUBLIC_AUTHOR_COLUMNS`, the same list.
  - Every read and every `.select(…)` after a write names one of them. `user_id` is never selected and never sent: the app addresses its own row by `id` (D3).
  - A pgTAP case runs a real save through the grants (ensure, then update by id).
- **The row is created only by `ensure_my_author_profile()`,** with an empty content row; a photo is attached by an update after the row exists, because its folder is the row's `id` (D4).
- **`user_id` never leaves the database (Gate 1 P5; code-review CR-01, user decision 2026-10-15).** Neither client role can select it, and photo paths use the profile id, so public URLs and API reads carry no auth id. The owner reaches their own row through the three security definer functions: `ensure_my_author_profile()` (create if missing, return the id), `my_author_profile_id()` (the id or null), and `owns_author_profile(folder)` for the storage policies. Each resolves the caller from `auth.uid()` and takes no user id, so no client input can name another user. The update policy still compares `user_id`: a policy expression needs no column privilege. *Alternative rejected:* keeping `select (user_id)` for authenticated so the DAL could filter on it; that let any signed-in user read every public author's auth id.

- **A deleted field is stored as `NULL`, never `''`.** The blank-pattern checks make an empty or whitespace-only string impossible, and `char_length(…) ≤ 60/1000` bounds the raw value too. So "public" is exactly `first_name is not null and last_name is not null`, in RLS (FR-4) and in `model/is-public-profile.ts`. The database repeats the 60/1000 limits so a bypassed action still can't store an oversized value.
- **`about` length is counted by `char_length`.** That is Unicode code points, the same as the `[...value].length` the schema uses. `String.prototype.length` would count UTF-16 units and disagree on emoji.
- **Storage bucket `author-photos`:** `public = true`, `file_size_limit = 5242880`, `allowed_mime_types = {image/png, image/jpeg}`. It is created in the same migration (`insert into storage.buckets …`) and mirrored in `supabase/config.toml` `[storage.buckets.author-photos]` for local `db reset`.
- **Storage policies:** `insert`, `select` (which `remove` needs), and `delete` on `storage.objects`, all `to authenticated`. All three are scoped to `bucket_id = 'author-photos'` and to a folder that names a profile the caller owns:

  ```sql
  public.owns_author_profile((storage.foldername(name))[1])
  ```

  The insert policy also requires the whole name to be `<uuid>/<uuid>.png|jpg`, the `photo_path` format, so the public bucket can't host arbitrary objects (code-review fix, 2026-10-15). The ownership check is a security definer function because a policy subquery runs with the caller's privileges, and the caller can no longer read `user_id`. Public reading goes through the public-bucket URL, which needs no `select` policy for `anon`.
- **Object path:** `<profile_id>/<random uuid>.<png|jpg>`. Using the profile id rather than the user id keeps the auth id out of public URLs (P5). A fresh name per upload means a cached public URL never shows a stale image after replacement, so no cache-busting query string is needed.
- *Alternative rejected:* a `profile_id` FK to a separate `profiles` table keyed by user. YAGNI: one author profile per user is the only reader-owned row so far.

### D3. Writes: one helper per field write, the user always from the session

Every action:
1. Runs the Zod schema (next-safe-action `inputSchema`). A violation becomes `validationErrors` → a field error (FR-8).
2. Checks the session with `getCurrentUserId()`. `null` returns `{ status: "failed", failure: "unauthenticated" }`. The input never carries a user or profile id (NFR-2).
3. Calls a DAL write. The DAL uses the cookie client (`createSupabaseServerClient`), so the request runs as `authenticated` with the same session, RLS applies, and the database functions resolve the caller themselves. The owner DAL therefore takes no `userId` argument (CR-01); the action's session check only decides `unauthenticated` before any I/O.
4. On `ok`, calls `updateTag(AUTHORS_TAG)` (the directory) and `updateTag(authorTag(profileId))` (that author's page) (FR-17), and returns `{ status: "saved", profile }`. Otherwise it returns the failure.

- **Every field write is two steps, through one helper `writeOwnProfile(patch)` (Gate 1 N1; CR-01):**
  1. ensure the row exists and get its id: `rpc("ensure_my_author_profile")`;
  2. `update(patch).eq("id", id).select(OWNER_PROFILE_COLUMNS).single()`.

  The photo flow (D4) uses the same step 1.
- **The owner read** (`getMyAuthorProfile()`) is `rpc("my_author_profile_id")`; `null` → no profile; otherwise `select(OWNER_PROFILE_COLUMNS).eq("id", id).single()`.
- **An empty row means "no profile" (Gate 1 N4).** Step 1 can leave a row with every content field `NULL`: after a failed photo upload, or after the owner deletes every field. `model/has-profile-content.ts` treats such a row as absent. `getMyAuthorProfile` returns `null` for it, so `/account` shows "Создать кабинет автора" again (FR-1) and the editor shows four add prompts. The row is harmless: it isn't public and holds nothing. "Создать кабинет автора" stays a plain link.
- **Delete:** `rpc("my_author_profile_id")`, then `update({ <column>: null }).eq("id", id)`. Deleting about also sets `about_align: "left"` (FR-10). With no row (a stale editor in a second tab), the id is `null` and nothing is updated: the delete maps that to the absent profile → `saved` (Gate 1 N5), and ends with `.select(OWNER_PROFILE_COLUMNS).maybeSingle()`, never `.single()`. `writeOwnProfile` keeps `.single()`, because its step 1 guarantees the row exists.
- **Delete photo order (Gate 1 C4):**
  1. read the current `photo_path`;
  2. set `photo_path = null`;
  3. remove the object, best effort, logged by name on failure.

  The row is cleared before the file goes, so a failed step leaves either an unchanged profile or an orphaned file, never a profile pointing at a missing file. After success the editor and the public page show the placeholder, the same as before any photo was added (FR-10).
- **Four actions,** not one generic one: `saveNameAction({ field: "first_name" | "last_name", value })`, `saveAboutAction({ about, align })`, `savePhotoAction({ photo: File })`, and `deleteProfileFieldAction({ field })`. Each has a tight schema. A single `{ field, value: unknown }` action would need a union schema whose errors are harder to attach to one field.
- **`updateTag`, not `revalidateTag`:** it is Server-Action-only and read-your-own-writes, so the action's own RSC payload already carries the fresh data. `revalidateTag(…, "max")` would serve stale data on the very re-render that follows the save.
- **The server re-render is the source of truth after a save.** The editor's props come from `getMyAuthorProfile()`. `updateTag` re-renders the route in the same round trip, so the saved value arrives as new props, and the client never copies server data into state (D6).

### D4. Photo upload through a Server Action

- **The browser checks first (user decision 2026-10-15; Gate 1 C2).** On file selection and again on Save, `PhotoFieldEditor` runs `validatePhotoFile(file)` from `model/validate-photo-file.ts`, which:
  - checks `size ≤ PHOTO_MAX_BYTES`;
  - reads the first 12 bytes (`file.slice(0, 12).arrayBuffer()`) and runs `detectImageType`.

  A failure shows the same field error the server would return, and the action is never called. An oversized file therefore never reaches Next's body limit, which would otherwise reject the request before any of our code runs. The check is a UX layer; the server repeats it.
- **The server repeats the check.** The client passes the `File` inside the action's argument object, which Server Actions serialize. The schema is `z.instanceof(File)` plus `.refine(size ≤ PHOTO_MAX_BYTES)`. The action then calls the same `validatePhotoFile` (magic bytes `89 50 4E 47 0D 0A 1A 0A` → png, `FF D8 FF` → jpeg). A mismatch is a field error, whatever `photo.type` claims (FR-8). The bucket's `size` and `allowed_mime_types` limits are a third check.
- **`next.config.ts`: `experimental.serverActions.bodySizeLimit: "6mb"`.** That is 5 MiB plus multipart overhead, per the Next docs. `proxyClientMaxBodySize` defaults to 10 MB, above the payload, so it stays unset. A body over the limit, reachable only by bypassing the browser check, makes the action call reject at the framework level. The field wrapper's `catch` maps that rejection to the generic failure under the field (D6), never to `error.tsx`.
- **Replace order.** The folder is the profile id, so the row must exist first:
  1. ensure the row exists and get its id (`writeOwnProfile`'s step 1), then select its `photo_path` by id;
  2. upload `<id>/<uuid>.<ext>`;
  3. update `photo_path`;
  4. remove the old object.

  Step 1 can create a row that holds only a photo. It is not public until both names exist (FR-4), and a photo-first profile is a legitimate state. If the upload fails, the row stays empty and reads as "no profile" (D3).
- **Failure handling.** If step 3 fails, the DAL removes the just-uploaded object, then returns the failure. If step 4 fails, the failure is logged by name and the save still reports success. The reader's photo did change; the orphan is a known risk (Risks).
- *Alternative rejected:* a signed upload URL (`createSignedUploadUrl`) with a direct browser upload. It avoids the body limit, but it needs a browser Supabase client and a second round trip. ADR 0004 removed the browser client.

### D5. Public reads: cached DAL, Suspense-wrapped pages

- `listPublicAuthors()` and `getPublicAuthor(id)` each open a `"use cache"` scope. Tags (Gate 1 P4): `AUTHORS_TAG` on the directory only, and `authorTag(id)` on the single read only. A save expires both through the two `updateTag` calls in D3, so each page keeps its own granularity.
- **The cache lifetime depends on the result (Gate 1 P1, P7).** `cacheLife` is called after the read, inside the scope:
  - `ok` → `cacheLife("hours")`;
  - `not-found` → `cacheLife("minutes")`, so random valid UUIDs don't pin entries for hours;
  - `unavailable` → `cacheLife("seconds")`, so a Supabase blip or an env-less build heals itself instead of freezing "unavailable" into the prerendered shell.

  Failures are returned as values, not thrown, matching the `shared/lib/contentful/client.ts` precedent, which caches failures with a lifetime and tag. The scope always carries its tag, so `updateTag` expires it too.
- **Order (FR-13, spec-clarify 2026-10-15).** The directory is sorted in the DAL by the pure `model/compare-authors.ts`: lower-cased last name, then lower-cased first name, compared by code point, then `id`. PostgREST's `order` can't sort on `lower(...)` without a view or generated column, and with no pagination (proposal Out of Scope) sorting the fetched list is the simplest correct option. The query fetches with no `order`.
- They use `createSupabasePublicClient()`, so anon RLS returns only public rows; a non-public or missing id comes back as `{ ok: false, reason: "not-found" }`. They return plain discriminated results (`docs/state-management.md`): `PublicAuthor` contains `id`, `firstName`, `lastName`, `about`, `aboutAlign`, and `photoUrl | null`. `user_id` never enters a cached result.
- **`getPublicAuthor` validates `id` as a UUID before opening the cache scope.** A non-UUID never becomes a cache key and returns `not-found` → `notFound()` (FR-14).
- **Photo URL:** `getPublicUrl(path)` is computed inside the DAL, a pure string build with no request.
- **Pages:**
  - `app/(public)/authors/page.tsx` renders `<AuthorDirectory />`.
  - `app/(public)/authors/[id]/page.tsx` renders `<AuthorPage id={params.then((p) => p.id)} />`.
  
  Each feature component holds its own `<Suspense>` (`docs/code-style.md`). The route files contain no `"use cache"`, because the cache lives on the data.
- **Owner link (FR-15).** `<AuthorOwnerLink profileId={…} />` sits in its own `<Suspense fallback={null}>` outside the cached data. It awaits `getCurrentUserId()` then `getMyAuthorProfile()` and renders "Редактировать профиль" only when the ids match. The cached page body stays identical for every visitor.
- **Unavailable reads.** If Supabase errors during a public read, the DAL logs by name and returns `{ ok: false, reason: "unavailable" }`, cached for seconds as above. The directory then shows "Список авторов сейчас недоступен." The author page throws to the route `error.tsx`, the existing generic error screen.
- **`notFound()` is a soft 404 (Gate 1 P2).** It is called inside the Suspense boundary after the shell has streamed, so Next renders the `not-found.tsx` UI but the HTTP status is 200. This is the same streaming mechanism D9 accepts for `redirect`. The specs require the 404 page to render, not a 404 status, and Gate 3 checks the UI.

### D6. Editor components and client state

```
AuthorEditorPanel        (server, exported) Suspense → AuthorEditorLoader
AuthorEditorLoader       (server) requireUserId(); getMyAuthorProfile(); renders AuthorProfileEditor, or a danger Alert on a failed read
AuthorProfileEditor      ("use client") activeField: useOptimistic<ProfileField | null>(null); "Сохранено" notice; layout
├── NameFieldEditor ×2   ("use client") useActionState + useOptimistic, text input
├── AboutFieldEditor     ("use client") useActionState + useOptimistic, MarkdownToolbar, Write/Preview, counter
├── PhotoFieldEditor     ("use client") validatePhotoFile before submit; useActionState + useOptimistic (object URL preview); placeholder when empty
└── SaveNotice           role="status" live region, text "Сохранено"
AuthorAbout              (shared by Preview and the public page) react-markdown, allowlist (NFR-1)
AuthorPhoto              next/image or placeholder icon; sizing per FR-16
TextField (shared/ui)    the name inputs: labelled input with error wiring, moved from auth's AuthField
FieldErrorText           error text wired by id for aria-describedby, for the about textarea and photo input (NFR-5)
```

- **The input draft is local `useState` in each field editor.** Two pieces of state cross fields, both held in `AuthorProfileEditor`:
  - `editingField: ProfileField | null` (plain `useState`, set by Edit and cleared by Cancel or on success), because at most one field is in edit mode (FR-6, spec-clarify 2026-10-15);
  - which field has an action pending (FR-7).

  Each field gets `disabled = (editingField ?? activeField) !== null && (editingField ?? activeField) !== field`. Clicking Edit happens outside any transition, so plain state is visible at once there. The pending field lives in `AuthorProfileEditor` as `const [activeField, setActiveField] = useOptimistic<ProfileField | null>(null)`. The `disabled` formula above, `(editingField ?? activeField)`, is the only one. A pending delete has no `editingField`, so `activeField` covers it. *Alternative rejected:* a Zustand store. This state belongs to one component subtree with a single owner, so a module-singleton store adds global state for no gain (`docs/state-management.md`).
- **Why `useOptimistic`, not `useState` (Gate 1 C1).** In React 19, a plain state update made inside an action transition is held back until the whole async action finishes. A `useState` `activeField` would therefore switch on and off in the same commit, after the save, and the other fields would never look disabled. An optimistic update is shown at once while the transition runs. It drops back to `null` on its own when the transition settles, so nothing has to clear it.
- **Each field's `useActionState` action is a component-local wrapper:**
  1. call `onStart(field)`, which runs `setActiveField(field)` and `setOptimisticNotice("")`, then `setOptimistic(submitted)`;
  2. `await` the action inside `try`;
  3. in `catch`, map a rejected call (a framework rejection such as an oversized body, or a network failure) to the `unknown` failure, so it shows under the field and never reaches `error.tsx` (Gate 1 C2);
  4. map the result to a form state with a pure `model/` function;
  5. on success, call `onSaved()`, which runs `setNotice("Сохранено")` on the committed state.

  No `useEffect` syncs pending state upward.
- **The field's mode follows the optimistic state (spec-clarify 2026-10-15).** Pressing Save switches the field to view mode at once, with the optimistic value as text and one disabled "Сохранение…" button; edit mode shows only the input. `mode` is derived during render: `isPending` → view; otherwise the field's local `isEditing` flag. On failure the wrapper sets `isEditing` back to `true` with the draft in the form state.
- **The optimistic value reverts on its own when the transition ends.** `useOptimistic(savedValueFromProps)` falls back to props. On success, the props already hold the new value (D3), so the field shows it with no flicker. On failure, the props are unchanged, so it reverts to the last saved value (FR-7).
- **On failure the input keeps its draft.** The form state carries the submitted text back, the way `SignInForm` keeps `email`. The photo input cannot be re-filled programmatically, so it shows the error and the previous photo, or the placeholder when there was none.
- **The photo field reuses `AuthorPhoto`.** With no photo, including right after a delete, the editor shows the same user-icon placeholder as the public page, plus "Добавить фото" (FR-6, FR-10).
- **A failed loader read (Gate 1 C5).** When `getMyAuthorProfile()` returns a failure, the loader renders no editor. It shows a danger `Alert` reading "Не удалось загрузить профиль. Попробуйте позже." `AccountAuthorSection` does the same, and `AuthorOwnerLink` renders nothing.
- **`SaveNotice` stays mounted** with `role="status"`. A live region that exists before its text changes is announced reliably (NFR-5). It does not auto-hide on a timer.
- **The notice text is optimistic too (Gate 1 N3).** `const [notice, setNotice] = useState("")` holds the committed text. `const [shownNotice, setOptimisticNotice] = useOptimistic(notice)` is what renders.
  - **On start:** `setOptimisticNotice("")` empties the region at once.
  - **On success:** `setNotice("Сохранено")` commits when the transition settles, so the region goes from empty to "Сохранено" on every save, including repeats. That change in the DOM is what assistive technology announces.
  - **On failure:** the committed text is cleared too (`setNotice("")`), so a stale "Сохранено" doesn't reappear.
  - A plain `setNotice("")` on start would be held back by the transition, the same deferral C1 describes.
- **The 460 px breakpoint** lives in `AuthorPhoto.module.css` as a media query, with a comment naming FR-16. CSS has no named-constant mechanism for media-query values without a build plugin. The 300 × 400 size is applied by CSS, and `next/image` gets `width={300} height={400}` plus `sizes="(min-width: 460px) 300px, 100vw"` from named constants.

- **Russian copy (NFR-8).** Every string lives in `model/author-messages.ts`, verbatim from the proposal's UI copy table. Each feature component's root element sets `lang="ru"` (the app root stays `lang="en"`), and so does each of the two header links.

### D7. Markdown: toolbar edits as pure functions, rendering by allowlist

- `markdown-format.ts` exports `applyFormat(text, { start, end }, format): { text, selection }` for `bold`, `italic`, `heading`, `subheading`, `bulleted`, `numbered`, and `quote`.
  - **Inline formats** wrap the selection, or insert a placeholder word when the selection is empty.
  - **Block formats** prefix each selected line.
  
  The textarea applies the result and restores the selection. Pure, so it is unit-tested without the DOM.
- `AuthorAbout` renders with `react-markdown`, `skipHtml`, `allowedElements: ["p", "strong", "em", "h2", "h3", "ul", "ol", "li", "blockquote", "br"]`, and `unwrapDisallowed`. Disallowed nodes such as links, images, `h1`, and code keep their text content but lose their element (NFR-1). Alignment is applied as a `text-left | text-center | text-right` utility on the wrapper.
- *Alternative rejected (user decision):* a WYSIWYG editor (Tiptap), or Markdown with an inline-HTML allowlist via `rehype-sanitize`. Both are heavier, and the second opens an XSS surface.
- `react-markdown` renders in Server Components too, so the public page does not ship the editor.

### D8. Images: `next/image` with a host derived from the env

- `next.config.ts` builds `images.remotePatterns` from `NEXT_PUBLIC_SUPABASE_URL`, when it is set, as `new URL("/storage/v1/object/public/author-photos/**", supabaseUrl)`. With the env unset (CI build), the list is empty and the build still succeeds (NFR-6).
- `AuthorPhoto` passes `unoptimized` when the photo URL's host is `localhost` or `127.0.0.1`, decided by a pure helper. Next 16 refuses to optimize local-IP sources, and `dangerouslyAllowLocalIP` is rejected because it is an SSRF opening in production config.
- *Alternative rejected:* a plain `<img>`. It loses responsive optimization in production and trips `@next/next/no-img-element` under the zero-warning lint.

### D9. Session gate for `(authorized)` pages

- `app/(authorized)/account/page.tsx` renders `<AccountAuthorSection />`, and `app/(authorized)/account/author/page.tsx` renders `<AuthorEditorPanel />`. Each feature component has a `<Suspense>` whose child calls `requireUserId()` first (FR-1, FR-2).
- Reading the session needs Suspense under Cache Components, so the redirect happens inside a streamed boundary. Next then performs it client-side (an injected redirect) instead of an HTTP 307. Both reach `/login` before any account data renders: the loader returns before fetching the profile. Gate 3 verifies the browser lands on `/login`.
- *Alternative rejected:* a proxy redirect for `/account/*` (a real 307). It would need `refreshSession` to also report "signed in". That changes a shared module and the `auth` FR-6 contract for a UX nicety. It can be added later without changing this design. A layout-only check is ruled out by `route-groups` (soft navigation skips shared layouts).
- `(authorized)/layout.tsx` stays pass-through. Its comment changes from "enforces nothing yet" to "pages here enforce the session themselves (requireUserId)".

### D10. Error layers (FR-9)

| Layer | Catches | Becomes |
| --- | --- | --- |
| Browser pre-check (photo only) | Size over 5 MiB, or not PNG/JPEG by magic bytes | The same field error, and no request is sent |
| Zod schema (next-safe-action) | Invalid input | `validationErrors` → field error, no I/O |
| Action | `getCurrentUserId()` is `null` | `failed: unauthenticated` |
| DAL | Supabase `{ error }` results, `SupabaseConfigError` | `classifyProfileError` → `unauthenticated` (JWT expired/invalid, HTTP 401 only), `unavailable` (config, network, 5xx, Storage 5xx), `unknown` (everything else, including `42501` permission denied: with a valid session that means a grant or policy bug, not an expired session) |
| Action client `handleServerError` | Any unexpected throw | `serverError` (generic). The form maps it to `unknown`. Only `error.name` is logged |
| Field wrapper `catch` (client) | The action call itself rejects (body over `bodySizeLimit`, network) | `unknown` failure under the field. Never `error.tsx` |

- **The DAL never throws for an expected failure.** It returns `{ ok: false, failure }`. Logs carry `[authors] <operation> failed: <error.name>`, never input values or file bytes (NFR-3).
- **`redirect()` stays outside every `try`,** following the `signInAction` precedent, so `NEXT_REDIRECT` isn't swallowed.

### D11. Header (FR-3)

- **`app/layout.tsx`'s header gains a static `<nav>` with "Наши авторы".** It is plain composition, so it stays in the prerendered shell.
- **`AuthStatus` (signed in) renders a "Личный кабинет" link and `SignOutButton`.** The link is part of the same session-dependent Suspense child, so no extra session read is added.

### D12. Documentation and decision record (Gate 1 C6)

This change departs from two rules in `docs/state-management.md`:

| Today's rule | What this change does instead | Why |
| --- | --- | --- |
| The shared client owns the cache scope; a DAL adds none | A feature DAL opens its own `"use cache"` scope | The scope must sit around the row mapping and the result-dependent `cacheLife` (D5) |
| Invalidation happens through `revalidateTag` in a route handler | Invalidation happens through `updateTag` in a Server Action | A reader's own write must show on the next render (D3) |

The poems change is expected to copy this pattern, so the docs move with the code:

- **`docs/state-management.md`** gains a "Supabase public reads" subsection:
  - the cookie-less client;
  - the feature-DAL cache scope;
  - result-dependent `cacheLife`;
  - `updateTag` from actions vs `revalidateTag` from webhooks.
- **`docs/architecture.md`:**
  - the project tree gains `features/authors`, `shared/lib/safe-action`, `shared/lib/supabase/public.ts`, and the `(authorized)/account` routes;
  - the `(authorized)` bullet changes from "enforces nothing yet" to "each page calls `requireUserId()` inside its feature's Suspense";
  - a new note: a feature may import another feature's public API for server-only accessors (`authors → auth`).
- **ADR 0005** records the durable decisions: RLS plus column grants as the last line of defense for reader-owned rows, per-field actions with `updateTag`, cookie-less cached public reads, and photo upload through a Server Action with a browser pre-check.

Each doc lands in the task group whose code it describes (`tasks.md`).

### Sequence: save one field (browser ↔ Server Action ↔ Supabase)

```mermaid
sequenceDiagram
  actor R as Reader (browser)
  participant F as NameFieldEditor
  participant E as AuthorProfileEditor
  participant A as saveNameAction (server)
  participant AU as auth getCurrentUserId
  participant D as DAL writeOwnProfile
  participant S as Supabase PostgREST (RLS + column grants)
  participant C as Next cache

  R->>F: Save (first name = "Anna")
  F->>E: setActiveField(first_name), setOptimisticNotice("") (optimistic → other fields disabled now)
  F->>F: setOptimistic("Anna"); "Сохранение…"
  F->>A: { field: "first_name", value: "Anna" }
  alt call rejects (network / framework)
    A--xF: rejection
    F->>F: catch → unknown failure under field
  else action runs
    A->>A: Zod parse (trim, 1–60)
    alt invalid
      A-->>F: validationErrors → field error
    else valid
      A->>AU: getCurrentUserId()
      AU->>S: getClaims (cookie session)
      alt no session
        A-->>F: failed: unauthenticated
      else user
        A->>D: writeOwnProfile({ first_name })
        D->>S: rpc ensure_my_author_profile → id; update … eq(id) select OWNER_PROFILE_COLUMNS
        alt error
          S-->>D: { error }
          D-->>A: { ok: false, failure }
          A-->>F: failed → message under field
        else ok
          S-->>D: row
          D-->>A: { ok: true, profile }
          A->>C: updateTag("authors"), updateTag("author:<id>")
          A-->>F: saved + re-rendered RSC payload (fresh props)
          F->>E: onSaved → setNotice("Сохранено") (shown when the transition settles)
        end
      end
    end
  end
  Note over F,E: transition settles → optimistic value and activeField fall back (props / null)
```

### Sequence: replace photo (browser ↔ Server Action ↔ Storage ↔ PostgREST)

```mermaid
sequenceDiagram
  participant P as PhotoFieldEditor (browser)
  participant A as savePhotoAction
  participant AU as auth getCurrentUserId
  participant D as DAL replacePhoto
  participant S as PostgREST (RLS)
  participant ST as Supabase Storage (author-photos)

  P->>P: validatePhotoFile(file): size ≤ 5 MiB, PNG/JPEG magic bytes
  alt invalid in browser
    P->>P: field error; no request sent
  else valid
    P->>A: { photo: File }
    alt body over 6 MB (browser check bypassed) / network
      A--xP: rejection → catch → unknown failure under field
    else action runs
      A->>A: Zod: File, size; validatePhotoFile
      alt invalid
        A-->>P: validationErrors → field error; nothing uploaded
      else valid
        A->>AU: getCurrentUserId()
        alt no session
          A-->>P: failed: unauthenticated; nothing uploaded
        else user
          A->>D: replacePhoto(file, type)
          D->>S: rpc ensure_my_author_profile → id; select photo_path by id
          alt row read/write fails
            D-->>A: failed
          else row (id, oldPath)
            D->>ST: upload <id>/<uuid>.<ext>
            alt upload fails
              D-->>A: failed (unavailable / unknown)
            else uploaded
              D->>S: update photo_path = <id>/<uuid>.<ext>
              alt update fails
                D->>ST: remove new object (compensate)
                D-->>A: failed
              else ok
                D->>ST: remove oldPath (best effort; logged by name on failure)
                D-->>A: ok, profile
              end
            end
          end
          A-->>P: saved (+ updateTag both tags) / failed
        end
      end
    end
  end
```

### Sequence: delete photo (browser ↔ Server Action ↔ PostgREST ↔ Storage)

```mermaid
sequenceDiagram
  participant P as PhotoFieldEditor
  participant A as deleteProfileFieldAction { field: "photo" }
  participant AU as auth getCurrentUserId
  participant D as DAL removePhoto
  participant S as PostgREST (RLS)
  participant ST as Supabase Storage

  P->>P: setActiveField(photo); setOptimistic(null) → placeholder
  P->>A: { field: "photo" }
  alt call rejects
    A--xP: catch → unknown failure; previous photo shown again
  else
    A->>AU: getCurrentUserId()
    alt no session
      A-->>P: failed: unauthenticated
    else user
      A->>D: removePhoto()
      D->>S: select photo_path; update photo_path = null
      alt row write fails
        D-->>A: failed (file untouched)
        A-->>P: failed → previous photo, error under field
      else cleared
        D->>ST: remove old object (best effort; logged by name on failure)
        D-->>A: ok, profile
        A-->>P: saved (+ updateTag both tags) → placeholder + "Добавить фото", "Сохранено"
      end
    end
  end
```

### Sequence: public author page (visitor ↔ Next ↔ cache ↔ Supabase)

```mermaid
sequenceDiagram
  actor V as Visitor
  participant P as /authors/[id] (AuthorPage, Suspense)
  participant G as getPublicAuthor
  participant K as "use cache" scope (tag: author:id)
  participant S as PostgREST as anon (RLS: public rows; no user_id column)
  participant O as AuthorOwnerLink (own Suspense)

  V->>P: GET /authors/<id>
  P->>G: id
  alt not a UUID
    G-->>P: not-found (no cache entry)
  else UUID
    G->>K: cached read(id)
    alt cache hit
      K-->>G: stored result
    else miss
      K->>S: select … where id = $1
      alt row
        K->>K: cacheLife("hours")
      else none
        K->>K: cacheLife("minutes") → not-found
      else error / config
        K->>K: cacheLife("seconds") → unavailable (logged by name)
      end
      K-->>G: result
    end
  end
  G-->>P: ok → render / not-found → notFound() (soft 404) / unavailable → error.tsx
  P->>O: profileId
  O->>O: getCurrentUserId(); getMyAuthorProfile()
  alt owner
    O-->>V: "Редактировать профиль"
  else not owner / signed out / read failed
    O-->>V: nothing
  end
```

### Sequence: author directory (visitor ↔ Next ↔ cache ↔ Supabase)

```mermaid
sequenceDiagram
  actor V as Visitor
  participant P as /authors (AuthorDirectory, Suspense)
  participant K as listPublicAuthors "use cache" (tag: authors)
  participant S as PostgREST as anon

  V->>P: GET /authors
  P->>K: cached read
  alt cache hit
    K-->>P: stored result
  else miss
    K->>S: select public rows (PUBLIC_AUTHOR_COLUMNS)
    K->>K: sort with compareAuthors (case-insensitive, then id)
    alt rows (maybe none)
      K->>K: cacheLife("hours")
      K-->>P: ok, authors[]
    else error / config
      K->>K: cacheLife("seconds")
      K-->>P: unavailable (logged by name)
    end
  end
  alt ok, non-empty
    P-->>V: links "First Last" → /authors/<id>
  else ok, empty
    P-->>V: "Пока нет авторов."
  else unavailable
    P-->>V: "Список авторов сейчас недоступен."
  end
```

### Sequence: session gate on `/account/author`

```mermaid
sequenceDiagram
  actor R as Browser
  participant L as AuthorEditorLoader (inside Suspense)
  participant AU as requireUserId (auth dal)
  participant D as getMyAuthorProfile
  participant S as PostgREST (owner policy)

  R->>L: GET /account/author
  L->>AU: requireUserId()
  alt no valid session
    AU-->>R: redirect("/login") (streamed → client redirect); no profile read
  else user id
    L->>D: getMyAuthorProfile()
    D->>S: select own row (cookie client)
    alt row or none
      D-->>L: AuthorProfile | null
      L-->>R: editor (add prompts for empty fields)
    else error
      D-->>L: failure (logged by name)
      L-->>R: danger Alert "Не удалось загрузить профиль. Попробуйте позже."
    end
  end
```

## Risks / Trade-offs

- **[A raised body limit applies to every Server Action]** Next buffers up to 6 MB for any Server Action before Zod or the auth check runs, including the unauthenticated sign-in and sign-up actions. → It is a bounded per-request cost. The default was 1 MB, and the proxy already buffers up to 10 MB. The browser pre-check means legitimate users never send more than 5 MiB. Accepted.
- **[Orphaned Storage objects]** These come from a failed old-file removal on replace or delete, or from an auth user deleted with files left behind (cascade covers rows, not objects). → Unique object names make orphans harmless to display, and they are never referenced. The cleanup job is out of scope; record it in `docs/deferred.md` if it surfaces in QA.
- **[RLS or grant misconfiguration exposes or blocks data]** → pgTAP tests under `supabase/tests/` (run with `npx supabase test db` against the local stack) cover:
  - anon sees only public rows, and neither anon nor a signed-in user can select `user_id`;
  - a user cannot insert, update, or read another user's row;
  - a user cannot update `id`, `user_id`, or `created_at`;
  - `photo_path` outside the profile's folder, including a `<own id>/../<other id>/…` path, is rejected;
  - a real save runs through the grants (ensure row, then update with the column list);
  - a whitespace-only name is rejected;
  - a user cannot write outside their profile's Storage folder.

  Manual validation against the local stack is a task.
- **[Security definer functions]** `ensure_my_author_profile`, `my_author_profile_id` and `owns_author_profile` run as the table owner, bypassing RLS. → Each takes no user id, resolves the caller from `auth.uid()` only, sets an empty `search_path`, and is executable by `authenticated` alone; pgTAP covers their results and anon's denied call. (This replaced the earlier residual risk that signed-in users could read public authors' auth ids, closed by code-review CR-01.)
- **[Photo-only rows]** A photo saved before any name creates a non-public row. → That state is intended (FR-4). It is invisible publicly and editable by its owner.
- **[Streamed redirect and soft 404]** Signed-out `/account*` gets a client redirect, not a 307, and an unknown author gets the 404 UI with status 200. → Acceptable for UX, with no data rendered first (D5, D9). A proxy redirect is a later additive option.
- **[`getClaims` per request on account pages and the owner link]** → Same cost profile as the header (ADR 0004). The public page body stays cached; only the small owner link is per request.
- **[Server Action `File` serialization holds the whole file in memory]** → Bounded by the 6 MB limit.
- **[CI builds without Supabase env produce empty `remotePatterns`]** → Builds don't render photos. A deploy with the env set gets the pattern. A missing env at deploy shows broken images rather than failing: `next/image` throws on an unconfigured host only at render, so Gate 3 checks a photo renders.
- **[`updateTag` only from Server Actions]** → All writes are Server Actions. A future admin or route-handler write must use `revalidateTag(tag, { expire: 0 })`.

## Migration Plan

1. Local:
   - add the migration and the `config.toml` bucket;
   - run `npx supabase db reset` (applies the migrations);
   - run `npx supabase test db` (pgTAP).
2. Code ships behind no flag. The routes are new, and the header links point at them.
3. Deploy, as a manual step owned by the user and added to the PROGRESS deploy checklist:
   - run `npx supabase db push` to the remote project before deploying the app;
   - confirm the bucket exists with its limits;
   - confirm `NEXT_PUBLIC_SUPABASE_URL` is set at build time, for `remotePatterns`.
4. Rollback:
   - revert the app deploy (the new routes disappear);
   - the table and bucket can stay, since nothing else reads them;
   - a down migration (`drop table public.author_profiles; delete from storage.buckets where id = 'author-photos'`) is documented in the migration's header comment, not auto-run.

## Open Questions

None.

## Scaffold map

Files on disk after `opsx-scaffold` (signatures and stub bodies only). Each component row covers its `.tsx` and, where it has props, its `.types.ts`. Paths are relative to `src/`.

| File | Responsibility | Exports |
| --- | --- | --- |
| `shared/ui/TextField/TextField.tsx`, `.types.ts` | Labelled input with error wiring, promoted from auth's `AuthField` (7.1) | `TextField`, `TextFieldProps` |
| `shared/ui/index.ts` | Shared UI barrel, now with `TextField` | `TextField` |
| `shared/lib/safe-action/create-action-client.ts` | The one action-client error policy (D1) | `createActionClient`, `ActionClientOptions`, `ActionClient` |
| `shared/lib/supabase/public.ts` | Cookie-less anon client for cached reads (D1) | `createSupabasePublicClient` |
| `shared/config/supabase-image-patterns.ts` | `images.remotePatterns` from `NEXT_PUBLIC_SUPABASE_URL` (D8) | `buildSupabaseImagePatterns` |
| `features/auth/dal/current-user.ts` | Who is signed in; the session gate (D1, D9) | `getCurrentUserId`, `requireUserId` |
| `features/auth/index.ts` | Public API, now with the two accessors | + `getCurrentUserId`, `requireUserId` |
| `features/authors/model/author.types.ts` | Domain types, DAL and action results, field form state, Markdown edit types | `NameField`, `ProfileField`, `AboutAlign`, `ProfileFailure`, `ImageType`, `PhotoFileCheck`, `AuthorProfile`, `PublicAuthor`, `ProfileRowPatch`, `MyProfileResult`, `ProfileWriteResult`, `PublicAuthorResult`, `PublicAuthorsResult`, `ProfileActionResult`, `ProfileActionResponse`, `FieldFormState`, `MarkdownFormat`, `TextSelection`, `FormattedText` |
| `features/authors/model/author.constants.ts` | Limits, bucket, column lists, photo size | `NAME_MAX_LENGTH`, `ABOUT_MAX_LENGTH`, `PHOTO_MAX_BYTES`, `AUTHOR_PHOTOS_BUCKET`, `OWNER_PROFILE_COLUMNS`, `PUBLIC_AUTHOR_COLUMNS`, `PHOTO_WIDTH`, `PHOTO_HEIGHT` |
| `features/authors/model/author-profile.schema.ts` | Action input schemas and the row schema (rules in 3.1) | `saveNameSchema`, `saveAboutSchema`, `savePhotoSchema`, `deleteProfileFieldSchema`, `profileRowSchema`, `ProfileRow` |
| `features/authors/model/author-messages.ts` | Russian UI copy; failure → message | `getProfileFailureMessage` |
| `features/authors/model/is-public-profile.ts` | FR-4 rule | `isPublicProfile` |
| `features/authors/model/has-profile-content.ts` | Empty row reads as no profile (D3) | `hasProfileContent` |
| `features/authors/model/compare-authors.ts` | Directory order (D5) | `compareAuthors` |
| `features/authors/model/detect-image-type.ts` | PNG/JPEG magic bytes | `detectImageType` |
| `features/authors/model/validate-photo-file.ts` | Size + type check, browser and action (D4) | `validatePhotoFile` |
| `features/authors/model/markdown-format.ts` | Toolbar edits (D7) | `applyFormat` |
| `features/authors/model/classify-profile-error.ts` | Error → `ProfileFailure` (D10) | `classifyProfileError` |
| `features/authors/model/author-cache-tags.ts` | Cache tags (D3, D5) | `AUTHORS_TAG`, `authorTag` |
| `features/authors/model/profile-form-state.ts` | Action result + draft → field state | `toFieldFormState` |
| `features/authors/dal/my-author-profile.ts` | Owner read, per request | `getMyAuthorProfile` |
| `features/authors/dal/public-authors.ts` | Cached public reads | `listPublicAuthors`, `getPublicAuthor` |
| `features/authors/dal/author-profile-writes.ts` | Field writes and photo replace/remove | `writeOwnProfile`, `clearProfileField`, `replacePhoto`, `removePhoto` |
| `features/authors/actions/action-client.ts` | Authors action client on the shared factory | `authorsActionClient` |
| `features/authors/actions/author-profile.actions.ts` | The four Server Actions (D3) | `saveNameAction`, `saveAboutAction`, `savePhotoAction`, `deleteProfileFieldAction` |
| `features/authors/components/AuthorAbout/` | Allowlisted Markdown render (D7) | `AuthorAbout`, `AuthorAboutProps` |
| `features/authors/components/AuthorPhoto/` (+ `is-local-image-host.ts`) | Photo or placeholder (FR-16); local-host check (D8) | `AuthorPhoto`, `AuthorPhotoProps`, `isLocalImageHost` |
| `features/authors/components/AuthorDirectory/` | Directory Suspense boundary | `AuthorDirectory` |
| `features/authors/components/AuthorList/` | Directory list, empty, unavailable | `AuthorList`, `AuthorListProps` |
| `features/authors/components/AuthorPage/` | Author page Suspense boundary | `AuthorPage`, `AuthorPageProps` |
| `features/authors/components/AuthorProfileView/` | Public profile layout; `ownerLink` slot before the h1 | `AuthorProfileView`, `AuthorProfileViewProps` |
| `features/authors/components/AuthorOwnerLink/` | Per-request owner check | `AuthorOwnerLink`, `AuthorOwnerLinkProps` |
| `features/authors/components/AuthorOwnerLinkView/` | "Редактировать профиль" when owner | `AuthorOwnerLinkView`, `AuthorOwnerLinkViewProps` |
| `features/authors/components/AccountAuthorSection/` | Account section: session gate, owner read | `AccountAuthorSection` |
| `features/authors/components/AccountAuthorLinks/` | FR-1 links or FR-18 alert, from the whole read result | `AccountAuthorLinks`, `AccountAuthorLinksProps` |
| `features/authors/components/AuthorEditorPanel/` | Editor Suspense boundary | `AuthorEditorPanel` |
| `features/authors/components/AuthorEditorLoader/` | Session gate, owner read, editor or alert | `AuthorEditorLoader` |
| `features/authors/components/AuthorProfileEditor/` | Field editors, one-active-field rule, notice; the shared field-editor props | `AuthorProfileEditor`, `AuthorProfileEditorProps`, `FieldEditorControls` |
| `features/authors/components/NameFieldEditor/` | First / last name field | `NameFieldEditor`, `NameFieldEditorProps` |
| `features/authors/components/AboutFieldEditor/` | About field: toolbar, alignment, tabs, counter | `AboutFieldEditor`, `AboutFieldEditorProps` |
| `features/authors/components/MarkdownToolbar/` | Seven format buttons | `MarkdownToolbar`, `MarkdownToolbarProps` |
| `features/authors/components/PhotoFieldEditor/` | Photo field with browser pre-check | `PhotoFieldEditor`, `PhotoFieldEditorProps` |
| `features/authors/components/SaveNotice/` | `role="status"` notice | `SaveNotice`, `SaveNoticeProps` |
| `features/authors/components/FieldErrorText/` | Error text wired by id | `FieldErrorText`, `FieldErrorTextProps` |
| `features/authors/index.ts` | Public API for route files | `AccountAuthorSection`, `AuthorDirectory`, `AuthorEditorPanel`, `AuthorPage` |
| `app/(public)/authors/page.tsx` | `/authors` route | default |
| `app/(public)/authors/[id]/page.tsx` | `/authors/[id]` route | default |
| `app/(authorized)/account/page.tsx` | `/account` route | default |
| `app/(authorized)/account/author/page.tsx` | `/account/author` route | default |
