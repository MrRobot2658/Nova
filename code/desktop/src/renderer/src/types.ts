export interface Msg {
  role: 'user' | 'agent'
  text: string
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
  path?: string
  ready: boolean
}

export type NovaEvent =
  | { type: 'intent'; runId: string; text: string; intent: string }
  | { type: 'step-start'; runId: string; id: string; skill: string; desc: string }
  | { type: 'step-done'; runId: string; id: string; ok: boolean }
  | { type: 'result'; runId: string; text: string }
  | { type: 'done'; runId: string }
