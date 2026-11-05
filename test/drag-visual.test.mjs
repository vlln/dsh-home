import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pinDraggedItem, placementAccepted } from '../src/client/drag-visual.ts'
import { previewPlacement } from '../src/client/collision-preview.ts'
const item=(i,x,y,w=4,h=4)=>({i,x,y,w,h,minW:3,minH:3,maxW:12})
test('pending visual pins only the active candidate while committable snapshot stays untouched',()=>{
 const snapshot=Object.freeze([Object.freeze(item('active',8,0)),Object.freeze(item('peer',0,6))])
 const candidate={x:0,y:7,w:4,h:4}
 const visual=pinDraggedItem(snapshot,'active',candidate)
 assert.deepEqual(visual[0],{...snapshot[0],...candidate})
 assert.deepEqual(visual[1],snapshot[1])
 assert.equal(snapshot[0].x,8)
 assert.equal(placementAccepted(snapshot,'active',candidate),false)
})
test('each valid directional preview preserves active candidate and moves peers only',()=>{
 const snapshot=[item('active',8,0),item('peer',4,8)]
 const candidate={x:4,y:9,w:4,h:4}
 for(const direction of ['left','right','up','down']){
  const preview=previewPlacement(snapshot,'active',candidate,12,direction)
  assert(placementAccepted(preview,'active',candidate))
  assert.deepEqual(pinDraggedItem(preview,'active',candidate),preview)
 }
})
test('impossible collision keeps visual candidate independent of rejected commit',()=>{
 const snapshot=[item('active',8,20),item('peer',0,8,12,4)]
 const candidate={x:4,y:8,w:4,h:4}
 const rejected=previewPlacement(snapshot,'active',candidate,12,'left')
 assert.deepEqual(rejected,snapshot)
 assert(!placementAccepted(rejected,'active',candidate))
 const visual=pinDraggedItem(rejected,'active',candidate)
 assert.deepEqual(visual[0],{...snapshot[0],...candidate})
 assert.deepEqual(visual[1],snapshot[1])
})
