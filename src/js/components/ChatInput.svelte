<script lang="ts">
  import ContextChipPill from "./ContextChip.svelte";
  import ContextPicker from "./ContextPicker.svelte";
  import type { ContextChip } from "../../shared/shared";

  interface Props {
    disabled: boolean;
    providerName: string;
    onsubmit: (text: string) => void;
    oncancel?: () => void;
    contexts: ContextChip[];
    onContextAdd: (chip: ContextChip) => void;
    onContextRemove: (index: number) => void;
  }

  let {
    disabled,
    providerName,
    onsubmit,
    oncancel,
    contexts,
    onContextAdd,
    onContextRemove,
  }: Props = $props();
  let text: string = $state("");
  let textareaEl: HTMLTextAreaElement | undefined = $state();
  let pickerOpen = $state(false);
  let contextMenuEl: HTMLDivElement | undefined = $state();

  const isStreaming = $derived(disabled && Boolean(oncancel));
  const placeholder = $derived(
    isStreaming
      ? providerName + " is responding..."
      : "Ask " + providerName + " about your AE project..."
  );

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

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onsubmit(trimmed);
    text = "";
    if (textareaEl) {
      textareaEl.style.height = "auto";
    }
  }

  function autoResize() {
    if (!textareaEl) return;
    textareaEl.style.height = "auto";
    const maxHeight = 120;
    textareaEl.style.height = Math.min(textareaEl.scrollHeight, maxHeight) + "px";
  }

  function handleDocumentMouseDown(event: MouseEvent) {
    if (!contextMenuEl) return;
    if (!(event.target instanceof Node)) return;
    if (!contextMenuEl.contains(event.target)) {
      pickerOpen = false;
    }
  }

  $effect(() => {
    if (!pickerOpen) return;

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  });
</script>

<div class="chat-input">
  <div class="chat-input__wrap">
    {#if contexts.length > 0}
      <div class="chat-input__contexts">
        {#each contexts as ctx, index (contextKey(ctx))}
          <ContextChipPill {ctx} onRemove={() => onContextRemove(index)} />
        {/each}
      </div>
    {/if}

    <textarea
      bind:this={textareaEl}
      bind:value={text}
      onkeydown={handleKeydown}
      oninput={autoResize}
      {placeholder}
      rows="1"
      {disabled}
    ></textarea>

    <div class="chat-input__toolbar">
      <div class="context-menu" bind:this={contextMenuEl}>
        <button
          class="context-btn"
          class:context-btn--active={pickerOpen}
          type="button"
          title="Add AE context"
          aria-haspopup="menu"
          aria-expanded={pickerOpen}
          onclick={() => (pickerOpen = !pickerOpen)}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
          </svg>
          <span>Context</span>
        </button>

        {#if pickerOpen}
          <ContextPicker
            {contexts}
            {onContextAdd}
            onClose={() => (pickerOpen = false)}
          />
        {/if}
      </div>

      <span class="chat-input__hint"><span>shift+↵</span> for newline</span>

      <span class="chat-input__spacer"></span>

      {#if isStreaming}
        <button class="stop-btn" type="button" onclick={() => oncancel?.()}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
          </svg>
          <span>Stop</span>
        </button>
      {:else}
        <button class="send-btn" type="button" onclick={submit} disabled={disabled || !text.trim()}>
          <span>Send</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12h13m-5-5 5 5-5 5"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .chat-input {
    flex-shrink: 0;
    padding: 10px;
    border-top: 1px solid var(--ae-line);
    background: linear-gradient(to top, rgba(0,0,0,0.2), transparent);
  }

  .chat-input__wrap {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 7px 8px 6px 10px;
    border: 1px solid var(--ae-line-2);
    border-radius: 10px;
    background: var(--ae-bg-2);
    transition:
      border-color 120ms ease,
      box-shadow 120ms ease;
  }

  .chat-input__wrap:focus-within {
    border-color: rgba(78,195,139,0.50);
    box-shadow: 0 0 0 3px rgba(78,195,139,0.18);
  }

  textarea {
    width: 100%;
    min-height: 22px;
    max-height: 120px;
    padding: 4px 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--ae-text);
    font-family: inherit;
    font-size: 13.5px;
    line-height: 1.5;
    resize: none;
    overflow-y: auto;
  }

  textarea:disabled {
    opacity: 0.55;
  }

  textarea::placeholder {
    color: var(--ae-text-3);
  }

  .chat-input__toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .chat-input__contexts {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;
  }

  .context-menu {
    position: relative;
    flex: none;
  }

  .context-btn,
  .stop-btn,
  .send-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 30px;
    border: 0;
    border-radius: 7px;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  .context-btn {
    gap: 4px;
    height: 26px;
    padding: 0 8px;
    border: 1px solid var(--ae-line-2);
    border-radius: 6px;
    background: transparent;
    color: var(--ae-text-2);
    font-size: 11.5px;
    font-weight: 500;
  }

  .context-btn:hover,
  .context-btn--active {
    border-color: rgba(78,195,139,0.45);
    background: rgba(255,255,255,0.06);
    color: var(--ae-text);
  }

  .chat-input__hint {
    min-width: 0;
    color: var(--ae-text-3);
    font-size: 10.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chat-input__hint span {
    font-family: "JetBrains Mono", "SF Mono", Menlo, ui-monospace, monospace;
  }

  .chat-input__spacer {
    flex: 1;
    min-width: 4px;
  }

  .stop-btn {
    padding: 0 12px;
    border: 1px solid rgba(255,142,106,0.30);
    background: rgba(255,142,106,0.14);
    color: var(--ae-warn);
  }

  .send-btn {
    padding: 0 14px;
    background: var(--accent);
    color: rgb(10,10,10);
  }

  .send-btn:disabled {
    background: rgba(78,195,139,0.25);
    color: var(--ae-text-3);
    cursor: default;
  }

  .send-btn:not(:disabled):active,
  .stop-btn:active {
    transform: translateY(1px);
  }
</style>
