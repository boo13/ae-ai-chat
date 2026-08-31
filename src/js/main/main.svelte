<script lang="ts">
  import { onMount, tick, untrack } from "svelte";
  import { evalTS, openLinkInBrowser } from "../lib/utils/bolt";
  import ProviderPicker from "../components/ProviderPicker.svelte";
  import { providerRegistry } from "../lib/provider-config";
  import {
    annotateScriptWithError,
    clearAiAction,
    parseAiActionResponse,
    readAiActionScript,
    revealAiActionInFinder,
    runAiAction,
    saveAiAction,
    scanActionRisk,
  } from "../lib/ai-action";
  import ScriptViewer from "../components/ScriptViewer.svelte";
  import TutorialViewer from "../components/TutorialViewer.svelte";
  import {
    buildContext,
    getWorkspaceContext,
    type ChatContext,
    type ChatMode,
    type LastActionResult,
  } from "../lib/context";
  import {
    outlineForHistory,
    parseTutorialResponse,
    type ParsedTutorial,
    type TutorialStepAction,
  } from "../lib/tutorial";
  import { logFailure } from "../lib/error-log";
  import { getErrorHint } from "../lib/error-patterns";
  import ChatMessageComponent from "../components/ChatMessage.svelte";
  import ChatInput from "../components/ChatInput.svelte";
  import ActionBar from "../components/ActionBar.svelte";
  import ErrorBlock from "../components/ErrorBlock.svelte";
  import PanelHeader from "../components/PanelHeader.svelte";
  import StreamingRow from "../components/StreamingRow.svelte";
  import Suggestions from "../components/Suggestions.svelte";
  import UpdateBanner from "../components/UpdateBanner.svelte";
  import WorkspaceBar from "../components/WorkspaceBar.svelte";
  import ActionCard from "../components/ActionCard.svelte";
  import { STORAGE_KEY, createWorkspaceState, createConversation, loadWorkspace, saveWorkspace, conversationMarkdown, createPreset, buildPresetPrompt, type Conversation, type WorkspaceMessage, type ActionRecord, type CreativePreset } from "../lib/workspace-state";
  import { summarizeActionResult, reviewActionResult } from "../lib/action-evidence";
  import { selectionSuggestions, type SelectionSummary } from "../lib/selection-suggestions";
  import { copyText, exportMarkdown } from "../lib/chat-export";
  import { validateScript } from "../lib/knowledge/validator";
  import type { ScriptValidationError, ScriptValidationWarning } from "../lib/knowledge/validator";
  import { buildAutoFixPrompt } from "../lib/auto-fix";
  import { getRuntimeEnvironment } from "../lib/runtime-environment";
  import { installTestHarness } from "../lib/test-harness";
  import type { ExpressionError } from "../lib/auto-fix";
  import type { ErrorKind, TriggerPath } from "../lib/error-log";
  import type {
    ChatMessage,
    ProviderDefinition,
    ProviderStatusUpdate,
  } from "../lib/providers/provider";
  import type { ContextChip } from "../../shared/shared";
  import { version } from "../../../package.json";
  import {
    checkForUpdate,
    dismissUpdate,
    type AvailableUpdate,
  } from "../lib/update-check";

  const runtimeEnvironment = getRuntimeEnvironment();
  const runtimeEnvironmentTitle = (() => {
    const installPath = runtimeEnvironment.realExtensionPath || runtimeEnvironment.extensionPath;
    return installPath
      ? runtimeEnvironment.reason + ": " + installPath
      : runtimeEnvironment.reason;
  })();

  let messages: WorkspaceMessage[] = $state([]);
  let workspace = $state(createWorkspaceState());
  let workspaceLoaded = $state(false);
  let conversationId = $state("");
  let draft = $state("");
  let projectKey = $state("unsaved");
  let projectName = $state("Unsaved project");
  let selection: SelectionSummary = $state({ hasComp: false, layerTypes: [], layerNames: [] });
  let storageError = $state("");
  let notice = $state("");
  let storageBlocked = $state(false);
  let recoveryPending = $state(false);
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let refreshingContext = false;
  let disposed = false;
  let stagedAction: ActionRecord | null = $state(null);
  const projectConversations = $derived(conversationsForProject(projectKey));
  let isLoading: boolean = $state(false);
  let activeProvider: ProviderDefinition | null = $state(null);
  let model: string = $state(providerRegistry[0]?.models[0]?.value || "");
  let sessionId: string | undefined = $state(undefined);
  let chatArea: HTMLDivElement | undefined = $state();
  let lastError: string = $state("");
  const suggestions = $derived(selectionSuggestions(selection, Boolean(lastError)));
  let lastErrorLine: number | null = $state(null);
  let pendingScreenshot: { path: string; fileName: string } | null = $state(null);
  let sessionProjectRoot: string | undefined = $state();
  let didInitializeAiAction: boolean = $state(false);
  let aiActionReady: boolean = $state(false);
  let aiActionWarnings: ScriptValidationWarning[] = $state([]);
  let aiActionErrors: ScriptValidationError[] = $state([]);
  let aiActionInjectedRecipeIds: string[] = $state([]);
  let aiActionOriginalUserMessage: string = $state("");
  let scriptViewerOpen: boolean = $state(false);
  let scriptViewerContent: string = $state("");
  let scriptViewerSummary: string = $state("");
  let tutorialViewerOpen: boolean = $state(false);
  let activeTutorial: ParsedTutorial | null = $state(null);
  let chatInputRef: { prefill: (value: string) => Promise<void> } | undefined = $state();
  let activeAbortController: AbortController | null = $state(null);
  let activeStatus: ProviderStatusUpdate | null = $state(null);
  let pendingContexts: ContextChip[] = $state([]);
  let availableUpdate: AvailableUpdate | null = $state(null);
  let statusClearTimer: ReturnType<typeof setTimeout> | null = null;
  let statusElapsedTimer: ReturnType<typeof setInterval> | null = null;
  let statusElapsedMs: number = $state(0);
  const STATUS_CLEAR_DELAY_MS = 2000;

  let autoFixAttempt: number = $state(0);
  let autoFixOriginalPrompt: string = $state("");
  let autoFixAborted: boolean = $state(false);
  const AUTO_FIX_MAX = 3;

  let lastActionResult: LastActionResult | null = null;
  let lastActionRunResult: unknown = null;

  function conversationsForProject(key: string): Conversation[] {
    return workspace.conversations.filter((item) => item.projectKey === key).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function persistConversation() {
    if (!workspaceLoaded) return;
    if (saveTimer) clearTimeout(saveTimer);
    const conversation = workspace.conversations.find((item) => item.id === conversationId);
    if (conversation && activeProvider) {
      conversation.messages = $state.snapshot(messages);
      conversation.draft = draft;
      conversation.providerId = activeProvider.id;
      conversation.model = model;
      conversation.updatedAt = Date.now();
      conversation.title = messages.find((message) => message.role === "user")?.content.replace(/\s+/g, " ").slice(0, 70) || "New conversation";
      workspace.activeConversationId = conversation.id;
      workspace.models[activeProvider.id] = model;
    }
    if (storageBlocked) return;
    try { storageError = saveWorkspace(localStorage, $state.snapshot(workspace)).error || ""; }
    catch { storageError = "Conversation storage is unavailable. Export this chat before closing the panel."; }
  }

  $effect(() => {
    if (!workspaceLoaded || !conversationId) return;
    for (const message of messages) {
      message.content;
      message.action?.status;
      message.action?.verification;
      message.action?.errors;
      message.action?.warnings;
      message.action?.changes;
    }
    draft; model; activeProvider;
    untrack(() => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(persistConversation, 250);
    });
    return () => { if (saveTimer) clearTimeout(saveTimer); };
  });

  function resetConversationRuntime() {
    sessionId = undefined;
    rememberError("");
    pendingScreenshot = null;
    pendingContexts = [];
    lastActionResult = null;
    lastActionRunResult = null;
    stagedAction = null;
    aiActionReady = false;
    aiActionErrors = [];
    setAiActionWarnings([]);
    tutorialViewerOpen = false;
    activeTutorial = null;
    scriptViewerOpen = false;
    setStatus(null);
  }

  function restoreConversation(conversation: Conversation) {
    resetConversationRuntime();
    conversationId = conversation.id;
    messages = conversation.messages;
    draft = conversation.draft;
    activeProvider = providerRegistry.find((provider) => provider.id === conversation.providerId) || activeProvider;
    if (activeProvider) model = activeProvider.models.find((item) => item.value === conversation.model)?.value || activeProvider.models.find((item) => item.value === workspace.models[activeProvider!.id])?.value || activeProvider.models[0]?.value || "";
    workspace.activeConversationId = conversation.id;
    scrollToBottom();
  }

  function newConversation() {
    if (isLoading || !activeProvider) return;
    persistConversation();
    const conversation = createConversation(projectKey, projectName, activeProvider.id, model);
    workspace.conversations.push(conversation);
    restoreConversation(conversation);
    addMessage("system", "Ask about this project, or select layers to get started.");
    persistConversation();
  }

  function selectConversation(id: string) {
    if (isLoading) return;
    const conversation = workspace.conversations.find((item) => item.id === id && item.projectKey === projectKey);
    if (!conversation) return;
    persistConversation();
    restoreConversation(conversation);
    persistConversation();
  }

  function syncProject(context: Pick<ChatContext, "projectKey" | "projectName" | "selection">) {
    selection = context.selection;
    if (context.projectKey === projectKey && conversationId) return;
    persistConversation();
    projectKey = context.projectKey;
    projectName = context.projectName;
    const conversations = conversationsForProject(projectKey);
    const saved = conversations.find((item) => item.id === workspace.activeConversationId) || conversations[0];
    if (saved) restoreConversation(saved);
    else if (activeProvider) {
      const conversation = createConversation(projectKey, projectName, activeProvider.id, model);
      workspace.conversations.push(conversation);
      restoreConversation(conversation);
    }
  }

  async function refreshWorkspaceContext() {
    if (disposed || isLoading || refreshingContext || !workspaceLoaded) return;
    refreshingContext = true;
    try {
      const context = await getWorkspaceContext();
      if (context && !disposed && !isLoading) syncProject(context);
    } finally { refreshingContext = false; }
  }

  function changeModel(value: string) {
    if (isLoading || !activeProvider) return;
    model = value;
    workspace.models[activeProvider.id] = value;
    sessionId = undefined;
    persistConversation();
  }

  async function copyConversation() {
    persistConversation();
    const conversation = workspace.conversations.find((item) => item.id === conversationId);
    if (!conversation) return;
    try { await copyText(conversationMarkdown(conversation)); notice = "Conversation copied."; }
    catch (error) { notice = String(error); }
  }

  function exportConversation(id = conversationId) {
    persistConversation();
    const conversation = workspace.conversations.find((item) => item.id === id);
    if (!conversation) return;
    try { if (exportMarkdown(conversation.title, conversationMarkdown(conversation))) notice = "Conversation exported."; }
    catch (error) { notice = String(error); }
  }

  function removeConversation(id: string) {
    if (isLoading || !activeProvider) return;
    persistConversation();
    workspace.conversations = workspace.conversations.filter((item) => item.id !== id);
    if (id === conversationId) {
      const next = conversationsForProject(projectKey)[0] || createConversation(projectKey, projectName, activeProvider.id, model);
      if (!workspace.conversations.includes(next)) workspace.conversations.push(next);
      restoreConversation(next);
    }
    persistConversation();
  }

  function backupStoredData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (exportMarkdown("Conversation storage backup", raw || "No saved data.")) notice = "Stored data exported unchanged. Keep this backup before replacing it.";
    } catch (error) { notice = String(error); }
  }

  function replaceStoredData() {
    if (isLoading) return;
    storageBlocked = false;
    recoveryPending = false;
    persistConversation();
    if (storageError) storageBlocked = true;
  }

  function savePreset(action: ActionRecord) {
    if (isLoading || action.status !== "succeeded") return;
    if (workspace.presets.length >= 20) { notice = "Your 20 preset slots are full."; return; }
    workspace.presets.push(createPreset(action.summary, action.prompt));
    persistConversation();
    notice = "Preset saved. Open Presets to adjust it for the next selection.";
  }

  async function usePreset(preset: CreativePreset) {
    if (isLoading) return;
    try {
      const prompt = buildPresetPrompt(preset);
      workspace.presets = workspace.presets.map((item) => item.id === preset.id ? preset : item);
      await chatInputRef?.prefill(prompt);
      persistConversation();
    } catch (error) { notice = String(error); }
  }

  function makeActionRecord(script: string, summary: string, prompt: string): ActionRecord {
    return { id: Date.now().toString(36) + Math.random().toString(36).slice(2), script, summary: summary.replace(/\s+/g, " ").slice(0, 200), prompt, status: "staged", warnings: [], errors: [], changes: [] };
  }

  function stageRecord(action: ActionRecord, root?: string) {
    const validation = validateScript(action.script);
    aiActionErrors = validation.errors;
    setAiActionWarnings(validation.warnings);
    action.errors = validation.errors.map((error) => error.message);
    action.warnings = validation.warnings.map((warning) => warning.message);
    const risk = scanActionRisk(action.script);
    if (risk.risky) action.warnings.push("Review before running: this script " + risk.reasons.join(" and ") + ".");
    stagedAction = action;
    aiActionReady = validation.errors.length === 0;
    if (aiActionReady) saveAiAction(root, action.script, action.summary);
    return validation;
  }

  async function executeRecord(action: ActionRecord, root: string | undefined, signal: AbortSignal): Promise<boolean> {
    if (signal.aborted || disposed) return false;
    const current = await getWorkspaceContext();
    if (signal.aborted || disposed) return false;
    if (!current || current.projectKey !== projectKey) {
      action.verification = "The active project could not be confirmed or has changed. Nothing was run. Refresh the project context before retrying.";
      action.status = "staged";
      return false;
    }
    const validation = stageRecord(action, root);
    if (validation.errors.length) { action.status = "failed"; return false; }
    action.status = "running";
    action.changes = [];
    action.verification = undefined;
    persistConversation();
    setStatus({ phase: "running_action", text: "Running AI Action..." });
    let raw: unknown;
    try { raw = await runAiAction(root); }
    catch (error) { raw = { error: error instanceof Error ? error.message : String(error) }; }
    lastActionRunResult = raw;
    const evidence = summarizeActionResult(raw);
    action.status = evidence.status;
    action.changes = evidence.changes;
    action.errors = evidence.errors;
    lastActionResult = { summary: action.summary + (action.errors.length ? " — " + action.errors.join("; ") : ""), ranAt: Date.now(), stateDiff: evidence.changes, expressionsSet: evidence.expressionsSet };
    if (action.errors.length) {
      rememberError(action.errors.join("; "), evidence.errorLine);
      logAiActionFailure({ errorKind: "runtime", errorString: action.errors.join("; "), script: action.script, injectedRecipeIds: aiActionInjectedRecipeIds, triggerPath: "manual-run", originalUserMessage: action.prompt });
    } else rememberError("");
    persistConversation();
    if (workspace.verifyActions && activeProvider) {
      action.verification = "Reviewing the execution evidence...";
      setStatus({ phase: "thinking", text: "Reviewing action results..." });
      action.verification = await reviewActionResult(action, activeProvider, model, signal);
    }
    persistConversation();
    setStatus({ phase: evidence.status === "failed" ? "error" : "completed", text: evidence.status === "succeeded" ? "Action complete — changes detected." : evidence.status === "failed" ? "Action needs attention." : "Action finished — result inconclusive.", terminal: true });
    return evidence.status !== "failed";
  }

  async function runStoredAction(action: ActionRecord): Promise<boolean> {
    if (isLoading) return false;
    isLoading = true;
    const controller = new AbortController();
    activeAbortController = controller;
    startStatusTimer();
    try {
      const context = await buildContext();
      if (controller.signal.aborted || disposed) return false;
      if (context.projectKey !== projectKey) {
        notice = "The active AE project changed. Open its conversation before running an action.";
        return false;
      }
      sessionProjectRoot = context.projectRoot;
      aiActionOriginalUserMessage = action.prompt;
      return await executeRecord(action, context.projectRoot, controller.signal);
    } catch (error) {
      action.status = "failed";
      action.errors = [error instanceof Error ? error.message : String(error)];
      return false;
    } finally {
      isLoading = false;
      activeAbortController = null;
      persistConversation();
      clearStatusSoon();
    }
  }

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
    extra?: {
      duration_ms?: number;
      isError?: boolean;
      diagnosticsRaw?: string;
      tutorial?: ParsedTutorial;
    }
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

  function latestUserMessage(): string {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "user") return messages[i].content;
    }
    return "";
  }

  function logAiActionFailure(input: {
    errorKind: ErrorKind;
    errorString: string;
    script: string | null;
    expressionErrors?: ExpressionError[];
    validationErrors?: ScriptValidationError[];
    validationWarnings?: ScriptValidationWarning[];
    injectedRecipeIds: string[];
    triggerPath: TriggerPath;
    originalUserMessage?: string;
  }) {
    if (!input.script) return;

    logFailure({
      originalUserMessage:
        input.originalUserMessage || autoFixOriginalPrompt || latestUserMessage(),
      provider: activeProvider?.id || "unknown",
      model,
      errorKind: input.errorKind,
      errorString: input.errorString,
      validationErrors: input.validationErrors,
      validationWarnings: input.validationWarnings,
      expressionErrors: input.expressionErrors,
      script: input.script,
      injectedRecipeIds: input.injectedRecipeIds,
      triggerPath: input.triggerPath,
    });
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

  function handleUpdateDismiss() {
    if (!availableUpdate) return;
    dismissUpdate(availableUpdate.version);
    availableUpdate = null;
  }

  function handleUpdateDownload() {
    if (availableUpdate) openLinkInBrowser(availableUpdate.downloadUrl);
  }

  function handleUpdateReleaseNotes() {
    if (availableUpdate) openLinkInBrowser(availableUpdate.releaseUrl);
  }

  function openTutorial(tutorial: ParsedTutorial | undefined) {
    if (!tutorial) return;
    activeTutorial = tutorial;
    tutorialViewerOpen = true;
    scriptViewerOpen = false;
  }

  async function triggerAutoFix(
    errorString: string,
    errorLine: number | null,
    script: string | null,
    expressionErrors: ExpressionError[],
    validationErrors: ScriptValidationError[],
    validationWarnings: ScriptValidationWarning[],
    logOptions: { errorKind: ErrorKind; injectedRecipeIds: string[] }
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

    logAiActionFailure({
      errorKind: logOptions.errorKind,
      errorString,
      script,
      expressionErrors,
      validationErrors,
      validationWarnings,
      injectedRecipeIds: logOptions.injectedRecipeIds,
      triggerPath: "auto-run",
    });

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
    if (isLoading) return;
    persistConversation();
    activeProvider = provider;
    const preferred = workspace.models[provider.id];
    model = provider.models.find((item) => item.value === preferred)?.value || provider.models[0]?.value || "";
    sessionId = undefined;
    rememberError("");
    pendingScreenshot = null;
    try { localStorage.setItem("selectedProviderId", provider.id); } catch {}
    if (!conversationId) newConversation();
    persistConversation();
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
    const slashCommand = text.match(/^\/(\w+)(?:\s+([\s\S]+))?$/);

    if (slashCommand?.[1].toLowerCase() === "tutorial") {
      if (!slashCommand[2]?.trim()) {
        addMessage("system", "Usage: /tutorial <topic>");
        return;
      }
      await handlePromptSend(text, ctxs, "tutorial");
      return;
    }

    await handlePromptSend(text, ctxs);
  }

  async function handlePromptSend(
    text: string,
    pinned?: ContextChip[],
    mode?: ChatMode
  ) {
    if (isLoading) return;
    autoFixAttempt = 0;
    autoFixOriginalPrompt = text;
    autoFixAborted = false;
    rememberError("");
    await handleSend(text, false, pinned, mode);
  }

  async function scrollToBottom() {
    await tick();
    if (chatArea) {
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  }

  async function handleSend(
    text: string,
    isAutoFix = false,
    pinned?: ContextChip[],
    mode?: ChatMode
  ) {
    if (!activeProvider) return;

    tutorialViewerOpen = false;
    setAiActionWarnings([]);
    aiActionErrors = [];
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
      const context = await buildContext(
        text,
        pinned,
        lastActionResult ?? undefined,
        mode
      );
      if (controller.signal.aborted || disposed) return;
      if (!context.snapshotAvailable) {
        notice = "Could not read the AE project. Your prompt is still in the composer; try again when AE is ready.";
        if (!isAutoFix) draft = text;
        return;
      }
      if (isAutoFix && context.projectKey !== projectKey) {
        notice = "The AE project changed. Automatic repair stopped.";
        return;
      }
      if (!isAutoFix) syncProject(context);
      const history = messages.slice();
      if (!isAutoFix) addMessage("user", text);
      lastActionResult = null;
      sessionProjectRoot = context.projectRoot;

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
          staticContext: context.staticContext,
          sessionId,
          imagePath,
          projectRoot: context.projectRoot,
          signal: controller.signal,
          onChunk: (chunk) => {
            if (controller.signal.aborted || disposed) return;
            if (streamingIdx === -1) {
              streamingIdx = addMessage("assistant", chunk);
            } else {
              appendToMessage(streamingIdx, chunk);
            }
          },
          onStatus: (status) => {
            if (controller.signal.aborted || disposed) return;
            setStatus(status);
          },
        },
        history
      );
      providerCallInFlight = false;

      if (controller.signal.aborted || disposed) return;

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
        const parsedTutorial = parseTutorialResponse(parsed.displayText);
        const tutorial = parsedTutorial.tutorial;
        const displayText = parsedTutorial.displayText || "AI Action updated.";
        const storedContent = tutorial
          ? displayText + "\n\n" + outlineForHistory(tutorial)
          : displayText;
        let responseIndex: number;

        if (streamingIdx !== -1) {
          responseIndex = streamingIdx;
          // Update the streamed message with the cleaned display text and duration
          messages[streamingIdx].content = storedContent;
          messages[streamingIdx].duration_ms = result.duration_ms;
          messages[streamingIdx].tutorial = tutorial;
          streamingIdx = -1;
        } else {
          responseIndex = addMessage("assistant", storedContent, {
            duration_ms: result.duration_ms,
            tutorial,
          });
        }

        if (tutorial) {
          activeTutorial = tutorial;
          tutorialViewerOpen = true;
          scriptViewerOpen = false;
          aiActionInjectedRecipeIds = context.diagnostics.recipeIds.slice();
          aiActionOriginalUserMessage = autoFixOriginalPrompt || text;
        }

        if (parsedTutorial.multipleBlocks) {
          addMessage("system", "Multiple tutorial blocks found — only the first was opened.");
        }

        if (parsed.multipleBlocks) {
          addMessage("system", "Multiple AI Action blocks found — only the first was applied.");
        }

        if (parsed.scriptContent) {
          messages[responseIndex].action = makeActionRecord(parsed.scriptContent, displayText, autoFixOriginalPrompt || text);
          const action = messages[responseIndex].action!;
          aiActionInjectedRecipeIds = context.diagnostics.recipeIds.slice();
          aiActionOriginalUserMessage = action.prompt;
          const validation = stageRecord(action, context.projectRoot);
          if (validation.errors.length) {
            action.status = "failed";
            rememberError(action.errors.join("; "));
            await triggerAutoFix(action.errors.join("; "), null, action.script, [], validation.errors, [], { errorKind: "validation", injectedRecipeIds: context.diagnostics.recipeIds });
          } else if (parsed.runImmediately && !action.warnings.length && !controller.signal.aborted) {
            const ok = await executeRecord(action, context.projectRoot, controller.signal);
            if (!ok && !workspace.verifyActions) {
              await triggerAutoFix(action.errors.join("; "), lastErrorLine, action.script, [], [], [], { errorKind: "runtime", injectedRecipeIds: context.diagnostics.recipeIds });
            }
          } else {
            setStatus({ phase: "completed", text: "Action staged. Review the script and choose Run.", terminal: true });
          }
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isProviderRuntimeError = providerCallInFlight;
      providerCallInFlight = false;
      if (streamingIdx !== -1) {
        messages.splice(streamingIdx, 1);
        streamingIdx = -1;
      }
      if (controller.signal.aborted || disposed) return;
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
      if (controller.signal.aborted) {
        if (streamingIdx !== -1) messages.splice(streamingIdx, 1);
        sessionId = undefined;
        setStatus({ phase: "cancelled", text: "Request cancelled.", terminal: true });
      }
      isLoading = false;
      activeAbortController = null;
      persistConversation();
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

  async function handleTutorialStepRun(action: TutorialStepAction): Promise<boolean> {
    if (isLoading) return false;
    const summary = `Tutorial step ${action.index + 1}: ${action.label}`;
    const index = addMessage("assistant", summary);
    messages[index].action = makeActionRecord(action.script, summary, aiActionOriginalUserMessage || summary);
    return runStoredAction(messages[index].action!);
  }

  async function handleAction(
    action: { label: string; prompt?: string; handler?: string },
    event?: MouseEvent
  ) {
    if (isLoading) return;
    if (action.handler === "startTutorial") {
      await chatInputRef?.prefill("/tutorial ");
      return;
    }

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
      if (event?.shiftKey) {
        const result = revealAiActionInFinder(sessionProjectRoot);
        if (!result.ok) addMessage("system", "Couldn't reveal AI Action: " + result.error);
        return;
      }

      if (event?.altKey) {
        const script = readAiActionScript(sessionProjectRoot);
        if (!script) {
          addMessage("system", "No AI Action script saved yet.");
        } else {
          scriptViewerContent = script;
          const firstLine = script.split("\n").find((l) => l.startsWith("// Summary:"));
          scriptViewerSummary = firstLine ? firstLine.replace("// Summary:", "").trim() : "";
          scriptViewerOpen = true;
          tutorialViewerOpen = false;
        }
        return;
      }

      if (stagedAction) await runStoredAction(stagedAction);
      else notice = "Choose Run on an action card to run a saved script.";
      return;
    }

    if (action.prompt) {
      await handlePromptSend(action.prompt);
    }
  }

  onMount(() => {
    let uninstallTestHarness: (() => void) | null = null;

    // Static (not dynamic) import: CEF cannot fetch a split chunk via import()
    // at runtime. The __AE_TEST_HARNESS__ define still excludes it from packaged builds.
    if (__AE_TEST_HARNESS__ && runtimeEnvironment.isDevInstall) {
      uninstallTestHarness = installTestHarness({
        runPrompt: async (text) => {
          if (!activeProvider) throw new Error("No provider configured in the panel.");
          lastActionRunResult = null;
          lastActionResult = null;
          await handlePromptSend(text);
        },
        getContext: () => buildContext(),
        getLastActionResult: () => lastActionResult,
        getLastRunResult: () => lastActionRunResult,
        getLastError: () => lastError,
      });
    }

    void (async () => {
      let lastProviderId: string | null = null;
      try {
        const loaded = loadWorkspace(localStorage);
        workspace = loaded.state;
        storageError = loaded.error || "";
        storageBlocked = Boolean(loaded.error);
        lastProviderId = localStorage.getItem("selectedProviderId");
      } catch {
        storageBlocked = true;
        storageError = "Conversation storage is unavailable. Export your chat before closing.";
      }
      const context = await getWorkspaceContext();
      if (disposed) return;
      if (context) { projectKey = context.projectKey; projectName = context.projectName; selection = context.selection; }
      const candidates = conversationsForProject(projectKey);
      const saved = candidates.find((item) => item.id === workspace.activeConversationId) || candidates[0];
      const provider = providerRegistry.find((item) => item.id === (saved?.providerId || lastProviderId));
      if (provider) {
        const availability = await provider.isAvailable();
        if (disposed) return;
        if (availability.available) {
          activeProvider = provider;
          if (saved) restoreConversation(saved);
          else model = provider.models.find((item) => item.value === workspace.models[provider.id])?.value || provider.models[0]?.value || "";
        }
      }
      workspaceLoaded = true;
      if (activeProvider && !conversationId) newConversation();
    })().catch(() => { if (!disposed) workspaceLoaded = true; });

    const onVisibility = () => { if (document.hidden) persistConversation(); else void refreshWorkspaceContext(); };
    window.addEventListener("focus", refreshWorkspaceContext);
    window.addEventListener("beforeunload", persistConversation);
    document.addEventListener("visibilitychange", onVisibility);

    checkForUpdate(version).then((update) => {
      if (!disposed) availableUpdate = update;
    });

    return () => {
      persistConversation();
      disposed = true;
      activeAbortController?.abort();
      if (saveTimer) clearTimeout(saveTimer);
      window.removeEventListener("focus", refreshWorkspaceContext);
      window.removeEventListener("beforeunload", persistConversation);
      document.removeEventListener("visibilitychange", onVisibility);
      uninstallTestHarness?.();
      cancelStatusClear();
      stopStatusTimer();
      if (sessionProjectRoot) {
        clearAiAction(sessionProjectRoot);
      }
    };
  });
</script>

{#if !workspaceLoaded}
  <p class="workspace-notice">Opening your workspace...</p>
{:else if !activeProvider}
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
      onModelChange={changeModel}
      onProviderChange={handleProviderSelect}
    />

    <WorkspaceBar
      conversations={projectConversations}
      allConversations={workspace.conversations}
      currentId={conversationId}
      {projectName}
      presets={workspace.presets}
      disabled={isLoading}
      verifyActions={workspace.verifyActions}
      reviewAvailable={Boolean(activeProvider.reviewAction)}
      onselect={selectConversation}
      onnew={newConversation}
      oncopy={copyConversation}
      onexport={exportConversation}
      onremove={removeConversation}
      onverify={(value) => { workspace.verifyActions = value; persistConversation(); }}
      onpreset={usePreset}
    />
    {#if storageError}
      <div class="workspace-notice workspace-notice--warning" role="alert">
        {storageError}
        {#if storageBlocked}
          <button type="button" onclick={backupStoredData}>Back up saved data</button>
          <button type="button" disabled={isLoading} onclick={() => (recoveryPending = !recoveryPending)}>Replace saved data</button>
          {#if recoveryPending}
            <p>This replaces unreadable saved data with the chats currently open in this panel. Export a backup first.</p>
            <button type="button" disabled={isLoading} onclick={replaceStoredData}>Confirm replacement</button>
            <button type="button" onclick={() => (recoveryPending = false)}>Cancel</button>
          {/if}
        {/if}
      </div>
    {/if}
    {#if notice}<div class="workspace-notice" role="status">{notice}<button type="button" aria-label="Dismiss notice" onclick={() => (notice = "")}>×</button></div>{/if}

    {#if availableUpdate}
      <UpdateBanner
        update={availableUpdate}
        onDownload={handleUpdateDownload}
        onReleaseNotes={handleUpdateReleaseNotes}
        onDismiss={handleUpdateDismiss}
      />
    {/if}

    <div
      class="chat-area"
      class:chat-area--hidden={tutorialViewerOpen && !!activeTutorial}
      bind:this={chatArea}
      data-select-scope="chat-history"
    >
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
            tutorialTitle={msg.tutorial?.title}
            onOpenTutorial={msg.tutorial
              ? () => openTutorial(msg.tutorial)
              : undefined}
          />
        {/if}
        {#if msg.action}
          <ActionCard action={msg.action} disabled={isLoading} onrun={() => { if (msg.action) void runStoredAction(msg.action); }} onsave={() => { if (msg.action) savePreset(msg.action); }} />
        {/if}
      {/each}

      {#if isLoading}
        <StreamingRow
          providerName={activeProvider.displayName}
          elapsedMs={statusElapsedMs}
        />
      {/if}

      {#if !messages.some((message) => message.role === "user") && !isLoading}
        <Suggestions onpick={(prompt) => chatInputRef?.prefill(prompt)} {suggestions} selectionLabel={selection.layerNames.length ? "Selected: " + selection.layerNames.join(", ") : "Try asking"} onrefresh={refreshWorkspaceContext} />
      {/if}
    </div>

    {#if tutorialViewerOpen && activeTutorial}
      {#key activeTutorial}
        <TutorialViewer
          tutorial={activeTutorial}
          onRunStep={handleTutorialStepRun}
          onclose={() => (tutorialViewerOpen = false)}
        />
      {/key}
    {/if}

    {#if pendingScreenshot}
      <div class="pending-screenshot">
        <span class="pending-screenshot__label">Attached: {pendingScreenshot.fileName}</span>
        <button class="pending-screenshot__clear" onclick={() => (pendingScreenshot = null)}>
          Clear
        </button>
      </div>
    {/if}

    {#if scriptViewerOpen}
      <ScriptViewer
        content={scriptViewerContent}
        summary={scriptViewerSummary}
        onreveal={() => {
          const result = revealAiActionInFinder(sessionProjectRoot);
          if (!result.ok) addMessage("system", "Couldn't reveal AI Action: " + result.error);
        }}
        onclose={() => (scriptViewerOpen = false)}
      />
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
      bind:this={chatInputRef}
      bind:draft
      disabled={isLoading}
      providerName={activeProvider.displayName}
      contexts={pendingContexts}
      onsubmit={handleUserSend}
      oncancel={activeAbortController ? handleCancel : undefined}
      onContextAdd={handleContextAdd}
      onContextRemove={handleContextRemove}
    />
    {#if !(tutorialViewerOpen && activeTutorial)}
      <ActionBar
        disabled={isLoading}
        providerName={activeProvider.displayName}
        supportsImages={activeProvider.supportsImages}
        hasError={Boolean(lastError)}
        {aiActionReady}
        aiActionBlocked={aiActionErrors.length > 0}
        onclick={handleAction}
      />
    {/if}
  </div>
{/if}

<style>
  .workspace-notice { margin: 0; padding: 8px 12px; display: flex; gap: 8px; align-items: flex-start; color: var(--ae-text-2); background: var(--ae-bg-2); font-size: 11px; line-height: 1.4; text-align: left; }
  .workspace-notice--warning { color: var(--ae-warn); }
  .workspace-notice button { margin-left: auto; border: 0; background: none; color: inherit; cursor: pointer; text-align: left; }
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

  .chat-area--hidden {
    display: none;
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
