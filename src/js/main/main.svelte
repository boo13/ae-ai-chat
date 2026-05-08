<script lang="ts">
  import { onMount, tick } from "svelte";
  import { evalTS } from "../lib/utils/bolt";
  import ProviderPicker from "../components/ProviderPicker.svelte";
  import { providerRegistry } from "../lib/provider-config";
  import {
    annotateScriptWithError,
    clearAiAction,
    parseAiActionResponse,
    readAiActionScript,
    runAiAction,
    saveAiAction,
  } from "../lib/ai-action";
  import { buildContext } from "../lib/context";
  import { getErrorHint } from "../lib/error-patterns";
  import ChatMessageComponent from "../components/ChatMessage.svelte";
  import ChatInput from "../components/ChatInput.svelte";
  import ActionBar from "../components/ActionBar.svelte";
  import ErrorBlock from "../components/ErrorBlock.svelte";
  import PanelHeader from "../components/PanelHeader.svelte";
  import StreamingRow from "../components/StreamingRow.svelte";
  import Suggestions from "../components/Suggestions.svelte";
  import type { ScriptValidationError, ScriptValidationWarning } from "../lib/knowledge/validator";
  import { buildAutoFixPrompt } from "../lib/auto-fix";
  import { getRuntimeEnvironment } from "../lib/runtime-environment";
  import type { ExpressionError } from "../lib/auto-fix";
  import type {
    ChatMessage,
    ProviderDefinition,
    ProviderStatusUpdate,
  } from "../lib/providers/provider";
  import type { ContextChip } from "../../shared/shared";
  import { version } from "../../../package.json";

  const runtimeEnvironment = getRuntimeEnvironment();
  const runtimeEnvironmentTitle = (() => {
    const installPath = runtimeEnvironment.realExtensionPath || runtimeEnvironment.extensionPath;
    return installPath
      ? runtimeEnvironment.reason + ": " + installPath
      : runtimeEnvironment.reason;
  })();

  let messages: ChatMessage[] = $state([]);
  let isLoading: boolean = $state(false);
  let activeProvider: ProviderDefinition | null = $state(null);
  let model: string = $state(providerRegistry[0]?.models[0]?.value || "");
  let sessionId: string | undefined = $state(undefined);
  let chatArea: HTMLDivElement | undefined = $state();
  let lastError: string = $state("");
  let lastErrorLine: number | null = $state(null);
  let pendingScreenshot: { path: string; fileName: string } | null = $state(null);
  let sessionProjectRoot: string | undefined = $state();
  let didInitializeAiAction: boolean = $state(false);
  let aiActionReady: boolean = $state(false);
  let aiActionWarnings: ScriptValidationWarning[] = $state([]);
  let aiActionErrors: ScriptValidationError[] = $state([]);
  let activeAbortController: AbortController | null = $state(null);
  let activeStatus: ProviderStatusUpdate | null = $state(null);
  let pendingContexts: ContextChip[] = $state([]);
  let statusClearTimer: ReturnType<typeof setTimeout> | null = null;
  let statusElapsedTimer: ReturnType<typeof setInterval> | null = null;
  let statusElapsedMs: number = $state(0);
  const STATUS_CLEAR_DELAY_MS = 2000;

  let autoFixAttempt: number = $state(0);
  let autoFixOriginalPrompt: string = $state("");
  let autoFixAborted: boolean = $state(false);
  const AUTO_FIX_MAX = 3;

  function cancelStatusClear() {
    if (statusClearTimer) {
      clearTimeout(statusClearTimer);
      statusClearTimer = null;
    }
  }

  function stopStatusTimer() {
    if (statusElapsedTimer) {
      clearInterval(statusElapsedTimer);
      statusElapsedTimer = null;
    }
  }

  function startStatusTimer() {
    stopStatusTimer();
    const startedAt = Date.now();
    statusElapsedMs = 0;
    statusElapsedTimer = setInterval(() => {
      statusElapsedMs = Date.now() - startedAt;
    }, 250);
  }

  function setStatus(status: ProviderStatusUpdate | null) {
    cancelStatusClear();
    activeStatus = status;
    if (status === null) {
      stopStatusTimer();
      statusElapsedMs = 0;
    }
  }

  function clearStatusSoon(delay = STATUS_CLEAR_DELAY_MS) {
    cancelStatusClear();
    if (!activeStatus) {
      stopStatusTimer();
      statusElapsedMs = 0;
      return;
    }
    statusClearTimer = setTimeout(() => {
      stopStatusTimer();
      statusElapsedMs = 0;
      activeStatus = null;
      statusClearTimer = null;
    }, delay);
  }

  function addMessage(
    role: ChatMessage["role"],
    content: string,
    extra?: { duration_ms?: number; isError?: boolean; diagnosticsRaw?: string }
  ): number {
    messages.push({
      role,
      content,
      timestamp: Date.now(),
      ...extra,
    });
    scrollToBottom();
    return messages.length - 1;
  }

  function formatMessageTime(timestamp: number): string {
    const d = new Date(timestamp);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  function appendToMessage(index: number, chunk: string) {
    if (index >= 0 && index < messages.length) {
      messages[index].content += chunk;
      scrollToBottom();
    }
  }

  function setAiActionWarnings(warnings: ScriptValidationWarning[]) {
    aiActionWarnings = warnings;
  }

  function rememberError(error: string, errorLine: number | null = null) {
    lastError = error;
    lastErrorLine = errorLine;
  }

  function handleCancel() {
    autoFixAborted = true;
    setStatus({
      phase: "cancelled",
      text: "Cancelling request...",
    });
    activeAbortController?.abort();
    activeAbortController = null;
  }

  async function triggerAutoFix(
    errorString: string,
    errorLine: number | null,
    script: string | null,
    expressionErrors: ExpressionError[],
    validationErrors: ScriptValidationError[],
    validationWarnings: ScriptValidationWarning[] = []
  ) {
    if (autoFixAborted) {
      addMessage("system", "Auto-fix cancelled.");
      return;
    }
    if (autoFixAttempt >= AUTO_FIX_MAX) {
      addMessage(
        "system",
        `Auto-fix gave up after ${AUTO_FIX_MAX} attempts. Review the errors or start a new prompt.`
      );
      return;
    }
    autoFixAttempt += 1;
    addMessage(
      "system",
      `Auto-fix attempt ${autoFixAttempt}/${AUTO_FIX_MAX} — sending error context to model.`
    );
    const fixPrompt = buildAutoFixPrompt({
      attemptNumber: autoFixAttempt,
      maxAttempts: AUTO_FIX_MAX,
      originalUserMessage: autoFixOriginalPrompt,
      errorString,
      errorLine,
      script,
      expressionErrors,
      validationErrors,
      validationWarnings,
    });
    await handleSend(fixPrompt, true);
  }

  function handleProviderSelect(provider: ProviderDefinition) {
    activeProvider = provider;
    model = provider.models[0]?.value || "";
    localStorage.setItem("selectedProviderId", provider.id);
    sessionId = undefined;
    messages = [];
    rememberError("");
    pendingScreenshot = null;
    aiActionReady = false;
    setAiActionWarnings([]);
    setStatus(null);
    autoFixAttempt = 0;
    autoFixOriginalPrompt = "";
    autoFixAborted = false;
    pendingContexts = [];
    addMessage(
      "system",
      provider.displayName + " ready. Ask about your After Effects project."
    );
  }

  function contextKey(ctx: ContextChip): string {
    if (ctx.type === "comp") {
      return "comp:" + ctx.compId;
    }

    if (ctx.type === "layer") {
      return "layer:" + ctx.compName + ":" + ctx.layerIndex;
    }

    return (
      "effect:" +
      ctx.layerIndex +
      ":" +
      ctx.layerName +
      ":" +
      ctx.matchName +
      ":" +
      ctx.effectIndex
    );
  }

  function handleContextAdd(chip: ContextChip) {
    const key = contextKey(chip);
    if (pendingContexts.some((ctx) => contextKey(ctx) === key)) return;
    pendingContexts = [...pendingContexts, chip];
  }

  function handleContextRemove(index: number) {
    pendingContexts = pendingContexts.filter((_, i) => i !== index);
  }

  async function handleUserSend(text: string) {
    const ctxs = pendingContexts.slice();
    pendingContexts = [];
    await handlePromptSend(text, ctxs);
  }

  async function handlePromptSend(text: string, pinned?: ContextChip[]) {
    autoFixAttempt = 0;
    autoFixOriginalPrompt = text;
    autoFixAborted = false;
    rememberError("");
    await handleSend(text, false, pinned);
  }

  async function scrollToBottom() {
    await tick();
    if (chatArea) {
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  }

  async function handleSend(text: string, isAutoFix = false, pinned?: ContextChip[]) {
    if (!activeProvider) return;

    setAiActionWarnings([]);
    aiActionErrors = [];
    const history = messages.slice();
    if (!isAutoFix) {
      addMessage("user", text);
    }
    isLoading = true;
    const imagePath = pendingScreenshot?.path;
    pendingScreenshot = null;

    const controller = new AbortController();
    activeAbortController = controller;
    startStatusTimer();

    // Index of the streaming assistant message slot (-1 = not yet created)
    let streamingIdx = -1;
    let providerCallInFlight = false;

    try {
      setStatus({
        phase: "preparing",
        text: "Reading AE context...",
      });
      const context = await buildContext(text, pinned);
      sessionProjectRoot = context.projectRoot || sessionProjectRoot;

      if (!didInitializeAiAction && sessionProjectRoot) {
        clearAiAction(sessionProjectRoot);
        aiActionReady = false;
        didInitializeAiAction = true;
      }

      providerCallInFlight = true;
      const result = await activeProvider.sendMessage(
        text,
        {
          model,
          systemContext: context.systemContext,
          sessionId,
          imagePath,
          projectRoot: context.projectRoot,
          signal: controller.signal,
          onChunk: (chunk) => {
            if (streamingIdx === -1) {
              streamingIdx = addMessage("assistant", chunk);
            } else {
              appendToMessage(streamingIdx, chunk);
            }
          },
          onStatus: (status) => {
            setStatus(status);
          },
        },
        history
      );
      providerCallInFlight = false;

      if (result.sessionId) {
        sessionId = result.sessionId;
      }

      if (result.is_error) {
        const isProviderError = result.is_error && !result.cancelled;
        // Remove the partial streaming message if we got an error
        if (streamingIdx !== -1) {
          messages.splice(streamingIdx, 1);
          streamingIdx = -1;
        }
        addMessage("system", result.result, {
          duration_ms: result.duration_ms,
          isError: isProviderError,
          diagnosticsRaw: isProviderError ? activeStatus?.raw : undefined,
        });
        if (!result.cancelled) rememberError(result.result);
      } else {
        const parsed = parseAiActionResponse(result.result);
        const displayText = parsed.displayText || "AI Action updated.";

        if (streamingIdx !== -1) {
          // Update the streamed message with the cleaned display text and duration
          messages[streamingIdx].content = displayText;
          messages[streamingIdx].duration_ms = result.duration_ms;
        } else {
          addMessage("assistant", displayText, {
            duration_ms: result.duration_ms,
          });
        }

        if (parsed.multipleBlocks) {
          addMessage("system", "Multiple AI Action blocks found — only the first was applied.");
        }

        if (parsed.scriptContent) {
          const validationErrors = parsed.validation?.errors || [];
          const warnings = parsed.validation?.warnings || [];
          setAiActionWarnings(warnings);

          setStatus({
            phase: "saving_action",
            text: "Saving AI Action...",
          });
          const saved = saveAiAction(context.projectRoot, parsed.scriptContent, displayText);
          addMessage("system", "AI Action ready: " + saved.summary);

          if (validationErrors.length > 0) {
            aiActionReady = false;
            aiActionErrors = validationErrors;
            addMessage(
              "system",
              "AI Action blocked by validation errors:\n" +
                validationErrors.map((e) => `  [${e.code}] ${e.message}`).join("\n")
            );
            setStatus({
              phase: "error",
              text: "AI Action blocked — validation errors.",
              terminal: true,
            });
            rememberError(validationErrors.map((e) => e.message).join("; "), null);
            await triggerAutoFix(
              validationErrors.map((e) => e.message).join("; "),
              null,
              parsed.scriptContent,
              [],
              validationErrors
            );
          } else {
            aiActionReady = true;
            if (warnings.length > 0) {
              addMessage(
                "system",
                warnings.map((warning) => warning.message).join("\n")
              );
            }

            if (parsed.runImmediately) {
              if (warnings.length > 0) {
                setStatus({
                  phase: "completed",
                  text: "AI Action saved with validation warnings.",
                  terminal: true,
                });
                addMessage(
                  "system",
                  "AI Action was not run automatically. Review the warnings, click AI Action to run anyway, or ask the assistant to fix the script."
                );
                rememberError(warnings.map((w) => w.message).join("; "), null);
                await triggerAutoFix(
                  warnings.map((w) => w.message).join("; "),
                  null,
                  parsed.scriptContent,
                  [],
                  [],
                  warnings
                );
              } else {
                setStatus({
                  phase: "running_action",
                  text: "Running AI Action...",
                });
                const runResult = await runAiAction(context.projectRoot);
                const exprErrors: ExpressionError[] =
                  (runResult as any)?.expressionErrors || [];

                if (runResult && "error" in runResult && runResult.error) {
                  const errorStr = String(runResult.error);
                  const errorLine =
                    typeof runResult.errorLine === "number" ? runResult.errorLine : null;
                  setStatus({
                    phase: "error",
                    text: "AI Action failed.",
                    raw: errorStr,
                    terminal: true,
                  });
                  addMessage("system", "AI Action failed: " + errorStr);
                  rememberError(errorStr, errorLine);
                  await triggerAutoFix(
                    errorStr,
                    errorLine,
                    parsed.scriptContent,
                    exprErrors,
                    []
                  );
                } else if (exprErrors.length > 0) {
                  const exprSummary = exprErrors
                    .map(
                      (e) =>
                        `prop "${e.name || "?"}" line ${e.line}: ${e.error}`
                    )
                    .join("; ");
                  setStatus({
                    phase: "error",
                    text: "AI Action ran with expression errors.",
                    terminal: true,
                  });
                  addMessage("system", "AI Action ran but expression errors occurred:\n" +
                    exprErrors.map((e) =>
                      `  prop "${e.name || "?"}" line ${e.line}: ${e.error}` +
                      (e.expr ? `\n    expr: "${e.expr}"` : "")
                    ).join("\n")
                  );
                  rememberError(exprSummary, null);
                  await triggerAutoFix(
                    exprSummary,
                    null,
                    parsed.scriptContent,
                    exprErrors,
                    []
                  );
                } else {
                  setStatus({
                    phase: "completed",
                    text: "AI Action executed successfully.",
                    terminal: true,
                  });
                  addMessage("system", "AI Action executed successfully.");
                }
              }
            } else {
              setStatus({
                phase: "completed",
                text: "AI Action ready.",
                terminal: true,
              });
            }
          }
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isProviderRuntimeError = providerCallInFlight;
      providerCallInFlight = false;
      if (streamingIdx !== -1) {
        messages.splice(streamingIdx, 1);
      }
      setStatus({
        phase: "error",
        text: "Unexpected panel error.",
        raw: errMsg,
        terminal: true,
      });
      addMessage("system", "Error: " + errMsg, {
        isError: isProviderRuntimeError,
        diagnosticsRaw: isProviderRuntimeError ? activeStatus?.raw : undefined,
      });
      rememberError(errMsg);
    } finally {
      isLoading = false;
      activeAbortController = null;
      clearStatusSoon();
    }
  }

  async function handleScreenshot() {
    isLoading = true;

    try {
      const timestamp = Date.now().toString();
      const result = await evalTS("takeScreenshot", timestamp);

      if (result && "error" in result && result.error) {
        addMessage("system", "Screenshot error: " + result.error);
      } else if (result && "path" in result && "fileName" in result) {
        const screenshotPath = String(result.path || "");
        const screenshotFileName = String(result.fileName || "");
        pendingScreenshot = {
          path: screenshotPath,
          fileName: screenshotFileName,
        };
        addMessage("system", "Screenshot captured: " + screenshotFileName);
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      addMessage("system", "Screenshot failed: " + errMsg);
      rememberError(errMsg);
    } finally {
      isLoading = false;
    }
  }

  async function handleAction(action: {
    label: string;
    prompt?: string;
    handler?: string;
  }) {
    if (action.handler === "takeScreenshot") {
      await handleScreenshot();
      return;
    }

    if (action.handler === "runAnalysis") {
      addMessage("system", "Building report...");
      isLoading = true;
      try {
        const result = await evalTS("runAnalysisScript");
        if (result && "error" in result && result.error) {
          addMessage("system", "Report error: " + result.error);
          rememberError(String(result.error));
        } else {
          addMessage(
            "system",
            "Report complete. Context updated for next message."
          );
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        addMessage("system", "Report failed: " + errMsg);
        rememberError(errMsg);
      } finally {
        isLoading = false;
      }
      return;
    }

    if (action.handler === "fixLastError") {
      if (!lastError) {
        addMessage("system", "No recent error to fix.");
        return;
      }
      const script = readAiActionScript(sessionProjectRoot);
      const hint = getErrorHint(lastError);
      let prompt = "Diagnose this error and suggest or implement a fix:\n\nError: " + lastError;

      if (script) {
        const annotated = annotateScriptWithError(script, lastError, lastErrorLine ?? undefined);
        prompt += "\n\nScript that produced this error:\n```jsx\n" + annotated + "\n```";
      }

      if (hint) {
        prompt += "\n\nHint: " + hint;
      }

      await handlePromptSend(prompt);
      return;
    }

    if (action.handler === "runAiAction") {
      try {
        if (!sessionProjectRoot) {
          const context = await buildContext();
          sessionProjectRoot = context.projectRoot || sessionProjectRoot;
        }

        if (aiActionErrors.length > 0) {
          addMessage(
            "system",
            "AI Action is blocked by validation errors. Ask the assistant to fix the script first."
          );
          return;
        }

        if (aiActionWarnings.length > 0) {
          addMessage("system", "Running AI Action despite validation warnings.");
        }

        const runResult = await runAiAction(sessionProjectRoot);
        if (runResult && "error" in runResult && runResult.error) {
          addMessage("system", "AI Action failed: " + runResult.error);
          rememberError(
            String(runResult.error),
            typeof runResult.errorLine === "number" ? runResult.errorLine : null
          );
        } else {
          setAiActionWarnings([]);
          aiActionErrors = [];
          addMessage("system", "AI Action executed successfully.");
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        addMessage("system", "AI Action unavailable: " + errMsg);
        rememberError(errMsg);
      }
      return;
    }

    if (action.prompt) {
      await handlePromptSend(action.prompt);
    }
  }

  onMount(() => {
    let disposed = false;

    const lastProviderId = localStorage.getItem("selectedProviderId");
    if (lastProviderId) {
      const provider = providerRegistry.find((p) => p.id === lastProviderId);
      if (provider) {
        provider.isAvailable().then((availability) => {
          if (availability.available && !disposed) {
            handleProviderSelect(provider);
          }
        });
      }
    }

    buildContext()
      .then((context) => {
        if (disposed) return;
        sessionProjectRoot = context.projectRoot || sessionProjectRoot;
        if (!didInitializeAiAction && context.projectRoot) {
          clearAiAction(context.projectRoot);
          aiActionReady = false;
          didInitializeAiAction = true;
        }
      })
      .catch(() => {});

    return () => {
      disposed = true;
      cancelStatusClear();
      stopStatusTimer();
      if (sessionProjectRoot) {
        clearAiAction(sessionProjectRoot);
      }
    };
  });
</script>

{#if !activeProvider}
  <ProviderPicker onSelect={handleProviderSelect} />
{:else}
  <div class="app">
    <PanelHeader
      {activeProvider}
      {runtimeEnvironment}
      {runtimeEnvironmentTitle}
      {version}
      {model}
      disabled={isLoading}
      onModelChange={(value) => (model = value)}
      onProviderChange={handleProviderSelect}
    />

    <div class="chat-area" bind:this={chatArea} data-select-scope="chat-history">
      {#each messages as msg}
        {#if msg.isError}
          <ErrorBlock
            time={formatMessageTime(msg.timestamp)}
            content={msg.content}
            diagnosticsRaw={msg.diagnosticsRaw}
            providerName={activeProvider.displayName}
          />
        {:else}
          <ChatMessageComponent
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
            duration_ms={msg.duration_ms}
          />
        {/if}
      {/each}

      {#if isLoading}
        <StreamingRow
          providerName={activeProvider.displayName}
          elapsedMs={statusElapsedMs}
        />
      {/if}

      {#if messages.length === 1 && messages[0]?.role === "system" && !messages[0]?.isError && !isLoading}
        <Suggestions onpick={handleUserSend} />
      {/if}
    </div>

    {#if pendingScreenshot}
      <div class="pending-screenshot">
        <span class="pending-screenshot__label">Attached: {pendingScreenshot.fileName}</span>
        <button class="pending-screenshot__clear" onclick={() => (pendingScreenshot = null)}>
          Clear
        </button>
      </div>
    {/if}

    {#if aiActionWarnings.length > 0}
      <div class="validation-banner">
        <div class="validation-banner__header">
          <div class="validation-banner__title">AI Action validation warnings</div>
          <button class="validation-banner__close" aria-label="Dismiss" onclick={() => setAiActionWarnings([])}>×</button>
        </div>
        <ul class="validation-banner__list">
          {#each aiActionWarnings as warning}
            <li>
              <span>{warning.message}</span>
              <span class="validation-banner__meta">
                {warning.occurrences
                  .map((occurrence) => `L${occurrence.line}:C${occurrence.column}`)
                  .join(", ")}
              </span>
            </li>
          {/each}
        </ul>
        <div class="validation-banner__hint">
          Click AI Action to run anyway, or ask the assistant to revise the script.
        </div>
      </div>
    {/if}

    <ChatInput
      disabled={isLoading}
      providerName={activeProvider.displayName}
      contexts={pendingContexts}
      onsubmit={handleUserSend}
      oncancel={activeAbortController ? handleCancel : undefined}
      onContextAdd={handleContextAdd}
      onContextRemove={handleContextRemove}
    />
    <ActionBar
      disabled={isLoading}
      supportsImages={activeProvider.supportsImages}
      hasError={Boolean(lastError)}
      {aiActionReady}
      aiActionBlocked={aiActionErrors.length > 0}
      onclick={handleAction}
    />
  </div>
{/if}

<style>
  :global(:root) {
    --ae-bg: #1c1c1c;
    --ae-bg-2: #232323;
    --ae-bg-3: #2a2a2a;
    --ae-chrome-bg: rgb(14,14,14);
    --ae-line: rgba(255,255,255,0.06);
    --ae-line-2: rgba(255,255,255,0.10);
    --ae-text: #e6e6e6;
    --ae-text-2: #a0a0a0;
    --ae-text-3: #6e6e6e;
    --accent: #4ec38b;
    --ae-accent-deep: #3a7df0;
    --ae-warn: #ff8e6a;
    --ae-ok: #4ec38b;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
    background: var(--ae-bg);
    color: var(--ae-text);
    overflow: hidden;
  }

  :global(*) {
    box-sizing: border-box;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--ae-bg);
    color: var(--ae-text);
  }

  .chat-area {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 0 6px;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.12) transparent;
  }

  .chat-area::-webkit-scrollbar {
    width: 8px;
  }

  .chat-area::-webkit-scrollbar-track {
    background: transparent;
  }

  .chat-area::-webkit-scrollbar-thumb {
    border: 2px solid transparent;
    border-radius: 4px;
    background: rgba(255,255,255,0.12);
    background-clip: content-box;
  }

  .chat-area::-webkit-scrollbar-thumb:hover {
    border: 2px solid transparent;
    background: rgba(255,255,255,0.20);
    background-clip: content-box;
  }

  .pending-screenshot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 12px;
    border-top: 1px solid var(--ae-line);
    background: var(--ae-bg-2);
    color: var(--accent);
    font-size: 11px;
  }

  .pending-screenshot__clear {
    background: none;
    border: none;
    color: var(--ae-text-3);
    cursor: pointer;
    font-size: 11px;
    padding: 0;
  }

  .pending-screenshot__clear:hover {
    color: var(--ae-text);
  }

  .validation-banner {
    margin: 8px 12px 0;
    padding: 10px 12px;
    border: 1px solid rgba(255,142,106,0.32);
    border-radius: 8px;
    background: rgba(255,142,106,0.08);
    color: rgb(242,211,162);
  }

  .validation-banner__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .validation-banner__title {
    font-size: 12px;
    font-weight: 600;
  }

  .validation-banner__close {
    background: none;
    border: none;
    color: rgba(242,211,162,0.70);
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0 2px;
  }

  .validation-banner__close:hover {
    color: rgb(242,211,162);
  }

  .validation-banner__list {
    margin: 0;
    padding-left: 18px;
  }

  .validation-banner__list li {
    margin: 0 0 6px;
    font-size: 12px;
    line-height: 1.4;
  }

  .validation-banner__meta {
    color: rgba(242,211,162,0.72);
    margin-left: 6px;
    font-family: "SF Mono", "Menlo", monospace;
    font-size: 11px;
  }

  .validation-banner__hint {
    font-size: 11px;
    color: rgba(242,211,162,0.82);
    margin-top: 6px;
  }
</style>
