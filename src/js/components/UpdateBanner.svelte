<script lang="ts">
  import type { AvailableUpdate } from "../lib/update-check";

  interface Props {
    update: AvailableUpdate;
    onDownload: () => void;
    onReleaseNotes: () => void;
    onDismiss: () => void;
  }

  let { update, onDownload, onReleaseNotes, onDismiss }: Props = $props();
</script>

<aside class="update-banner" aria-live="polite">
  <div class="update-banner__copy">
    <span class="update-banner__title">Update available</span>
    <span class="update-banner__version">
      AE AI Chat v{update.version}
    </span>
  </div>
  <div class="update-banner__actions">
    <button
      class="update-banner__button update-banner__button--primary"
      type="button"
      onclick={onDownload}
    >
      Download
    </button>
    <button class="update-banner__button" type="button" onclick={onReleaseNotes}>
      Notes
    </button>
    <button
      class="update-banner__dismiss"
      type="button"
      aria-label={`Dismiss update ${update.version}`}
      title="Dismiss this version"
      onclick={onDismiss}
    >
      ×
    </button>
  </div>
</aside>

<style>
  .update-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(78,195,139,0.24);
    background: rgba(78,195,139,0.08);
    color: var(--ae-text);
  }

  .update-banner__copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .update-banner__title {
    color: var(--accent);
    font-size: 11px;
    font-weight: 700;
  }

  .update-banner__version {
    overflow: hidden;
    color: var(--ae-text-2);
    font-size: 10.5px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .update-banner__actions {
    display: flex;
    align-items: center;
    gap: 5px;
    flex: none;
  }

  .update-banner__button {
    height: 24px;
    padding: 0 8px;
    border: 1px solid var(--ae-line-2);
    border-radius: 5px;
    background: rgba(255,255,255,0.04);
    color: var(--ae-text-2);
    cursor: pointer;
    font: inherit;
    font-size: 10.5px;
  }

  .update-banner__button:hover,
  .update-banner__button:focus-visible {
    border-color: rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.08);
    color: var(--ae-text);
  }

  .update-banner__button--primary {
    border-color: rgba(78,195,139,0.35);
    background: rgba(78,195,139,0.14);
    color: var(--accent);
  }

  .update-banner__dismiss {
    width: 22px;
    height: 22px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ae-text-3);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
  }

  .update-banner__dismiss:hover,
  .update-banner__dismiss:focus-visible {
    color: var(--ae-text);
  }
</style>
