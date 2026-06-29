export interface Msg {
  role: 'user' | 'agent'
  text: string
  id?: string // 流式消息以 runId 标识，便于追加 chunk
  error?: boolean
}

export interface Step {
  id: string
  skill: string
  desc: string
  status: 'running' | 'done' | 'fail'
}

export interface HermesStatus {
  mode: 'system' | 'bundled' | 'simulated'
  detected: boolean
  bin: string | null
  ready: boolean
}

export interface TestResult {
  ok: boolean
  bin: string | null
  version?: string
  mode: 'system' | 'bundled' | 'simulated'
  message: string
}

export interface SkillGroup {
  group: string
  count: number
  items: string[]
}

export interface HermesInfo {
  connected: boolean
  mode: 'system' | 'bundled' | 'simulated'
  bin: string | null
  model: string
  profile: string
  skills: SkillGroup[]
  mcp: Array<{ name: string; status: string }>
  usage: Array<{ label: string; value: string }>
}

export interface NovaSettings {
  hermesPath: string
  profile: string
  model: string
}

export type NovaEvent =
  | { type: 'intent'; runId: string; text: string; intent: string }
  | { type: 'step-start'; runId: string; id: string; skill: string; desc: string }
  | { type: 'step-done'; runId: string; id: string; ok: boolean }
  | { type: 'output'; runId: string; chunk: string }
  | { type: 'result'; runId: string; text: string }
  | { type: 'error'; runId: string; message: string }
  | { type: 'done'; runId: string }

export type View = 'chat' | 'settings'
