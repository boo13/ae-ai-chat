import { openLinkInBrowser } from "./utils/bolt";

const FEEDBACK_EMAIL = "boo13bot@gmail.com";

export interface FeedbackContext {
  version: string;
  providerLabel: string;
  modelLabel: string;
  isDevInstall: boolean;
}

function getHostInfo(): string {
  try {
    const raw = window.__adobe_cep__?.getHostEnvironment?.() as string | undefined;
    const env = JSON.parse(raw || "{}");
    const parts = [env.appName, env.appVersion].filter(Boolean);
    if (parts.length) return parts.join(" ");
  } catch (_) {
    // getHostEnvironment is unavailable outside the CEP host
  }
  return "unknown";
}

function getOsInfo(): string {
  if (typeof navigator === "undefined") return "unknown";
  return navigator.platform || navigator.userAgent || "unknown";
}

export function buildFeedbackBody(ctx: FeedbackContext): string {
  const build = ctx.isDevInstall ? "dev" : "release";
  return [
    "<describe your feedback, bug, or feature request here>",
    "",
    "",
    "",
    "-- diagnostics (helps me debug -- edit or remove as you like) --",
    "Panel: v" + ctx.version + " (" + build + ")",
    "Provider: " + ctx.providerLabel,
    "Model: " + ctx.modelLabel,
    "After Effects: " + getHostInfo(),
    "OS: " + getOsInfo(),
  ].join("\n");
}

export function buildFeedbackMailto(ctx: FeedbackContext): string {
  const subject = "AE AI Chat feedback (v" + ctx.version + ")";
  const body = buildFeedbackBody(ctx);
  return (
    "mailto:" +
    FEEDBACK_EMAIL +
    "?subject=" +
    encodeURIComponent(subject) +
    "&body=" +
    encodeURIComponent(body)
  );
}

export function openFeedbackEmail(ctx: FeedbackContext): void {
  openLinkInBrowser(buildFeedbackMailto(ctx));
}
