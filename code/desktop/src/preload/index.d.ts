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
      listProfiles(): Promise<unknown>
      listSkills(): Promise<unknown>
      installSkill(id: string): Promise<unknown>
      uninstallSkill(name: string): Promise<unknown>
      listMcp(): Promise<unknown>
      addMcp(input: Record<string, unknown>): Promise<unknown>
      removeMcp(name: string): Promise<unknown>
      usageMetrics(): Promise<unknown>
      getSettings(): Promise<unknown>
      setSettings(patch: Record<string, unknown>): Promise<unknown>
      selectFolder(): Promise<string | null>
      resolveFile(keyword: string): Promise<string | null>
      onEvent(cb: (evt: unknown) => void): () => void
      onBrowserCommand(cb: (cmd: { id: number; action: string; [k: string]: unknown }) => void): () => void
      browserResult(id: number, result: unknown): void
    }
  }
}
