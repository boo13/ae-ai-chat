<script lang="ts">
  import type { ProviderStatusUpdate } from "../lib/providers/provider";

  interface Props {
    providerName: string;
    status: ProviderStatusUpdate;
    elapsedMs: number;
  }

  let { providerName, status, elapsedMs }: Props = $props();

  const toneClass = $derived.by(() => {
    switch (status.phase) {
      case "error":
      case "timeout":
        return "status-bar--error";
      case "cancelled":
        return "status-bar--cancelled";
      case "saving_action":
      case "running_action":
        return "status-bar--action";
      default:
        return "status-bar--active";
    }
  });

  const elapsedLabel = $derived.by(() => {
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  });

  const showDetails = $derived.by(
    () =>
      Boolean(status.raw) &&
      (status.phase === "error" || status.phase === "timeout" || status.phase === "cancelled")
  );
</script>

<div class={`status-shell ${toneClass}`}>
  <div class="status-bar">
    <span class="status-bar__dot" aria-hidden="true"></span>
    <span class="status-bar__provider">{providerName}</span>
    <span class="status-bar__text">{status.text}</span>
    <span class="status-bar__elapsed">{elapsedLabel}</span>
  </div>

  {#if showDetails}
    <details class="status-details" open={status.phase === "error"}>
      <summary>Details</summary>
      <pre>{status.raw}</pre>
    </details>
  {/if}
</div>

<style>
  .status-shell {
    background: #191919;
    border-top: 1px solid #333;
  }
  .status-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    color: #cfcfcf;
    font-size: 11px;
    line-height: 1.4;
    min-height: 30px;
  }
  .status-bar__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #4a9eff;
    box-shadow: 0 0 0 0 rgba(74, 158, 255, 0.5);
    animation: pulse 1.2s ease-out infinite;
    flex: 0 0 auto;
  }
  .status-bar__provider {
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #8fb7ff;
    flex: 0 0 auto;
  }
  .status-bar__text {
    color: #b8b8b8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1 1 auto;
  }
  .status-bar__elapsed {
    color: #8a8a8a;
    font-variant-numeric: tabular-nums;
    flex: 0 0 auto;
  }
  .status-details {
    padding: 0 12px 10px;
    color: #d7d7d7;
    font-size: 11px;
  }
  .status-details summary {
    cursor: pointer;
    color: #9fbfff;
    user-select: none;
    outline: none;
    margin-bottom: 6px;
  }
  .status-details pre {
    margin: 0;
    padding: 8px;
    background: #101010;
    border: 1px solid #2f2f2f;
    border-radius: 4px;
    color: #cfcfcf;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 220px;
    overflow: auto;
    font-size: 10px;
    line-height: 1.45;
  }
  .status-bar--active .status-bar__dot {
    background: #4a9eff;
  }
  .status-bar--action .status-bar__dot {
    background: #f3c96b;
    box-shadow: 0 0 0 0 rgba(243, 201, 107, 0.45);
  }
  .status-bar--action .status-bar__provider {
    color: #f3c96b;
  }
  .status-bar--cancelled .status-bar__dot {
    background: #999;
    box-shadow: none;
    animation: none;
  }
  .status-bar--cancelled .status-bar__provider {
    color: #aaa;
  }
  .status-bar--error .status-bar__dot {
    background: #ff7070;
    box-shadow: none;
    animation: none;
  }
  .status-bar--error .status-bar__provider {
    color: #ff9a9a;
  }
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(74, 158, 255, 0.5);
    }
    100% {
      box-shadow: 0 0 0 7px rgba(74, 158, 255, 0);
    }
  }
</style>
