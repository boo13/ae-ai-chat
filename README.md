# AI Chat for After Effects

A CEP panel that provides a chat interface for communicating with Claude or Codex directly inside After Effects. Send instructions, get scripts generated, run common actions, and optionally attach comp screenshots without leaving the AE app.

## Architecture

- **CEP Panel** (Chromium + Node.js) docked inside After Effects
- **Svelte** for the chat UI with markdown rendering
- **Provider adapters** for Claude CLI or Codex CLI via Node.js `child_process`
- **ExtendScript bridge** for querying AE project state

## Platform

**macOS only.** Binary discovery (`findClaudePath`, `findCodexPath`) searches macOS/Linux paths only. Windows is not supported.

## Prerequisites

- After Effects 2023 or later
- Node.js 18–24 (Node 25+ is not recommended due to CEP compatibility)
- One AI CLI installed and authenticated:
  - [Claude CLI](https://docs.anthropic.com/en/docs/claude-code)
  - Codex CLI
- CEP debug mode enabled (use [ZXP Installer](https://aescripts.com/learn/zxp-installer/) > Settings > Enable Debugging)

## Setup

```bash
cd examples/ai-chat
npm install
npm run build:claude   # default provider
```

Restart After Effects, then open the panel: **Window > Extensions > AI Chat**

## Provider Selection

Claude is the default provider. Build or run the panel with the single provider you want to ship:

```bash
npm run build:claude
npm run build:codex
```

```bash
npm run dev:claude
npm run dev:codex
```

## Development

```bash
npm run dev      # same as default Claude provider
```

After starting dev mode, restart AE to load the extension. Changes to Svelte components hot-reload automatically.

## Usage

- **Type a message** to ask the active provider about your AE project. Context (active comp, layers, project path) is automatically included.
- **Model selector** in the header switches between the active provider's supported models.
- **Run Analysis** button executes the project analysis script directly in AE.
- **Describe Comp** asks the active provider to analyze the active composition.
- **Fix Last Error** sends the most recent error back to the active provider for diagnosis.
- **AI Action** reruns the current temporary script for this panel session after the AI has prepared one.
- **Shot** appears for providers that support image attachments and captures the current comp frame into a `screenshots/` folder next to the project file.

## Building for Production

```bash
npm run zxp:claude   # package the Claude variant
npm run zxp:codex    # package the Codex variant
```

## How It Works

1. Svelte UI captures user input
2. Context builder queries AE state via ExtendScript bridge (`evalTS`)
3. The selected AI CLI is spawned as a child process with project context appended
4. If the model includes an `<ai-action>` block, the panel writes it to `.session/ai-action.jsx` and can run it immediately
5. Response is rendered as markdown in the chat area
6. Provider-specific capabilities such as screenshot attachments are exposed through the same panel shell
