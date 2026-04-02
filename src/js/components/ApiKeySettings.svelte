<script lang="ts">
  interface Props {
    onSave: (key: string) => void;
  }

  let { onSave }: Props = $props();
  let inputKey = $state("");

  function handleSave() {
    const trimmed = inputKey.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem("ANTHROPIC_API_KEY", trimmed);
    } catch {}
    onSave(trimmed);
  }
</script>

<div class="settings">
  <p class="settings__title">Anthropic API Key Required</p>
  <p class="settings__hint">
    Get your key at
    <button
      class="settings__link"
      onclick={() => window.open("https://console.anthropic.com/settings/keys", "_blank")}
    >
      console.anthropic.com
    </button>
  </p>
  <div class="settings__row">
    <input
      class="settings__input"
      type="password"
      placeholder="sk-ant-..."
      bind:value={inputKey}
      onkeydown={(e) => e.key === "Enter" && handleSave()}
    />
    <button
      class="settings__btn"
      onclick={handleSave}
      disabled={!inputKey.trim()}
    >
      Save
    </button>
  </div>
</div>

<style>
  .settings {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 20px 16px;
    flex: 1;
    justify-content: center;
  }
  .settings__title {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #eee;
  }
  .settings__hint {
    margin: 0;
    font-size: 11px;
    color: #888;
  }
  .settings__link {
    background: none;
    border: none;
    padding: 0;
    color: #4a9eff;
    font-size: 11px;
    cursor: pointer;
    text-decoration: none;
  }
  .settings__link:hover {
    text-decoration: underline;
  }
  .settings__row {
    display: flex;
    gap: 8px;
  }
  .settings__input {
    flex: 1;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    color: #eee;
    padding: 6px 8px;
    font-size: 12px;
    font-family: monospace;
  }
  .settings__input:focus {
    outline: none;
    border-color: #4a9eff;
  }
  .settings__btn {
    background: #4a9eff;
    border: none;
    border-radius: 4px;
    color: #fff;
    padding: 6px 14px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }
  .settings__btn:hover:not(:disabled) {
    background: #6ab0ff;
  }
  .settings__btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
