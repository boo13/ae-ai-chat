import { child_process, os } from "../cep/node";
import { csi } from "./bolt";

/**
 * Register all possible keyboard shortcuts on Mac and Windows for you CEP Panel
 * Warning: Note that certain keys will not work per OS regardless of registration
 */

export const keyRegisterOverride = () => {
  //@ts-ignore
  const platform = navigator.platform.substring(0, 3);
  let maxKey = 0;
  if (platform === "Mac") maxKey = 126; // Mac Max Key Code
  else if (platform === "Win") maxKey = 222; // HTML Max Key Code
  let allKeys: {
    keyCode: number;
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
  }[] = [];
  for (let k = 0; k <= maxKey; k++) {
    for (let j = 0; j <= 15; j++) {
      const guide = (j >>> 0).toString(2).padStart(4, "0");
      allKeys.push({
        keyCode: k,
        ctrlKey: guide[0] === "1",
        altKey: guide[1] === "1",
        shiftKey: guide[2] === "1",
        metaKey: guide[3] === "1",
      });
    }
  }
  const keyRes = csi.registerKeyEventsInterest(JSON.stringify(allKeys));
  console.log("Key Events Registered Completed: " + keyRes);
};

export const textCepPatch = (e: KeyboardEvent) => {
  const isMac = os.platform() === "darwin";
  if (!isMac) return; // Only needed on MacOS, Windows handles this natively

  // console.log("keyup", e);

  const isShiftKey = e.shiftKey;
  const input = e.target as HTMLTextAreaElement | HTMLInputElement;
  const start = input.selectionStart;
  let end = input.selectionEnd;

  const selectionExists = start !== null && end !== null && start !== end;

  if (start === null || end === null) return;

  if (e.key === "ArrowLeft") {
    if (start === 0) return; // Prevents going to -1
    if (isShiftKey) {
      input.setSelectionRange(start - 1, end);
    } else {
      input.setSelectionRange(start - 1, start - 1);
    }
  } else if (e.key === "ArrowRight") {
    if (end === input.value.length) return; // Prevents going to start
    if (isShiftKey) {
      input.setSelectionRange(start, end + 1);
    } else {
      input.setSelectionRange(end + 1, end + 1);
    }
  }
};

const primaryModifierPressed = (event: KeyboardEvent) => {
  const isMac = os.platform() === "darwin";
  return isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
};

const isTextField = (
  element: EventTarget | null
): element is HTMLInputElement | HTMLTextAreaElement => {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
};

const isEditableElement = (element: EventTarget | null): element is HTMLElement => {
  return element instanceof HTMLElement && element.isContentEditable;
};

const execPanelCommand = (command: "copy" | "cut" | "paste" | "selectAll") => {
  if (typeof document.execCommand === "function") {
    return document.execCommand(command);
  }
  return false;
};

const copyViaHiddenTextarea = (text: string) => {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = execPanelCommand("copy");
  document.body.removeChild(textarea);
  return copied;
};

const writeTextToClipboard = (text: string) => {
  if (!text) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {
      copyViaHiddenTextarea(text);
    });
    return true;
  }

  if (os.platform() === "darwin" && typeof child_process.spawnSync === "function") {
    const result = child_process.spawnSync("pbcopy", [], {
      input: text,
      encoding: "utf8",
    });
    return !result.error && result.status === 0;
  }

  return copyViaHiddenTextarea(text);
};

const selectNodeContents = (node: HTMLElement) => {
  const selection = window.getSelection();
  if (!selection) return false;

  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
};

const selectAllWithinScope = (activeElement: Element | null, scopeSelector: string) => {
  if (isTextField(activeElement)) {
    activeElement.select();
    return true;
  }

  if (isEditableElement(activeElement)) {
    return execPanelCommand("selectAll");
  }

  const scopedRoot =
    (activeElement instanceof Element
      ? activeElement.closest<HTMLElement>(scopeSelector)
      : null) ?? document.querySelector<HTMLElement>(scopeSelector);

  if (!scopedRoot) return false;
  return selectNodeContents(scopedRoot);
};

const nodeIsInsideScope = (node: Node | null, scopeSelector: string) => {
  if (!node) return false;
  const scopedRoot = document.querySelector<HTMLElement>(scopeSelector);
  if (!scopedRoot) return false;

  if (node instanceof Element) return scopedRoot.contains(node);
  return scopedRoot.contains(node.parentElement);
};

const getTextFieldSelection = (element: Element | null) => {
  if (!isTextField(element)) return "";

  const { selectionStart, selectionEnd, value } = element;
  if (selectionStart === null || selectionEnd === null || selectionStart === selectionEnd) {
    return "";
  }

  return value.slice(selectionStart, selectionEnd);
};

const getScopedSelectionText = (scopeSelector: string) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return "";

  const range = selection.getRangeAt(0);
  if (!nodeIsInsideScope(range.commonAncestorContainer, scopeSelector)) return "";
  return selection.toString();
};

const copyCurrentSelection = (scopeSelector: string) => {
  const activeElement = document.activeElement;
  const text = getTextFieldSelection(activeElement) || getScopedSelectionText(scopeSelector);
  if (!text) return false;
  return writeTextToClipboard(text);
};

export const installClipboardShortcuts = (scopeSelector = "[data-select-scope='chat-history']") => {
  window.addEventListener(
    "keydown",
    (event) => {
    if (!primaryModifierPressed(event) || event.altKey || event.shiftKey) return;

    const key = event.key.toLowerCase();
    const activeElement = document.activeElement;

    if (key === "c" && copyCurrentSelection(scopeSelector)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }

    if (key === "x" && (isTextField(activeElement) || isEditableElement(activeElement))) {
      event.preventDefault();
      execPanelCommand("cut");
      return;
    }

    if (key === "v" && (isTextField(activeElement) || isEditableElement(activeElement))) {
      event.preventDefault();
      execPanelCommand("paste");
      return;
    }

    if (key === "a") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      selectAllWithinScope(activeElement, scopeSelector);
    }
    },
    true
  );

  document.addEventListener(
    "copy",
    (event) => {
      const text = getTextFieldSelection(document.activeElement) || getScopedSelectionText(scopeSelector);
      if (!text) return;

      event.preventDefault();
      event.stopPropagation();
      event.clipboardData?.setData("text/plain", text);
      writeTextToClipboard(text);
    },
    true
  );
};

export const selectAllInPanelScope = (scopeSelector = "[data-select-scope='chat-history']") => {
  return selectAllWithinScope(document.activeElement, scopeSelector);
};

export const copySelectionInPanelScope = (scopeSelector = "[data-select-scope='chat-history']") => {
  return copyCurrentSelection(scopeSelector);
};

/**
 * Prevents the user from dropping files or URLs onto the panel and navigating away
 */

export const dropDisable = () => {
  window.addEventListener("dragover", (e) => e.preventDefault(), false);
  window.addEventListener("drop", (e) => e.preventDefault(), false);
};
