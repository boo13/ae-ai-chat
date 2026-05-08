# Redesign Phase 1 — Visual Reskin

Design source: `plans/ae-ai-chat-design/project/app.jsx`

## Goal

Re-skin the panel 1:1 against the design exports, excluding the "Add context" picker (Phase 2). Direct replacement on `main`.

User-confirmed defaults: **bubbles**, compact density, green `#4ec38b` accent, drawer below composer, "row" streaming indicator. No Tweaks panel.

---

## Token system

Define once in a `:global(:root)` block at the top of `main.svelte` (or a new `src/js/lib/theme.css`):

```css
:root {
  --ae-bg:    #1c1c1c;
  --ae-bg-2:  #232323;
  --ae-bg-3:  #2a2a2a;
  --ae-line:   rgba(255,255,255,0.06);
  --ae-line-2: rgba(255,255,255,0.10);
  --ae-text:   #e6e6e6;
  --ae-text-2: #a0a0a0;
  --ae-text-3: #6e6e6e;
  --accent:        #4ec38b;
  --ae-accent-deep:#3a7df0;
  --ae-warn: #ff8e6a;
  --ae-ok:   #4ec38b;
}
```

After the token block lands, sweep for any remaining hex literals:
```bash
grep -RIE "#[0-9a-fA-F]{3,6}" src/js --include="*.svelte" --include="*.ts" --include="*.css"
```

### CEP / Chromium compatibility

The design uses `color-mix(in oklch, …)`. CEP Chromium in older AE builds does not support it. Use pre-computed `rgba()` equivalents everywhere:

| Design expression | Replace with |
|---|---|
| `color-mix(in oklch, var(--accent) 22%, transparent)` | `rgba(78,195,139,0.22)` |
| `color-mix(in oklch, var(--accent) 25%, transparent)` | `rgba(78,195,139,0.25)` |
| `color-mix(in oklch, var(--accent) 14%, transparent)` | `rgba(78,195,139,0.14)` |
| `color-mix(in oklch, var(--accent) 18%, transparent)` | `rgba(78,195,139,0.18)` |
| `color-mix(in oklch, var(--accent) 28%, transparent)` | `rgba(78,195,139,0.28)` |
| `color-mix(in oklch, var(--accent) 50%, var(--ae-line-2))` | `rgba(78,195,139,0.50)` + layer |

Keep `var(--accent)` for solid fills. Only replace `color-mix`.

---

## Files to modify

### `src/js/lib/providers/provider.ts`

Extend `ChatMessage` with two optional fields:

```ts
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  duration_ms?: number;
  isError?: boolean;       // true when this message is from a provider error
  diagnosticsRaw?: string; // raw status.raw text captured at error time
}
```

No new role value. Errors remain `role: "system"` but are distinguished by `isError: true`.

### `src/js/main/main.svelte`

- Add `:global(:root)` token block.
- Extract inline header markup into `<PanelHeader>`.
- Reorder panel layout:
  ```
  <PanelHeader>
  <div class="chat-area">          ← messages, StreamingRow, Suggestions
  <ChatInput>
  <ActionBar>                      ← moved below composer
  ```
  Currently: header → chat-area → screenshot → validation → StatusBar → ActionBar → ChatInput. New order puts ActionBar last.
- Render `<Suggestions>` inside `.chat-area` when `messages.length === 1` (system-only) and `!isLoading`.
- Render `<StreamingRow>` inside `.chat-area` when `isLoading`.
- In the `{#each messages}` loop: when `msg.isError` is true → render `<ErrorBlock>` instead of `<ChatMessage>`.
- **Update the `addMessage` helper signature** (currently at `main.svelte:128`):

  ```ts
  // Before
  function addMessage(role: ChatMessage["role"], content: string, extra?: { duration_ms?: number })
  // After
  function addMessage(
    role: ChatMessage["role"],
    content: string,
    extra?: { duration_ms?: number; isError?: boolean; diagnosticsRaw?: string }
  )
  ```
- **Mark provider launch/runtime errors only** (the provider call at `main.svelte:307` and the catch block at `main.svelte:473`). Use:
  ```ts
  const isProviderError = result.is_error && !result.cancelled;
  ```
  Cancelled requests have `is_error: true` set by the provider but should NOT render as `ErrorBlock` (Stop/Cancel is not a failure). For these, keep the current plain system message.
- When marking, capture `diagnosticsRaw: activeStatus?.raw` at message creation time so the diagnostics string survives `clearStatusSoon()`.
- **Do NOT mark AI Action failures** at `main.svelte:408`, `:429`, `:586`, etc. as `isError`. Those are application-level (script ran, returned an error) and already render as readable system messages with the failure text. The ErrorBlock visual is reserved for provider/runtime launch failures where `diagnosticsRaw` carries actionable host info (claudePath/codexPath, cwd, etc.).
- Remove `<StatusBar>` import + usage. All terminal states (error, cancelled, timeout) already produce chat messages; the ErrorBlock handles provider-error diagnostics visually. Other status feedback is provided by `StreamingRow` while loading.

### `src/js/components/ChatMessage.svelte`

Convert to bubble layout:

- **User** messages: right-aligned column (`align-items: flex-end`), bubble bg `rgba(78,195,139,0.22)`, border `rgba(78,195,139,0.28)`, `border-bottom-right-radius: 4px`, padding `9px 12px`, max-width 84%.
- **Assistant** messages: left-aligned column, bubble bg `var(--ae-bg-2)`, border `var(--ae-line)`, `border-bottom-left-radius: 4px`.
- Time stamp: small chip above the bubble at `font-size: 10.5px`, `color: var(--ae-text-3)`.
- Drop the uppercase ROLE header row + horizontal rule that currently separates messages.
- Container padding: `6px 14px` per message.
- Markdown rendering via `marked` + DOMPurify stays unchanged; only wrapping changes.
- Remove hardcoded role color constants (`#7cb3ff`, `#a78bfa`, etc.) — replaced by token variables.

### `src/js/components/ChatInput.svelte`

- Composer outer wrap: `background: var(--ae-bg-2)`, `border: 1px solid var(--ae-line-2)`, `border-radius: 10px`, `padding: 7px 8px 6px 10px`, `display: flex; flex-direction: column; gap: 6px`. Focus-within glow: `border-color: rgba(78,195,139,0.50)` + `box-shadow: 0 0 0 3px rgba(78,195,139,0.18)`.
- Textarea: transparent bg, no border/outline, `font-size: 13.5px`, `line-height: 1.5`. Placeholder text: "Ask Claude about your AE project…" (idle) / "Claude is responding…" (streaming).
- Bottom toolbar row:
  - **Left**: `+ Context` button (stub — disabled, `title="Coming soon"`, wired in Phase 2). Height 26px, border `var(--ae-line-2)`, radius 6.
  - **Middle**: hint text `shift+↵ for newline` in `JetBrains Mono` 10.5px, muted.
  - **Right**: when streaming → Stop pill (`rgba(255,142,106,0.14)` bg, warn color, square-stop icon + "Stop"). When idle → Send button (`var(--accent)` bg when text present, muted when empty, `font-weight: 600`, `border-radius: 7px`).
- Remove the text "Cancel" button. Remove the spinner inside Send.

### `src/js/components/ActionBar.svelte`

- Outer container: `background: #0e0e0e`, `box-shadow: inset 0 8px 10px -8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.02)`.
- Inner grid: `padding: 8px 8px 10px`, `display: grid`, `grid-template-columns: repeat(var(--drawer-cols), 1fr)`, `gap: 2px`. Set `--drawer-cols` dynamically from the count of visible actions (4 when Screenshot is hidden, 5 when shown). Pass the visible action list as a prop or derive it inside ActionBar from `quickActions.filter(a => a.handler !== "takeScreenshot" || supportsImages)`.
- Each button: `flex-direction: column`, `align-items: center`, `justify-content: center`, `gap: 4px`, `height: 50px`, `background: transparent`, `border: 0`, `border-radius: 6px`. Icon at top in `var(--accent)`. Label below at 10.5px, `var(--ae-text-2)`. Hover: `rgba(255,255,255,0.04)` bg.
- Screenshot button stays hidden when `!supportsImages` (existing logic). Column count adjusts automatically.
- The four always-visible actions: Proj Report, Describe, Fix Last Error, AI Action. Their `handler` dispatch strings (`runAnalysis`, `fixLastError`, `runAiAction`) are unchanged.

### `src/js/components/StatusBar.svelte`

Delete. `activeStatus` and `statusElapsedMs` remain as state in `main.svelte` and are consumed by `StreamingRow.svelte`. All terminal status messages (cancelled, timeout, error) already produce chat messages; the new `ErrorBlock` handles error diagnostics. The `<details status-details>` block for raw error text is replaced by the `diagnosticsRaw` field on messages.

---

## New components

### `src/js/components/PanelHeader.svelte`

```
[☰ menu btn]  AE AI Chat          [Model ▾]
              ● v0.1.1
```

- Menu button: 28×28px, `border: 1px solid var(--ae-line-2)`, `border-radius: 6px`, hamburger icon. Opens nothing in Phase 1 (placeholder for provider switch in the "Provider Selection UX" TODO).
- Title: 13px, `font-weight: 600`, `color: var(--ae-text)`.
- Status row: green dot (`var(--ae-ok)`) + version string. If `runtimeEnvironment === "dev"` show existing DEV badge.
- Model selector: right side, styled as dropdown button with accent dot. Options: derived from `activeProvider.models` (`ProviderModel[]`, each with `.value` and `.label`). Do not hardcode Haiku/Sonnet/Opus — Codex uses GPT model labels. Bind selection to `model` prop using `.value`; display `.label`.
- Props: `activeProvider`, `runtimeEnvironment`, `version`, `model`, `onModelChange`.

### `src/js/components/RoleChip.svelte`

Maps `role` → `{ label, fg, bg, dot }`:

```
system:    label="System",  fg=#a0a0a0, bg=rgba(255,255,255,0.05), dot=#7a7a7a
you:       label="You",     fg=var(--accent), bg=rgba(78,195,139,0.14), dot=var(--accent)
assistant: label="Claude",  fg=#cfcfcf, bg=rgba(255,255,255,0.06), dot=#cfcfcf
error:     label="Error",   fg=var(--ae-warn), bg=rgba(255,142,106,0.10), dot=var(--ae-warn)
```

Height 20px, padding `0 8px 0 7px`, radius 6, `font-size: 11px`, `font-weight: 600`. Colored 5px dot on the left.

Used by `ErrorBlock` (and optionally by `ChatMessage` in a future row-style toggle).

### `src/js/components/ErrorBlock.svelte`

Props: `{ time: string, content: string, diagnosticsRaw?: string, providerName?: string }`

- `content` — the error message text (from `message.content`).
- `diagnosticsRaw` — the `status.raw` string captured at error time (from `message.diagnosticsRaw`). This is already formatted text produced by each provider's `formatLaunchDiagnostics()`. Claude and Codex format differently; both are preformatted lines (e.g. `- claudePath: /opt/homebrew/bin/claude` / `- codexPath: /usr/local/bin/codex`). Do not parse or reformat — render verbatim.
- `providerName` — from `activeProvider.displayName` for the `<details>` summary meta.

Renders:
1. Warn card (`rgba(255,142,106,0.06)` bg, `rgba(255,142,106,0.18)` border, radius 8): warning icon + first line of `content` as headline + `time` stamp. Full `content` follows if multi-line.
2. If `diagnosticsRaw` is present: `<details>` block. Summary: "Launch diagnostics" + right-aligned `providerName`. Body: `<pre>` tag, `JetBrains Mono`, 11px, `color: var(--ae-text-2)`, `white-space: pre-wrap`. Content: `diagnosticsRaw` verbatim.
3. If `diagnosticsRaw` is absent: omit `<details>` entirely.

### `src/js/components/Suggestions.svelte`

Emits `onpick(prompt: string)`. Renders:

```
TRY ASKING
[ Describe my current comp          ]
[ Create a 1920×1080 comp at 30fps  ]
[ Fix the expression on selected    ]
[ Generate a project report         ]
```

Buttons: `background: var(--ae-bg-2)`, `border: 1px solid var(--ae-line)`, `border-radius: 9px`, `font-size: 12.5px`, `color: var(--ae-text-2)`. Hover: `var(--ae-bg-3)`, `var(--ae-text)`, `var(--ae-line-2)`.

### `src/js/components/StreamingRow.svelte`

Full-width row rendered inside the chat scroll while `isLoading`:

```
● CLAUDE  Thinking ...              12.3s
```

- `border-top: 1px solid var(--ae-line)`, `background: rgba(255,255,255,0.015)`, `padding: 12px 16px`.
- Pulsing accent dot (`.pulse-dot`, `@keyframes pulse-fade 1.4s infinite`).
- Provider name: `font-size: 11px`, `font-weight: 700`, `letter-spacing: 0.6px`, `text-transform: uppercase`, `color: var(--accent)`. Source: `activeProvider.displayName` — not hardcoded "Claude" (Codex shows "Codex", Claude API shows "Claude API", etc.).
- "Thinking": `font-size: 12.5px`, `color: var(--ae-text-2)`.
- Animated ellipsis: `::after` pseudo-element cycling `"" → "." → ".." → "..."` via `@keyframes ellipsis-cycle 1.4s infinite steps(1)`.
- Elapsed timer: right-aligned, `JetBrains Mono`, 11.5px, `color: var(--ae-text-3)`, tabular-nums. Format: `{s.toFixed(1)}s` under 60s, `MM:SS` over 60s. Sourced from `statusElapsedMs / 1000`.

---

## Behavior preserved

- All `$state` runes in `main.svelte` stay: `messages`, `isLoading`, `activeProvider`, `model`, `sessionId`, `lastError`, `lastErrorLine`, `pendingScreenshot`, `aiActionWarnings`, `aiActionErrors`, `activeAbortController`, `activeStatus`, `statusElapsedMs`, `autoFix*`.
- `buildContext()` in `context.ts` runs unchanged on every send.
- `handleAction()` routing by `action.handler` strings unchanged.
- Provider picker + first-run flow untouched.
- Validation banner (`aiActionWarnings`) rendering stays in `main.svelte`.
- Screenshot pill stays if `pendingScreenshot` is set.
- `+ Context` button rendered but disabled (stub); full wiring is Phase 2.

---

## Out of scope

- "Add context" picker + chips → Phase 2.
- In-panel provider switching → existing TODO.md "Provider Selection UX".
- macOS window chrome from the design → dropped (CEP renders inside AE's chrome).
- Alternate streaming styles (shimmer, pulse, bar variants) → only "row" ships.
- Tweaks panel → dropped.

---

## Verification

```bash
pnpm install
pnpm build
pnpm symlink
# restart AE → Window → Extensions → AE AI Chat
```

| Check | Pass condition |
|---|---|
| Header | Green dot, provider title, version, model selector visible |
| Empty state | Four suggestion buttons render; clicking one sends the prompt |
| Send a message | Streaming row appears (pulsing dot + elapsed timer); assistant reply renders as left-aligned bubble |
| Quick actions | Proj Report, Describe, Fix Last Error, AI Action all trigger correctly |
| Stop mid-stream | Stop pill visible during streaming; clicking cancels and shows stopped state |
| Provider launch error | Force a provider launch failure (rename `claude`/`codex` binary or unset HOME) → error block card + "Launch diagnostics" details renders with raw host info |
| AI Action failure | Trigger an ExtendScript runtime error → renders as a plain system message (NOT an ErrorBlock) so application failures stay readable |
| Stop mid-stream | Stop button cancels; cancelled message renders as plain system text, not as an ErrorBlock |
| Drawer position | Action drawer renders below the composer with recessed inset shadow |
| Color sweep | No raw hex literals remain in `src/js` components (run the grep check above) |

Re-run `plans/TODO.md` regression checklist sections (Richer Context, Error Feedback, Corpus Expansion) to confirm underlying wiring is intact.
