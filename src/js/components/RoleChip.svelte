<script lang="ts">
  interface Props {
    role: "system" | "you" | "assistant" | "error";
  }

  let { role }: Props = $props();

  const chip = $derived.by(() => {
    switch (role) {
      case "system":
        return {
          label: "System",
          fg: "var(--ae-text-2)",
          bg: "rgba(255,255,255,0.05)",
          dot: "var(--ae-text-3)",
        };
      case "you":
        return {
          label: "You",
          fg: "var(--accent)",
          bg: "rgba(78,195,139,0.14)",
          dot: "var(--accent)",
        };
      case "assistant":
        return {
          label: "Claude",
          fg: "rgb(207,207,207)",
          bg: "rgba(255,255,255,0.06)",
          dot: "rgb(207,207,207)",
        };
      case "error":
        return {
          label: "Error",
          fg: "var(--ae-warn)",
          bg: "rgba(255,142,106,0.10)",
          dot: "var(--ae-warn)",
        };
    }
  });
</script>

<span
  class="role-chip"
  style={`--chip-fg: ${chip.fg}; --chip-bg: ${chip.bg}; --chip-dot: ${chip.dot}`}
>
  <span class="role-chip__dot" aria-hidden="true"></span>
  {chip.label}
</span>

<style>
  .role-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 20px;
    padding: 0 8px 0 7px;
    border-radius: 6px;
    background: var(--chip-bg);
    color: var(--chip-fg);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.2px;
    line-height: 20px;
  }

  .role-chip__dot {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--chip-dot);
  }
</style>
