<script lang="ts">
  import type { ContextChip } from "../../shared/shared";

  interface Props {
    ctx: ContextChip;
    onRemove: () => void;
  }

  let { ctx, onRemove }: Props = $props();

  const chipTitle = $derived.by(() => {
    if (ctx.type === "comp") {
      return ctx.label + " (comp id " + ctx.compId + ")";
    }

    if (ctx.type === "layer") {
      return ctx.label + " (layer " + ctx.layerIndex + " in " + ctx.compName + ")";
    }

    return (
      ctx.label +
      " (" +
      ctx.matchName +
      ", effect " +
      ctx.effectIndex +
      " on layer " +
      ctx.layerIndex +
      ")"
    );
  });
</script>

<span class="context-chip" title={chipTitle}>
  <span class="context-chip__icon" aria-hidden="true">
    {#if ctx.type === "comp"}
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <rect x="1.5" y="2" width="9" height="7" rx="1" stroke="currentColor" stroke-width="1.2" />
      </svg>
    {:else if ctx.type === "layer"}
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path
          d="M6 1.5l4.5 2.5L6 6.5 1.5 4z M1.5 7L6 9.5 10.5 7"
          stroke="currentColor"
          stroke-width="1.1"
          stroke-linejoin="round"
        />
      </svg>
    {:else}
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path
          d="M6 1.5l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"
          stroke="currentColor"
          stroke-width="1.1"
          stroke-linejoin="round"
        />
      </svg>
    {/if}
  </span>
  <span class="context-chip__type">{ctx.type}</span>
  <span class="context-chip__name">{ctx.label}</span>
  <button class="context-chip__remove" type="button" aria-label={"Remove " + ctx.label} onclick={() => onRemove()}>
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
    </svg>
  </button>
</span>

<style>
  .context-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    max-width: 100%;
    height: 22px;
    padding: 0 6px 0 7px;
    border: 1px solid var(--ae-line-2);
    border-radius: 5px;
    background: rgba(255,255,255,0.05);
    color: var(--ae-text);
    font-size: 11px;
    min-width: 0;
  }

  .context-chip__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 11px;
    height: 11px;
    color: var(--ae-text-3);
    flex: none;
  }

  .context-chip__type {
    min-width: 42px;
    color: var(--ae-text-3);
    font-size: 10px;
    letter-spacing: 0.4px;
    line-height: 1;
    text-transform: uppercase;
  }

  .context-chip__name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .context-chip__remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 14px;
    height: 14px;
    margin-left: 1px;
    margin-right: -2px;
    padding: 0;
    border: 0;
    border-radius: 3px;
    background: transparent;
    color: var(--ae-text-3);
    cursor: pointer;
  }

  .context-chip__remove:hover {
    background: rgba(255,255,255,0.08);
    color: var(--ae-text);
  }
</style>
