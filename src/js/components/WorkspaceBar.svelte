<script lang="ts">
  import type { Conversation, CreativePreset } from "../lib/workspace-state";
  interface Props {
    conversations: Conversation[];
    allConversations: Conversation[];
    currentId: string;
    projectName: string;
    presets: CreativePreset[];
    disabled: boolean;
    verifyActions: boolean;
    reviewAvailable: boolean;
    onselect: (id: string) => void;
    onnew: () => void;
    oncopy: () => void;
    onexport: (id?: string) => void;
    onremove: (id: string) => void;
    onverify: (value: boolean) => void;
    onpreset: (preset: CreativePreset) => void;
  }
  let { conversations, allConversations, currentId, projectName, presets, disabled, verifyActions, reviewAvailable, onselect, onnew, oncopy, onexport, onremove, onverify, onpreset }: Props = $props();
  let manageOpen = $state(false);
  let managedId = $state("");
  let removalPending = $state(false);
  const managedChat = $derived(allConversations.find((item) => item.id === managedId));
  let presetsOpen = $state(false);
  let selectedPreset = $state("");
  let color = $state("");
  let intensity = $state(50);
  let duration = $state(1);
  const preset = $derived(presets.find((item) => item.id === selectedPreset));
  function selectPreset(id: string) {
    selectedPreset = id;
    const item = presets.find((entry) => entry.id === id);
    color = item?.color || "";
    intensity = item?.intensity ?? 50;
    duration = item?.duration ?? 1;
  }
</script>

<div class="workspace-bar">
  <div class="workspace-bar__project" title={projectName}>{projectName}</div>
  <div class="workspace-bar__row">
    <select aria-label="Conversation" value={currentId} {disabled} onchange={(event) => onselect(event.currentTarget.value)}>
      {#each conversations as conversation}<option value={conversation.id}>{conversation.title}</option>{/each}
    </select>
    <button type="button" {disabled} onclick={onnew}>New chat</button>
    <button type="button" {disabled} onclick={() => { presetsOpen = !presetsOpen; if (presetsOpen && !preset && presets[0]) selectPreset(presets[0].id); }} aria-expanded={presetsOpen}>Presets</button>
    <button type="button" onclick={oncopy} title="Copy conversation as Markdown">Copy</button>
    <button type="button" onclick={() => onexport()}>Export</button>
    <button type="button" {disabled} aria-expanded={manageOpen} onclick={() => { manageOpen = !manageOpen; managedId = currentId; removalPending = false; }}>Manage chats</button>
  </div>
  {#if manageOpen}
    <div class="preset-editor">
      <label>All saved chats<select aria-label="Manage conversation" value={managedId} {disabled} onchange={(event) => { managedId = event.currentTarget.value; removalPending = false; }}>
        {#each allConversations as item}<option value={item.id}>{item.projectName} — {item.title}</option>{/each}
      </select></label>
      <button type="button" disabled={!managedChat} onclick={() => onexport(managedId)}>Export selected chat</button>
      <button type="button" disabled={disabled || !managedChat} onclick={() => (removalPending = true)}>Remove selected chat</button>
      {#if removalPending && managedChat}
        <p>Remove “{managedChat.title}” from this panel? Export it first if you want to keep it.</p>
        <button type="button" {disabled} onclick={() => { onremove(managedId); managedId = currentId; removalPending = false; }}>Confirm removal</button>
        <button type="button" onclick={() => (removalPending = false)}>Cancel</button>
      {/if}
    </div>
  {/if}
  <label class="workspace-bar__verify">
    <input type="checkbox" checked={verifyActions} {disabled} onchange={(event) => onverify(event.currentTarget.checked)} />
    Review results after running
    <span>{reviewAvailable ? "One extra model request" : "Measured changes only with this provider"}</span>
  </label>
  {#if presetsOpen}
    <form class="preset-editor" onsubmit={(event) => { event.preventDefault(); if (preset && !disabled) onpreset({ ...preset, color, intensity, duration }); }}>
      {#if presets.length}
        <label>Saved treatment<select aria-label="Saved treatment" value={selectedPreset} onchange={(event) => selectPreset(event.currentTarget.value)}>{#each presets as item}<option value={item.id}>{item.name}</option>{/each}</select></label>
        <div class="preset-editor__fields">
          <label>Color<input aria-label="Preset color" placeholder="#RRGGBB" value={color} oninput={(event) => (color = event.currentTarget.value)} pattern="#[0-9a-fA-F]{6}" /></label>
          <label>Intensity %<input aria-label="Preset intensity" type="number" min="0" max="100" bind:value={intensity} required /></label>
          <label>Seconds<input aria-label="Preset duration" type="number" min="0.01" max="600" step="0.01" bind:value={duration} required /></label>
        </div>
        <button type="submit" disabled={disabled || !preset}>Prepare prompt</button>
        <p>Uses the current selection. Review the prompt, then send it.</p>
      {:else}
        <p>Run a treatment, then choose Save preset on its action card.</p>
      {/if}
    </form>
  {/if}
</div>

<style>
  .workspace-bar { padding: 8px 12px; border-bottom: 1px solid var(--ae-line); flex-shrink: 0; background: var(--ae-chrome-bg); text-align: left; }
  .workspace-bar__project { margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ae-text-3); font-size: 10px; }
  .workspace-bar__row { display: flex; flex-wrap: wrap; gap: 5px; }
  select, button, input { font: inherit; font-size: 11px; text-align: left; }
  select, button, input:not([type="checkbox"]) { min-height: 27px; padding: 4px 6px; border: 1px solid var(--ae-line-2); border-radius: 5px; color: var(--ae-text-2); background: var(--ae-bg-2); }
  .workspace-bar__row select { flex: 1 1 120px; min-width: 0; max-width: 100%; }
  button { cursor: pointer; }
  button:disabled { opacity: .4; cursor: default; }
  button:hover:not(:disabled) { color: var(--ae-text); border-color: var(--accent); }
  .workspace-bar__verify { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; margin-top: 7px; color: var(--ae-text-2); font-size: 10px; }
  .workspace-bar__verify input { accent-color: var(--accent); margin: 0 3px 0 0; }
  .workspace-bar__verify span { color: var(--ae-text-3); }
  .preset-editor { padding-top: 10px; max-height: 260px; overflow-y: auto; }
  .preset-editor label { display: flex; flex-direction: column; gap: 4px; min-width: 0; color: var(--ae-text-2); font-size: 10px; }
  .preset-editor__fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 8px 0; }
  input { min-width: 0; width: 100%; }
  input[type="checkbox"] { width: auto; }
  p { margin: 7px 0 0; color: var(--ae-text-3); font-size: 11px; line-height: 1.4; }
</style>
