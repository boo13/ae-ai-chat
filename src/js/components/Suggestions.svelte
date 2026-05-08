<script lang="ts">
  interface Props {
    onpick: (prompt: string) => void;
  }

  let { onpick }: Props = $props();

  const suggestions = [
    "Describe my current comp",
    "Create a 1920x1080 comp at 30fps",
    "Fix the expression on selected",
    "Generate a project report",
  ];
</script>

<div class="suggestions">
  <div class="suggestions__eyebrow">Try asking</div>
  {#each suggestions as suggestion}
    <button class="suggestions__button" onclick={() => onpick(suggestion)}>
      {suggestion}
    </button>
  {/each}
</div>

<style>
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
