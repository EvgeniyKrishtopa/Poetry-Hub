# UI plan

State names come from `docs/design-system.md` section 4. A home section has no `loading` state of its own (the page is cached): it is either rendered with CMS copy or with its static fallback, and for these three sections the fallback keeps the layout, so no section is ever absent because of this change. No mockup link exists for this change and no Figma or Pencil server is connected (`plugin:figma:figma` needs authentication), so the values below were first "described" (the owner's request and the proposal); the approved Claude Design canvas (`proposal.md`, `## Mockups`) now confirms the hero: `--hero-scrim` `rgb(0 0 0 / .10)` and the centred title, text and buttons. Value source: "Claude Design" plus the artboard.

| Screen | States | Components | Value source |
| --- | --- | --- | --- |
| Home, hero (`/`, home-banner FR-B4 to FR-B7; home-sections FR-1) | normal (CMS banner: title, description paragraphs, Banner image); long description (several paragraphs, line breaks kept); `error` (CMS unavailable: «Поэтический Хаб», the static description and the shipped photo, same layout); light and dark; 360, 768 and 1280 px. New in this change: the title, every paragraph and the two buttons centred horizontally; the photo covered by one uniform black layer at 10% (`--hero-scrim` `rgb(0 0 0 / .10)` in both themes, was `.60` / `.65`) | existing: `HomeHero` (`src/features/home/components/HomeHero/`, changed in place, no new component), `ButtonLink` `primary` `lg` «Читать произведения» and `onImage` `lg` «Стать автором» (`src/shared/ui/Button/`, unchanged); no new component | Claude Design: HomeHero; the `--hero-scrim` row of `docs/design-system.md` section 2 changes with it |
| Home, about (home-sections FR-3) | normal (CMS title and message as plain-text paragraphs); `error` (the static heading and text); layout unchanged: `surface` band, 896 px text column, `ghost` «Подробнее о проекте» link | existing: `ButtonLink` `ghost`; the section component `HomeAbout` and its heading (code components not listed in `docs/design-system.md`, layout unchanged; the design-system refresh in task 4.1 can add them) | Claude Design: HomeAuthors (about), HomeLatest (closing); no visual change, copy source only |
| Home, closing invitation (home-sections FR-6) | normal (CMS title and message); `error` (the static heading and text); shown only to a signed-out visitor; layout unchanged: framed block, centred text, `lg` `primary` «Присоединиться к проекту» | existing: `ButtonLink` `primary` `lg`; the section component `HomeJoinCta` (code component not listed in `docs/design-system.md`, layout unchanged) | Claude Design: HomeAuthors (about), HomeLatest (closing); no visual change, copy source only |

## Criteria with a human-visible outcome and where they land

- home-banner FR-B4, FR-B5, FR-B6, FR-B7, NFR-B2 and home-sections FR-1 → hero row.
- home-sections FR-3 and home-greeting FR-8 (plain-text paragraphs) → about and closing rows.
- home-sections FR-6 → closing row.
- No visible outcome of their own: FR-B1, FR-B2, FR-B3, NFR-B1, and home-greeting FR-3, FR-4, FR-5, FR-7.

## Gap noted

`docs/design-system.md` has a `HomeHero` row but no row for `HomeAbout`, `HomeJoinCta` or `SectionHeading`; the compared Commit line (`0dd8872`) is also older than the current HEAD. The names used above all exist in code, and the layout of the two sections does not change, so nothing blocks; the document refresh is already in task 4.1 (overlay value, lightest-photo rule). Re-running `design-system` is optional and the owner's call.
