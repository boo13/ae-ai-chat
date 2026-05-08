<script lang="ts">
  import type { RuntimeEnvironment } from "../lib/runtime-environment";
  import type { ProviderDefinition } from "../lib/providers/provider";

  interface Props {
    activeProvider: ProviderDefinition;
    runtimeEnvironment: RuntimeEnvironment;
    runtimeEnvironmentTitle: string;
    version: string;
    model: string;
    onModelChange: (value: string) => void;
  }

  let {
    activeProvider,
    runtimeEnvironment,
    runtimeEnvironmentTitle,
    version,
    model,
    onModelChange,
  }: Props = $props();

  let isModelOpen = $state(false);
  let menuEl: HTMLDivElement | undefined = $state();

  const selectedModelLabel = $derived.by(
    () => activeProvider.models.find((providerModel) => providerModel.value === model)?.label || model
  );

  function chooseModel(value: string) {
    onModelChange(value);
    isModelOpen = false;
  }

  function handleDocumentMouseDown(event: MouseEvent) {
    if (!menuEl) return;
    if (!(event.target instanceof Node)) return;
    if (!menuEl.contains(event.target)) {
      isModelOpen = false;
    }
  }

  $effect(() => {
    if (!isModelOpen) return;

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  });
</script>

<header class="panel-header">
  <div class="panel-header__identity">
    <div class="panel-header__title">{activeProvider.displayName}</div>
    <div class="panel-header__status">
      <span class="panel-header__status-dot" title="Connected" aria-hidden="true"></span>
      <span>v{version}</span>
      {#if runtimeEnvironment.isDevInstall}
        <span class="panel-header__dev-badge" title={runtimeEnvironmentTitle}>DEV</span>
      {/if}
    </div>
  </div>

  <div class="panel-header__spacer"></div>

  <div class="model-menu" bind:this={menuEl}>
    <button
      class="model-menu__trigger"
      type="button"
      aria-haspopup="menu"
      aria-expanded={isModelOpen}
      onclick={() => (isModelOpen = !isModelOpen)}
    >
      <span class="model-menu__accent" aria-hidden="true"></span>
      <span class="model-menu__label">{selectedModelLabel}</span>
      <svg class="model-menu__chevron" width="10" height="10" viewBox="0 0 24 24" fill="none">
        <path
          d="m6 9 6 6 6-6"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    {#if isModelOpen}
      <div class="model-menu__list" role="menu">
        {#each activeProvider.models as providerModel}
          <button
            class="model-menu__item"
            class:model-menu__item--selected={providerModel.value === model}
            type="button"
            role="menuitemradio"
            aria-checked={providerModel.value === model}
            onclick={() => chooseModel(providerModel.value)}
          >
            <span class="model-menu__item-dot" aria-hidden="true"></span>
            <span>{providerModel.label}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</header>

<style>
  .panel-header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    padding: 12px 18px;
    border-bottom: 1px solid var(--ae-line);
    background: linear-gradient(to bottom, rgba(255,255,255,0.02), transparent);
  }

  .panel-header__identity {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.1;
  }

  .panel-header__title {
    color: var(--ae-text);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.2px;
  }

  .panel-header__status {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
    color: var(--ae-text-3);
    font-size: 11px;
  }

  .panel-header__status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--ae-ok);
  }

  .panel-header__dev-badge {
    padding: 1px 5px;
    border: 1px solid rgba(255,199,103,0.35);
    border-radius: 4px;
    background: rgba(255,199,103,0.09);
    color: rgb(255,199,103);
    font-size: 9px;
    font-weight: 700;
    line-height: 14px;
  }

  .panel-header__spacer {
    flex: 1;
    min-width: 8px;
  }

  .model-menu {
    position: relative;
    flex: none;
  }

  .model-menu__trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 170px;
    height: 26px;
    padding: 0 8px 0 10px;
    border: 1px solid var(--ae-line-2);
    border-radius: 6px;
    background: var(--ae-bg-2);
    color: var(--ae-text);
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 500;
  }

  .model-menu__trigger:hover {
    border-color: rgba(78,195,139,0.50);
  }

  .model-menu__accent {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 2px rgba(78,195,139,0.25);
    flex: none;
  }

  .model-menu__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .model-menu__chevron {
    color: var(--ae-text-3);
    flex: none;
  }

  .model-menu__list {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 20;
    min-width: 150px;
    padding: 4px;
    border: 1px solid var(--ae-line-2);
    border-radius: 8px;
    background: var(--ae-bg-3);
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  }

  .model-menu__item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
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

  .model-menu__item:hover,
  .model-menu__item--selected {
    background: rgba(255,255,255,0.05);
  }

  .model-menu__item-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px var(--ae-text-3);
    flex: none;
  }

  .model-menu__item--selected .model-menu__item-dot {
    background: var(--accent);
    box-shadow: none;
  }
</style>
