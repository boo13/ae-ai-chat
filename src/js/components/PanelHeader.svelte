<script lang="ts">
  import { onMount } from "svelte";
  import { providerRegistry } from "../lib/provider-config";
  import { openFeedbackEmail } from "../lib/feedback";
  import type { RuntimeEnvironment } from "../lib/runtime-environment";
  import type { ProviderDefinition } from "../lib/providers/provider";

  interface Props {
    activeProvider: ProviderDefinition;
    runtimeEnvironment: RuntimeEnvironment;
    runtimeEnvironmentTitle: string;
    version: string;
    model: string;
    disabled: boolean;
    onModelChange: (value: string) => void;
    onProviderChange: (provider: ProviderDefinition) => void;
  }

  type AvailabilityState = { available: boolean; reason?: string };

  let {
    activeProvider,
    runtimeEnvironment,
    runtimeEnvironmentTitle,
    version,
    model,
    disabled,
    onModelChange,
    onProviderChange,
  }: Props = $props();

  let isProviderOpen = $state(false);
  let isModelOpen = $state(false);
  let providerMenuEl: HTMLDivElement | undefined = $state();
  let modelMenuEl: HTMLDivElement | undefined = $state();
  let availabilityById: Record<string, AvailabilityState> = $state({});

  const selectedModelLabel = $derived.by(
    () => activeProvider.models.find((providerModel) => providerModel.value === model)?.label || model
  );

  async function refreshAvailability() {
    const availability = await Promise.all(
      providerRegistry.map(
        async (provider) => [provider.id, await provider.isAvailable()] as const
      )
    );

    availabilityById = Object.fromEntries(availability);
  }

  function toggleProviderMenu() {
    if (disabled) return;
    isProviderOpen = !isProviderOpen;
    if (isProviderOpen) {
      isModelOpen = false;
      void refreshAvailability();
    }
  }

  function chooseProvider(provider: ProviderDefinition) {
    const availability = availabilityById[provider.id];
    if (provider.id === activeProvider.id) {
      isProviderOpen = false;
      return;
    }

    if (!availability?.available) return;

    onProviderChange(provider);
    isProviderOpen = false;
    isModelOpen = false;
  }

  function chooseModel(value: string) {
    onModelChange(value);
    isModelOpen = false;
  }

  function handleFeedback() {
    openFeedbackEmail({
      version,
      providerLabel: activeProvider.displayName,
      modelLabel: selectedModelLabel,
      isDevInstall: runtimeEnvironment.isDevInstall,
    });
  }

  function handleDocumentMouseDown(event: MouseEvent) {
    if (!(event.target instanceof Node)) return;

    if (providerMenuEl && !providerMenuEl.contains(event.target)) {
      isProviderOpen = false;
    }

    if (modelMenuEl && !modelMenuEl.contains(event.target)) {
      isModelOpen = false;
    }
  }

  $effect(() => {
    if (!isProviderOpen && !isModelOpen) return;

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  });

  onMount(() => {
    void refreshAvailability();
  });
</script>

<header class="panel-header">
  <div class="panel-header__identity">
    <div class="provider-menu" bind:this={providerMenuEl}>
      <button
        class="provider-menu__trigger"
        type="button"
        title="Switch provider"
        aria-haspopup="menu"
        aria-expanded={isProviderOpen}
        {disabled}
        onclick={toggleProviderMenu}
      >
        <span class="provider-menu__status" aria-hidden="true"></span>
        <span class="panel-header__title">{activeProvider.displayName}</span>
        <svg class="provider-menu__chevron" width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      {#if isProviderOpen}
        <div class="provider-menu__list" role="menu" aria-label="Switch provider">
          {#each providerRegistry as provider}
            {@const availability = availabilityById[provider.id]}
            {@const isReady = availability?.available === true}
            {@const isCurrent = provider.id === activeProvider.id}
            {@const isUnavailable = !isCurrent && !isReady}
            <button
              class="provider-menu__item"
              class:provider-menu__item--selected={isCurrent}
              class:provider-menu__item--unavailable={isUnavailable}
              type="button"
              role="menuitemradio"
              aria-checked={isCurrent}
              aria-disabled={isUnavailable ? "true" : undefined}
              title={isCurrent
                ? "Current provider"
                : !availability
                  ? "Checking availability..."
                  : !isReady
                    ? availability.reason || "Unavailable"
                    : "Switch to " + provider.displayName}
              onclick={() => chooseProvider(provider)}
            >
              <span
                class="provider-menu__item-dot"
                class:provider-menu__item-dot--ready={isReady}
                class:provider-menu__item-dot--unavailable={Boolean(availability && !isReady)}
                aria-hidden="true"
              ></span>
              <span class="provider-menu__item-text">
                <span class="provider-menu__item-name">{provider.displayName}</span>
                <span class="provider-menu__item-meta">
                  {#if !availability}
                    Checking...
                  {:else if isCurrent}
                    Current
                  {:else if isReady}
                    Ready
                  {:else}
                    {availability.reason}
                  {/if}
                </span>
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
    <span class="panel-header__version">v{version}</span>
    {#if runtimeEnvironment.isDevInstall}
      <span class="panel-header__dev-badge" title={runtimeEnvironmentTitle}>DEV</span>
    {/if}
  </div>

  <div class="panel-header__spacer"></div>

  <div class="header-tooltip" data-tooltip="Send feedback">
    <button
      class="feedback-button"
      type="button"
      aria-label="Send feedback"
      onclick={handleFeedback}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>

  <div class="model-menu" bind:this={modelMenuEl}>
    <button
      class="model-menu__trigger"
      type="button"
      aria-haspopup="menu"
      aria-expanded={isModelOpen}
      {disabled}
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
    background: var(--ae-chrome-bg);
  }

  .panel-header__identity {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    line-height: 1;
  }

  .provider-menu {
    position: relative;
    min-width: 0;
  }

  .provider-menu__trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 150px;
    min-width: 0;
    height: 24px;
    padding: 0 6px 0 0;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--ae-text);
    cursor: pointer;
    font: inherit;
  }

  .provider-menu__trigger:hover:not(:disabled),
  .provider-menu__trigger:focus-visible {
    background: rgba(255,255,255,0.05);
  }

  .provider-menu__trigger:disabled {
    cursor: default;
    opacity: 0.65;
  }

  .provider-menu__status {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--ae-ok);
    box-shadow: 0 0 0 2px rgba(78,195,139,0.16);
    flex: none;
  }

  .panel-header__title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--ae-text);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.2px;
  }

  .provider-menu__chevron {
    color: var(--ae-text-3);
    flex: none;
  }

  .provider-menu__list {
    position: absolute;
    top: calc(100% + 5px);
    left: 0;
    z-index: 25;
    width: 220px;
    padding: 4px;
    border: 1px solid var(--ae-line-2);
    border-radius: 8px;
    background: var(--ae-bg-3);
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  }

  .provider-menu__item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-width: 0;
    padding: 7px 8px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--ae-text);
    cursor: pointer;
    font: inherit;
    text-align: left;
  }

  .provider-menu__item:hover:not(.provider-menu__item--unavailable),
  .provider-menu__item--selected {
    background: rgba(255,255,255,0.05);
  }

  .provider-menu__item--unavailable {
    cursor: not-allowed;
    opacity: 0.58;
  }

  .provider-menu__item-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--ae-text-3);
    flex: none;
  }

  .provider-menu__item-dot--ready {
    background: var(--ae-ok);
  }

  .provider-menu__item-dot--unavailable {
    background: var(--ae-warn);
  }

  .provider-menu__item-text {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .provider-menu__item-name,
  .provider-menu__item-meta {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .provider-menu__item-name {
    font-size: 12px;
    font-weight: 600;
  }

  .provider-menu__item-meta {
    color: var(--ae-text-3);
    font-size: 10.5px;
  }

  .panel-header__version {
    flex: none;
    color: var(--ae-text-3);
    font-size: 11px;
  }

  .panel-header__dev-badge {
    flex: none;
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

  .header-tooltip {
    position: relative;
    display: inline-flex;
    flex: none;
  }

  .header-tooltip::after {
    content: attr(data-tooltip);
    position: absolute;
    top: calc(100% + 7px);
    left: 50%;
    z-index: 30;
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
    transform: translate(-50%, -2px);
    transition:
      opacity 100ms ease,
      transform 100ms ease;
    white-space: pre-line;
  }

  .header-tooltip:hover::after,
  .header-tooltip:focus-within::after {
    opacity: 1;
    transform: translate(-50%, 0);
  }

  .feedback-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--ae-text-3);
    cursor: pointer;
    flex: none;
  }

  .feedback-button:hover,
  .feedback-button:focus-visible {
    background: rgba(255,255,255,0.05);
    color: var(--ae-text);
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
    height: 24px;
    padding: 0 6px 0 7px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--ae-text);
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 500;
  }

  .model-menu__trigger:hover:not(:disabled),
  .model-menu__trigger:focus-visible,
  .model-menu__trigger[aria-expanded="true"] {
    background: rgba(255,255,255,0.05);
  }

  .model-menu__trigger:disabled {
    cursor: default;
    opacity: 0.65;
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
    border: 0;
    border-radius: 8px;
    background: rgb(21,21,21);
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
