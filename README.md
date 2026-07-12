# AE AI Chat

![AE AI Chat banner](screenshots/repo-banner.png)

An AI chat panel that lives inside Adobe After Effects. It reads your project and composition automatically — comp name, size, duration, frame rate, layer stack, selected layers, effects, and expressions — so you can ask about your *actual* project and get answers grounded in what's really there.

Two ways people use it:

- **Ask and troubleshoot.** "Why isn't this wiggle expression working?" / "How do I make this layer follow the null?" The AI answers using your real project content — and when there's a concrete fix (a broken expression, for example), it can apply it in place.
- **Build.** "Add a text layer that says Hello and fade it in." The AI makes the change directly — adding layers, applying effects, setting keyframes — not just describing the steps.

[![Screen recording of AI Chat drawing a star](screenshots/Screenrecord_AIChat_Star.gif)](screenshots/Screenrecord_AIChat_Star.mp4)

---

## Showcase

Every clip below was created by pasting **one prompt** into the panel. The model builds the layers, effects, keyframes, and expressions live in After Effects — no templates, no manual keyframing. All eleven prompts ship in [`prompts/`](prompts/), verified against live AE, ready to run or remix. Footage treatments are shown on the open-source [Big Buck Bunny](https://peach.blender.org/) short.

<table>
<tr>
<td width="50%">
<a href="prompts/Broadcast_Lower_Third.md"><img src="screenshots/examples/broadcast-lower-third.gif" alt="Broadcast lower third" width="100%"></a>
<b><a href="prompts/Broadcast_Lower_Third.md">Broadcast Lower Third</a></b> — rigged and art-directable: colors, font, sizes, spacing, and timing all live on one control layer
</td>
<td width="50%">
<a href="prompts/SciFi_Radar_HUD.md"><img src="screenshots/examples/scifi-radar-hud.gif" alt="Sci-fi radar HUD" width="100%"></a>
<b><a href="prompts/SciFi_Radar_HUD.md">Sci-Fi Radar HUD</a></b> — rotating sweep, trailing blips, ticking sector readouts
</td>
</tr>
<tr>
<td width="50%">
<a href="prompts/Kinetic_Typography_Slam.md"><img src="screenshots/examples/kinetic-typography-slam.gif" alt="Kinetic typography slam" width="100%"></a>
<b><a href="prompts/Kinetic_Typography_Slam.md">Kinetic Typography Slam</a></b> — word-by-word slam build with eased overshoot and accent underline
</td>
<td width="50%">
<a href="prompts/Rain_On_Glass.md"><img src="screenshots/examples/rain-on-glass.gif" alt="Rain on glass" width="100%"></a>
<b><a href="prompts/Rain_On_Glass.md">Rain On Glass</a></b> — clinging droplets and run streaks over blue-hour city bokeh
</td>
</tr>
<tr>
<td width="50%">
<a href="prompts/Neon_Sign_Flicker.md"><img src="screenshots/examples/neon-sign-flicker.gif" alt="Neon sign flicker" width="100%"></a>
<b><a href="prompts/Neon_Sign_Flicker.md">Neon Sign Flicker</a></b> — layered tube glow with electrical flicker
</td>
<td width="50%">
<a href="prompts/TextureLabs_FilmDamage.md"><img src="screenshots/examples/texturelabs-filmdamage.gif" alt="Film damage treatment" width="100%"></a>
<b><a href="prompts/TextureLabs_FilmDamage.md">TextureLabs Film Damage</a></b> — 10-layer aged-film treatment: grain, scratches, dust, flicker, gate weave, light leaks
</td>
</tr>
<tr>
<td width="50%">
<a href="prompts/Deep_Space_Starfield.md"><img src="screenshots/examples/deep-space-starfield.gif" alt="Deep space starfield" width="100%"></a>
<b><a href="prompts/Deep_Space_Starfield.md">Deep Space Starfield</a></b> — drifting star layers at three parallax depths
</td>
<td width="50%">
<a href="prompts/Geometric_Loader_Loop.md"><img src="screenshots/examples/geometric-loader-loop.gif" alt="Geometric loader loop" width="100%"></a>
<b><a href="prompts/Geometric_Loader_Loop.md">Geometric Loader Loop</a></b> — seamless glowing loader with rotating sweep and pulsing core
</td>
</tr>
<tr>
<td width="50%">
<a href="prompts/Procedural_Fog_Atmosphere.md"><img src="screenshots/examples/procedural-fog-atmosphere.gif" alt="Procedural fog atmosphere" width="100%"></a>
<b><a href="prompts/Procedural_Fog_Atmosphere.md">Procedural Fog Atmosphere</a></b> — fog banks drifting through layered ridgelines with pulsing valley lights
</td>
<td width="50%">
<a href="prompts/Retro_VHS_CRT_Glitch.md"><img src="screenshots/examples/retro-vhs-crt-glitch.gif" alt="Retro VHS CRT glitch" width="100%"></a>
<b><a href="prompts/Retro_VHS_CRT_Glitch.md">Retro VHS CRT Glitch</a></b> — scanlines, chroma bleed, tracking tears, and a live timecode OSD
</td>
</tr>
<tr>
<td width="50%">
<a href="prompts/Day_For_Night_Grade.md"><img src="screenshots/examples/day-for-night-grade.gif" alt="Day for night grade" width="100%"></a>
<b><a href="prompts/Day_For_Night_Grade.md">Day For Night Grade</a></b> — moonlit grade that turns daytime footage into convincing night
</td>
<td width="50%">
</td>
</tr>
</table>

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

Open a comp, open the panel, and type. There are two things you'll do most:

**Ask about your project.** The panel already knows your comp, layers, effects, and expressions, so you can ask questions grounded in what's actually there:

> Why isn't the wiggle expression on the selected layer working?

You get an answer in plain language. If there's a clear fix — say, a broken expression — the AI applies it for you. Pure questions just get answered; nothing in your project changes unless the AI has an actual edit to make.

**Ask for a change.** Describe what to build and the AI makes it:

> Add a text layer that says "Hello", center it in the comp, and fade it in over the first second.

You'll see the new layer appear in your comp. Every change runs as a single undo step, so ⌘Z reverts it. The **AI Action** button re-runs the last change if you want to repeat or tweak it. For getting better results on bigger builds, see [Writing Prompts](#writing-prompts).

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

## Feedback

Hit a bug, or have an idea? Click the **speech-bubble icon** in the panel header to open a pre-addressed email with your version and provider already filled in. Add a sentence about what happened and send — it comes straight to me.

---

## License

MIT
