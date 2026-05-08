---
name: install
description: First-time setup for ae-ai-chat. Walks through CEP debug mode, npm install/build/symlink, AE restart, and provider configuration. Triggers on "install ae-ai-chat", "set up the panel", "first time setup", "get started", "install the panel".
---

# Install AE AI Chat

## Step 1: Check prerequisites

```bash
node --version
```

Node 18–24 is required. If the version is outside that range, ask the user to update.

Verify macOS (this panel is macOS-only).

## Step 2: Enable CEP debug mode (once per machine)

Adobe blocks unsigned CEP extensions by default. Without this, the panel opens as a blank white window.

Ask the user to run in Terminal:

```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
```

This only needs to be done once per machine. It covers AE 2022–2023 (CEP 11) and AE 2024+ (CEP 12).

## Step 3: Install, build, and symlink

From the repo root:

```bash
npm install
npm run build
npm run symlink
```

Order matters: build before symlink.

**Verify:**

```bash
ls dist/cep/main/index.html
```

If the file exists, the build succeeded.

## Step 4: Restart AE and open the panel

Tell the user to:

1. Restart After Effects.
2. Open the panel from **Window → Extensions → AE AI Chat (dev)**. The `(dev)` suffix is added automatically by the build so this dev install coexists with the signed ZXP release (`AE AI Chat`) if you also have it installed.

## Step 5: Configure at least one provider

The panel shows a provider picker on open. At least one provider must be configured:

| Provider | What's needed |
|----------|---------------|
| `Claude API` | `ANTHROPIC_API_KEY` env var, or save a key in the panel UI |
| `Claude` | `claude` CLI installed and authenticated (`claude auth login`) |
| `Codex` | `codex` CLI installed and authenticated |

Only providers that are ready will appear in the picker.

## Step 6: (Optional) Set up sibling clone for knowledge regeneration

`scripts/generate-knowledge.mjs` reads verified AE-effect data from a sibling `ae-ai-starter` clone. If the user wants to regenerate the knowledge corpus after starter updates:

```bash
# clone ae-ai-starter next to ae-ai-chat (same parent directory)
git clone https://github.com/your-org/ae-ai-starter ../ae-ai-starter

# then regenerate:
node scripts/generate-knowledge.mjs
```

If the sibling clone is elsewhere, pass `--source <path>`:

```bash
node scripts/generate-knowledge.mjs --source /path/to/ae-ai-starter/Scripts/verified
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Panel opens blank / white | CEP debug mode not enabled — run the `defaults write` commands in Step 2 and restart AE |
| Panel not in Window menu | Symlink failed or AE not restarted — re-run `npm run symlink`, then restart AE |
| `npm install` fails | Check Node 18–24: `node --version` |
| No providers available in picker | No auth configured — set `ANTHROPIC_API_KEY` or install/auth a CLI provider |
| `generate-knowledge.mjs` fails with "Source path not found" | Sibling `ae-ai-starter` clone missing — clone it (Step 6) or pass `--source` |
