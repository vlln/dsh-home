/** A library of ordinary widget shells: real Content previews and the same title/grip drag affordance. */
import { useCallback, useState, useRef, useEffect, useLayoutEffect } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { observeDragRelease } from './drag-release.ts'
import { Button, Input, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import { CardBoundary } from './boundary.tsx'
import type { Translate } from './format.ts'
import type { RegisteredWidgetDefinition } from './widget-contract.ts'
import { filterWidgetDefinitions, galleryText, type GallerySource } from './gallery-model.ts'
import { WidgetPreview } from './widget-preview.tsx'
import { WidgetFrameHeader } from './widget-frame.tsx'
import {
  LIBRARY_PANEL_MARGIN, clampLibraryPosition, libraryPositionFromDrag, libraryPositionFromKey,
  type LibraryPoint, type LibrarySize,
} from './library-position.ts'
export function WidgetGallery({ definitions, t, language, disabled, onDrag, onClose, position, onPositionChange }: {
  definitions: readonly RegisteredWidgetDefinition[]; t:Translate; language:string; disabled:boolean
  onDrag:(definition:RegisteredWidgetDefinition,event:{x:number;y:number;pointerId:number;touch:boolean},grab:{x:number;y:number})=>void
  onClose:()=>void
  /** Stored corner in viewport pixels; `null` keeps the default corner from the stylesheet. */
  position: LibraryPoint | null
  /** Called once per gesture, never per pointer frame. */
  onPositionChange:(position:LibraryPoint|null)=>void
}):ReactNode {
  const [search,setSearch]=useState(''),[source,setSource]=useState<GallerySource>('all')
  const pending=useRef<(()=>void)|null>(null)
  const [dragSource,setDragSource]=useState<string|null>(null)
  const sourceRelease=useRef<(()=>void)|null>(null)
  useEffect(()=>()=>{pending.current?.();sourceRelease.current?.()},[])
  // The window moves by writing `left`/`top` directly: React owns no style here, so a
  // re-render mid-drag cannot snap the panel back under the pointer.
  const panel=useRef<HTMLElement>(null)
  const placed=useRef<LibraryPoint|null>(position)
  const [moving,setMoving]=useState(false)
  const endMove=useRef<(()=>void)|null>(null)
  const sizeOf=(node:HTMLElement):LibrarySize=>({width:node.offsetWidth,height:node.offsetHeight})
  const viewportOf=():LibrarySize=>({width:window.innerWidth,height:window.innerHeight})
  /** The host frame paints over the top of the page; inherited clearance keeps the title bar clear of it. */
  const minTopOf=(node:HTMLElement):number=>{
    const clearance=Number.parseFloat(getComputedStyle(node).getPropertyValue('--dsh-frame-top-clearance'))
    return LIBRARY_PANEL_MARGIN+(Number.isFinite(clearance)?Math.max(0,clearance):0)
  }
  const apply=useCallback((next:LibraryPoint|null):void=>{
    const node=panel.current
    if(node===null)return
    if(next===null){node.style.removeProperty('left');node.style.removeProperty('top');node.style.removeProperty('right');return}
    node.style.left=`${next.x}px`;node.style.top=`${next.y}px`;node.style.right='auto'
  },[])
  const place=useCallback((next:LibraryPoint|null):LibraryPoint|null=>{
    const node=panel.current
    const clamped=next===null||node===null?next:clampLibraryPosition(next,viewportOf(),sizeOf(node),minTopOf(node))
    placed.current=clamped;apply(clamped)
    return clamped
  },[])
  useLayoutEffect(()=>{
    // Before paint, so a restored corner never flashes at the default one first. The
    // effect also follows the stored corner when preferences finish loading after mount
    // (the page can open the tray before `prefs.get` resolves).
    placed.current=position;place(position)
  },[position,place])
  useLayoutEffect(()=>{
    const resize=():void=>{place(placed.current)}
    window.addEventListener('resize',resize)
    return ()=>{window.removeEventListener('resize',resize);endMove.current?.()}
  },[place])
  const finishMove=(commit:boolean,moved:boolean,current:LibraryPoint):void=>{
    endMove.current=null
    setMoving(false)
    if(commit&&moved){place(current);onPositionChange(current)}
    else apply(placed.current)
  }
  const beginMove=(event:ReactPointerEvent<HTMLElement>):void=>{
    if(event.button!==0||!event.isPrimary)return
    if((event.target as Element).closest('button:not(.dsh-library-grip)')!==null)return
    const node=panel.current
    if(node===null)return
    event.preventDefault()
    const rect=node.getBoundingClientRect()
    const start={x:rect.left,y:rect.top},size=sizeOf(node),origin={x:event.clientX,y:event.clientY},minTop=minTopOf(node)
    let current=start,moved=false
    endMove.current?.()
    setMoving(true)
    const move=(next:globalThis.PointerEvent):void=>{
      if(next.pointerId!==event.pointerId)return
      const point=libraryPositionFromDrag(start,{x:next.clientX-origin.x,y:next.clientY-origin.y},viewportOf(),size,minTop)
      if(point.x!==current.x||point.y!==current.y)moved=true
      current=point;apply(point)
    }
    const up=(next:globalThis.PointerEvent):void=>{if(next.pointerId===event.pointerId)finish(true,moved,current)}
    const cancel=(next:globalThis.PointerEvent):void=>{if(next.pointerId===event.pointerId)finish(false,moved,current)}
    const finish=(commit:boolean,changed:boolean,point:LibraryPoint):void=>{
      window.removeEventListener('pointermove',move,true)
      window.removeEventListener('pointerup',up,true)
      window.removeEventListener('pointercancel',cancel,true)
      finishMove(commit,changed,point)
    }
    endMove.current=():void=>{finish(false,moved,current)}
    window.addEventListener('pointermove',move,true)
    window.addEventListener('pointerup',up,true)
    window.addEventListener('pointercancel',cancel,true)
  }
  const resetPosition=(event:ReactMouseEvent<HTMLElement>):void=>{
    if((event.target as Element).closest('button:not(.dsh-library-grip)')!==null)return
    place(null);onPositionChange(null)
  }
  const moveByKey=(event:ReactKeyboardEvent<HTMLButtonElement>):void=>{
    const node=panel.current
    if(node===null)return
    if(event.key==='Home'){event.preventDefault();event.stopPropagation();place(null);onPositionChange(null);return}
    const rect=node.getBoundingClientRect()
    const next=libraryPositionFromKey(placed.current??{x:rect.left,y:rect.top},event.key,viewportOf(),sizeOf(node),minTopOf(node),event.shiftKey?64:16)
    if(next===null)return
    event.preventDefault();event.stopPropagation()
    place(next);onPositionChange(next)
  }
  const filtered=filterWidgetDefinitions(definitions,search,source)
  const begin=(definition:RegisteredWidgetDefinition,event:ReactPointerEvent<HTMLElement>)=>{
    if(disabled||event.button!==0||!event.isPrimary||(event.target as Element).closest('button:not(.dsh-widget-grip)'))return
    event.preventDefault();pending.current?.()
    const x=event.clientX,y=event.clientY,pointerId=event.pointerId
    const node=event.currentTarget.closest('.dsh-directory-item')!.getBoundingClientRect()
    const grab={x:(x-node.left)/node.width,y:Math.min(28,y-node.top)}
    const targets={window,document,documentElement:document.documentElement}
    let release=()=>{}
    const clear=()=>{window.removeEventListener('pointermove',move,true);release();pending.current=null}
    const move=(e:globalThis.PointerEvent)=>{
      if(e.pointerId!==pointerId||Math.hypot(e.clientX-x,e.clientY-y)<5)return
      clear()
      sourceRelease.current?.()
      sourceRelease.current=observeDragRelease(targets,{transport:'pointer',pointerId,touch:e.pointerType==='touch',
        onRelease:()=>setDragSource(null),onCancel:()=>setDragSource(null)})
      // Keep the actual origin button enabled, and synchronously install SpatialGrid's
      // layout-effect release owner before returning from this threshold event.
      flushSync(()=>{setDragSource(definition.typeId);onDrag(definition,{x:e.clientX,y:e.clientY,pointerId,touch:e.pointerType==='touch'},grab)})
    }
    release=observeDragRelease(targets,{transport:'pointer',pointerId,touch:event.pointerType==='touch',onRelease:clear,onCancel:clear})
    window.addEventListener('pointermove',move,true);pending.current=clear
  }
  return <aside ref={panel} className="dsh-library-panel" aria-label={t('gallery.addTab')} data-moving={moving?'true':undefined}>
    <div className="dsh-library-heading" onPointerDown={beginMove} onDoubleClick={resetPosition}>
      <button type="button" className="dsh-tool dsh-library-grip" aria-label={t('library.move')} title={t('library.moveHint')} onKeyDown={moveByKey}>⠿</button>
      <h2>{t('gallery.addTab')}</h2>
      <Button size="sm" variant="ghost" aria-label={t('library.close')} onClick={onClose}>×</Button>
    </div>
    <p className="dsh-gallery-hint">{t('library.hint')}</p>
    <div className="dsh-gallery-toolbar"><Input type="search" aria-label={t('gallery.search')} placeholder={t('gallery.search')} value={search} onChange={event=>setSearch(event.target.value)}/>
      <div className="dsh-gallery-filters" role="group" aria-label={t('gallery.filter')}>{(['all','builtin','extension'] as const).map(value=><Button key={value} size="sm" variant={source===value?'outline':'ghost'} aria-pressed={source===value} onClick={()=>setSource(value)}>{t(`gallery.${value}`)}</Button>)}</div>
    </div>
    <div className="dsh-widget-directory">{filtered.map(definition=>{
      const title=galleryText(definition.title,definition.typeId),Icon=definition.icon
      return <Tooltip key={definition.typeId} portal side="left" delayMs={350} maxWidth={300} disabled={disabled || dragSource !== null} label={`${galleryText(definition.description)}\n${definition.source??definition.typeId}`}>{/* The whole card is the drag source: the preview is most of its area and
            users naturally grab it, not only the title strip. */}
        <article className="dsh-w dsh-directory-item" data-widget-type={definition.typeId} onPointerDown={event=>begin(definition,event)}>
        <WidgetFrameHeader title={title} t={t} editing disabled={disabled&&dragSource!==definition.typeId} icon={Icon?<Icon size={14}/>:undefined}/>
        <div className="dsh-library-preview" inert><CardBoundary fallback={<div className="dsh-empty">{t('error.card')}</div>}><WidgetPreview definition={definition} t={t} language={language}/></CardBoundary></div>
      </article></Tooltip>
    })}</div>
    {filtered.length===0&&<div className="dsh-gallery-empty" role="status">{t('gallery.noMatch')}<Button size="sm" variant="outline" onClick={()=>{setSearch('');setSource('all')}}>{t('gallery.clear')}</Button></div>}
  </aside>
}
