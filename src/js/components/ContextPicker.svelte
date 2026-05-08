<script lang="ts">
  import { onMount } from "svelte";
  import type { ContextChip } from "../../shared/shared";
  import {
    listEffectsOnSelectedLayer,
    listProjectComps,
    listSelectedLayers,
  } from "../lib/context";

  interface Props {
    contexts: ContextChip[];
    onContextAdd: (chip: ContextChip) => void;
    onClose: () => void;
  }

  let { contexts, onContextAdd, onClose }: Props = $props();

  let comps: Extract<ContextChip, { type: "comp" }>[] = $state([]);
  let layers: Extract<ContextChip, { type: "layer" }>[] = $state([]);
  let effects: Extract<ContextChip, { type: "effect" }>[] = $state([]);
  let loadingComps = $state(true);
  let loadingLayers = $state(true);
  let loadingEffects = $state(true);

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

  function isPinned(ctx: ContextChip): boolean {
    const key = contextKey(ctx);
    return contexts.some((existing) => contextKey(existing) === key);
  }

  function contextTitle(ctx: ContextChip): string {
    if (ctx.type === "comp") {
      return ctx.label + " (id:" + ctx.compId + ")";
    }

    if (ctx.type === "layer") {
      return ctx.label + " (index:" + ctx.layerIndex + " in " + ctx.compName + ")";
    }

    return (
      ctx.label +
      " (" +
      ctx.matchName +
      ", effectIndex:" +
      ctx.effectIndex +
      ", layerIndex:" +
      ctx.layerIndex +
      ")"
    );
  }

  function choose(ctx: ContextChip) {
    if (isPinned(ctx)) return;
    onContextAdd(ctx);
    onClose();
  }

  onMount(() => {
    let disposed = false;

    Promise.all([
      listProjectComps().catch(() => []),
      listSelectedLayers().catch(() => []),
      listEffectsOnSelectedLayer().catch(() => []),
    ]).then(([nextComps, nextLayers, nextEffects]) => {
      if (disposed) return;
      comps = nextComps;
      layers = nextLayers;
      effects = nextEffects;
      loadingComps = false;
      loadingLayers = false;
      loadingEffects = false;
    });

    return () => {
      disposed = true;
    };
  });
</script>

<div class="context-picker" role="menu" aria-label="Add context from project">
  <div class="context-picker__header">Add from project</div>

  <div class="context-picker__group" aria-label="Compositions">
    {#if loadingComps}
      <div class="context-picker__empty">Loading...</div>
    {:else if comps.length === 0}
      <div class="context-picker__empty">No comps in project</div>
    {:else}
      {#each comps as chip (contextKey(chip))}
        <button
          class="context-picker__item"
          type="button"
          role="menuitem"
          disabled={isPinned(chip)}
          title={contextTitle(chip)}
          onclick={() => choose(chip)}
        >
          <span class="context-picker__icon" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1.5" y="2" width="9" height="7" rx="1" stroke="currentColor" stroke-width="1.2" />
            </svg>
          </span>
          <span class="context-picker__type">comp</span>
          <span class="context-picker__name">{chip.label}</span>
        </button>
      {/each}
    {/if}
  </div>

  <div class="context-picker__group" aria-label="Selected layers">
    {#if loadingLayers}
      <div class="context-picker__empty">Loading...</div>
    {:else if layers.length === 0}
      <div class="context-picker__empty">No layers selected</div>
    {:else}
      {#each layers as chip (contextKey(chip))}
        <button
          class="context-picker__item"
          type="button"
          role="menuitem"
          disabled={isPinned(chip)}
          title={contextTitle(chip)}
          onclick={() => choose(chip)}
        >
          <span class="context-picker__icon" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M6 1.5l4.5 2.5L6 6.5 1.5 4z M1.5 7L6 9.5 10.5 7"
                stroke="currentColor"
                stroke-width="1.1"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <span class="context-picker__type">layer</span>
          <span class="context-picker__name">{chip.label}</span>
        </button>
      {/each}
    {/if}
  </div>

  <div class="context-picker__group" aria-label="Effects on selected layers">
    {#if loadingEffects}
      <div class="context-picker__empty">Loading...</div>
    {:else if effects.length === 0}
      <div class="context-picker__empty">No effects on selection</div>
    {:else}
      {#each effects as chip (contextKey(chip))}
        <button
          class="context-picker__item"
          type="button"
          role="menuitem"
          disabled={isPinned(chip)}
          title={contextTitle(chip)}
          onclick={() => choose(chip)}
        >
          <span class="context-picker__icon" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M6 1.5l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"
                stroke="currentColor"
                stroke-width="1.1"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <span class="context-picker__type">effect</span>
          <span class="context-picker__name">{chip.label}</span>
        </button>
      {/each}
    {/if}
  </div>
</div>

<style>
  .context-picker {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    z-index: 30;
    width: 220px;
    max-height: 240px;
    padding: 4px;
    overflow-y: auto;
    border: 1px solid var(--ae-line-2);
    border-radius: 8px;
    background: var(--ae-bg-3);
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.14) transparent;
  }

  .context-picker::-webkit-scrollbar {
    width: 8px;
  }

  .context-picker::-webkit-scrollbar-track {
    background: transparent;
  }

  .context-picker::-webkit-scrollbar-thumb {
    border: 2px solid transparent;
    border-radius: 4px;
    background: rgba(255,255,255,0.14);
    background-clip: content-box;
  }

  .context-picker__header {
    padding: 6px 8px;
    color: var(--ae-text-3);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.6px;
    text-transform: uppercase;
  }

  .context-picker__group + .context-picker__group {
    margin-top: 2px;
  }

  .context-picker__item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-width: 0;
    padding: 6px 8px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--ae-text);
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    text-align: left;
  }

  .context-picker__item:hover:not(:disabled) {
    background: rgba(255,255,255,0.05);
  }

  .context-picker__item:disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .context-picker__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    color: var(--ae-text-3);
    flex: none;
  }

  .context-picker__type {
    min-width: 42px;
    color: var(--ae-text-3);
    font-size: 10px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }

  .context-picker__name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .context-picker__empty {
    padding: 6px 8px;
    color: var(--ae-text-3);
    font-size: 12px;
  }
</style>
