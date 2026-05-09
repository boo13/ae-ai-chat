export interface KnowledgeSource {
  id: string;
  /** Returns static context that's always included in the system prompt. */
  getStaticContext(): string;
  /** Returns dynamic context based on the user's message (Phase 2+). */
  getMessageContext?(userMessage: string): string;
  /** Returns side-channel data for message context without changing prompt text. */
  getMessageContextDiagnostics?(userMessage: string): { ids: string[] };
}
