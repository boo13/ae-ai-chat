<script lang="ts">
  import DOMPurify from "dompurify";
  import type {
    ParsedTutorial,
    TutorialStepAction,
  } from "../lib/tutorial";

  interface Props {
    tutorial: ParsedTutorial;
    onRunStep: (action: TutorialStepAction) => Promise<boolean | void>;
    onclose: () => void;
  }

  let { tutorial, onRunStep, onclose }: Props = $props();
  let bodyEl: HTMLDivElement | undefined = $state();
  let stepStatus: Record<number, string> = $state({});

  const sanitizedHtml = $derived.by(() =>
    DOMPurify.sanitize(tutorial.html, {
      ALLOWED_TAGS: [
        "section",
        "h2",
        "h3",
        "p",
        "ul",
        "ol",
        "li",
        "strong",
        "em",
        "code",
        "pre",
        "kbd",
        "br",
        "hr",
        "div",
        "span",
        "button",
      ],
      ALLOWED_ATTR: [
        "class",
        "type",
        "data-tutorial-action",
        "data-tutorial-status",
      ],
      ALLOW_DATA_ATTR: false,
    })
  );

  async function handleBodyClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const marker = target.closest<HTMLElement>("[data-tutorial-action]");
    if (!marker || !bodyEl?.contains(marker)) return;

    const index = Number.parseInt(marker.dataset.tutorialAction || "", 10);
    const action = tutorial.actions.find((item) => item.index === index);
    if (!action || action.validation.errors.length > 0 || stepStatus[index] === "Running…") {
      return;
    }

    stepStatus = { ...stepStatus, [index]: "Running…" };
    try {
      const succeeded = await onRunStep(action);
      stepStatus = {
        ...stepStatus,
        [index]: succeeded === false ? "Failed" : "Done",
      };
    } catch {
      stepStatus = { ...stepStatus, [index]: "Failed" };
    }
  }

  $effect(() => {
    if (!bodyEl) return;

    bodyEl.addEventListener("click", handleBodyClick);
    return () => bodyEl?.removeEventListener("click", handleBodyClick);
  });

  $effect(() => {
    sanitizedHtml;
    if (!bodyEl) return;

    for (const action of tutorial.actions) {
      const marker = bodyEl.querySelector<HTMLElement>(
        `[data-tutorial-action="${action.index}"]`
      );
      const button = marker?.querySelector<HTMLButtonElement>("button");
      const status = bodyEl.querySelector<HTMLElement>(
        `[data-tutorial-status="${action.index}"]`
      );
      const errors = action.validation.errors;
      const currentStatus = stepStatus[action.index] || "";

      if (button) {
        button.disabled = errors.length > 0 || currentStatus === "Running…";
        button.title = errors.length > 0
          ? errors.map((error) => `[${error.code}] ${error.message}`).join("\n")
          : "";
      }
      if (status) {
        status.textContent = errors.length > 0 ? "Blocked" : currentStatus;
      }
    }
  });
</script>

<div class="tutorial-viewer">
  <div class="tutorial-viewer__header">
    <button class="tutorial-viewer__back" type="button" onclick={onclose}>‹ Chat</button>
    <div class="tutorial-viewer__heading">
      <span class="tutorial-viewer__eyebrow">Tutorial</span>
      <span class="tutorial-viewer__title">{tutorial.title}</span>
    </div>
  </div>
  <div class="tutorial-viewer__body" bind:this={bodyEl}>
    {@html sanitizedHtml}
  </div>
</div>

<style>
  .tutorial-viewer {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
    background: rgb(20,20,20);
    color: var(--ae-text);
    text-align: left;
  }

  .tutorial-viewer__header {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 38px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--ae-line-2);
  }

  .tutorial-viewer__heading {
    display: flex;
    align-items: baseline;
    gap: 7px;
    min-width: 0;
  }

  .tutorial-viewer__eyebrow {
    flex: none;
    color: var(--accent);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .tutorial-viewer__title {
    color: var(--ae-text);
    font-size: 12px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tutorial-viewer__back {
    flex: none;
    padding: 3px 8px;
    border: 1px solid var(--ae-line-2);
    border-radius: 5px;
    background: transparent;
    color: var(--ae-text-2);
    cursor: pointer;
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.4;
  }

  .tutorial-viewer__back:hover {
    color: var(--ae-text);
    border-color: var(--ae-text-3);
  }

  .tutorial-viewer__body {
    flex: 1;
    min-height: 0;
    padding: 12px 13px 14px;
    overflow: auto;
    counter-reset: tutorial-step;
    font-size: 12.5px;
    line-height: 1.55;
    text-align: left;
  }

  .tutorial-viewer__body :global(h2),
  .tutorial-viewer__body :global(h3),
  .tutorial-viewer__body :global(p),
  .tutorial-viewer__body :global(ul),
  .tutorial-viewer__body :global(ol) {
    text-align: left;
  }

  .tutorial-viewer__body :global(h2) {
    margin: 0 0 10px;
    font-size: 15px;
  }

  .tutorial-viewer__body :global(section.step) {
    position: relative;
    min-height: 26px;
    margin: 0 0 15px;
    padding: 0 0 15px 34px;
    border-bottom: 1px solid var(--ae-line);
    counter-increment: tutorial-step;
  }

  .tutorial-viewer__body :global(section.step:last-child) {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: 0;
  }

  .tutorial-viewer__body :global(section.step h3) {
    margin: 0 0 5px;
    color: var(--ae-text);
    font-size: 13px;
    line-height: 1.35;
  }

  .tutorial-viewer__body :global(section.step h3::before) {
    content: counter(tutorial-step);
    position: absolute;
    top: -2px;
    left: 0;
    display: grid;
    width: 23px;
    height: 23px;
    place-items: center;
    border-radius: 50%;
    background: var(--accent);
    color: rgb(10,10,10);
    font-size: 10px;
    font-weight: 800;
  }

  .tutorial-viewer__body :global(p) {
    margin: 4px 0 8px;
    color: var(--ae-text-2);
  }

  .tutorial-viewer__body :global(ul),
  .tutorial-viewer__body :global(ol) {
    margin: 5px 0 9px;
    padding-left: 18px;
    color: var(--ae-text-2);
  }

  .tutorial-viewer__body :global(.callout) {
    margin: 8px 0;
    padding: 7px 9px;
    border-left: 3px solid var(--ae-line-2);
    border-radius: 0 4px 4px 0;
    background: rgba(255,255,255,0.035);
    color: var(--ae-text-2);
  }

  .tutorial-viewer__body :global(.callout--tip) {
    border-color: var(--accent);
    background: rgba(78,195,139,0.08);
  }

  .tutorial-viewer__body :global(.callout--warning) {
    border-color: var(--ae-warn);
    background: rgba(255,142,106,0.08);
  }

  .tutorial-viewer__body :global(.callout--note) {
    border-color: var(--ae-line-2);
  }

  .tutorial-viewer__body :global(kbd) {
    display: inline-block;
    padding: 1px 5px;
    border: 1px solid var(--ae-line-2);
    border-bottom-width: 2px;
    border-radius: 4px;
    background: var(--ae-bg-3);
    color: var(--ae-text);
    font-family: "JetBrains Mono", "SF Mono", Menlo, ui-monospace, monospace;
    font-size: 10.5px;
    line-height: 1.4;
  }

  .tutorial-viewer__body :global(pre) {
    margin: 7px 0;
    padding: 8px;
    border-radius: 4px;
    background: rgba(0,0,0,0.28);
    overflow-x: auto;
    color: var(--ae-text);
    font-size: 11px;
    line-height: 1.5;
  }

  .tutorial-viewer__body :global(code) {
    font-family: "JetBrains Mono", "SF Mono", Menlo, ui-monospace, monospace;
    font-size: 11px;
  }

  .tutorial-viewer__body :global(.tutorial-step__action) {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 9px;
  }

  .tutorial-viewer__body :global(.tutorial-step__action button) {
    padding: 5px 9px;
    border: 1px solid rgba(78,195,139,0.42);
    border-radius: 5px;
    background: rgba(78,195,139,0.12);
    color: var(--accent);
    cursor: pointer;
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    text-align: left;
  }

  .tutorial-viewer__body :global(.tutorial-step__action button:hover:not(:disabled)) {
    background: rgba(78,195,139,0.2);
  }

  .tutorial-viewer__body :global(.tutorial-step__action button:disabled) {
    border-color: var(--ae-line-2);
    background: rgba(255,255,255,0.03);
    color: var(--ae-text-3);
    cursor: not-allowed;
  }

  .tutorial-viewer__body :global([data-tutorial-status]) {
    color: var(--ae-text-3);
    font-size: 10.5px;
  }
</style>
