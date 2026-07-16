<script lang="ts">
  import type { QuickAction } from "../lib/actions";

  type ActionIconName = QuickAction["icon"];

  interface Props {
    name: ActionIconName;
    size?: number;
    strokeWidth?: number;
  }

  let { name, size = 13, strokeWidth = 2.1 }: Props = $props();
</script>

<svg
  class="icon"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === "screenshot"}
    <path d="M14.5 4H9.5L7.8 6H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2.8z" />
    <circle cx="12" cy="12.5" r="3.25" />
  {:else if name === "report"}
    <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
    <path d="M14 2v5h5" />
    <path d="M9 12h6" />
    <path d="M9 16h6" />
  {:else if name === "fix-error"}
    <path d="m14.7 6.3 3 3" />
    <path d="M10.5 8.8a5.5 5.5 0 0 1 7.7-5.1l-2.7 2.7a1 1 0 0 0 0 1.4l.7.7a1 1 0 0 0 1.4 0l2.7-2.7a5.5 5.5 0 0 1-5 7.8L7.6 21.3a2 2 0 1 1-2.8-2.8l7.7-7.7a5.4 5.4 0 0 1-2-2z" />
  {:else if name === "tutorial"}
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a2 2 0 0 1 2 2v16a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 21.5z" />
    <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v18a2 2 0 0 1 2-2h2.5a2.5 2.5 0 0 1 2.5 2.5z" />
  {:else if name === "ai-action"}
    <path d="M12 3.5 13.6 8l4.4 1.6-4.4 1.6L12 15.7l-1.6-4.5L6 9.6 10.4 8z" />
    <path d="M18.5 14.5 19.3 17l2.5.8-2.5.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8z" />
    <path d="M6.2 14.8 6.9 17l2.2.7-2.2.7-.7 2.2-.7-2.2-2.2-.7 2.2-.7z" />
  {/if}
</svg>

<style>
  .icon {
    display: block;
    flex: none;
  }
</style>
