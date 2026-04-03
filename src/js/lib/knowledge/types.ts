export interface KnowledgeSource {
  id: string;
  /** Returns static context that's always included in the system prompt. */
  getStaticContext(): string;
  /** Returns dynamic context based on the user's message (Phase 2+). */
  getMessageContext?(userMessage: string): string;
}
