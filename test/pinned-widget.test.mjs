import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { HomeStore } from '../src/client/store.ts'
import { emptyLayout, emptyPrefs } from '../src/client/api.ts'
import { pinnedSessionRows } from '../src/client/pinned-model.ts'

test('native pins preserve full pin order across directories and metadata gaps without recent/blank/subagent exclusion',()=>{
 const pins={ids:['last','blank','child','missing','last','archived',...Array.from({length:25},(_,i)=>`long-${i}`)],archived:['archived'],status:'ready'}
 const sessions={last:{id:'last',title:'Latest pin',cwd:'/a',updatedAt:1},blank:{id:'blank',blank:true,title:'Blank pin',updatedAt:999},child:{id:'child',parentSessionId:'parent',origin:'subagent',cwd:'/b'},archived:{id:'archived'}}
 const before=structuredClone({pins,sessions}),rows=pinnedSessionRows(pins,sessions)
 assert.equal(rows.length,29);assert.deepEqual(rows.slice(0,4).map(x=>x.id),['last','blank','child','missing'])
 assert.equal(rows[3].title,undefined);assert.equal(rows[3].lastAt,null);assert.equal(rows.at(-1).id,'long-24');assert.deepEqual({pins,sessions},before)
 assert.deepEqual(pinnedSessionRows(undefined,sessions),[])
 assert.deepEqual(pinnedSessionRows({ids:['__proto__'],archived:[],status:'ready'},{}).map(x=>x.id),['__proto__'])
})
async function withStore(run){const old=globalThis.fetch;const calls=[];globalThis.fetch=async(_u,init)=>{const b=JSON.parse(init.body);calls.push(b.op);let value
 if(b.op==='workbench.get')value={layout:emptyLayout(),instances:[],storage:{writable:true,status:'ready',error:null}}
 else if(b.op==='prefs.get')value=emptyPrefs()
 else if(b.op==='snapshot')value={sessions:[],days:[],today:{},week:{},scanning:false,scannedAt:1}
 else throw Error(`Unexpected write: ${b.op}`)
 return {ok:true,status:200,json:async()=>({ok:true,value})}}
 const store=new HomeStore();try{await store.loadLayout();await run(store,calls)}finally{store.dispose();globalThis.fetch=old}}
test('workspace subscription publishes native pin loading, ordered updates, errors and detach without Home writes',async()=>withStore(async(store,calls)=>{
 let state={items:[],pinnedSessionIds:[],archivedSessionIds:[],state:'loading',phase:'pending',error:null};const listeners=new Set();let off=0
 const source={getSnapshot:()=>state,subscribe:fn=>{listeners.add(fn);return()=>{off++;listeners.delete(fn)}}}
 store.attachWorkspaces(source);assert.equal(store.getSnapshot().nativePins.status,'pending')
 state={...state,pinnedSessionIds:['b','a','b'],phase:'ready',state:'idle'};listeners.forEach(fn=>fn())
 assert.deepEqual(store.getSnapshot().nativePins,{ids:['b','a'],archived:[],status:'ready'})
 state.pinnedSessionIds.push('external-mutation');assert.deepEqual(store.getSnapshot().nativePins.ids,['b','a'])
 state={...state,pinnedSessionIds:['a'],archivedSessionIds:['b'],state:'error'};listeners.forEach(fn=>fn());assert.equal(store.getSnapshot().nativePins.status,'error')
 store.detachWorkspaces();store.detachWorkspaces();assert.equal(off,1);assert.equal(listeners.size,0);assert.equal(store.getSnapshot().nativePins.status,'unavailable')
 store.attachWorkspaces(source);store.dispose();assert.equal(off,2);assert.equal(listeners.size,0)
 assert.ok(calls.every(op=>!op.endsWith('.set')))
}))
test('native display title is preferred and service scope replacement unsubscribes',async()=>withStore(async store=>{
 store.attachSessions({getSnapshot:()=>({byId:{a:{title:'Stored',displayTitle:'Native display',updatedAt:4}}}),subscribe:()=>()=>{}})
 assert.equal(store.getSnapshot().sessions.a.title,'Native display')
 const listeners=new Set();let off=0;const source={getSnapshot:()=>({pinnedSessionIds:['a'],archivedSessionIds:[],phase:'ready',state:'idle'}),subscribe:fn=>{listeners.add(fn);return()=>{off++;listeners.delete(fn)}}}
 store.attachWorkspaces(source);store.attachWorkspaces(source);assert.equal(off,1);assert.equal(listeners.size,1)
}))
test('pinned widget has complete rows, no ledger/recency pagination, isolated sample and fixed size',async()=>{
 const source=await readFile(new URL('../src/client/pinned-widget.tsx',import.meta.url),'utf8'),builtin=await readFile(new URL('../src/client/builtin-registration.tsx',import.meta.url),'utf8')
 assert.match(source,/rows\.map/);assert.doesNotMatch(source,/slice\(|recentPageSize|state\.ledger|saveConfig|pinSession\(/)
 assert.match(source,/actions\.openSession\(session\.id\)/);assert.match(builtin,/pinned: \{ default: \{ w:4,h:7 \}, supported: \[\{w:4,h:7\}\] \}/)
 assert.match(builtin,/nativePins: \{ ids: \['sample-0'/)
})
