/** Gallery pointer transport uses the same grid coordinates and snap model as existing cards. */
import type { RegisteredWidgetDefinition } from './widget-contract.ts'
import { buildSpatialLayout, canPlace, type SpatialItem } from './spatial-model.ts'
import { emptyLayout } from './api.ts'
import { snapCandidate } from './collision-preview.ts'
import type { GridRect } from './api.ts'
export interface LibraryDrag {
  id: string
  definition: RegisteredWidgetDefinition
  item: SpatialItem
  start: { x: number; y: number }
  grab: { x: number; y: number }
  touch: boolean
  pointerId: number
  baseLayout: string
}
export function libraryItem(definition: RegisteredWidgetDefinition, id: string, cols: number, layout: SpatialItem[]): SpatialItem {
  if(![2,6,12].includes(cols)||layout.some(item=>item.i===id))throw new Error('Invalid library drag identity or columns')
  if(layout.some(item=>![item.x,item.y,item.w,item.h].every(Number.isInteger)||item.x<0||item.y<0||item.w<1||item.h<3))throw new Error('Invalid peer geometry')
  const d = definition.defaults
  const item = buildSpatialLayout(emptyLayout(), [{ id, defaultSize:d.size, defaultHeight:d.height,
    minWidth:d.minWidth,maxWidth:d.maxWidth,minHeight:d.minHeight,maxHeight:d.maxHeight }],cols)[0]!
  const y = Math.max(0,...layout.map(entry=>entry.y+entry.h))
  if(y+item.h>10000) throw new Error('No space for library draft')
  return {...item,x:0,y}
}
export function libraryPointerInside(point:{x:number;y:number},grid:{left:number;top:number;width:number;height:number}):boolean {
 return [point.x,point.y,grid.left,grid.top,grid.width,grid.height].every(Number.isFinite)&&grid.width>0&&grid.height>0&&point.x>=grid.left&&point.x<grid.left+grid.width&&point.y>=grid.top&&point.y<grid.top+grid.height
}
export function libraryCandidate(point:{x:number;y:number},grab:{x:number;y:number},grid:{left:number;top:number},width:number,cols:number,id:string,snapshot:SpatialItem[],previous:GridRect) {
 return snapCandidate({x:(point.x-grab.x-grid.left)/((width+12)/cols),y:(point.y-grab.y-grid.top)/56},id,snapshot,cols,previous)
}
export function validLibraryDrop(layout:SpatialItem[],id:string,candidate:GridRect,cols:number):boolean {
 return layout.some(item=>item.i===id&&item.x===candidate.x&&item.y===candidate.y&&item.w===candidate.w&&item.h===candidate.h)&&canPlace(layout,id,candidate,cols)
}
