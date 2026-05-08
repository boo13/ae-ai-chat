# Redesign Phase 2 — Add Context Chips

Design source: `plans/ae-ai-chat-design/project/app.jsx` (`Composer`, `ContextChip`, `ContextPicker` sections)

Prerequisite: Phase 1 (`plans/redesign-phase-1-visual-reskin.md`) must be merged first. The `+ Context` button stub created in Phase 1 gets fully wired here.

---

## Goal

Let users pin specific comps, layers, or effects from the current AE project to the next outgoing message. Pinned items appear as chips above the textarea; on send they are prepended to `systemContext` and then cleared.

---

## Type contracts

### `ContextChip` — discriminated union, not a plain object

Use a discriminated union to uniquely identify items even when display names collide:

```ts
// src/js/shared/shared.ts (or co-located in context.ts)
export type ContextChip =
  | { type: "comp";   label: string; compId: string }
  | { type: "layer";  label: string; layerIndex: number; compName: string }
  | {
      type: "effect";
      label: string;
      matchName: string;
      effectIndex: number;   // 1-based position within ADBE Effect Parade
      layerIndex: number;
      layerName: string;
    };
```

- **comp**: `compId` is AE's `CompItem.id` (unique across a session).
- **layer**: `layerIndex` is 1-based within the containing comp; `compName` disambiguates when multiple comps have the same-named layer.
- **effect**: a single layer can carry the same effect (same `matchName`) more than once, and AE distinguishes them only by their position in the Effect Parade. `effectIndex` (1-based) is the unique identifier within the layer; `matchName` + `layerIndex` + `layerName` provide context for the model.

### State

Add to `main.svelte`:

```ts
let pendingContexts: ContextChip[] = $state([]);
```

Clear `pendingContexts = []` after each successful send (same place input text is cleared in `ChatInput`).

---

## Files to modify

### `src/jsx/aeft/aeft.ts` — new ExtendScript exports (ES3-compatible)

Add three functions. All must use `var`, no arrow functions, no template literals, no `let`/`const`. Return values are serialized through the CEP bridge as JSON.

**`getProjectCompsList()`** — returns all comps in the project:
```
// ES3 pseudocode
var result = [];
for (var i = 1; i <= app.project.numItems; i++) {
  var item = app.project.item(i);
  if (item instanceof CompItem) {
    result.push({ label: item.name, compId: String(item.id) });
  }
}
return result;
```

**`getSelectedLayersList()`** — returns selected layers in the active comp:
```
// ES3 pseudocode
var result = [];
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) return result;
for (var i = 1; i <= comp.numLayers; i++) {
  var layer = comp.layer(i);
  if (layer.selected) {
    result.push({ label: layer.name, layerIndex: i, compName: comp.name });
  }
}
return result;
```

**`getEffectsOnSelectedLayer()`** — returns effects on all selected layers:
```
// ES3 pseudocode
var result = [];
var comp = app.project.activeItem;
if (!comp || !(comp instanceof CompItem)) return result;
for (var i = 1; i <= comp.numLayers; i++) {
  var layer = comp.layer(i);
  if (!layer.selected) continue;
  var effects = layer.property("ADBE Effect Parade");
  for (var j = 1; j <= effects.numProperties; j++) {
    var fx = effects.property(j);
    // PropertyBase exposes `name` (user-visible) and `matchName` (ADBE internal id).
    // Do NOT use `displayName` — that field is on Layer, not on PropertyBase.
    result.push({
      label: fx.name,
      matchName: fx.matchName,
      effectIndex: j,
      layerIndex: i,
      layerName: layer.name
    });
  }
}
return result;
```

### `src/js/lib/context.ts`

Add three discovery functions that call AE via `evalTS`. Reuse the existing import already in `context.ts:1`:

```ts
import { evalTS } from "../lib/utils/bolt"; // path already used at context.ts:1
```

Do NOT use `evalAex` — it does not exist in this codebase.

```ts
type CompChip   = Extract<ContextChip, { type: "comp" }>;
type LayerChip  = Extract<ContextChip, { type: "layer" }>;
type EffectChip = Extract<ContextChip, { type: "effect" }>;

export async function listProjectComps(): Promise<CompChip[]> {
  // 10s TTL cache keyed by "comps"
  const raw = await evalTS("getProjectCompsList");
  return Array.isArray(raw) ? raw.map(r => ({ type: "comp", ...r })) : [];
}

export async function listSelectedLayers(): Promise<LayerChip[]> {
  // No cache — selection changes between picker opens
  const raw = await evalTS("getSelectedLayersList");
  return Array.isArray(raw) ? raw.map(r => ({ type: "layer", ...r })) : [];
}

export async function listEffectsOnSelectedLayer(): Promise<EffectChip[]> {
  // No cache — selection-dependent
  const raw = await evalTS("getEffectsOnSelectedLayer");
  return Array.isArray(raw) ? raw.map(r => ({ type: "effect", ...r })) : [];
}
```

The ExtendScript exports return objects without a `type` field; the wrapper attaches it so the discriminated union resolves correctly on the TS side.

**Cache strategy:**
- Comps: module-level `Map<"comps", { ts: number, items: ... }>`, TTL 10 000ms. Project comp lists change rarely mid-session.
- Layers: **no cache**. Fetch fresh every time the picker opens. AE selection changes immediately on click; a 5s cache would immediately stale.
- Effects: **no cache**. Same reason — selection-dependent, zero tolerance for staleness.

**Modify `buildContext` signature** — add an optional second argument:

```ts
// Before
export async function buildContext(userMessage?: string): Promise<ChatContext>

// After
export async function buildContext(
  userMessage?: string,
  pinnedContexts?: ContextChip[]
): Promise<ChatContext>
```

Existing callers (`handleUserSend` in `main.svelte`) are unchanged — `pinnedContexts` defaults to `undefined`. When `pinnedContexts` is non-empty, prepend a `<pinned-context>` block to the system context string **before** the auto-discovered block:

```
<pinned-context>
comp: Comp 1 (id:3)
layer: Logo.ai (index:2 in Comp 1)
effect: Lumetri Color (matchName:AE.ADBE Lumetri Color, on Logo.ai index:2)
</pinned-context>
```

Include enough of the structured fields for the model to understand exactly which object is being referenced. The auto-discovery section follows and may add complementary data (selected layer details, keyframes, etc.) for items not explicitly pinned.

### `src/js/components/ChatInput.svelte`

- Enable the `+ Context` button (remove the `disabled` + "Coming soon" stub from Phase 1).
- Button click → toggle `pickerOpen` local state.
- Render `<ContextPicker>` anchored above the `+ Context` button when `pickerOpen`. Click-outside handler closes it (same bind-outside pattern used by model selector in `PanelHeader`).
- Render `<ContextChip>` pills in a wrapping flex row above the textarea when `contexts.length > 0`.
- Props from parent: `contexts: ContextChip[]`, `onContextAdd: (chip: ContextChip) => void`, `onContextRemove: (index: number) => void`.

### `src/js/main/main.svelte`

- Own `pendingContexts` state (see above).
- Pass `pendingContexts`, `onContextAdd`, `onContextRemove` down to `<ChatInput>`.
- `buildContext()` is invoked from `handleSend(text, isAutoFix)` (currently at `main.svelte:266`), not directly from `handleUserSend`. Thread the contexts through:
  1. In `handleUserSend(text)` (currently at `main.svelte:226`): take a snapshot `const ctxs = pendingContexts.slice();`, then immediately clear `pendingContexts = []`, then call `await handleSend(text, false, ctxs);`.
  2. Update `handleSend` signature to accept a third optional argument `pinned?: ContextChip[]` and forward it: `const context = await buildContext(text, pinned);`.
  3. The auto-fix path at `main.svelte:204` (`await handleSend(fixPrompt, true);`) does NOT pass pinned contexts — auto-fix runs the model against the previous error, not against new user pins.
  4. The `buildContext()` calls at `main.svelte:568` and `:624` (used by quick actions / fixLastError) also do NOT pass pinned contexts; quick actions are independent of user-pinned chips.
- Clearing happens at snapshot time (step 1) so the chip row updates immediately when the user clicks Send, even if the network call takes seconds.

---

## New components

### `src/js/components/ContextChip.svelte`

Props: `ctx: ContextChip`, `onRemove: () => void`

```
[comp icon] comp  Logo.ai  [✕]
```

- Height 22px, padding `0 6px 0 7px`, `border-radius: 5px`.
- Background `rgba(255,255,255,0.05)`, border `var(--ae-line-2)`.
- Icon: type-specific SVG (from design `Icon.comp`, `Icon.layer`, `Icon.effect`, 11px variant) at `color: var(--ae-text-3)`.
- Type label: 10px uppercase, `letter-spacing: 0.4px`, `color: var(--ae-text-3)`, `min-width: 42px`.
- Name label: `flex: 1`, `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`.
- ✕ button: 14×14px, `border-radius: 3px`. Hover: `rgba(255,255,255,0.08)` bg.

### `src/js/components/ContextPicker.svelte`

Popover anchored above the `+ Context` button (`bottom: calc(100% + 6px)`, `left: 0`).

- Width 220px, max-height 240px, overflow-y auto.
- Background `var(--ae-bg-3)`, border `var(--ae-line-2)`, radius 8, `box-shadow: 0 8px 24px rgba(0,0,0,0.5)`, `z-index: 30`.
- Section header: "Add from project" at 10px uppercase, `color: var(--ae-text-3)`, `padding: 6px 8px`.
- On open: fetch all three lists concurrently (`Promise.all`). Show per-group "Loading…" while in-flight.
- Three groups rendered sequentially: Comps → Layers → Effects (only render a group if it has items OR is loading).
- Empty group: "No comps in project" / "No layers selected" / "No effects on selection" — `color: var(--ae-text-3)`, not clickable.
- Items matching `contexts` (by type + unique key fields) render `opacity: 0.5; pointer-events: none`.
- Click an item: call `onContextAdd(chip)`, close picker.

#### `CtxIcon` inline SVG helper

Three SVG paths, copied verbatim from `app.jsx`:
- `Icon.comp(12)` — rectangle outline
- `Icon.layer(12)` — diamond/stack
- `Icon.effect(12)` — star/sparkle

Export from `ContextPicker.svelte` or a shared inline helper.

---

## Behavior summary

- Picker fetches on open. Comps cached 10s; Layers and Effects always fresh.
- Chips persist until ✕ or send.
- On send: `pinnedContexts` serialized into system context, then cleared.
- If AE has no open project: all groups return empty arrays; picker shows empty states with no crash.
- `<pinned-context>` block only injected when `pendingContexts.length > 0`.

---

## Verification

| Check | Pass condition |
|---|---|
| Open picker | Real comps from current AE project appear in Comps group |
| Layers group | Shows currently selected layer(s); updates if you change selection and reopen |
| Effects group | Shows effects on selected layer(s) with ADBE match-names in chip identity |
| Pin a comp | Chip appears above textarea; that comp renders disabled in picker |
| Duplicate layer names | Two layers named "Solid" at different indices produce distinct chips |
| Duplicate effects | Add two "Hue/Saturation" effects to the same layer → both pickable; chips have distinct `effectIndex` |
| Send with chip | `console.log` in `buildContext` shows `<pinned-context>` block before auto-context |
| Response references pinned | Ask "describe what's pinned" → model names the pinned comp/layer |
| Remove chip | ✕ removes it; remaining chips and send unaffected |
| No project open | All groups show empty-state text; no eval crash |
| Chips clear after send | Chip row empty after send completes (success or error) |
| Stale cache check | Open picker, change AE selection, reopen immediately → Layers/Effects show new selection |
