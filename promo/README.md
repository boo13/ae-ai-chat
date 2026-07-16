# AE AI Chat promo

A self-contained 16-second Remotion project for the AE AI Chat panel. The `AEAIChatPromo` composition is 1920×1080, 30fps, and 480 frames.

## Preview

```bash
pnpm install
pnpm dev
```

`pnpm dev` opens Remotion Studio. The predev script refreshes the footage and audio manifests first.

## Render

```bash
pnpm render
```

The finished file is written to `out/ae-ai-chat-promo.mp4`.

The equivalent direct command is:

```bash
pnpm exec remotion render src/index.ts AEAIChatPromo out/ae-ai-chat-promo.mp4
```

## Footage

Read [FOOTAGE.md](./FOOTAGE.md) for the exact recording list. Drop clips into `public/footage/` using the documented filenames, then preview or render again.

The manifest generator checks those filenames before Remotion bundles the project. Missing clips render as labeled dark slates, so both Studio and the final render work before recordings exist. Optional audio files in `public/audio/` are mounted only when present. `postinstall`, `predev`, `typecheck`, and `prerender` refresh both generated manifests automatically.
