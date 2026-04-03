<script lang="ts">
  import DOMPurify from "dompurify";
  import { marked } from "marked";
  import { openLinkInBrowser } from "../lib/utils/bolt";

  interface Props {
    assistantName: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
    duration_ms?: number;
  }

  let { assistantName, role, content, timestamp, duration_ms }: Props = $props();
  let contentEl: HTMLDivElement | null = $state(null);

  const roleLabel = $derived(
    role === "user" ? "You" : role === "assistant" ? assistantName : "System"
  );

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
  <div class="message__header">
    <span class="message__role">{roleLabel}</span>
    <span class="message__time">{timeStr}</span>
  </div>
  <div class="message__content" bind:this={contentEl}>
    {#if role === "system"}
      <p class="message__system-text">{content}</p>
    {:else}
      {@html renderedContent}
    {/if}
  </div>
  {#if metaStr}
    <div class="message__meta">{metaStr}</div>
  {/if}
</div>

<style>
  .message {
    padding: 8px 12px;
    margin-bottom: 4px;
    border-radius: 4px;
  }
  .message--user {
    background: #2a2a2a;
  }
  .message--assistant {
    background: #1e1e1e;
  }
  .message--system {
    background: transparent;
  }
  .message__header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  .message__role {
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .message--user .message__role {
    color: #7cb3ff;
  }
  .message--assistant .message__role {
    color: #a78bfa;
  }
  .message--system .message__role {
    color: #888;
  }
  .message__time {
    font-size: 10px;
    color: #666;
  }
  .message__content {
    font-size: 13px;
    line-height: 1.5;
    color: #d4d4d4;
    overflow-wrap: break-word;
  }
  .message__content :global(pre) {
    background: #161616;
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
    color: #4a9eff;
  }
  .message__system-text {
    color: #888;
    font-style: italic;
    font-size: 12px;
    margin: 0;
    white-space: pre-wrap;
  }
  .message__meta {
    font-size: 10px;
    color: #555;
    margin-top: 4px;
    text-align: right;
  }
</style>
