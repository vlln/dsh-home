/** Static, localized sample illustrations only. No runtime/store, effects, timers, or real data. */
import type { ComponentType } from 'react'
import type { Translate } from './format.ts'
export function builtinPreview(kind: string, t: Translate): ComponentType {
  return function BuiltinSample() {
    if (kind === 'activity') return <div className="dsh-preview-heatmap">{Array.from({ length: 91 }, (_, i) => <i key={i} data-level={(i * 7 + Math.floor(i / 9)) % 5} />)}</div>
    if (kind === 'notes') return <div className="dsh-preview-note"><strong>{t('gallery.sample.noteTitle')}</strong><p>{t('gallery.sample.noteText')}</p><span className="dsh-preview-line" /><span className="dsh-preview-line" /></div>
    if (kind === 'clock') return <div className="dsh-preview-clock"><strong>10:24</strong><span>{t('gallery.sample.date')}</span></div>
    if (kind === 'rhythm' || kind === 'areas') return <div className="dsh-preview-bars">{[22,48,34,68,88,56,75,40,66,92,51,74,60,36].map((h,i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
    if (kind === 'today') return <div className="dsh-preview-today"><strong>{t('gallery.sample.duration')}</strong><div><i /><i /><i /></div><span>00　　　　　12　　　　　24</span></div>
    const keys = kind === 'tasks' ? ['tasks.develop.title', 'tasks.debug.title', 'tasks.review.title']
      : kind === 'quick' ? ['widget.quick.new', 'widget.quick.resume', 'gallery.sample.project']
      : kind === 'queue' ? ['queue.approval', 'queue.question', 'queue.done']
      : kind === 'resume' ? ['gallery.sample.project', 'gallery.sample.continue']
      : ['gallery.sample.project', 'gallery.sample.review', 'gallery.sample.plan']
    return <div className="dsh-preview-rows">{keys.map((key, i) => <div key={key}><i data-live={kind === 'running'} /><span>{t(key)}</span><small>{kind === 'running' ? '•••' : i === 0 ? '→' : ''}</small></div>)}</div>
  }
}
