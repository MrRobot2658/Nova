export {}

declare global {
  interface Window {
    nova: {
      run(text: string): Promise<{ runId: string }>
      status(): Promise<{
        mode: 'system' | 'bundled' | 'simulated'
        detected: boolean
        path?: string
        ready: boolean
      }>
      onEvent(cb: (evt: unknown) => void): () => void
    }
  }
}
