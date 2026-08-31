<script lang="ts">
  interface Props {
    onpick: (prompt: string) => void;
    suggestions: string[];
    selectionLabel: string;
    onrefresh: () => void;
  }

  let { onpick, suggestions, selectionLabel, onrefresh }: Props = $props();
</script>

<div class="suggestions">
  <div class="suggestions__eyebrow">{selectionLabel} <button class="suggestions__refresh" type="button" onclick={onrefresh}>Refresh</button></div>
  {#each suggestions as suggestion}
    <button class="suggestions__button" onclick={() => onpick(suggestion)}>
      {suggestion}
    </button>
  {/each}
</div>

<style>
  .suggestions__refresh { border: 0; background: none; color: var(--accent); font: inherit; font-size: 10px; cursor: pointer; text-align: left; }
  .suggestions {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 4px 14px 14px;
  }

  .suggestions__eyebrow {
    padding: 6px 4px 4px;
    color: var(--ae-text-3);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.6px;
    text-transform: uppercase;
  }

  .suggestions__button {
    width: 100%;
    padding: 9px 12px;
    border: 1px solid var(--ae-line);
    border-radius: 9px;
    background: var(--ae-bg-2);
    color: var(--ae-text-2);
    cursor: pointer;
    font: inherit;
    font-size: 12.5px;
    text-align: left;
    transition:
      background 120ms ease,
      border-color 120ms ease,
      color 120ms ease;
  }

  .suggestions__button:hover {
    border-color: var(--ae-line-2);
    background: var(--ae-bg-3);
    color: var(--ae-text);
  }
</style>
