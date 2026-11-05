/** A library of ordinary widget shells: real Content previews and the same title/grip drag affordance. */
import { useState, useRef, useEffect } from 'react'
import type { ReactNode, PointerEvent } from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import { CardBoundary } from './boundary.tsx'
import type { Translate } from './format.ts'
import type { RegisteredWidgetDefinition } from './widget-contract.ts'
import { filterWidgetDefinitions, galleryText, type GallerySource } from './gallery-model.ts'
import { WidgetPreview } from './widget-preview.tsx'
import { WidgetFrameHeader } from './widget-frame.tsx'
export function WidgetGallery({ definitions, t, disabled, onDrag, onClose }: {
 definitions: readonly RegisteredWidgetDefinition[]; t:Translate; disabled:boolean
 onDrag:(definition:RegisteredWidgetDefinition,event:{x:number;y:number;pointerId:number;touch:boolean},grab:{x:number;y:number})=>void
 onClose:()=>void
}):ReactNode {
 const [search,setSearch]=useState(''),[source,setSource]=useState<GallerySource>('all')
 const pending=useRef<(()=>void)|null>(null)
 useEffect(()=>()=>pending.current?.(),[])
 const filtered=filterWidgetDefinitions(definitions,search,source)
 const begin=(definition:RegisteredWidgetDefinition,event:PointerEvent<HTMLElement>)=>{
   if(disabled||event.button!==0||!event.isPrimary||(event.target as Element).closest('button:not(.dsh-widget-grip)'))return
   event.preventDefault();pending.current?.()
   const x=event.clientX,y=event.clientY,pointerId=event.pointerId
   const node=event.currentTarget.closest('.dsh-directory-item')!.getBoundingClientRect()
   const grab={x:(x-node.left)/node.width,y:Math.min(28,y-node.top)}
   const clear=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',clear);window.removeEventListener('pointercancel',clear);pending.current=null}
   const move=(e:globalThis.PointerEvent)=>{
     if(e.pointerId!==pointerId||Math.hypot(e.clientX-x,e.clientY-y)<5)return
     clear();onDrag(definition,{x:e.clientX,y:e.clientY,pointerId,touch:e.pointerType==='touch'},grab)
   }
   window.addEventListener('pointermove',move);window.addEventListener('pointerup',clear);window.addEventListener('pointercancel',clear);pending.current=clear
 }
 return <aside className="dsh-library-panel" aria-label={t('gallery.addTab')}>
   <div className="dsh-library-heading"><h2>{t('gallery.addTab')}</h2><Button size="sm" variant="ghost" aria-label={t('library.close')} onClick={onClose}>×</Button></div>
   <p className="dsh-gallery-hint">{t('library.hint')}</p>
   <div className="dsh-gallery-toolbar"><Input type="search" aria-label={t('gallery.search')} placeholder={t('gallery.search')} value={search} onChange={event=>setSearch(event.target.value)}/>
     <div className="dsh-gallery-filters" role="group" aria-label={t('gallery.filter')}>{(['all','builtin','extension'] as const).map(value=><Button key={value} size="sm" variant={source===value?'outline':'ghost'} aria-pressed={source===value} onClick={()=>setSource(value)}>{t(`gallery.${value}`)}</Button>)}</div>
   </div>
   <div className="dsh-widget-directory">{filtered.map(definition=>{
     const title=galleryText(definition.title,definition.typeId),Icon=definition.icon
     return <article key={definition.typeId} className="dsh-w dsh-directory-item" data-widget-type={definition.typeId} title={`${galleryText(definition.description)}\n${definition.source??definition.typeId}`}>
       <div className="dsh-library-tooltip" role="tooltip">{galleryText(definition.description)}<small>{definition.source??definition.typeId}</small></div>
       <WidgetFrameHeader title={title} t={t} editing disabled={disabled} icon={Icon?<Icon size={14}/>:undefined} onPointerDown={event=>begin(definition,event)}/>
       <div className="dsh-library-preview" inert><CardBoundary fallback={<div className="dsh-empty">{t('error.card')}</div>}><div className="dsh-library-preview-scale"><WidgetPreview definition={definition} t={t} size={definition.defaults.size} width={480} height={260}/></div></CardBoundary></div>
     </article>
   })}</div>
   {filtered.length===0&&<div className="dsh-gallery-empty" role="status">{t('gallery.noMatch')}<Button size="sm" variant="outline" onClick={()=>{setSearch('');setSource('all')}}>{t('gallery.clear')}</Button></div>}
 </aside>
}
