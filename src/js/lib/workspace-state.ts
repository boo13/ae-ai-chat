import type { ChatMessage } from "./providers/provider";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ActionRecord {
  id: string;
  script: string;
  summary: string;
  prompt: string;
  status: "staged" | "running" | "succeeded" | "failed" | "inconclusive";
  warnings: string[];
  errors: string[];
  changes: string[];
  verification?: string;
}

export type WorkspaceMessage = ChatMessage & { action?: ActionRecord };

export interface Conversation {
  id: string;
  title: string;
  projectKey: string;
  projectName: string;
  providerId: string;
  model: string;
  messages: WorkspaceMessage[];
  draft: string;
  updatedAt: number;
}

export interface CreativePreset {
  id: string;
  name: string;
  prompt: string;
  color: string;
  intensity: number;
  duration: number;
}

export interface WorkspaceState {
  version: 1;
  conversations: Conversation[];
  activeConversationId: string | null;
  models: Record<string, string>;
  verifyActions: boolean;
  presets: CreativePreset[];
}

export const STORAGE_KEY = "ae-ai-chat.workspace.v1";
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_TEXT = 50000;
const MAX_SCRIPT = 150000;
const statuses = ["staged", "running", "succeeded", "failed", "inconclusive"];

function id(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

export function createWorkspaceState(): WorkspaceState {
  return { version: 1, conversations: [], activeConversationId: null, models: {}, verifyActions: true, presets: [] };
}

export function createConversation(projectKey: string, projectName: string, providerId: string, model: string): Conversation {
  return { id: id(), title: "New conversation", projectKey, projectName, providerId, model, messages: [], draft: "", updatedAt: Date.now() };
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid workspace record");
  return value as Record<string, unknown>;
}

function text(value: unknown, max = MAX_TEXT): string {
  if (typeof value !== "string") throw new Error("Invalid workspace text");
  return value.slice(0, max);
}

function finite(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid workspace number");
  return value;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Invalid workspace list");
  return value;
}

function lines(value: unknown): string[] {
  return array(value).slice(0, 100).map((entry) => text(entry, 2000));
}

function readAction(value: unknown, restoring: boolean): ActionRecord | undefined {
  const action = object(value);
  if (typeof action.script !== "string" || action.script.length > MAX_SCRIPT) return undefined;
  if (!statuses.includes(action.status as string)) throw new Error("Invalid action status");
  const result: ActionRecord = {
    id: text(action.id, 200),
    script: action.script,
    summary: text(action.summary, 2000),
    prompt: text(action.prompt),
    status: action.status as ActionRecord["status"],
    warnings: lines(action.warnings),
    errors: lines(action.errors),
    changes: lines(action.changes),
  };
  if (typeof action.verification === "string") result.verification = text(action.verification, 10000);
  if (restoring && result.status === "running") {
    result.status = "inconclusive";
    result.verification = "The panel closed while this action was running. Execution may have been interrupted; inspect After Effects before running it again.";
  }
  return result;
}

function readMessage(value: unknown, restoring: boolean): WorkspaceMessage {
  const message = object(value);
  if (!["user", "assistant", "system"].includes(message.role as string)) throw new Error("Invalid message role");
  const result: WorkspaceMessage = {
    role: message.role as WorkspaceMessage["role"],
    content: text(message.content),
    timestamp: finite(message.timestamp),
  };
  if (typeof message.duration_ms === "number" && Number.isFinite(message.duration_ms)) result.duration_ms = message.duration_ms;
  if (typeof message.isError === "boolean") result.isError = message.isError;
  if (message.action !== undefined) result.action = readAction(message.action, restoring);
  // Tutorial HTML and runnable steps stay ephemeral; preserve a plain text outline.
  if (message.tutorial && !result.content.includes("Tutorial outline:")) {
    const tutorial = object(message.tutorial);
    const headings = typeof tutorial.html === "string"
      ? Array.from(tutorial.html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi), (match) => match[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 100)
      : [];
    const outline = "\n\nTutorial outline: " + text(tutorial.title, 200) + headings.map((heading, i) => `\n${i + 1}. ${heading}`).join("");
    result.content = (result.content + outline).slice(0, MAX_TEXT);
  }
  return result;
}

function readConversation(value: unknown, restoring: boolean): Conversation {
  const conversation = object(value);
  return {
    id: text(conversation.id, 200),
    title: text(conversation.title, 200),
    projectKey: text(conversation.projectKey, 4000),
    projectName: text(conversation.projectName, 500),
    providerId: text(conversation.providerId, 100),
    model: text(conversation.model, 200),
    messages: array(conversation.messages).slice(-200).map((message) => readMessage(message, restoring)),
    draft: text(conversation.draft, 20000),
    updatedAt: finite(conversation.updatedAt),
  };
}

function validatePreset(preset: CreativePreset): void {
  if (preset.color !== "" && !/^#[0-9a-f]{6}$/i.test(preset.color)) throw new Error("Color must be #RRGGBB or empty.");
  if (!Number.isFinite(preset.intensity) || preset.intensity < 0 || preset.intensity > 100) throw new Error("Intensity must be between 0 and 100.");
  if (!Number.isFinite(preset.duration) || preset.duration <= 0 || preset.duration > 600) throw new Error("Duration must be greater than 0 and at most 600 seconds.");
}

function readPreset(value: unknown): CreativePreset {
  const item = object(value);
  const preset = { id: text(item.id, 200), name: text(item.name, 200), prompt: text(item.prompt, 20000), color: text(item.color, 20), intensity: finite(item.intensity), duration: finite(item.duration) };
  validatePreset(preset);
  return preset;
}

function readState(value: unknown, restoring: boolean): WorkspaceState {
  const source = object(value);
  if (source.version !== 1) throw new Error("Unsupported workspace version");
  const state = createWorkspaceState();
  if (source.activeConversationId !== null && typeof source.activeConversationId !== "string") throw new Error("Invalid active conversation");
  state.activeConversationId = source.activeConversationId as string | null;
  const conversations = array(source.conversations).map((item) => readConversation(item, restoring)).sort((a, b) => b.updatedAt - a.updatedAt);
  const active = conversations.find((conversation) => conversation.id === state.activeConversationId);
  state.conversations = conversations.slice(0, 30);
  if (active && !state.conversations.includes(active)) state.conversations[29] = active;
  if (!active) state.activeConversationId = state.conversations[0]?.id ?? null;
  const modelMap = object(source.models);
  for (const key of Object.keys(modelMap).slice(0, 30)) {
    if (/^[a-zA-Z0-9_-]{1,100}$/.test(key) && !["__proto__", "constructor", "prototype"].includes(key)) {
      state.models[key] = text(modelMap[key], 200);
    }
  }
  state.verifyActions = typeof source.verifyActions === "boolean" ? source.verifyActions : true;
  state.presets = array(source.presets).slice(0, 20).map(readPreset);
  return state;
}

export function loadWorkspace(storage: StorageLike): { state: WorkspaceState; error?: string } {
  let serialized: string | null;
  try {
    serialized = storage.getItem(STORAGE_KEY);
  } catch {
    return { state: createWorkspaceState(), error: "Cannot access conversation storage. Check the panel's storage permissions; changes will remain in memory." };
  }
  if (serialized === null) return { state: createWorkspaceState() };
  try {
    if (serialized.length * 2 > MAX_BYTES) throw new Error("Workspace is too large");
    return { state: readState(JSON.parse(serialized), true) };
  } catch {
    return { state: createWorkspaceState(), error: "Saved conversations could not be read or use an unsupported format. The saved data has been left untouched. Export any current chat before replacing it." };
  }
}

export function saveWorkspace(storage: StorageLike, state: WorkspaceState): { error?: string } {
  let serialized: string;
  try {
    serialized = JSON.stringify(readState(state, false));
  } catch {
    return { error: "Conversation data could not be saved. Export the current chat before closing the panel." };
  }
  if (serialized.length * 2 > MAX_BYTES) return { error: "Conversation storage exceeds its 3 MB limit. Export older chats, then remove them to make space. Existing saved data is unchanged." };
  try {
    storage.setItem(STORAGE_KEY, serialized);
    return {};
  } catch {
    return { error: "Conversation storage is unavailable or full. Export the current chat before closing the panel, and free storage space." };
  }
}

export function createPreset(name: string, prompt: string): CreativePreset {
  return { id: id(), name: name.trim().slice(0, 200) || "Creative preset", prompt: prompt.slice(0, 20000), color: "", intensity: 50, duration: 1 };
}

export function buildPresetPrompt(preset: CreativePreset): string {
  validatePreset(preset);
  return [
    "Apply this creative treatment to the current selection in After Effects. Resolve the selected layers from the current project context.",
    "Treatment: " + preset.prompt,
    ...(preset.color ? ["Color: " + preset.color] : []),
    "Intensity: " + preset.intensity + "% (scale the strength of the treatment accordingly).",
    "Duration: " + preset.duration + " seconds.",
    "Adapt the treatment to these parameters and the current selection; do not target layers from an earlier project.",
  ].join("\n");
}

export function conversationMarkdown(conversation: Conversation): string {
  const header = `# ${conversation.title}\n\nProject: ${conversation.projectName}\nProvider: ${conversation.providerId}\nModel: ${conversation.model}`;
  return header + conversation.messages.map((message) => {
    const title = message.role[0].toUpperCase() + message.role.slice(1);
    let content = `\n\n## ${title}\n\n${message.content}`;
    const action = message.action;
    if (action) {
      content += `\n\n### Action: ${action.summary}\n\nStatus: ${action.status}`;
      if (action.verification) content += "\n\n" + action.verification;
      for (const [label, values] of [["Changes", action.changes], ["Warnings", action.warnings], ["Errors", action.errors]] as const) {
        if (values.length) content += `\n\n${label}:\n\n` + values.map((value) => "- " + value).join("\n");
      }
      const runs = action.script.match(/`+/g) || [];
      const fence = "`".repeat(Math.max(3, ...runs.map((run) => run.length + 1)));
      content += `\n\n${fence}javascript\n${action.script}\n${fence}`;
    }
    return content;
  }).join("") + "\n";
}
