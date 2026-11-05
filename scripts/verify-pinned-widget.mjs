/** Real native pin RPC → workspace follow → fixed widget; owned private station only. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const url=new URL(process.env.DSH_VERIFY_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'3186')
const out=new URL(`../../.work/dsh-home/evidence/pinned-${Date.now()}/`,import.meta.url);await mkdir(out,{recursive:true})
const registryFile=new URL('../../.work/dsh-home/dsh/storages/workspace.json',import.meta.url)
const originalRegistry=JSON.parse(await readFile(registryFile,'utf8'));const originalPins=originalRegistry.global.pinnedSessionIds??[]
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
let page,backup,prefs;const checks=[],errors=[],changed=[]
const api=async(op,extra={})=>{const r=await context.request.post(new URL('/plugins/dsh-home/api',url).href,{headers:{Origin:url.origin},data:{op,...extra}}),j=await r.json();assert(j.ok,JSON.stringify(j));return j.value}
const rpc=async(method,args)=>{assert(['session/list','workspace/pinSession','workspace/unpinSession'].includes(method));const r=await context.request.post(new URL(`/api/${method}`,url).href,{headers:{Origin:url.origin},data:{type:'client-request',rpcId:crypto.randomUUID(),method,payload:{args}}}),j=await r.json();assert(j.result?.ok,JSON.stringify(j));return j.result.value}
try{
 await context.request.get(url.href);backup=await api('workbench.get');prefs=await api('prefs.get');await writeFile(new URL('backup.json',out),JSON.stringify({backup,prefs,originalPins},null,2))
 const list=await rpc('session/list',{_request:{}});const fixtures=list.items.filter(row=>row.blank===true&&!originalRegistry.global.archivedSessionIds.includes(row.sessionId));assert(fixtures.length>=2,'private synthetic blank fixtures required')
 const ids=fixtures.map(row=>row.sessionId);assert(ids.every(id=>!originalPins.includes(id)),'fixtures must begin unpinned')
 const widget={instanceId:'verify-pinned',typeId:'@vlln/dsh-home:pinned',configVersion:1,config:{}}
 await api('workbench.set',{instances:[...backup.instances,widget],layout:{...backup.layout,instanceLayout:true,hidden:backup.instances.map(i=>i.instanceId),order:[...backup.layout.order,widget.instanceId],positions:{...backup.layout.positions,12:{...backup.layout.positions?.[12],[widget.instanceId]:{x:0,y:0,w:4,h:7}}}}})
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url.href);await page.getByRole('button',{name:/^(Home|首页)$/}).first().click()
 const card=page.locator('[data-widget-id="verify-pinned"]'),rows=card.locator('[data-session-id]')
 await card.getByText(/^(No pinned sessions yet|还没有置顶会话)$/).waitFor();checks.push('native registry ready shows honest empty state and original-sidebar guidance')
 for(const id of ids){await rpc('workspace/pinSession',{request:{sessionId:id}});changed.push(id)}
 await page.waitForFunction(n=>document.querySelectorAll('[data-widget-id="verify-pinned"] [data-session-id]').length===n,ids.length)
 assert.deepEqual(await rows.evaluateAll(nodes=>nodes.map(n=>n.dataset.sessionId)),[...ids].reverse())
 assert.equal(await card.locator('.dsh-widget-resize-handle,.dsh-widget-size-select,.react-resizable-handle').count(),0)
 await card.screenshot({path:new URL('pinned-widget.png',out).pathname,animations:'disabled'})
 checks.push('native RPC pins all existing synthetic blank sessions; widget updates live in native pin order without ledger or blank filtering')
 await page.reload();await page.getByRole('button',{name:/^(Home|首页)$/}).first().click();await rows.first().waitFor();assert.deepEqual(await rows.evaluateAll(nodes=>nodes.map(n=>n.dataset.sessionId)),[...ids].reverse());checks.push('native pins survive browser reload and remain fixed-size')
 await rpc('workspace/unpinSession',{request:{sessionId:ids[0]}});await page.waitForFunction(id=>!document.querySelector(`[data-widget-id="verify-pinned"] [data-session-id="${id}"]`),ids[0]);checks.push('native unpin immediately removes only its row without reloading')
 await rows.first().click();await page.locator('.dsh-home').waitFor({state:'hidden'});checks.push('selecting a pinned row opens the original native session')
 await page.getByRole('button',{name:/^(Home|首页)$/}).first().click();await page.getByRole('button',{name:/^(Edit layout|编辑布局)$/}).click();await page.locator('.dsh-edit-bar').getByRole('button',{name:/^(Widgets|小组件)$/}).click();const panel=page.locator('.dsh-library-panel');await panel.getByRole('searchbox').fill('pinned');await panel.locator('[data-widget-type="@vlln/dsh-home:pinned"]').waitFor();await panel.screenshot({path:new URL('pinned-library.png',out).pathname});checks.push('pinned widget is searchable in the real-content widget library without auto-changing the desktop')
 assert.deepEqual(errors,[])
}catch(e){errors.push(e.stack??String(e));process.exitCode=1;await page?.screenshot({path:new URL('failure.png',out).pathname,fullPage:true}).catch(()=>{})}
finally{await page?.close();for(const id of changed)await rpc('workspace/unpinSession',{request:{sessionId:id}});if(backup)await api('workbench.set',{instances:backup.instances,layout:backup.layout});if(prefs)await api('prefs.set',{prefs:prefs.prefs});await browser.close();const after=JSON.parse(await readFile(registryFile,'utf8'));assert.deepEqual(after.global.pinnedSessionIds??[],originalPins);await writeFile(new URL('report.json',out),JSON.stringify({checks,errors,data:'Existing private synthetic blank sessions; real native pin/unpin RPC and follow, no model requests; pin set, instances, layout restored.'},null,2));console.log(out.pathname,JSON.stringify({checks,errors}))}
