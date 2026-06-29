import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

/** 用户可配置的 Nova / Hermes 设置（持久化到 userData/settings.json） */
export interface NovaSettings {
  /** 手动指定的 Hermes 可执行路径；留空则自动检测（PATH / ~/.hermes / 内置） */
  hermesPath: string
  /** Hermes profile；留空则用 Hermes 当前粘性默认 */
  profile: string
  /** 模型覆盖（-m）；留空则用 Hermes 默认模型 */
  model: string
  /** 自动批准工具调用（--yolo），非交互执行避免卡在审批 */
  yolo: boolean
}

const DEFAULTS: NovaSettings = {
  hermesPath: '',
  profile: '',
  model: '',
  yolo: true
}

function settingsFile(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export function loadSettings(): NovaSettings {
  try {
    const f = settingsFile()
    if (existsSync(f)) {
      return { ...DEFAULTS, ...JSON.parse(readFileSync(f, 'utf8')) }
    }
  } catch {
    // 损坏则回退默认
  }
  return { ...DEFAULTS }
}

export function saveSettings(patch: Partial<NovaSettings>): NovaSettings {
  const merged: NovaSettings = { ...loadSettings(), ...patch }
  try {
    const f = settingsFile()
    mkdirSync(dirname(f), { recursive: true })
    writeFileSync(f, JSON.stringify(merged, null, 2), 'utf8')
  } catch {
    // 写入失败忽略（内存中仍生效）
  }
  return merged
}
