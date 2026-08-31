import { fs } from "./cep/node";

export async function copyText(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {}
  const input = document.createElement("textarea");
  input.value = text;
  input.style.position = "fixed";
  input.style.opacity = "0";
  const previousFocus = document.activeElement;
  document.body.appendChild(input);
  input.select();
  try {
    if (!document.execCommand("copy")) throw new Error("Copy failed. Use Export to save the conversation.");
  } finally {
    input.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  }
}

export function exportMarkdown(title: string, content: string): boolean {
  const filename = (title.replace(/[^a-z0-9 _-]/gi, "").trim().slice(0, 80) || "conversation") + ".md";
  if (window.cep?.fs?.showSaveDialogEx && typeof fs.writeFileSync === "function") {
    const result = window.cep.fs.showSaveDialogEx("Export conversation", "", ["md"], filename) as { err?: number; data?: string };
    if (result.err) throw new Error("Could not open the export dialog.");
    if (!result.data) return false;
    fs.writeFileSync(result.data, content, "utf8");
    return true;
  }
  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
