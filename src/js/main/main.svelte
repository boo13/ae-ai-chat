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
  import StatusBar from "../components/StatusBar.svelte";
  import type { ScriptValidationWarning } from "../lib/knowledge/validator";
  import type {
    ChatMessage,
    ProviderDefinition,
    ProviderStatusUpdate,
  } from "../lib/providers/provider";

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
  let aiActionWarnings: ScriptValidationWarning[] = $state([]);
  let activeAbortController: AbortController | null = $state(null);
  let activeStatus: ProviderStatusUpdate | null = $state(null);
  let statusClearTimer: ReturnType<typeof setTimeout> | null = null;
  let statusElapsedTimer: ReturnType<typeof setInterval> | null = null;
  let statusElapsedMs: number = $state(0);
  const STATUS_CLEAR_DELAY_MS = 2000;

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
    extra?: { duration_ms?: number }
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
    setStatus({
      phase: "cancelled",
      text: "Cancelling request...",
    });
    activeAbortController?.abort();
    activeAbortController = null;
  }

  function handleProviderSelect(provider: ProviderDefinition) {
    activeProvider = provider;
    model = provider.models[0]?.value || "";
    sessionId = undefined;
    messages = [];
    rememberError("");
    pendingScreenshot = null;
    setAiActionWarnings([]);
    setStatus(null);
    addMessage(
      "system",
      "AE AI Chat ready. Ask " +
        provider.displayName +
        " about your After Effects project."
    );
  }

  async function scrollToBottom() {
    await tick();
    if (chatArea) {
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  }

  async function handleSend(text: string) {
    if (!activeProvider) return;

    setAiActionWarnings([]);
    const history = messages.slice();
    addMessage("user", text);
    isLoading = true;
    const imagePath = pendingScreenshot?.path;
    pendingScreenshot = null;

    const controller = new AbortController();
    activeAbortController = controller;
    startStatusTimer();

    // Index of the streaming assistant message slot (-1 = not yet created)
    let streamingIdx = -1;

    try {
      setStatus({
        phase: "preparing",
        text: "Reading AE context...",
      });
      const context = await buildContext(text);
      sessionProjectRoot = context.projectRoot || sessionProjectRoot;

      if (!didInitializeAiAction && sessionProjectRoot) {
        clearAiAction(sessionProjectRoot);
        didInitializeAiAction = true;
      }

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

      if (result.sessionId) {
        sessionId = result.sessionId;
      }

      if (result.is_error) {
        // Remove the partial streaming message if we got an error
        if (streamingIdx !== -1) {
          messages.splice(streamingIdx, 1);
          streamingIdx = -1;
        }
        addMessage("system", result.result, {
          duration_ms: result.duration_ms,
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
          const warnings = parsed.validation?.warnings || [];
          setAiActionWarnings(warnings);

          setStatus({
            phase: "saving_action",
            text: "Saving AI Action...",
          });
          const saved = saveAiAction(context.projectRoot, parsed.scriptContent, displayText);
          addMessage("system", "AI Action ready: " + saved.summary);

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
            } else {
              setStatus({
                phase: "running_action",
                text: "Running AI Action...",
              });
              const runResult = await runAiAction(context.projectRoot);
              if (runResult && "error" in runResult && runResult.error) {
                setStatus({
                  phase: "error",
                  text: "AI Action failed.",
                  raw: String(runResult.error),
                  terminal: true,
                });
                addMessage("system", "AI Action failed: " + runResult.error);
                rememberError(
                  String(runResult.error),
                  typeof runResult.errorLine === "number" ? runResult.errorLine : null
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
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (streamingIdx !== -1) {
        messages.splice(streamingIdx, 1);
      }
      setStatus({
        phase: "error",
        text: "Unexpected panel error.",
        raw: errMsg,
        terminal: true,
      });
      addMessage("system", "Error: " + errMsg);
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
      addMessage("system", "Running analysis...");
      isLoading = true;
      try {
        const result = await evalTS("runAnalysisScript");
        if (result && "error" in result && result.error) {
          addMessage("system", "Analysis error: " + result.error);
          rememberError(String(result.error));
        } else {
          addMessage(
            "system",
            "Analysis complete. Context updated for next message."
          );
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        addMessage("system", "Analysis failed: " + errMsg);
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

      await handleSend(prompt);
      return;
    }

    if (action.handler === "runAiAction") {
      try {
        if (!sessionProjectRoot) {
          const context = await buildContext();
          sessionProjectRoot = context.projectRoot || sessionProjectRoot;
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
      await handleSend(action.prompt);
    }
  }

  onMount(() => {
    let disposed = false;

    buildContext()
      .then((context) => {
        if (disposed) return;
        sessionProjectRoot = context.projectRoot || sessionProjectRoot;
        if (!didInitializeAiAction && context.projectRoot) {
          clearAiAction(context.projectRoot);
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
    <header class="header">
      <span class="header__title">AE AI Chat</span>
      <div class="header__controls">
        <select class="model-select" bind:value={model}>
          {#each activeProvider.models as providerModel}
            <option value={providerModel.value}>{providerModel.label}</option>
          {/each}
        </select>
      </div>
    </header>

    <div class="chat-area" bind:this={chatArea}>
      {#each messages as msg}
        <ChatMessageComponent
          assistantName={activeProvider.displayName}
          role={msg.role}
          content={msg.content}
          timestamp={msg.timestamp}
          duration_ms={msg.duration_ms}
        />
      {/each}
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
        <div class="validation-banner__title">AI Action validation warnings</div>
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

    {#if activeStatus}
      <StatusBar
        providerName={activeProvider.displayName}
        status={activeStatus}
        elapsedMs={statusElapsedMs}
      />
    {/if}

    <ActionBar
      disabled={isLoading}
      supportsImages={activeProvider.supportsImages}
      onclick={handleAction}
    />
    <ChatInput
      assistantName={activeProvider.displayName}
      disabled={isLoading}
      onsubmit={handleSend}
      oncancel={activeAbortController ? handleCancel : undefined}
    />
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
    background: #232323;
    color: #d4d4d4;
    overflow: hidden;
  }
  :global(*) {
    box-sizing: border-box;
  }
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #232323;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #1a1a1a;
    border-bottom: 1px solid #333;
    flex-shrink: 0;
  }
  .header__title {
    font-size: 13px;
    font-weight: 600;
    color: #eee;
  }
  .header__controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .model-select {
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    color: #ccc;
    padding: 3px 6px;
    font-size: 11px;
    cursor: pointer;
  }
  .model-select:focus {
    outline: none;
    border-color: #4a9eff;
  }
  .chat-area {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }
  .chat-area::-webkit-scrollbar {
    width: 6px;
  }
  .chat-area::-webkit-scrollbar-track {
    background: transparent;
  }
  .chat-area::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 3px;
  }
  .pending-screenshot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 12px;
    background: #2a2a2a;
    border-top: 1px solid #333;
    font-size: 11px;
    color: #4a9eff;
  }
  .pending-screenshot__clear {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    font-size: 11px;
    padding: 0;
  }
  .pending-screenshot__clear:hover {
    color: #eee;
  }
  .validation-banner {
    margin: 8px 12px 0;
    padding: 10px 12px;
    border: 1px solid #8a5a1d;
    border-radius: 6px;
    background: #2b2114;
    color: #f2d3a2;
  }
  .validation-banner__title {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 6px;
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
    color: #c6a46c;
    margin-left: 6px;
    font-family: "SF Mono", "Menlo", monospace;
    font-size: 11px;
  }
  .validation-banner__hint {
    font-size: 11px;
    color: #d8ba86;
    margin-top: 6px;
  }
</style>
