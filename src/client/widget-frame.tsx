/**
 * 外壳只负责几何与删除；内容编辑属于小组件自己。
 *
 * 标题行是四段结构的第一段：图标 20px 槽位 + 标题 + （编辑态）把手。几何固定，
 * 所以每张卡的标题基线一致——这是「一排卡片看起来是一套」最便宜的来源。
 */
import type { ReactNode, PointerEvent } from 'react'
import type { Translate } from './format.ts'
import { Button, cx } from './ui/index.ts'

export function WidgetFrameHeader({title,t,editing,icon,onPointerDown,onNudge,onKeyDelete,gripDisabled,disabled=false}:{
 title:string;t:Translate;editing:boolean;icon?:ReactNode
 onPointerDown?:(event:PointerEvent<HTMLElement>)=>void;onNudge?:(key:string)=>void;onKeyDelete?:()=>void;disabled?:boolean;gripDisabled?:boolean
}) {
 return <div className={cx('dsh-w-head flex min-h-5 items-center gap-1.5', editing && 'dsh-widget-grip')} onPointerDown={onPointerDown}>
   <span className="dsh-widget-symbol flex size-5 flex-none items-center justify-center text-foreground-icon-tertiary" aria-hidden="true">{icon}</span>
   <h2 className="dsh-w-title m-0 min-w-0 truncate text-body-medium font-medium text-text-primary">{title}</h2>
   {editing && <div className="dsh-tools ml-auto flex items-center gap-0.5">
     {/* Deletion is a drag onto the page's delete target; the grip also exposes the
         keyboard equivalent (Delete / Backspace) so pointer-free users keep a path. */}
     <Button variant="ghost" size="xs" className="dsh-tool dsh-widget-grip cursor-grab" disabled={gripDisabled ?? disabled} aria-label={t('edit.drag')} title={t('edit.drag')} onKeyDown={event=>{
       if((event.key==='Delete'||event.key==='Backspace')&&onKeyDelete){event.preventDefault();onKeyDelete();return}
       if(onNudge&&event.key.startsWith('Arrow')){event.preventDefault();onNudge(event.key)}
     }}>⠿</Button>
   </div>}
 </div>
}
