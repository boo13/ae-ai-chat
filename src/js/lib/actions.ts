export interface QuickAction {
  label: string;
  icon: "screenshot" | "report" | "fix-error" | "ai-action";
  description: string;
  prompt?: string;
  handler?: string;
}

export const quickActions: QuickAction[] = [
  {
    label: "Screenshot",
    icon: "screenshot",
    description: "Capture the active comp frame.",
    handler: "takeScreenshot",
  },
  {
    label: "Report",
    icon: "report",
    description: "Analyze the comp for future prompts.",
    handler: "runAnalysis",
  },
  {
    label: "Fix",
    icon: "fix-error",
    description: "Diagnose the last panel or action error.",
    handler: "fixLastError",
  },
  {
    label: "AI Action",
    icon: "ai-action",
    description: "Run the staged ExtendScript action.",
    handler: "runAiAction",
  },
];
