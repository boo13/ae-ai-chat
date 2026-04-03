<script lang="ts">
  import ActionIcon from "./ActionIcon.svelte";
  import { quickActions } from "../lib/actions";

  interface Props {
    disabled: boolean;
    supportsImages: boolean;
    onclick: (action: { label: string; prompt?: string; handler?: string }) => void;
  }

  let { disabled, supportsImages, onclick }: Props = $props();

  const visibleActions = $derived.by(() =>
    quickActions.filter((action) => supportsImages || action.handler !== "takeScreenshot")
  );
</script>

<div class="action-bar">
  {#each visibleActions as action}
    <button
      class="action-btn"
      {disabled}
      onclick={() => onclick(action)}
      title={action.label}
    >
      <span class="action-icon">
        <ActionIcon name={action.icon} />
      </span>
      <span class="action-label">{action.label}</span>
    </button>
  {/each}
</div>

<style>
  .action-bar {
    display: flex;
    gap: 4px;
    padding: 6px 12px;
    background: #1e1e1e;
    border-top: 1px solid #333;
    flex-wrap: wrap;
  }
  .action-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    color: #ccc;
    padding: 4px 8px;
    font-size: 11px;
    cursor: pointer;
    white-space: nowrap;
  }
  .action-btn:hover:not(:disabled) {
    background: #333;
    border-color: #4a9eff;
    color: #fff;
  }
  .action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .action-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    flex: none;
  }
  .action-label {
    font-size: 11px;
  }
</style>
