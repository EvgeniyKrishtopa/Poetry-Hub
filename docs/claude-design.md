# UI changes: mockups from Claude Design

For any change with user-facing screens, mockups come from Claude Design before UI code:

1. After Gate 2 (spec-review) and test-plan pass, write a design brief and stop. The brief
   covers:
   - the screens from the proposal;
   - every state per screen (loading, error, empty, plus states from spec scenarios);
   - the exact user-facing texts from the scenarios;
   - the tokens and primitives from `globals.css`, `shared/ui`, or `docs/design-system.md`.
   Leave out `design.md` internals. Print the brief in the chat for the user to paste into
   Claude Design.
2. Record the wait in `PROGRESS.md`: "<change>: awaiting mockups from Claude Design". Do not
   run `opsx-scaffold` or `opsx-apply-git` for UI groups until the link arrives. Non-UI groups
   may proceed.
3. When the user pastes the approved design link (`claude.ai/artifact/...`):
   - read it;
   - add a `## Mockups` section to the change's `proposal.md` mapping each screen to its link;
   - re-run `ui-plan` (it pulls values only from Figma/Pencil MCP, so take the values from the
     artifact yourself and note "Claude Design" as the source);
   - clear the "awaiting" line in `PROGRESS.md`.
   `ui-plan` needs `designSystem.enabled: true` in `.claude/harness.json`.
4. Gate 3 checks the implementation against every state shown in the mockups.

## Design-system updates from Claude Design

A Claude Design artifact link with changed tokens or primitives is a UI change, not a docs edit:

- open an OpenSpec change with a before → after token table (light and dark) and the link;
- implement it in `globals.css` and the affected components;
- then re-run `design-system` to refresh `docs/design-system.md` from the code.

Never edit `docs/design-system.md` straight from the link: it describes what is in the code.
