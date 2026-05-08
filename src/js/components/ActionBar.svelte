<script lang="ts">
  import ActionIcon from "./ActionIcon.svelte";
  import { quickActions, type QuickAction } from "../lib/actions";

  interface Props {
    disabled: boolean;
    providerName: string;
    supportsImages: boolean;
    hasError: boolean;
    aiActionReady: boolean;
    aiActionBlocked: boolean;
    onclick: (action: QuickAction) => void;
  }

  let {
    disabled,
    providerName,
    supportsImages,
    hasError,
    aiActionReady,
    aiActionBlocked,
    onclick,
  }: Props = $props();

  function unavailableReason(action: QuickAction): string {
    if (action.handler === "takeScreenshot" && !supportsImages) {
      return providerName + " cannot use screenshots because this provider cannot read images.";
    }

    if (action.handler === "fixLastError" && !hasError) {
      return "No recent error to fix.";
    }

    if (action.handler === "runAiAction") {
      if (aiActionBlocked) return "AI Action has validation errors.";
      if (!aiActionReady) return "No AI Action is staged yet.";
    }

    return "";
  }

  function tooltipFor(action: QuickAction): string {
    const unavailable = unavailableReason(action);
    if (unavailable) return unavailable;

    return action.description;
  }

  function handleClick(action: QuickAction) {
    if (disabled || unavailableReason(action)) return;
    onclick(action);
  }
</script>

<div class="action-drawer" style={`--drawer-cols: ${quickActions.length}`}>
  <div class="action-drawer__grid">
    {#each quickActions as action}
      {@const reason = unavailableReason(action)}
      {@const tooltip = tooltipFor(action)}
      <div class="action-tooltip" data-tooltip={tooltip}>
        <button
          class="action-btn"
          class:action-btn--unavailable={Boolean(reason)}
          disabled={disabled}
          aria-disabled={reason ? "true" : undefined}
          aria-label={`${action.label}: ${tooltip}`}
          onclick={() => handleClick(action)}
          title={tooltip}
          type="button"
        >
          <span class="action-icon">
            <ActionIcon name={action.icon} size={15} />
          </span>
          <span class="action-label">{action.label}</span>
        </button>
      </div>
    {/each}
  </div>
</div>

<style>
  .action-drawer {
    flex-shrink: 0;
    background: var(--ae-chrome-bg);
    box-shadow:
      inset 0 8px 10px -8px rgba(0,0,0,0.7),
      inset 0 1px 0 rgba(255,255,255,0.02);
    position: relative;
    z-index: 2;
  }

  .action-drawer__grid {
    display: grid;
    grid-template-columns: repeat(var(--drawer-cols), 1fr);
    gap: 2px;
    padding: 8px 8px 10px;
  }

  .action-tooltip {
    position: relative;
    min-width: 0;
  }

  .action-tooltip::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 7px);
    left: 50%;
    z-index: 5;
    width: max-content;
    max-width: 180px;
    padding: 6px 8px;
    border: 1px solid var(--ae-line-2);
    border-radius: 5px;
    background: rgb(38,38,38);
    color: var(--ae-text);
    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    font-size: 11px;
    font-weight: 500;
    line-height: 1.3;
    opacity: 0;
    pointer-events: none;
    text-align: center;
    transform: translate(-50%, 2px);
    transition:
      opacity 100ms ease,
      transform 100ms ease;
    white-space: normal;
  }

  .action-tooltip:first-child::after {
    left: 0;
    text-align: left;
    transform: translate(0, 2px);
  }

  .action-tooltip:last-child::after {
    right: 0;
    left: auto;
    text-align: right;
    transform: translate(0, 2px);
  }

  .action-tooltip:hover::after,
  .action-tooltip:focus-within::after {
    opacity: 1;
    transform: translate(-50%, 0);
  }

  .action-tooltip:first-child:hover::after,
  .action-tooltip:first-child:focus-within::after,
  .action-tooltip:last-child:hover::after,
  .action-tooltip:last-child:focus-within::after {
    transform: translate(0, 0);
  }

  .action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 0;
    height: 50px;
    padding: 4px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--ae-text);
    cursor: pointer;
    font: inherit;
    font-size: 11px;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    transition:
      background-color 120ms ease,
      color 120ms ease;
  }

  .action-btn:hover:not(:disabled):not(.action-btn--unavailable) {
    background: rgba(255,255,255,0.04);
    color: var(--ae-text);
  }

  .action-btn:active:not(:disabled):not(.action-btn--unavailable) {
    transform: translateY(1px);
  }

  .action-btn:disabled,
  .action-btn--unavailable {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .action-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex: none;
    color: var(--accent);
  }

  .action-label {
    max-width: 100%;
    color: var(--ae-text-2);
    font-size: 10.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
