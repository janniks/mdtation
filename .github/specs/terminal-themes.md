# Real terminal themes

- Request: actual light and dark TUI recordings for the website.
- Render both themes in the real product; no inversion or replica.
- Existing `mdtation.json` theme selects the palette.
- `MDTATION_THEME` overrides config for individual sessions and recordings.
- Keep dark as the default.
- One shared palette for body, syntax, chrome, inputs, overlays.
- Existing preferences remain unchanged.

## Acceptance

- [x] Light and dark syntax and comment highlights.
- [x] Readable root, chrome, inputs, help and palettes.
- [x] Existing config and environment override.
- [x] Matched real recordings and posters from current main source.
- [x] Full suite: 297 tests, zero skips; focused theme assertions, typecheck and formatting.
- [x] Commit source and website captures separately.
