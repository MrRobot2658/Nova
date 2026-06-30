import type { Step } from '../types'
import { Icon } from './Icon'

interface Props {
  steps: Step[]
  running: boolean
}

export default function ExecutionPanel({ steps, running }: Props): JSX.Element {
  const doneCount = steps.filter((s) => s.status === 'done').length
  const allDone = steps.length > 0 && !running && steps.every((s) => s.status !== 'running')

  return (
    <div className="pane">
      <div className="exec-body">
        {steps.length === 0 ? (
          <div className="exec-empty">
            <div className="exec-empty-ico"><Icon name="zap" size={22} /></div>
            这里会实时显示 Nova 调用的 Skill 与执行过程。
          </div>
        ) : (
          <>
            <ul className="timeline">
              {steps.map((s) => (
                <li key={s.id} className={`tl-item ${s.status}`}>
                  <span className="tl-ico">{s.status === 'done' ? <Icon name="check" size={14} /> : s.status === 'fail' ? <Icon name="x" size={14} /> : null}</span>
                  <div className="tl-text">
                    <span className="tl-skill">{s.skill}</span>
                    <span className="tl-desc">{s.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
            {allDone && <div className="exec-summary">✓ 全部完成 · 共 {steps.length} 步</div>}
            {running && <div className="exec-progress">已完成 {doneCount}/{steps.length}</div>}
          </>
        )}
      </div>
    </div>
  )
}
