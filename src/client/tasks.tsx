/** Task starters only prepare an unsent draft through the Host navigation API. */
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { WidgetProps } from './widgets.tsx'

export const TASK_IDS = ['develop', 'debug', 'review', 'summarize'] as const
export type TaskId = typeof TASK_IDS[number]

export function TasksBody({ t, sessions, data, actions }: WidgetProps): ReactNode {
  const [cwd, setCwd] = useState('')
  const [task, setTask] = useState<TaskId>('develop')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => { pending.current?.abort() }, [])
  const directories = [...new Set([
    ...Object.values(sessions).map(session => session.cwd),
    ...(data?.sessions ?? []).map(session => session.cwd),
    cwd,
  ].filter((path): path is string => typeof path === 'string' && path.trim() !== ''))].sort()

  return (
    <div className="dsh-tasks">
      <p className="dsh-muted">{t('tasks.hint')}</p>
      <label className="dsh-field">
        <span className="dsh-label">{t('tasks.cwd')}</span>
        {/* ui-primitives has no native path selector; use a labelled native select. */}
        <select className="dsh-home-select" value={cwd} onChange={event => { setCwd(event.target.value); setError(false) }}>
          <option value="">{t('tasks.current')}</option>
          {directories.map(path => <option value={path} key={path}>{path}</option>)}
        </select>
      </label>
      {actions.pickDirectory !== undefined && (
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => {
          const pick = actions.pickDirectory
          if (pick === undefined) return
          setBusy(true)
          setError(false)
          void pick().then(path => { if (path !== null) setCwd(path) })
            .catch(() => { setError(true) }).finally(() => { setBusy(false) })
        }}>{t('tasks.pick')}</Button>
      )}
      <div className="dsh-task-options" role="group" aria-label={t('widget.tasks.title')}>
        {TASK_IDS.map(id => (
          <Button key={id} variant={task === id ? 'outline' : 'ghost'} size="sm" aria-pressed={task === id}
            onClick={() => { setTask(id); setError(false) }}>
            {t(`tasks.${id}.title`)}
          </Button>
        ))}
      </div>
      <p className="dsh-task-preview">{t(`tasks.${task}.prompt`)}</p>
      <Button variant="primary" size="sm" disabled={busy || actions.startTask === undefined}
        onClick={() => {
          if (busy || actions.startTask === undefined) return
          setBusy(true)
          setError(false)
          pending.current?.abort()
          const controller = new AbortController()
          pending.current = controller
          void actions.startTask({ cwd: cwd || undefined, prompt: t(`tasks.${task}.prompt`), signal: controller.signal })
            .catch(() => { setError(true) })
            .finally(() => { setBusy(false) })
        }}>
        {t(busy ? 'tasks.preparing' : 'tasks.open')}
      </Button>
      {actions.startTask === undefined && <p className="dsh-muted">{t('tasks.unavailable')}</p>}
      {error && <p className="dsh-task-error" role="alert">{t('tasks.error')}</p>}
    </div>
  )
}
