/** The shell owns geometry and deletion only; content editing belongs to the widget. */
import type { ReactNode, PointerEvent } from 'react'
import type { Translate } from './format.ts'
export function WidgetFrameHeader({title,t,editing,icon,onPointerDown,onNudge,onKeyDelete,gripDisabled,disabled=false}:{
 title:string;t:Translate;editing:boolean;icon?:ReactNode
 onPointerDown?:(event:PointerEvent<HTMLElement>)=>void;onNudge?:(key:string)=>void;onKeyDelete?:()=>void;disabled?:boolean;gripDisabled?:boolean
}) {
 return <div className={`dsh-w-head${editing?' dsh-widget-grip':''}`} onPointerDown={onPointerDown}>
   {icon && <span className="dsh-widget-symbol" aria-hidden="true">{icon}</span>}<h2 className="dsh-w-title">{title}</h2>
   {editing&&<div className="dsh-tools">
     {/* Deletion is a drag onto the page's delete target; the grip also exposes the
         keyboard equivalent (Delete / Backspace) so pointer-free users keep a path. */}
     <button type="button" className="dsh-tool dsh-widget-grip" disabled={gripDisabled ?? disabled} aria-label={t('edit.drag')} title={t('edit.drag')} onKeyDown={event=>{
       if((event.key==='Delete'||event.key==='Backspace')&&onKeyDelete){event.preventDefault();onKeyDelete();return}
       if(onNudge&&event.key.startsWith('Arrow')){event.preventDefault();onNudge(event.key)}
     }}>⠿</button>
   </div>}
 </div>
}
