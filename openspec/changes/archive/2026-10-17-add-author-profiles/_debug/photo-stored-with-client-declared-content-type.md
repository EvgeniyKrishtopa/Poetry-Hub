# A stored photo keeps the client-declared content type, not the sniffed one

- Change: `add-author-profiles`
- Called from: `code-review` (deep-reviewer DR-05, confirmed by reproduction)
- First seen: 2026-10-15
- Limit in force: `maxFixAttempts: 2`

## Failure

`replacePhoto` passes the client's `File` to `storage.upload(path, file, { contentType })`. storage-js sends a `File`/`Blob` body as multipart, and the stored object's content type comes from the `File`'s own `type`, which the client sets freely; `options.contentType` is ignored. A real JPEG declared as `image/png` passes `validatePhotoFile`, is stored as `<id>/<uuid>.jpg`, and is served as `image/png`. This contradicts FR-8 and the code's own claim that the stored type never comes from `File.type`. The bucket's `allowed_mime_types` (png/jpeg) bounds the damage to a png/jpeg mismatch, or a failed upload for an empty type.

## Reproduce

Against the local stack (secret key, so storage policies don't interfere with the library behaviour under test): upload `new File([JPEG magic bytes], "x.png", { type: "image/png" })` to `author-photos` with `{ contentType: "image/jpeg" }`, then `HEAD` the public URL. Served `content-type: image/png`. Reproduced twice in a row.

## Attempt 1 — 2026-10-15

- Isolated to: `src/features/authors/dal/author-profile-writes.ts`, the `upload` call in `replacePhoto` — the body is the client's `File`.
- Hypothesis: storage-js's form-data path uses the body's own `type` for the multipart part and never applies `options.contentType` to a `File`/`Blob` body.
- Expected effect: uploading `new Blob([file], { type: contentType })`, a body whose type is the sniffed one, makes the same scenario serve `image/jpeg`; the client's declared type no longer reaches Storage.
- What actually happened: the same scenario with the re-wrapped body served `content-type: image/jpeg`. Unit tests now assert the upload body is not the client's `File` and carries the sniffed type.
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2
- Spec case: 3 no criterion covered — FR-8 required typing by content but said nothing about the stored type; added the scenario "Stored type follows the content" to `specs/author-profiles/spec.md`
- Criterion touched: `FR-8`
