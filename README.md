# AE AI Chat

A chat panel that lives inside Adobe After Effects. Ask for changes in plain language and the AI can make them in your project for you — adding layers, applying effects, setting keyframes — not just describe the steps.

It reads your project and composition context automatically — comp name, size, duration, frame rate, layer stack — so you don't have to describe your setup every prompt.

[![Screen recording of AI Chat drawing a star](screenshots/Screenrecord_AIChat_Star.gif)](screenshots/Screenrecord_AIChat_Star.mp4)

---

## Requirements

- macOS (Windows not supported)
- After Effects with CEP debug mode enabled — this lets AE load the panel
- One working AI provider (see [Providers](#providers))

Enable CEP debug mode with a tool such as [ZXP Installer](https://aescripts.com/learn/zxp-installer/) and turn on debugging in its settings.

---

## Install

Download the latest `.zxp` from [GitHub Releases](https://github.com/boo13/ae-ai-chat/releases) and install it with [ZXP Installer](https://aescripts.com/learn/zxp-installer/). The panel appears under **Window > Extensions > AE AI Chat**.

**Build from source** (needs Node.js 22.13+):
```bash
pnpm install && pnpm build && pnpm symlink
```
Restart AE and open **Window > Extensions > AE AI Chat (dev)**. Both builds can coexist in the menu.

---

## Providers

Pick one from the provider picker when the panel opens.

| Provider | What you need | Images |
|---|---|---|
| Claude API | An Anthropic API key | ✓ |
| Claude | The `claude` CLI, installed and logged in | — |
| Codex | The `codex` CLI, installed and logged in | — |

The Claude API key can be set as `ANTHROPIC_API_KEY` or saved in the panel. Image attachments (like screenshots) work with Claude API only.

---

## Your first prompt

Open a comp, open the panel, and type a plain request:

> Add a text layer that says "Hello", center it in the comp, and fade it in over the first second.

The AI makes the change inside After Effects — you'll see the new layer appear in your comp. The **AI Action** button re-runs that last change if you want to repeat or tweak it. For getting better results on bigger builds, see [Writing Prompts](#writing-prompts).

---

## Quick Actions

- **Screenshot** — captures the current comp frame and sends it to the model (image-capable providers only)
- **Report** — runs a deeper comp analysis and caches a richer summary (effects, expressions) for later prompts
- **Fix** — sends the most recent error back to the model for diagnosis
- **AI Action** — re-runs the last action the AI generated (disabled until you've run one)

---

## Writing Prompts

The more precisely you say what to build, the better the result.

- **Be imperative and concrete.** Say what to make, not what to describe.
  - Good: `Add a drop shadow and a 20px Gaussian Blur to the selected layer, then scale it from 0% to 100% over 15 frames.`
  - Bad: `Describe how a film-damage look should be built.` / `Produce a recreation spec.`
- **Specify exact details on multi-layer builds.** For each layer: name, type, blend mode, effects in order, exact property values, and exact expression strings. Leave no room for interpretation.
- **Keep scope manageable.** Aim for 4–6 layers per prompt. Split larger treatments — smaller prompts execute more reliably and are easier to verify.
- **Use plain effect names** — write `Gaussian Blur`, not `ADBE Gaussian Blur 2`. The panel looks up the technical names for you.
- **Don't ask it to save files or commit.** The panel stores the generated action for you, so prompts about writing files or running git just get in the way.

See `prompts/sample-prompt.md` for a longer reference example.

---

## License

MIT
