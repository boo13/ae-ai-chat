# Verify Loop Automation

This skill closes the feedback loop between generated AI Actions and live After Effects. It attaches to the open dev CEP panel on CDP port 8862, resets a known fixture composition, executes recipe scripts through the panel's existing `runScriptFile` snapshot engine, runs full provider-to-action prompts, and turns recurring error clusters into verified knowledge.

## Requirements

- After Effects running with CEP debug mode enabled
- The built and symlinked **AE AI Chat (dev)** panel open
- `chrome-remote-interface` installed from the repository dev dependencies
- A configured panel provider for E2E prompt fixtures

Run `/verify-loop` from Claude Code to follow the complete preflight, verification, error-mining, regeneration, and review sequence. Runtime reports and failure screenshots are written under `.session/` and remain local.

## Commands

| Command | Behavior |
|---|---|
| `pnpm recipes:verify` | Runs recipes whose notes contain `verification pending` against live AE |
| `pnpm recipes:verify --all` | Runs every local recipe |
| `pnpm recipes:verify --only <id>` | Runs one recipe regardless of verification status |
| `pnpm recipes:verify --promote` | Removes the pending phrase from passing pending recipe sources |
| `pnpm verify:e2e` | Runs the JSON prompt fixtures through the configured provider and live AE |
| `pnpm errors:summarize` | Clusters dev action failures for recipe, gotcha, or validator work |

The primary route is CDP through the live panel because it preserves snapshot diffs and expression-error evidence. If CDP is unavailable and only raw recipe execution is needed, macOS can run a `.jsx` with `osascript -e 'tell application id "com.adobe.AfterEffects" to DoScriptFile "<absolute-path>"'`. That fallback does not provide panel providers, `runScriptFile` diffs, or the E2E hook.
