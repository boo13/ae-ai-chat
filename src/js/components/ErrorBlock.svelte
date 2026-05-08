<script lang="ts">
  import RoleChip from "./RoleChip.svelte";

  interface Props {
    time: string;
    content: string;
    diagnosticsRaw?: string;
    providerName?: string;
  }

  let { time, content, diagnosticsRaw, providerName }: Props = $props();

  const contentLines = $derived.by(() => content.split(/\r?\n/));
  const headline = $derived.by(() => contentLines[0] || "Provider error");
  const remainingContent = $derived.by(() => contentLines.slice(1).join("\n").trim());
</script>

<div class="error-block">
  <div class="error-card">
    <span class="error-card__icon" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 9v4m0 4h.01M10.2 4.3 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.8 4.3a2 2 0 0 0-3.6 0Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>

    <div class="error-card__body">
      <div class="error-card__meta">
        <RoleChip role="error" />
        <span class="error-card__time">{time}</span>
      </div>
      <div class="error-card__headline">{headline}</div>
      {#if remainingContent}
        <div class="error-card__content">{remainingContent}</div>
      {/if}
    </div>
  </div>

  {#if diagnosticsRaw}
    <details class="diagnostics">
      <summary>
        <span>Launch diagnostics</span>
        {#if providerName}
          <span class="diagnostics__provider">{providerName}</span>
        {/if}
      </summary>
      <pre>{diagnosticsRaw}</pre>
    </details>
  {/if}
</div>

<style>
  .error-block {
    padding: 6px 14px;
  }

  .error-card {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px 12px;
    margin-bottom: 8px;
    border: 1px solid rgba(255,142,106,0.18);
    border-radius: 8px;
    background: rgba(255,142,106,0.06);
  }

  .error-card__icon {
    display: inline-flex;
    margin-top: 3px;
    color: var(--ae-warn);
    flex: none;
  }

  .error-card__body {
    min-width: 0;
    flex: 1;
  }

  .error-card__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }

  .error-card__time {
    color: var(--ae-text-3);
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
  }

  .error-card__headline {
    color: var(--ae-warn);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    overflow-wrap: break-word;
  }

  .error-card__content {
    margin-top: 4px;
    color: var(--ae-text-2);
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }

  .diagnostics {
    overflow: hidden;
    border: 1px solid var(--ae-line);
    border-radius: 8px;
    background: rgba(255,255,255,0.03);
  }

  .diagnostics summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 12px;
    color: var(--ae-text-2);
    cursor: pointer;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.3px;
    list-style: none;
    text-transform: uppercase;
    user-select: none;
  }

  .diagnostics summary::-webkit-details-marker {
    display: none;
  }

  .diagnostics__provider {
    color: var(--ae-text-3);
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
  }

  .diagnostics pre {
    margin: 0;
    padding: 8px 12px 12px;
    border-top: 1px solid var(--ae-line);
    color: var(--ae-text-2);
    font-family: "JetBrains Mono", "SF Mono", Menlo, ui-monospace, monospace;
    font-size: 11px;
    line-height: 1.65;
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }
</style>
