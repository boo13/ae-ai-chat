# Footage shot list

Only one clip needs manual recording. Every other clip is a rendered showcase-prompt output and can be regenerated from the comps the prompts build (see below).

## 1. Panel running in After Effects (manual recording)

Filename: `ae-panel-run.mp4`

- Open the AE AI Chat panel beside the active composition viewer.
- Use the full prompt from `prompts/TextureLabs_FilmDamage.md`.
- Begin just before sending or running the prompt and show the panel entering its running state.
- Keep both the panel and composition viewer visible while the action creates the film-damage layer stack.
- Avoid covering the panel with menus or notifications.
- Record 1920×1080 or larger. A native Retina capture is acceptable and will be cropped to fill 1920×1080.
- Provide 3–5 seconds of stable, usable action.

## 2. Showcase-prompt outputs (generated)

Filenames:

```text
broadcast-lower-third.mp4
scifi-radar-hud.mp4
kinetic-typography-slam.mp4
rain-on-glass.mp4
neon-sign-flicker.mp4
texturelabs-filmdamage.mp4
```

Each is the rendered output of the matching prompt in `prompts/`, H.264 1920×1080 30fps, 5–8 seconds. To regenerate: run the prompt in the panel, render the comp losslessly, then convert with:

```bash
ffmpeg -i input.mov -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p -movflags +faststart -an <slug>.mp4
```

## Delivery location

Place all files in `promo/public/footage/`. Run `pnpm dev` or `pnpm render` afterward. The generated footage manifest detects the clips automatically; any missing filename renders as a clearly labeled placeholder slate.
