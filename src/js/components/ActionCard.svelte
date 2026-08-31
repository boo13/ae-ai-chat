<script lang="ts">
  import type { ActionRecord } from "../lib/workspace-state";
  interface Props {
    action: ActionRecord;
    disabled: boolean;
    onrun: () => void;
    onsave: () => void;
  }
  let { action, disabled, onrun, onsave }: Props = $props();
  let reviewOpen = $state(false);
  const statusLabel = $derived({ staged: "Ready to run", running: "Running", succeeded: "Changes detected", failed: "Needs attention", inconclusive: "Result inconclusive" }[action.status]);
</script>

<section class="action-card" aria-label={`Action: ${action.summary}`}>
  <div class="action-card__heading">
    <span class:warning={action.status === "failed" || action.status === "inconclusive"}>{statusLabel}</span>
    <span class="action-card__kind">AE ACTION</span>
  </div>
  <p class="action-card__summary">{action.summary}</p>
  {#if action.errors.length || action.warnings.length}
    <ul class="warning">
      {#each [...action.errors, ...action.warnings] as issue}<li>{issue}</li>{/each}
    </ul>
  {/if}
  {#if action.changes.length}
    <ul>{#each action.changes as change}<li>{change}</li>{/each}</ul>
  {:else if action.status === "inconclusive"}
    <p>No tracked change was detected. Check the composition before running again.</p>
  {/if}
  {#if action.verification}
    <p class="action-card__review" aria-live="polite">{action.verification}</p>
  {/if}
  <div class="action-card__buttons">
    <button type="button" aria-expanded={reviewOpen} onclick={() => (reviewOpen = !reviewOpen)}>{reviewOpen ? "Hide script" : "Review script"}</button>
    <button type="button" disabled={disabled || action.status === "running"} onclick={onrun}>{action.status === "staged" ? "Run" : "Run again"}</button>
    <button type="button" disabled={disabled || action.status !== "succeeded"} onclick={onsave}>Save preset</button>
  </div>
  {#if reviewOpen}<textarea class="action-card__script" readonly aria-label="Action script" value={action.script}></textarea>{/if}
</section>

<style>
  .action-card { margin: 2px 14px 10px; padding: 11px 12px; border: 1px solid var(--ae-line-2); border-left: 2px solid var(--accent); border-radius: 7px; background: var(--ae-bg-2); text-align: left; }
  .action-card__heading { display: flex; justify-content: space-between; gap: 10px; color: var(--accent); font-size: 10px; font-weight: 600; }
  .action-card__kind { color: var(--ae-text-3); letter-spacing: .08em; white-space: nowrap; }
  p, ul { margin: 7px 0; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
  ul { padding-left: 16px; color: var(--ae-text-2); }
  .action-card__summary { color: var(--ae-text); }
  .warning { color: var(--ae-warn); }
  .action-card__review { border-top: 1px solid var(--ae-line); padding-top: 8px; color: var(--ae-text-2); white-space: pre-wrap; }
  .action-card__buttons { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  button { border: 1px solid var(--ae-line-2); border-radius: 5px; padding: 5px 8px; background: transparent; color: var(--ae-text-2); font: inherit; font-size: 11px; text-align: left; cursor: pointer; }
  button:hover:not(:disabled) { color: var(--ae-text); background: var(--ae-bg-3); }
  button:disabled { opacity: .4; cursor: default; }
  .action-card__script { width: 100%; height: 180px; margin-top: 8px; resize: vertical; overflow: auto; padding: 8px; border: 1px solid var(--ae-line); background: var(--ae-bg); color: var(--ae-text); font: 11px/1.5 "SF Mono", Menlo, monospace; white-space: pre; text-align: left; }
</style>
