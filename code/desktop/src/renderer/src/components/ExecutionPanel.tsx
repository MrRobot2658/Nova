import type { Step } from '../types'

interface Props {
  steps: Step[]
  running: boolean
}

const ICON: Record<Step['status'], string> = {
  running: '⟳',
  done: '✓',
  fail: '✗'
}

export default function ExecutionPanel({ steps, running }: Props): JSX.Element {
  return (
    <aside className="exec">
      <header className="titlebar drag">
        Nova 的执行
        {running && <span className="exec-live">运行中</span>}
      </header>

      <div className="exec-body">
        {steps.length === 0 ? (
          <div className="exec-empty">
            这里会实时显示 Nova 调用的 Skill 与执行过程。
          </div>
        ) : (
          <ul className="timeline">
            {steps.map((s) => (
              <li key={s.id} className={`tl-item ${s.status}`}>
                <span className="tl-ico">{ICON[s.status]}</span>
                <div className="tl-text">
                  <span className="tl-skill">{s.skill}</span>
                  <span className="tl-desc">{s.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
