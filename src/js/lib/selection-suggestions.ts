export interface SelectionSummary {
  hasComp: boolean;
  layerTypes: string[];
  layerNames: string[];
}

export function selectionSuggestions(selection: SelectionSummary, hasError = false): string[] {
  const suggestions: string[] = [];
  if (hasError) suggestions.push("Diagnose the most recent action error and suggest a fix");
  if (!selection.hasComp) return [...suggestions, "Create a 1920x1080 comp at 30fps", "Summarize the items in my project"].slice(0, 4);
  if (selection.layerTypes.includes("text")) suggestions.push("Animate the selected text with a staggered character reveal", "Fade in the selected text over one second");
  else if (selection.layerTypes.includes("shape")) suggestions.push("Animate the selected shape with an eased scale bounce", "Add a looping rotation to the selected shape");
  else if (selection.layerTypes.includes("av")) suggestions.push("Add a subtle film grain treatment to the selected footage", "Fade the selected footage in and out");
  else if (selection.layerNames.length) suggestions.push("Explain the animation on the selected layers", "Ease the selected layers' keyframes");
  else suggestions.push("Describe my current comp", "Add a text layer with a fade-in animation");
  return [...suggestions, "Check this comp for expression problems"].slice(0, 4);
}
