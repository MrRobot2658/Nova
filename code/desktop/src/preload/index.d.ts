export {}

declare global {
  interface Window {
    nova: {
      run(text: string): Promise<{ runId: string }>
      status(): Promise<unknown>
      test(): Promise<unknown>
      info(): Promise<unknown>
      getSettings(): Promise<unknown>
      setSettings(patch: Record<string, unknown>): Promise<unknown>
      onEvent(cb: (evt: unknown) => void): () => void
    }
  }
}
