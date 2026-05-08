<script lang="ts">
  import DOMPurify from "dompurify";
  import { marked } from "marked";
  import { openLinkInBrowser } from "../lib/utils/bolt";

  interface Props {
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
    duration_ms?: number;
  }

  let { role, content, timestamp, duration_ms }: Props = $props();
  let contentEl: HTMLDivElement | null = $state(null);

  const timeStr = $derived.by(() => {
    const d = new Date(timestamp);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  });

  const renderedContent = $derived.by(() => {
    try {
      return DOMPurify.sanitize(marked.parse(content, { async: false }) as string);
    } catch {
      return DOMPurify.sanitize(content);
    }
  });

  const metaStr = $derived.by(() => {
    const parts: string[] = [];
    if (duration_ms) {
      parts.push(`${(duration_ms / 1000).toFixed(1)}s`);
    }
    return parts.join(" | ");
  });

  function handleContentClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const anchor = target.closest("a");
    if (!(anchor instanceof HTMLAnchorElement)) return;

    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#")) return;

    event.preventDefault();
    openLinkInBrowser(anchor.href || href);
  }

  $effect(() => {
    if (!contentEl) return;

    contentEl.addEventListener("click", handleContentClick);

    return () => {
      contentEl?.removeEventListener("click", handleContentClick);
    };
  });
</script>

<div class="message message--{role}">
  <span class="message__time">{timeStr}</span>
  <div class="message__bubble">
    <div class="message__content" bind:this={contentEl}>
      {#if role === "system"}
        <p class="message__system-text">{content}</p>
      {:else}
        {@html renderedContent}
      {/if}
    </div>
  </div>
  {#if metaStr}
    <div class="message__meta">{metaStr}</div>
  {/if}
</div>

<style>
  .message {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    padding: 6px 14px;
  }

  .message--user {
    align-items: flex-end;
  }

  .message__time {
    padding: 0 6px 2px;
    color: var(--ae-text-3);
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
  }

  .message__bubble {
    max-width: 84%;
    padding: 9px 12px;
    border: 1px solid var(--ae-line);
    border-radius: 12px;
    border-bottom-left-radius: 4px;
    background: var(--ae-bg-2);
  }

  .message--user .message__bubble {
    border-color: rgba(78,195,139,0.28);
    border-bottom-right-radius: 4px;
    border-bottom-left-radius: 12px;
    background: rgba(78,195,139,0.22);
  }

  .message__content {
    color: var(--ae-text);
    font-size: 13.5px;
    line-height: 1.5;
    overflow-wrap: break-word;
  }

  .message__content :global(pre) {
    background: rgba(0,0,0,0.28);
    padding: 8px;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 12px;
    margin: 6px 0;
  }

  .message__content :global(code) {
    font-family: "SF Mono", "Menlo", monospace;
    font-size: 12px;
  }

  .message__content :global(p) {
    margin: 4px 0;
  }

  .message__content :global(a) {
    color: var(--accent);
  }

  .message__system-text {
    color: var(--ae-text-2);
    font-size: 12.5px;
    margin: 0;
    white-space: pre-wrap;
  }

  .message__meta {
    padding: 0 6px;
    color: var(--ae-text-3);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
  }
</style>
