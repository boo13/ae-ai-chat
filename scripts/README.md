# Development scripts

`pnpm preview:fixture` builds the real Svelte panel into
`.session/panel-preview/index.html`. Open that file in a browser for UI checks
without a local server, After Effects, or a paid model request. Only the AE bridge,
providers, action execution, and update check are mocked. The fixture uses its own
browser origin storage and never runs generated scripts.

Use the fixture project and selection controls to exercise project changes and
suggestions. Prompts containing `stage`, `empty`, `fail`, or `unsafe review`
respectively stage an action, return no changes, simulate a partial execution
failure, or return prohibited action markup during review. Execution and review
counts are shown above the panel. Reload to test saved chats and drafts.

`pnpm test:ui` compiles the same fixture and exercises it with Happy DOM, with
network access disabled. It checks chat/draft restoration, provider and project
switches, preset preparation, action execution counts, and result review. It
does not verify visual layout. `pnpm check` includes this interaction suite
alongside unit tests, typechecking, recipe matching checks, and the CEP build.
This fixture is an additional interactive check, not evidence of live AE
script compatibility. Existing live runtime checks use `pnpm recipes:verify` and
`pnpm verify:e2e` with AE and the dev panel open.
