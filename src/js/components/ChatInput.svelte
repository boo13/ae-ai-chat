<script lang="ts">
  interface Props {
    assistantName: string;
    disabled: boolean;
    onsubmit: (text: string) => void;
    oncancel?: () => void;
  }

  let { assistantName, disabled, onsubmit, oncancel }: Props = $props();
  let text: string = $state("");
  let textareaEl: HTMLTextAreaElement | undefined = $state();

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
    const maxHeight = 96; // ~4 lines
    textareaEl.style.height = Math.min(textareaEl.scrollHeight, maxHeight) + "px";
  }
</script>

<div class="chat-input">
  <textarea
    bind:this={textareaEl}
    bind:value={text}
    onkeydown={handleKeydown}
    oninput={autoResize}
    placeholder={disabled ? "Thinking..." : "Ask " + assistantName + " about your AE project..."}
    rows="1"
    {disabled}
  ></textarea>
  {#if disabled && oncancel}
    <button class="cancel-btn" onclick={oncancel}>Cancel</button>
  {:else}
    <button class="send-btn" onclick={submit} disabled={disabled || !text.trim()}>
      {#if disabled}
        <span class="spinner"></span>
      {:else}
        Send
      {/if}
    </button>
  {/if}
</div>

<style>
  .chat-input {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    background: #1a1a1a;
    border-top: 1px solid #333;
    align-items: flex-end;
  }
  textarea {
    flex: 1;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    color: #d4d4d4;
    padding: 8px;
    font-size: 13px;
    font-family: inherit;
    resize: none;
    line-height: 1.4;
    min-height: 20px;
    max-height: 96px;
    overflow-y: auto;
  }
  textarea:focus {
    outline: none;
    border-color: #4a9eff;
  }
  textarea:disabled {
    opacity: 0.5;
  }
  textarea::placeholder {
    color: #666;
  }
  .send-btn {
    background: #4a9eff;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    min-width: 52px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .send-btn:hover:not(:disabled) {
    background: #3a8aee;
  }
  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .cancel-btn {
    background: #3a2a2a;
    color: #ff7070;
    border: 1px solid #5a3a3a;
    border-radius: 4px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    min-width: 52px;
    height: 36px;
  }
  .cancel-btn:hover {
    background: #4a2a2a;
    border-color: #7a4a4a;
  }
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
