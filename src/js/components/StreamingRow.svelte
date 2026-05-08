<script lang="ts">
  interface Props {
    providerName: string;
    elapsedMs: number;
  }

  let { providerName, elapsedMs }: Props = $props();

  const elapsedLabel = $derived.by(() => {
    const seconds = Math.max(0, elapsedMs / 1000);
    if (seconds < 60) return seconds.toFixed(1) + "s";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return minutes.toString().padStart(2, "0") + ":" + remainingSeconds;
  });
</script>

<div class="streaming-row">
  <span class="streaming-row__dot" aria-hidden="true"></span>
  <span class="streaming-row__provider">{providerName}</span>
  <span class="streaming-row__text">Thinking</span>
  <span class="streaming-row__ellipsis" aria-hidden="true"></span>
  <span class="streaming-row__spacer"></span>
  <span class="streaming-row__elapsed">{elapsedLabel}</span>
</div>

<style>
  .streaming-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--ae-line);
    background: rgba(255,255,255,0.015);
  }

  .streaming-row__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse-fade 1.4s infinite ease-in-out;
  }

  .streaming-row__provider {
    color: var(--accent);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
  }

  .streaming-row__text,
  .streaming-row__ellipsis {
    color: var(--ae-text-2);
    font-size: 12.5px;
  }

  .streaming-row__ellipsis {
    display: inline-block;
    width: 14px;
  }

  .streaming-row__ellipsis::after {
    content: "...";
    animation: ellipsis-cycle 1.4s infinite steps(1);
  }

  .streaming-row__spacer {
    flex: 1;
  }

  .streaming-row__elapsed {
    color: var(--ae-text-3);
    font-family: "JetBrains Mono", "SF Mono", Menlo, ui-monospace, monospace;
    font-size: 11.5px;
    font-variant-numeric: tabular-nums;
  }

  @keyframes pulse-fade {
    0%,
    100% {
      opacity: 0.45;
    }

    50% {
      opacity: 1;
    }
  }

  @keyframes ellipsis-cycle {
    0% {
      content: "";
    }

    25% {
      content: ".";
    }

    50% {
      content: "..";
    }

    75%,
    100% {
      content: "...";
    }
  }
</style>
