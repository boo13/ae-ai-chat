# Project chat workspace

## Goal

Make the panel remember useful work, expose actions beside their messages, and
report execution evidence immediately. Build on the existing CEP bridge,
providers, validator, and run snapshots. Preserve unrelated in-progress recipes
and validator changes.

## Requirements

- Save conversations and unfinished prompts locally, grouped by the full AE
  project path. Offer new chats, conversation selection, copy, and Markdown export.
- Preserve messages when changing providers. Remember a model per provider, and
  seed fresh CLI sessions from bounded conversation history after restoration.
- Attach each generated script to its own action card with review, explicit run,
  warnings/errors, measured changes, and a reusable-preset control.
- Save creative presets as prompts with adjustable color, intensity, and duration.
  Preparing a preset fills the composer for the current selection; it does not
  blindly execute a script recorded against an old layer stack.
- Derive suggestions from the current composition and selected layer types.
- Offer immediate model review using one isolated, tool-free request after an
  execution. Retain deterministic results when review is unavailable, interrupted,
  or fails. An empty diff stays inconclusive. Review output cannot execute actions.
- Cover automatic actions, manual runs, and tutorial steps through the same result
  handling. When verification is enabled, an execution failure must not launch
  another automatic mutation.

## Implementation decisions

- Use versioned local storage with bounded history and explicit storage errors.
  No credentials, diagnostic payloads, or CLI session IDs enter this store.
- Offer export and confirmed removal across projects to recover storage space,
  plus backup and confirmed replacement when stored data cannot be read.
- Restore interrupted actions as inconclusive and require explicit user execution.
- Check project identity before execution and refresh context when the panel
  regains focus. Keep new metadata in the existing snapshot pipeline.
- Claude API review has no tools; Claude CLI review requires safe mode, no tools,
  no MCP servers, no session persistence, and a fresh reviewer system prompt.
  Unsupported Claude CLI versions fail closed. Codex shows measured evidence
  because a reliable tool-free mode has not been established locally.
- Retain the existing panel theme and compact proportions; use left-aligned text
  and accessible controls. Add no frontend or storage dependencies.
- This is a bounded evidence-review feature. The older validated-agent-loop plan's
  broader provider isolation, visual review, and multi-call repair state machine
  are not implied by this implementation.

## Verification

- Unit tests: malformed/oversized/quota-failed storage, project identity,
  interrupted restoration, transcript export, preset parameters, contextual
  suggestions, execution evidence, cancelled/failed model reviews, rejection of
  runnable review output, and fresh-session history seeding.
- Run `pnpm check`, including typechecking, unit tests, recipe checks, and CEP build.
- Exercise actual Svelte components in a browser fixture with mocked AE/provider
  boundaries: new/restore/switch chat, draft persistence, provider change, action
  review/run/result, presets, and copy/export. Inspect narrow and wide panel views.
- Verify no changes to pre-existing dirty files. Review before commit/push and
  inspect the GitHub check. Do not claim live AE execution from fixture tests.

## Verification result

- Typechecking, unit tests, DOM integration flows, recipe checks, and CEP build
  passed. The DOM fixture covers explicit retry, cancellation after streaming,
  storage quota recovery, and confirmed replacement of unreadable data as well
  as the primary product flows.
- Browser navigation to the local fixture was blocked by browser policy.
  DOM tests do not establish visual layout, live CEP rendering, or live AE behavior;
  those checks remain outstanding.
