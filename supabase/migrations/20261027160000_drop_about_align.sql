-- Drop about alignment (refine-author-page-and-contact, FR-4, design D2).
--
-- The app no longer offers, validates, or reads an alignment for about: the about text always renders
-- left-aligned. Postgres drops the column's select and update privileges with the column, so the grants in
-- 20261015160958_author_profiles.sql need no edit.
--
-- Down migration (documented, never auto-run; revert the app first, then):
--   alter table public.author_profiles
--     add column about_align text not null default 'left' check (about_align in ('left', 'center', 'right'));
--   grant select (about_align) on public.author_profiles to anon, authenticated;
--   grant update (about_align) on public.author_profiles to authenticated;

alter table public.author_profiles drop column about_align;
