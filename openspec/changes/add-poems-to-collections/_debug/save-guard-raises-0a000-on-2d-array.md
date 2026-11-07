# save_my_collection_poems() raises 0A000 instead of 22023 on a multi-dimensional array

- Change: `add-poems-to-collections`
- Called from: `code-review`
- First seen: 2026-11-07
- Limit in force: `maxFixAttempts: 2`

## Failure

Gate 4 CR-01 (CONFIRMED, low severity): the save's header says malformed input raises 22023, but a
multi-dimensional `uuid[]` in `added` or `removed` raises 0A000 ("searching for elements in
multidimensional arrays is not supported") from `array_position(..., null)`. Only a direct call can send
one; nothing is written either way.

## Reproduce

As `authenticated` with any `sub`, inside a rolled-back transaction:

```sql
select public.save_my_collection_poems(gen_random_uuid(),
  array[[gen_random_uuid(), gen_random_uuid()], [gen_random_uuid(), gen_random_uuid()]], '{}');
```

Reproduced twice in a row: `ERROR: searching for elements in multidimensional arrays is not supported`.

## Attempt 1 — 2026-11-07

- Isolated to: `supabase/migrations/20261107140000_collection_poems.sql`, the input guard of
  `save_my_collection_poems()`: `array_position()` runs on the arrays before anything checks their shape,
  and SQL doesn't guarantee the `or` chain's evaluation order.
- Hypothesis: the guard never checks the number of dimensions, so `array_position()` meets a 2-D array and
  raises its own error first.
- Expected effect: a separate `if` before the main guard rejects `array_ndims(...) > 1` for either list
  with 22023, so the reproduction above raises 22023; a new pgTAP case pins it and every other case still
  passes.
- What actually happened: after `npx supabase db reset`, the same call raises `22023: invalid collection
  poems selection`; the new pgTAP case passes and `npx supabase test db` runs 5 files, 321 tests, PASS.
- Verdict: matched

## Outcome

- Fixed on attempt 1 of 2
- Spec case: 3 no criterion covered (NFR-1's scenarios never named malformed save input); added the
  scenario "Malformed save input (added by defect fix)"
- Criterion touched: `NFR-1`
