export {}

declare global {
  interface Window {
    nova: {
      run(text: string, sessionId?: string): Promise<{ runId: string }>
      listSessions(): Promise<unknown>
      loadSession(id: string): Promise<unknown>
      status(): Promise<unknown>
      test(): Promise<unknown>
      info(): Promise<unknown>
      getSettings(): Promise<unknown>
      setSettings(patch: Record<string, unknown>): Promise<unknown>
      selectFolder(): Promise<string | null>
      onEvent(cb: (evt: unknown) => void): () => void
    }
  }
}
