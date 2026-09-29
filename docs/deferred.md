# Deferred items

Spec points that a finished task group did **not** fully deliver: blocked, skipped by decision, or no longer relevant. Each one is recorded here so it outlives `openspec archive`, which moves the change folder and its `tasks.md` out of sight.

## When to add an entry

At the end of every task group, before the group's commit, add an entry for each task or acceptance criterion that ends the group in one of these states:

- **blocked**: still carries `<!-- blocked: … -->` in `tasks.md`.
- **skipped**: checked, but part of its verification was waived by a user decision.
- **obsolete**: no longer relevant because the requirement changed or the approach was replaced.

The task line stays in `tasks.md`. `opsx-apply-git` reads its checkbox and `blocked` marker to pick the next run and to decide when to archive, so only a short pointer is added to the line: `<!-- deferred: docs/deferred.md -->`. The reasoning lives here, not in the comment.

## How to resolve an entry

When a later change delivers the point, or the risk is formally accepted, set **Status** to `resolved` and name the change or decision that closed it. Resolved entries stay in the file as history and are not deleted.

## Entry format

```md
### <change-slug> · <task id> — <short title>

- **State:** blocked | skipped | obsolete
- **Requirement:** <FR-/NFR- ids>
- **What is missing:** <the part not verified or delivered>
- **Why:** <reason>
- **Verified instead:** <what was checked, or "nothing">
- **Decision:** <who, date>
- **Status:** open | resolved (<change or decision>)
```

---

## add-contentful-home-greeting

### add-contentful-home-greeting · 9.5 — live publish → fresh title

- **State:** skipped
- **Requirement:** FR-9, NFR-2
- **What is missing:** a live check that after publishing in Contentful and POSTing `/api/revalidate`, the very next load of `/` shows the new title.
- **Why:** after the user published an edited title, the Contentful Delivery API still served the old entry (`publishedAt` 2026-09-28, `publishedVersion` 10), so the fresh title could not be observed.
- **Verified instead:** production server: correct secret → 200 `{"revalidated":true}`; wrong or missing secret → 401; `GET` → 405; secret unset → 503 plus a server log line. Unit tests assert `revalidateTag("contentful", { expire: 0 })` is called only on a valid secret.
- **Decision:** user, 2026-09-29: skip the live step.
- **Status:** open. Natural place to close it is the deploy step (design.md rollout steps 3 and 5): after setting up the real Contentful webhook, publish once and confirm the page updates.
