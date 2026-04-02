<script lang="ts">
  import { onMount } from "svelte";
  import ApiKeySettings from "./ApiKeySettings.svelte";
  import { providerRegistry } from "../lib/provider-config";
  import type { ProviderDefinition } from "../lib/providers/provider";

  interface Props {
    onSelect: (provider: ProviderDefinition) => void;
  }

  type AvailabilityState = { available: boolean; reason?: string };

  let { onSelect }: Props = $props();
  let availabilityById: Record<string, AvailabilityState> = $state({});
  let expandedProviderId: string | null = $state(null);

  async function refreshAvailability() {
    const availability = await Promise.all(
      providerRegistry.map(async (provider) => [provider.id, await provider.isAvailable()] as const)
    );

    availabilityById = Object.fromEntries(availability);
  }

  function getAvailability(provider: ProviderDefinition): AvailabilityState | undefined {
    return availabilityById[provider.id];
  }

  async function handleProviderClick(provider: ProviderDefinition) {
    const availability = getAvailability(provider);
    if (!availability) return;

    if (availability.available) {
      onSelect(provider);
      return;
    }

    expandedProviderId = expandedProviderId === provider.id ? null : provider.id;
  }

  async function handleApiKeySaved(provider: ProviderDefinition) {
    const availability = await provider.isAvailable();
    availabilityById = {
      ...availabilityById,
      [provider.id]: availability,
    };

    if (availability.available) {
      expandedProviderId = null;
      onSelect(provider);
    }
  }

  onMount(() => {
    void refreshAvailability();
  });
</script>

<div class="picker">
  <div class="picker__header">
    <h1 class="picker__title">AE AI Chat</h1>
    <p class="picker__subtitle">Choose a provider</p>
  </div>

  <div class="picker__list">
    {#each providerRegistry as provider}
      {@const availability = getAvailability(provider)}
      {@const isReady = availability?.available === true}
      {@const isExpanded = expandedProviderId === provider.id}

      <button
        class:is-ready={isReady}
        class:is-unavailable={!!availability && !isReady}
        class="provider-card"
        onclick={() => handleProviderClick(provider)}
        type="button"
      >
        <div class="provider-card__row">
          <span class="provider-card__name">{provider.displayName}</span>
          <span class="provider-card__status">
            <span
              class:status-dot--ready={isReady}
              class:status-dot--unavailable={!!availability && !isReady}
              class="status-dot"
            ></span>
            {#if !availability}
              Checking...
            {:else if isReady}
              Ready
            {:else}
              {availability.reason}
            {/if}
          </span>
        </div>
      </button>

      {#if isExpanded && availability && !availability.available}
        <div class="provider-card__detail">
          {#if provider.id === "claude-api"}
            <ApiKeySettings onSave={(_key) => handleApiKeySaved(provider)} />
          {:else}
            <p class="provider-card__reason">{availability.reason}</p>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .picker {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-height: 100vh;
    padding: 24px 16px;
    background: #232323;
    color: #d4d4d4;
  }
  .picker__header {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .picker__title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: #f5f5f5;
  }
  .picker__subtitle {
    margin: 0;
    font-size: 13px;
    color: #9a9a9a;
  }
  .picker__list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .provider-card {
    width: 100%;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 10px;
    color: inherit;
    cursor: pointer;
    padding: 14px 16px;
    text-align: left;
  }
  .provider-card:hover {
    border-color: #4a4a4a;
    background: #202020;
  }
  .provider-card.is-ready {
    border-color: #2d5d39;
  }
  .provider-card.is-ready:hover {
    border-color: #3f8c55;
  }
  .provider-card__row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .provider-card__name {
    font-size: 14px;
    font-weight: 600;
    color: #f0f0f0;
  }
  .provider-card__status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #a5a5a5;
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #666;
    flex-shrink: 0;
  }
  .status-dot--ready {
    background: #45c16f;
  }
  .status-dot--unavailable {
    background: #d45b5b;
  }
  .provider-card__detail {
    background: #1a1a1a;
    border: 1px solid #333;
    border-top: none;
    border-radius: 0 0 10px 10px;
    margin-top: -12px;
    overflow: hidden;
  }
  .provider-card__reason {
    margin: 0;
    padding: 14px 16px;
    font-size: 12px;
    color: #c2c2c2;
  }
</style>
