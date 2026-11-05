/** The shell owns geometry and deletion only; content editing belongs to the widget. */
import type { ReactNode, PointerEvent } from 'react'
import { IconTrashOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Translate } from './format.ts'
export function WidgetFrameHeader({title,t,editing,icon,onDelete,onPointerDown,onNudge,gripDisabled,disabled=false}:{
 title:string;t:Translate;editing:boolean;icon?:ReactNode;onDelete?:()=>void
 onPointerDown?:(event:PointerEvent<HTMLElement>)=>void;onNudge?:(key:string)=>void;disabled?:boolean;gripDisabled?:boolean
}) {
 return <div className={`dsh-w-head${editing?' dsh-widget-grip':''}`} onPointerDown={onPointerDown}>
   {icon}<h2 className="dsh-w-title">{title}</h2>
   {editing&&<div className="dsh-tools">
     <button type="button" className="dsh-tool dsh-widget-grip" disabled={gripDisabled ?? disabled} aria-label={t('edit.drag')} title={t('edit.drag')} onKeyDown={event=>{if(onNudge&&event.key.startsWith('Arrow')){event.preventDefault();onNudge(event.key)}}}>⠿</button>
     {onDelete&&<button type="button" className="dsh-tool dsh-delete-widget" disabled={disabled} aria-label={t('manager.delete')} title={t('manager.delete')} onClick={onDelete}><IconTrashOutlineRegular size={16}/></button>}
   </div>}
 </div>
}
