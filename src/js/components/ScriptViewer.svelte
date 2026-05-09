<script lang="ts">
  interface Props {
    content: string;
    summary: string;
    onreveal: () => void;
    onclose: () => void;
  }

  let { content, summary, onreveal, onclose }: Props = $props();
</script>

<div class="script-viewer">
  <div class="script-viewer__header">
    <span class="script-viewer__title">ai-action.jsx</span>
    {#if summary}
      <span class="script-viewer__summary">{summary}</span>
    {/if}
    <div class="script-viewer__actions">
      <button class="script-viewer__btn" onclick={onreveal} title="Reveal in Finder" type="button">
        ⤴ Reveal
      </button>
      <button class="script-viewer__close" onclick={onclose} aria-label="Close" type="button">×</button>
    </div>
  </div>
  <pre class="script-viewer__body">{content}</pre>
</div>

<style>
  .script-viewer {
    flex-shrink: 0;
    border-top: 1px solid var(--ae-line-2);
    background: rgb(20, 20, 20);
  }

  .script-viewer__header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px 4px;
    border-bottom: 1px solid var(--ae-line-2);
    min-height: 28px;
  }

  .script-viewer__title {
    font-size: 11px;
    font-weight: 600;
    color: var(--ae-text);
    flex-shrink: 0;
  }

  .script-viewer__summary {
    font-size: 11px;
    color: var(--ae-text-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .script-viewer__actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    margin-left: auto;
  }

  .script-viewer__btn {
    padding: 2px 7px;
    border: 1px solid var(--ae-line-2);
    border-radius: 4px;
    background: transparent;
    color: var(--ae-text-2);
    cursor: pointer;
    font: inherit;
    font-size: 11px;
    line-height: 1.4;
    transition: color 100ms ease, background-color 100ms ease;
  }

  .script-viewer__btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--ae-text);
  }

  .script-viewer__close {
    padding: 0 5px;
    border: 0;
    background: transparent;
    color: var(--ae-text-2);
    cursor: pointer;
    font: inherit;
    font-size: 15px;
    line-height: 1;
    transition: color 100ms ease;
  }

  .script-viewer__close:hover {
    color: var(--ae-text);
  }

  .script-viewer__body {
    margin: 0;
    padding: 8px 10px;
    max-height: 220px;
    overflow: auto;
    font-family: "JetBrains Mono", "SF Mono", Menlo, ui-monospace, monospace;
    font-size: 11px;
    line-height: 1.5;
    color: var(--ae-text);
    white-space: pre;
    tab-size: 2;
  }
</style>
