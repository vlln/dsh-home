import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HomeWidgetRegistry } from '../src/client/widget-registry.ts'
import { WIDGET_PRESETS, normalizeWidgetSizing, legacyInstanceProjection, presetGeometry, projectedWidgetPresets } from '../src/client/widget-sizing.ts'
import { applyWidgetPreset, buildSpatialLayout, canPlace } from '../src/client/spatial-model.ts'
import { HomeStore } from '../src/client/store.ts'
import { emptyLayout, emptyPrefs } from '../src/client/api.ts'
import { readFile } from 'node:fs/promises'
const definition = extra => ({ typeId:'test/presets:note', apiVersion:1, title:'Note', configVersion:1,
  defaultConfig:()=>({text:'keep'}), validateConfig:()=>true, Content:()=>null,
  sizing:{default:'4x6',supported:['4x4','4x6','8x6','8x8','12x8']}, ...extra })
const rect = ({x,y,w,h}) => ({x,y,w,h})
function registry(extra) { const r=new HomeWidgetRegistry(); r.register(definition(extra)); return r }
const meta = (r,id) => { const d=r.get('test/presets:note'); return {id,sizing:d.sizing,defaultSize:d.defaults.size,defaultHeight:d.defaults.height,...d.defaults} }
test('finite host catalog projects every shape at all public breakpoints',()=>{
  assert.equal(Object.keys(WIDGET_PRESETS).length,12)
  for(const [key,shape] of Object.entries(WIDGET_PRESETS)) for(const cols of [12,6,2]) {
    const actual=presetGeometry(key,cols)
    assert.equal(actual.h,shape.h)
    assert.equal(actual.w,cols===12?shape.w:cols===6?(shape.w===4?3:6):2)
    assert.ok(actual.w<=cols)
  }
  for(const key of ['5x6','4x5','20x20','__proto__',null]) assert.throws(()=>presetGeometry(key,12))
  for(const cols of [1,4,8,13,NaN]) assert.throws(()=>presetGeometry('4x4',cols))
})
test('registration accepts names only and freezes independent supported presets',()=>{
  const source=definition(),r=new HomeWidgetRegistry();r.register(source)
  source.sizing.supported.push('12x12')
  const d=r.get(source.typeId)
  assert.ok(Object.isFrozen(d.sizing));assert.ok(Object.isFrozen(d.sizing.supported))
  assert.equal(d.sizing.supported.includes('12x12'),false)
  for(const sizing of [null,{}, {default:'4x4',supported:[]}, {default:'4x4',supported:['4x6']},
    {default:'4x4',supported:['4x4','4x4']},{default:'5x4',supported:['5x4']},
    {default:'4x4',supported:['4x4'],width:5}]) assert.throws(()=>registry({sizing}),/sizing/)
  assert.throws(()=>registry({defaults:{height:5}}),/not both/)
  const input={default:'4x4',supported:['4x4']};Object.defineProperty(input,'w',{get(){throw Error('getter executed')}})
  assert.throws(()=>normalizeWidgetSizing(input),/supports only/)
})
test('legacy registration maps arbitrary old hints to one standard shape, not custom geometry',()=>{
  for(const [height,h]of [[3,4],[5,6],[7,8],[9,12],[30,12]]){
    const r=registry({sizing:undefined,defaults:{size:'s',height,minWidth:3,maxWidth:5}}),d=r.get('test/presets:note')
    assert.deepEqual(d.sizing,{default:`4x${h}`,supported:[`4x${h}`]})
    for(const cols of [12,6,2])assert.deepEqual(rect(buildSpatialLayout(emptyLayout(),[meta(r,'a')],cols)[0]),{x:0,y:0,...presetGeometry(d.sizing.default,cols)})
  }
})
test('projected choices deduplicate without losing default representative',()=>{
 const s=normalizeWidgetSizing({default:'12x6',supported:['4x6','8x6','12x6','8x8']})
 assert.deepEqual(projectedWidgetPresets(s,6).map(x=>x.preset),['4x6','12x6','8x8'])
 assert.deepEqual(projectedWidgetPresets(s,2).map(x=>x.preset),['12x6','8x8'])
})
test('historical narrow/custom/large shapes survive load, movement bounds and missing-breakpoint projection',()=>{
 const r=registry(); const widths=[1,2,3,5,7,11]
 const positions=Object.fromEntries(widths.map((w,i)=>[String(i),{x:0,y:i*32,w,h:i===5?30:7}]))
 const layout={...emptyLayout(),instanceLayout:true,order:Object.keys(positions),positions:{12:positions}},before=structuredClone(layout)
 const geometry=buildSpatialLayout(layout,widths.map((_,i)=>meta(r,String(i))),12)
 for(const item of geometry){assert.deepEqual(rect(item),positions[item.i]);assert.ok(item.minW<=item.w&&item.maxW>=item.w);assert.ok(item.maxH>=item.h)}
 for(const cols of[6,2])for(const item of buildSpatialLayout(layout,widths.map((_,i)=>meta(r,String(i))),cols)) assert.deepEqual({w:item.w,h:item.h},presetGeometry('4x6',cols))
 assert.deepEqual(layout,before)
})
test('explicit preset is anchored and rejects collision, edge and unsupported shape without mutation',()=>{
 const sizing=registry().get('test/presets:note').sizing
 const a={i:'a',x:0,y:0,w:4,h:6,minW:3,minH:3,maxW:12},b={...a,i:'b',x:8}
 const geometry=Object.freeze([Object.freeze(a),Object.freeze(b)])
 const changed=applyWidgetPreset(geometry,'a',sizing,'8x6',12)
 assert.equal(changed[1],b);assert.deepEqual(rect(changed[0]),{x:0,y:0,w:8,h:6})
 assert.strictEqual(applyWidgetPreset(geometry,'a',sizing,'4x6',12),geometry)
 assert.throws(()=>applyWidgetPreset(geometry,'a',sizing,'12x8',12),/blocked/)
 assert.throws(()=>applyWidgetPreset(geometry,'a',sizing,'4x12',12),/Unsupported/)
 assert.throws(()=>applyWidgetPreset([{...a,x:8}], 'a',sizing,'8x6',12),/blocked/)
 assert.ok(canPlace(changed,'a',changed[0],12))
})
async function withStore(callback, setup=()=>{}){
 const old=globalThis.fetch,writes=[];let state={layout:{...emptyLayout(),instanceLayout:true,order:['a','b'],size:{a:'l'},hidden:['hidden'],positions:{12:{a:{x:0,y:0,w:4,h:6},b:{x:8,y:0,w:4,h:6},orphan:{x:0,y:50,w:5,h:7}},6:{a:{x:0,y:20,w:6,h:7}},2:{hidden:{x:0,y:9,w:2,h:9}}}},instances:['a','b','hidden'].map(instanceId=>({instanceId,typeId:'test/presets:note',configVersion:1,config:{text:instanceId}})),storage:{writable:true,status:'ready',error:null}}
 setup(state)
 let fail=false;globalThis.fetch=async(_u,init)=>{const body=JSON.parse(init.body);let value
  if(body.op==='workbench.get')value=state
  else if(body.op==='prefs.get')value=emptyPrefs()
  else if(body.op==='snapshot')value={generatedAt:0,scannedAt:0,scanning:false,progress:{done:0,total:0},sessions:[],days:[],today:{activeMs:0},week:{}}
  else if(body.op==='workbench.set'){writes.push(structuredClone(body));if(fail){fail=false;throw Error('disk failed')}state={...state,layout:body.layout,instances:body.instances};value=state}
  else throw Error(body.op)
  return {ok:true,json:async()=>({ok:true,value:structuredClone(value)})}
 }
 const store=new HomeStore(),r=registry();store.reconcileDefinitions(r)
 try{await store.loadLayout();await callback(store,r,writes,()=>{fail=true})}finally{store.dispose();globalThis.fetch=old}
}
const current=(store,r)=>buildSpatialLayout(store.getSnapshot().layout,store.getSnapshot().instances.map(i=>meta(r,i.instanceId)),12)
test('store size transaction changes only active breakpoint target and is durable with retry',async()=>withStore(async(store,r,writes,fail)=>{
 const before=structuredClone(store.getSnapshot()),d=r.get('test/presets:note')
 assert.equal(store.setWidgetPreset('a',d,current(store,r),12,'8x6'),true)
 const next=store.getSnapshot()
 assert.deepEqual(next.instances,before.instances);assert.deepEqual(next.layout.size,before.layout.size);assert.deepEqual(next.layout.positions[6],before.layout.positions[6]);assert.deepEqual(next.layout.positions[2],before.layout.positions[2]);assert.deepEqual(next.layout.positions[12].orphan,before.layout.positions[12].orphan);assert.deepEqual(next.layout.positions[12].b,before.layout.positions[12].b)
 fail();await assert.rejects(store.flushLayout(),/disk failed/);await store.flushLayout()
 assert.equal(writes.length,2);assert.deepEqual(writes[0].layout,writes[1].layout)
}))
test('store no-op/rejected/stale/provider-change/readonly/disposed requests have zero publication and writes',async()=>withStore(async(store,r,writes)=>{
 let notices=0;store.subscribe(()=>notices++);const d=r.get('test/presets:note'),g=current(store,r),before=store.getSnapshot()
 assert.equal(store.setWidgetPreset('a',d,g,12,'4x6'),false)
 for(const action of[()=>store.setWidgetPreset('a',d,g,12,'12x8'),()=>store.setWidgetPreset('a',d,g.map(i=>i.i==='a'?{...i,y:5}:i),12,'8x6'),()=>store.setWidgetPreset('a',d,g,6,'8x6'),()=>store.setWidgetPreset('hidden',d,g,12,'8x6'),()=>store.setWidgetPreset('a',{...d},g,12,'8x6')])assert.throws(action)
 assert.equal(notices,0);assert.strictEqual(store.getSnapshot(),before);assert.equal(writes.length,0)
 store.dispose();assert.throws(()=>store.setWidgetPreset('a',d,g,12,'8x6'));assert.equal(writes.length,0)
}))
test('legacy size-only builtin projection preserves historical width and height without writes',()=>{
 const r=registry(),layout={...emptyLayout(),instanceLayout:true,order:['recent'],size:{recent:'l'}}
 const hint=legacyInstanceProjection('@vlln/dsh-home:recent','recent',layout,r.get('test/presets:note'))
 const m={...meta(r,'recent'),legacyProjection:hint}
 assert.equal(buildSpatialLayout(layout,[m],12)[0].w,12)
 assert.equal(buildSpatialLayout(layout,[m],12)[0].h,7)
 assert.equal(legacyInstanceProjection('@vlln/dsh-home:recent','recent',{positions:{6:{recent:{x:0,y:0,w:6,h:8}}}}),undefined)
})
test('size transaction does not materialize a peer missing from saved breakpoint',async()=>withStore(async(store,r)=>{
 const before=structuredClone(store.getSnapshot().layout),d=r.get('test/presets:note')
 assert.equal(store.setWidgetPreset('a',d,current(store,r),12,'4x4'),true)
 const after=store.getSnapshot().layout;const expected=structuredClone(before);expected.positions[12].a.h=4
 assert.deepEqual(after,expected);assert.equal(Object.hasOwn(after.positions[12],'b'),false)
}, state=>{delete state.layout.positions[12].b}))
test('size transaction never publishes repaired projection of a colliding peer',async()=>withStore(async(store,r)=>{
 const before=structuredClone(store.getSnapshot().layout),d=r.get('test/presets:note')
 assert.equal(store.setWidgetPreset('a',d,current(store,r),12,'4x4'),true)
 const expected=structuredClone(before);expected.positions[12].a.h=4
 assert.deepEqual(store.getSnapshot().layout,expected)
}, state=>{state.layout.positions[12].b={x:0,y:0,w:4,h:6}}))
test('free resize is disabled and only named grid options are exposed by the shell',async()=>{
 const grid=await readFile(new URL('../src/client/spatial-grid.tsx',import.meta.url),'utf8'),page=await readFile(new URL('../src/client/page.tsx',import.meta.url),'utf8')
 assert.match(grid,/resizeConfig=\{\{ enabled: false, handles: \[\] \}\}/)
 assert.match(page,/store\.setWidgetPreset/);assert.match(page,/edit\.presetLegacy/)
 assert.match(page,/gripDisabled=\{!writable \|\| busy\}/)
 const frame=await readFile(new URL('../src/client/widget-frame.tsx',import.meta.url),'utf8');assert.match(frame,/disabled=\{gripDisabled \?\? disabled\}/)
})
