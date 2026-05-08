# TODO

## Implement Redesign

Design source: `plans/ae-ai-chat-design/` (handoff from Claude Design).

### Phase 1 — Visual Reskin
- [x] See `plans/redesign-phase-1-visual-reskin.md`

### Phase 2 — Add Context Chips
- [x] See `plans/redesign-phase-2-context-chips.md`

## Implement Fourth Plan
- [x] Implement `plans/few-shot-examples.md`

## Provider Selection UX
- [x] Add an in-panel way to switch providers after initial selection.
  - Current behavior: choosing Claude/Codex stores `selectedProviderId` in CEP `localStorage`, and future launches auto-select that provider without showing the provider picker.
  - Problem: users can get stuck on Claude or Codex with no visible way back to the opening provider choice screen.
  - Likely fix: add a compact provider switch control in the header, or make the provider title open the existing `ProviderPicker`.
  - Acceptance: user can switch between available providers without clearing `localStorage` or reinstalling the extension.
