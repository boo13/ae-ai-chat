# Prompt Writing Guide for ae-ai-chat

Use prompt text that tells the model what to build in After Effects right now. The model's job in this app is to return a runnable `<ai-action run="true">...</ai-action>` block with ExtendScript ES3 when the user wants the change executed immediately.

## Core Rules

### 1. Use imperative voice

Write prompts as build instructions.

Good:

- `Build this 4-layer film treatment in the active composition and execute it immediately.`

Bad:

- `Produce a faithful recreation spec...`
- `Describe how this setup should be built...`

The prompt should ask for an AE result, not a document about an AE result.

### 2. Explicitly request an AI Action

The model will not use `<ai-action run="true">` unless the prompt explicitly references it. Saying "execute immediately" alone is not enough — the model may fall back to telling the user to run the script manually via File > Scripts.

Good:

- `Respond with an AI Action and run it immediately.`
- `Write this as an AI Action and execute it.`

Bad:

- `Execute it immediately.` (model may ignore the AI Action protocol)
- `Build this and run the script.` (model may offer to save a .jsx file instead)

### 3. Specify exact layer and effect details

Every layer should include:

- Layer name
- Layer type
- Blend mode
- Effects in exact order
- Exact property values
- Exact expression strings

Do not leave room for interpretation. If the setup matters, spell it out.

### 4. Keep scope manageable

Aim for 4 to 6 layers per prompt. If the treatment is larger, split it into multiple prompts. Smaller prompts are easier for the model to execute reliably and easier for the user to verify in AE.

### 5. Use display names for effects

Write effect names the way humans refer to them:

- `Transform`
- `Noise`
- `Gaussian Blur`
- `Unsharp Mask`
- `Exposure`
- `Glow`
- `CC Vignette`
- `Levels`

Do not force matchNames into the prompt. ae-ai-chat already has the verified effect catalog and matchName lookup table.

### 6. Do not include filesystem instructions

Do not tell the model to:

- write files
- save scripts into another repo
- commit changes
- print a separate implementation artifact

ae-ai-chat handles temporary script storage through the AI Action protocol automatically.

## Anti-Patterns

The original `TextureLabs_FilmDamage.md` failed because it used the wrong framing for this app.

Avoid language like:

- `Do not write implementation code.`
- `Return only the recreation spec.`
- `Produce a faithful recreation spec...`

Those instructions steer the model toward prose output instead of a runnable AE action.

Also avoid:

- asking for a spec instead of a build
- omitting whether the action should run now
- leaving values implied instead of explicit
- mentioning disk paths or external repos

## Recommended Shape

A strong ae-ai-chat prompt usually has this shape:

1. One sentence that says what to build, where to build it, and explicitly requests an AI Action.
2. A top-to-bottom layer stack.
3. For each layer: exact type, blend mode, effects in order, values, and expressions.

`sample-prompt.md` is the reference example for this structure.
