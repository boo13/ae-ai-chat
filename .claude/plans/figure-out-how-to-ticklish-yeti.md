# Re-cut the AE AI Chat promo to actually sell the plugin

## Context

`promo/out/ae-ai-chat-promo.mp4` (currently 25.8s) doesn't make a viewer want to install the
plugin. It's a Remotion project (React/TSX code, not a video editor) rendered via `pnpm render`.

Root causes of the weak current cut (`promo/src/Promo.tsx`, 774 frames @ 30fps):
- **No visible causality.** The single strongest thing this tool does — you type a prompt and AE
  actually builds it in your comp — never lands on screen. One prompt is typed in a tiny mockup
  floating in dead black space, then the promo cuts to pretty footage with no connective tissue.
  The three montage clips (lower third, radar, kinetic type) are *results of prompts*, but the
  viewer has no way to know that, so they read as random motion graphics.
- **Everything is static.** Footage is `object-fit: cover` with zero animation; the panel is a
  fixed `scale(1.9)` crop. Nothing moves except film grain. Reads like a slideshow.
- **The eye wanders.** Focal point jumps between tiny-centered panel, full-frame footage, and
  left-margin text with no through-line.
- **It buries the proof.** The two most convincing assets — real screen recordings of the panel
  running live in AE (`ae-panel-run.mp4`) and auto-fixing its own script errors
  (`panel-autofix.mp4`) — exist in `promo/public/footage/` but are **unused** (dropped in the
  26s re-cut for a "cleaner" look, per commit `3b761cf`).

Goal: a shorter (~16s), causality-driven cut with 3–6 crisp selling lines, camera movement on
every plugin/footage shot, and a single consistent focal anchor so the eye stays guided.

## Selling lines (the funnel) — CONFIRMED

Decisions confirmed by the user: **Mix** visuals, **~16s** length, **music/SFX added**,
differentiator-led copy with two edits (line 2 trimmed; "One prompt. Any look." cut).

1. **"An AI chat panel inside After Effects."** — what it is
2. **"It writes and runs ExtendScript."** — the differentiator (no manual scripting)
3. **"It checks its own work."** + mono: **"Validated against 338 verified AE effects."** — trust
4. End card: **"AE AI Chat — Prompt-driven After Effects. Free & open source."** — CTA

Three headline lines + CTA. With "One prompt. Any look." cut, the range montage carries itself
visually via per-clip caption chips (no title card) — variety + chips do the "any look" work.

## Target structure (~16s / ~480–495 frames @ 30fps)

| Beat | Time | Content | Camera / focus |
|---|---|---|---|
| B1 Premise | 0–1.8s | Line 1 card, orange rule, lower-left | slow push-in on text (1.0→1.03) |
| B2 Type | 1.8–4.0s | **clean mockup** panel types the prompt → Send → Running; Line 2 lands on the Send beat | push-in toward the input |
| B3 Runs-live proof | 4.0–6.5s | **real `ae-panel-run.mp4`** — cross-dissolve from B2's Running state; you watch the comp transform and layers stack (authentic "it really runs in AE") | push-in framing the panel + comp viewer |
| B4 Range montage | 6.5–12.0s | hero `texturelabs-filmdamage.mp4` result (~2s) then 3 quick results (lower third, radar, kinetic slam, ~1.1s each), each with a mono caption chip naming the look | alternating push-in / slow pan per clip |
| B5 Trust | 12.0–14.0s | Line 3 over the **real `panel-autofix.mp4`** capture (literally shows auto-fix retrying) | push-in on the panel region |
| B6 End | 14.0–16.0s | End card + CTA | subtle push-in |

Mix allocation: mockup for the polished type beat (legible prompt); real captures at the two
proof beats (B3 runs-live, B5 self-checks); polished rendered clips for the range montage.

Consistent focal anchor: every text block + caption chip sits at the same lower-left position with
the orange rule; camera moves push toward the subject; cross-dissolves on the causal beat (B2→B3),
hard cuts inside the montage synced to the music.

## Execution

Implementation is **delegated to Codex (gpt-5.6-sol)** via the codex plugin. Pablo (Claude)
orchestrates: hands Codex this spec as the worker prompt, then runs the visual QA loop itself
(`pnpm render` + ffmpeg contact sheet, iterate on camera curves/timing/beat-sync) since that needs
visual judgment. Music track selection stays with the user.

## Implementation

All work is in `promo/`. No new npm dependencies required.

1. **`promo/src/components/CameraMove.tsx` (new)** — reusable wrapper that applies an animated
   `transform: scale()/translate()` via `interpolate(useCurrentFrame(), [0, dur], [from, to])`
   with an eased curve (`Easing.bezier`). Parent stays `overflow: hidden`; footage is
   `object-fit: cover` so scale > 1 is a clean push-in with no exposed edges. Props: `zoomFrom`,
   `zoomTo`, `panX/panY`, `durationInFrames`.
2. **`promo/src/components/Footage.tsx`** — wrap the `<OffthreadVideo>` in `CameraMove`; expose a
   `move` prop (push-in vs pan) and per-clip `zoom`/`pan` so the real captures can be framed on the
   panel region (`ae-panel-run` panel sits in the left third; `panel-autofix` is 700×900 portrait —
   scale + translate to hold the auto-fix text). Add an `isCapture` flag that **drops/softens the
   film-grain Grade** on the real UI screencaps (grain over UI text hurts legibility) while keeping
   it on the rendered result clips.
3. **`promo/src/Promo.tsx`** — rewrite the `Promo` timeline to the 6-beat structure above:
   retime/rename the `<Sequence>`s, add the montage caption chips (small mono, lower-left,
   reuse the accent-rule motif), add a lightweight per-scene fade helper for cross-dissolves
   (local-frame opacity ramp at head/tail — no new dependency), animate the `panel-stage` push-in
   for B2, and add the top-level `<Audio>` bed (see 7). Swap in `ae-panel-run.mp4` (B3) and
   `panel-autofix.mp4` (B5).
4. **`promo/src/components/Interstitial.tsx` + `styles.css`** — add an optional subtle push-in to
   text cards; add a `.caption-chip` style (mono, lower-left, accent tick) for montage labels.
5. **`promo/src/Root.tsx`** — update `durationInFrames` from 774 to the new total (~480–495).
6. **`promo/README.md`** — fix the stale "10-second / 300 frames" note to match the new length.
7. **Music + SFX (confirmed):**
   - New `promo/public/audio/` holding a music bed (`track.mp3`) + a few SFX one-shots (typing
     tick, send/whoosh, montage swish, end-card sting).
   - Wire `<Audio src={staticFile('audio/track.mp3')} />` at the `Promo` root; place SFX via short
     `<Sequence>`+`<Audio>` at the type start, Send fire, each montage cut, and the end card.
   - Cut the montage on the track's beat (pick BPM after the track is chosen; align B4 cuts).
   - **Track selection needs your sign-off** — either you supply a licensed/royalty-free file, or I
     present 2–3 royalty-free candidates to drop in during implementation (chosen against the cut,
     not blind). Document source + license in a new `promo/AUDIO.md` and decide git-tracking vs
     `.gitignore` (footage is currently gitignored) based on the license.
   - Remotion muxes `<Audio>` into the rendered mp4 automatically — no `remotion.config.ts` change.

## Verification

1. `cd promo && pnpm dev` — Remotion Studio at the composition `AEAIChatPromo`; scrub each beat to
   confirm camera moves, cross-dissolves, caption chips, and the lower-left anchor read correctly.
2. `pnpm typecheck` — TS clean.
3. `pnpm render` → `promo/out/ae-ai-chat-promo.mp4`; confirm new duration (~16s) and that the
   audio track is present (`ffprobe` shows a non-silent AAC stream).
4. Extract a contact sheet with ffmpeg and eyeball focus/legibility/causality end-to-end; iterate
   on camera curves and timing until each beat holds the eye and the montage cuts land on the beat.
