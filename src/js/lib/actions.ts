export interface QuickAction {
  label: string;
  icon: "screenshot" | "analysis" | "describe" | "fix-error" | "ai-action";
  prompt?: string;
  handler?: string;
}

export const quickActions: QuickAction[] = [
  {
    label: "Screenshot",
    icon: "screenshot",
    handler: "takeScreenshot",
  },
  {
    label: "Run Analysis",
    icon: "analysis",
    handler: "runAnalysis",
  },
  {
    label: "Describe",
    icon: "describe",
    prompt:
      "Describe the active composition's structure, layers, and expressions in detail.",
  },
  {
    label: "Fix Last Error",
    icon: "fix-error",
    handler: "fixLastError",
  },
  {
    label: "AI Action",
    icon: "ai-action",
    handler: "runAiAction",
  },
];
