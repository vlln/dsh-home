/** Coordinated private station only. Backups always restored; no model traffic. */
import{chromium}from'playwright';import assert from'node:assert/strict';import{mkdir,writeFile}from'node:fs/promises'
const url=new URL(process.env.DSH_VERIFY_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'3186')
const out=new URL(`../../.work/dsh-home/evidence/library-${Date.now()}/`,import.meta.url);await mkdir(out,{recursive:true})
const b=await chromium.launch({channel:'chrome',headless:true}),c=await b.newContext({viewport:{width:1440,height:1100}})
let p,backup,prefs;const errors=[],checks=[],activityRequests=[]
const api=async(op,extra={})=>{const r=await c.request.post(new URL('/plugins/dsh-home/api',url).href,{headers:{Origin:url.origin},data:{op,...extra}});const j=await r.json();assert(j.ok,JSON.stringify(j));return j.value}
const until=async(fn)=>{let error;for(let i=0;i<100;i++){try{if(await fn())return}catch(e){error=e}await new Promise(r=>setTimeout(r,50))}throw error??Error('condition timeout')}
try{
 await c.request.get(url.href);backup=await api('workbench.get');prefs=await api('prefs.get');await writeFile(new URL('backup.json',out),JSON.stringify({backup,prefs},null,2))
 // A disposable geometry fixture, never replacing original instances or configs.
 const fixture={...backup.layout,hidden:backup.instances.map(i=>i.instanceId)}
 await api('workbench.set',{layout:fixture,instances:backup.instances})
 p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('/plugins/dsh-home/api')&&r.postDataJSON()?.op==='activity')activityRequests.push(r.url())});await p.goto(url.href);await p.getByRole('button',{name:/^(Home|首页)$/}).first().click();await p.getByRole('button',{name:/^(Edit layout|编辑布局)$/}).click();await p.locator('.dsh-edit-bar').getByRole('button',{name:/^(Widgets|小组件)$/}).click();await p.locator('.dsh-library-panel').waitFor()
 const counterTimers=await p.evaluate(()=>window.__homeExampleStats?.activeTimers??0);assert.equal(counterTimers,0)
 assert.equal(await p.getByRole('button',{name:/^(On desktop|桌面组件)$/}).count(),0)
 assert.equal(await p.locator('.dsh-library-panel').getByRole('button',{name:/^(Add|添加|Duplicate|复制|Hide|隐藏)$/}).count(),0)
 const search=p.locator('.dsh-library-panel').getByRole('searchbox',{name:/^(Search widgets|搜索小组件)$/});await search.fill('notes')
 const source=p.locator('.dsh-directory-item').filter({has:p.locator('[data-widget-content-preview="@vlln/dsh-home:notes"]')}).first();await source.waitFor()
 const grip=source.locator('.dsh-w-head');const start=await grip.boundingBox();assert(start)
 const before=(await api('workbench.get')).instances.length
 // Simple tap creates nothing.
 await grip.click();assert.equal((await api('workbench.get')).instances.length,before);checks.push('no Add/tab/hide/duplicate and tapping source creates nothing')
 await p.mouse.move(start.x+70,start.y+10);await p.mouse.down();await p.mouse.move(start.x+50,start.y+20,{steps:4});await p.locator('.dsh-library-ghost').waitFor();await p.keyboard.press('Escape');await p.mouse.up();await until(async()=>await p.locator('.dsh-library-ghost').count()===0);assert.equal((await api('workbench.get')).instances.length,before);checks.push('Escape cancels local-only ghost without persisted instance')
 const grid=await p.locator('.dsh-spatial-grid').boundingBox();assert(grid)
 await p.mouse.move(start.x+70,start.y+10);await p.mouse.down();await p.mouse.move(start.x+30,start.y+20,{steps:3});await p.mouse.move(grid.x+90,grid.y+70,{steps:16});await p.screenshot({path:new URL('dragging.png',out).pathname,fullPage:true});await p.mouse.up()
 await until(async()=> (await api('workbench.get')).instances.length===before+1)
 const added=(await api('workbench.get')).instances.find(i=>!backup.instances.some(o=>o.instanceId===i.instanceId));assert(added)
 checks.push('ordinary pointer drag creates exactly one instance at accepted grid point')
 // Cancel a pending collision before the500ms dwell; no peers or instances persist.
 const earlySource=await grip.boundingBox(),earlyPeer=await p.locator(`[data-widget-id="${added.instanceId}"]`).boundingBox();assert(earlySource&&earlyPeer)
 const earlyState=await api('workbench.get');await p.mouse.move(earlySource.x+70,earlySource.y+10);await p.mouse.down();await p.mouse.move(earlySource.x+40,earlySource.y+20,{steps:3});await p.mouse.move(earlyPeer.x+90,earlyPeer.y+20,{steps:3});await p.mouse.up();assert.deepEqual((await api('workbench.get')).instances,earlyState.instances);checks.push('release before collision confirmation cancels creation')
 // Another source drag uses the ordinary collision transaction: no immediate peer move.
 const peer=p.locator(`[data-widget-id="${added.instanceId}"]`),peerBefore=await peer.boundingBox()
 const src=await grip.boundingBox();assert(src&&peerBefore)
 await p.mouse.move(src.x+70,src.y+10);await p.mouse.down();await p.mouse.move(src.x+40,src.y+20,{steps:3});await p.mouse.move(peerBefore.x+90,peerBefore.y+20,{steps:10})
 await p.locator('.dsh-library-ghost').waitFor();const initial=await peer.boundingBox();assert(Math.abs(initial.y-peerBefore.y)<2)
 await until(async()=>{const r=await peer.boundingBox();return Math.abs(r.y-peerBefore.y)>2||Math.abs(r.x-peerBefore.x)>2})
 const peerDuring=await peer.boundingBox();await p.screenshot({path:new URL('collision-confirmed.png',out).pathname,fullPage:true});await p.mouse.up();await until(async()=> (await api('workbench.get')).instances.length===before+2)
 assert(peerDuring);checks.push('collision stays still initially, then stationary500ms lets peers yield and accepted drop creates one instance')
 // Outside release must not retain the last accepted on-canvas candidate.
 const count=(await api('workbench.get')).instances.length;const s2=await grip.boundingBox();await p.mouse.move(s2.x+60,s2.y+10);await p.mouse.down();await p.mouse.move(s2.x+20,s2.y+25,{steps:3});await p.mouse.move(100,40,{steps:10});await p.mouse.up();assert.equal((await api('workbench.get')).instances.length,count);checks.push('release outside desktop never creates a phantom instance')
 await p.locator(`[data-widget-id="${added.instanceId}"]`).waitFor()
 await p.getByRole('button',{name:/^(Done|完成)$/}).click();await p.locator(`[data-widget-id="${added.instanceId}"]`).getByRole('button',{name:/^(Edit note|编辑便笺)$/}).click();await p.locator('.dsh-widget-config-modal').waitFor();await p.locator('.dsh-widget-config-modal').getByRole('button',{name:/^(Cancel|取消)$/}).last().click();await p.getByRole('button',{name:/^(Edit layout|编辑布局)$/}).click()
 await p.locator(`[data-widget-id="${added.instanceId}"]`).getByRole('button',{name:/^(Delete|删除)$/}).click();await p.locator('.dsh-home-delete-modal').getByRole('button',{name:/^(Confirm delete|确认删除)$/}).click();await until(async()=>!(await api('workbench.get')).instances.some(i=>i.instanceId===added.instanceId));checks.push('widget-owned note editing and separate modal confirmation delete')
 await p.locator('.dsh-edit-bar').getByRole('button',{name:/^(Widgets|小组件)$/}).click();await p.locator('.dsh-library-panel').waitFor();await p.locator('.dsh-directory-item').first().evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>{})))});await p.screenshot({path:new URL('library.png',out).pathname,fullPage:true,animations:'disabled'});assert.deepEqual(errors,[]);assert.equal(activityRequests.length,0);checks.push('real Content preview mounts without activity requests in isolated empty runtime')
}catch(e){errors.push(e.stack??String(e));process.exitCode=1;await p?.screenshot({path:new URL('failure.png',out).pathname}).catch(()=>{})}
finally{await p?.close();if(backup)await api('workbench.set',{layout:backup.layout,instances:backup.instances});if(prefs)await api('prefs.set',{prefs:prefs.prefs});await b.close();await writeFile(new URL('report.json',out),JSON.stringify({checks,errors},null,2));console.log(out.pathname,JSON.stringify({checks,errors}));}
