# UI Plan

No new component, token, or copy: the plain list on `/account/poems` shows fewer items. States are
named from `docs/design-system.md` §4; no mockup (proposal, Mockups), so values are "described".

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| `/account/poems` | loading (`MyPoemsSkeleton`, unchanged); default (section, then `PoemTitleList` of free poems); empty (every poem collected or no poems: no list and no text, unlike the author page's muted empty text — FR-1); error (membership or poem read failed: danger `Alert` «Не удалось загрузить произведения. Попробуйте позже.» in the list's place, next to the section's own danger `Alert` — FR-2) | `PoemTitleList` (`src/features/poems/components/PoemTitleList/`), `Alert` (`src/shared/ui/Alert/Alert.tsx`), the existing `OwnCollectionsSection` slot; no new component | described |
| `/account/poems` after a collection delete or a collection poems save | default with the deleted collection's notice (unchanged) and the freed poems in `PoemTitleList` (FR-3, FR-4) | Same as above | described |
