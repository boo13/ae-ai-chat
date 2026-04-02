export interface QuickAction {
  label: string;
  icon: string;
  prompt?: string;
  handler?: string;
}

export const quickActions: QuickAction[] = [
  {
    label: "Screenshot",
    icon: "\uD83D\uDCF7",
    handler: "takeScreenshot",
  },
  {
    label: "Run Analysis",
    icon: "\uD83D\uDD0D",
    handler: "runAnalysis",
  },
  {
    label: "Describe",
    icon: "\uD83D\uDCCB",
    prompt:
      "Describe the active composition's structure, layers, and expressions in detail.",
  },
  {
    label: "Fix Last Error",
    icon: "\uD83D\uDD27",
    handler: "fixLastError",
  },
  {
    label: "AI Action",
    icon: "\u25B6",
    handler: "runAiAction",
  },
];
