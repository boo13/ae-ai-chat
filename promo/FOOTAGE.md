# Footage shot list

Record clean clips without cursor flourishes, zoom effects, music, or baked-in titles. Retina screen capture is fine; keep the panel and relevant After Effects UI sharp. Capture 3–5 usable seconds for each file, even though the edit uses shorter excerpts.

## 1. Panel running in After Effects

Filename: `ae-panel-run.mp4`

- Open the AE AI Chat panel beside the active composition viewer.
- Use the full prompt from `prompts/TextureLabs_FilmDamage.md`.
- Begin just before sending or running the prompt and show the panel entering its running state.
- Keep both the panel and composition viewer visible while the action creates the film-damage layer stack.
- Avoid covering the panel with menus or notifications.
- Record 1920×1080 or larger. A native Retina capture is acceptable and will be cropped to fill 1920×1080.
- Provide 3–5 seconds of stable, usable action.

## 2. Film-damage output

Filename: `output-1.mp4`

- Record the rendered composition created from `prompts/TextureLabs_FilmDamage.md`.
- Show a representative section where grain, scratches, weave, dust, flicker, color treatment, and light leaks are legible.
- Record the comp output without surrounding desktop UI if possible.
- Record 1920×1080 or larger for 3–5 seconds.

## 3. Second output

Filename: `output-2.mp4`

- Run either `prompts/Neon_Sign_Flicker.md` or `prompts/Deep_Space_Starfield.md` in AE AI Chat.
- Record only the rendered composition output, choosing a moment with visible motion.
- Record 1920×1080 or larger for 3–5 seconds.

## Delivery location

Place the files here:

```text
promo/public/footage/ae-panel-run.mp4
promo/public/footage/output-1.mp4
promo/public/footage/output-2.mp4
```

Run `pnpm dev` or `pnpm render` afterward. The generated footage manifest will detect the clips automatically. Any filename still missing remains a clearly labeled placeholder slate.
