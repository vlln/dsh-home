/** One title/grip and operation vocabulary for desktop cards and library samples. */
import type { ReactNode, PointerEvent } from 'react'
import type { Translate } from './format.ts'
export function WidgetFrameHeader({title,t,editing,icon,onEdit,onDelete,onPointerDown,onNudge,disabled=false}:{
 title:string;t:Translate;editing:boolean;icon?:ReactNode;onEdit?:()=>void;onDelete?:()=>void
 onPointerDown?:(event:PointerEvent<HTMLElement>)=>void;onNudge?:(key:string)=>void;disabled?:boolean
}) {
 return <div className={`dsh-w-head${editing?' dsh-widget-grip':''}`} onPointerDown={onPointerDown}>
   {icon}<h2 className="dsh-w-title">{title}</h2>
   {editing&&<div className="dsh-tools">
     {onEdit&&<button type="button" className="dsh-tool" disabled={disabled} aria-label={t('library.edit')} title={t('library.edit')} onClick={onEdit}>✎</button>}
     <button type="button" className="dsh-tool dsh-widget-grip" disabled={disabled} aria-label={t('edit.drag')} title={t('edit.drag')} onKeyDown={event=>{if(onNudge&&event.key.startsWith('Arrow')){event.preventDefault();onNudge(event.key)}}}>⠿</button>
     {onDelete&&<button type="button" className="dsh-tool dsh-delete-widget" disabled={disabled} aria-label={t('manager.delete')} title={t('manager.delete')} onClick={onDelete}>×</button>}
   </div>}
 </div>
}
