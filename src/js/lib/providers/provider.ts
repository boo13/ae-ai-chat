export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  duration_ms?: number;
  isError?: boolean;
  diagnosticsRaw?: string;
}

export interface ProviderResult {
  result: string;
  duration_ms: number;
  is_error: boolean;
  cancelled?: boolean;
  sessionId?: string;
}

export type ProviderStatusPhase =
  | "preparing"
  | "connecting"
  | "thinking"
  | "responding"
  | "working"
  | "saving_action"
  | "running_action"
  | "cancelled"
  | "timeout"
  | "error"
  | "completed";

export interface ProviderStatusUpdate {
  phase: ProviderStatusPhase;
  text: string;
  raw?: string;
  terminal?: boolean;
}

export interface SendMessageOptions {
  model: string;
  // Per-turn AE state and message-matched knowledge.
  systemContext: string;
  // Byte-stable knowledge corpus — API providers cache it, CLI providers
  // send it only on the first turn of a session.
  staticContext?: string;
  sessionId?: string;
  imagePath?: string;
  projectRoot?: string;
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
  onStatus?: (status: ProviderStatusUpdate) => void;
}

export interface ProviderModel {
  value: string;
  label: string;
}

export interface ProviderDefinition {
  id: string;
  displayName: string;
  models: ProviderModel[];
  supportsImages: boolean;
  isAvailable(): Promise<{ available: boolean; reason?: string }>;
  sendMessage: (
    prompt: string,
    options: SendMessageOptions,
    history: ChatMessage[]
  ) => Promise<ProviderResult>;
}
