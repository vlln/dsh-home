/** Component-declared discrete corner resize in real installed private GUI. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
const url=new URL(process.env.DSH_VERIFY_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'3186')
const out=new URL(`../../.work/dsh-home/evidence/resize-${Date.now()}/`,import.meta.url);await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1600,height:1400},reducedMotion:'reduce'})
let page,backup,prefs;const errors=[],checks=[]
const api=async(op,extra={})=>{const r=await context.request.post(new URL('/plugins/dsh-home/api',url).href,{headers:{Origin:url.origin},data:{op,...extra}}),j=await r.json();assert(j.ok,JSON.stringify(j));return j.value}
const poll=async fn=>{for(let n=0;n<100;n++){if(await fn())return;await new Promise(r=>setTimeout(r,30))}throw Error('condition timed out')}
const saved=async id=>(await api('workbench.get')).layout.positions[12][`resize-${id}`]
try{
 await context.request.get(url.href);backup=await api('workbench.get');prefs=await api('prefs.get');await writeFile(new URL('backup.json',out),JSON.stringify({backup,prefs},null,2))
 const fixtures=[['a','notes',{title:'Discrete resize',text:'Keep my text and configuration.'}],['b','clock',{label:'Fixed clock',timeZone:'UTC',hour12:false}],['c','notes',{title:'Original size',text:'Old custom size stays until resize.'}],['d','clock',{label:'Collision guard',timeZone:'UTC',hour12:false}]].map(([id,type,config])=>({instanceId:`resize-${id}`,typeId:`@vlln/dsh-home:${type}`,configVersion:1,config}))
 const positions={'resize-a':{x:0,y:0,w:4,h:6},'resize-b':{x:8,y:0,w:4,h:4},'resize-c':{x:0,y:14,w:5,h:7},'resize-d':{x:7,y:9,w:4,h:4}}
 const layout={...backup.layout,instanceLayout:true,hidden:backup.instances.map(i=>i.instanceId),order:[...backup.layout.order,...fixtures.map(i=>i.instanceId)],positions:{...backup.layout.positions,12:{...backup.layout.positions?.[12],...positions}}}
 await api('workbench.set',{instances:[...backup.instances,...fixtures],layout})
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
 const home=async()=>{await page.goto(url.href);await page.getByRole('button',{name:/^(Home|首页)$/}).first().click();await page.locator('[data-widget-id="resize-a"]').waitFor()}
 const edit=()=>page.getByRole('button',{name:/^(Edit layout|编辑布局)$/}).click()
 const done=()=>page.getByRole('button',{name:/^(Done|完成)$/}).click()
 const widget=id=>page.locator(`[data-widget-id="resize-${id}"]`),handle=id=>widget(id).locator('.dsh-widget-resize-handle')
 const dom=async id=>{const g=await page.locator('.dsh-spatial-grid').boundingBox(),b=await widget(id).boundingBox();return{x:Math.round((b.x-g.x)/((g.width+12)/12)),y:Math.round((b.y-g.y)/56),w:Math.round((b.width+12)/((g.width+12)/12)),h:Math.round((b.height+12)/56)}}
 const begin=async(id,w,h)=>{await handle(id).scrollIntoViewIfNeeded();const b=await handle(id).boundingBox(),g=await page.locator('.dsh-spatial-grid').boundingBox(),r=await dom(id);const p={x:b.x+b.width/2,y:b.y+b.height/2};await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+(w-r.w)*(g.width+12)/12,p.y+(h-r.h)*56,{steps:8});await page.locator('body.dsh-home-resizing').waitFor()}
 await home();assert.equal(await page.locator('.dsh-widget-resize-handle').count(),0);await edit()
 assert.equal(await page.locator('.dsh-widget-size-select').count(),0);assert.equal(await handle('b').count(),0);assert.equal(await handle('a').count(),1);assert.deepEqual(await dom('c'),positions['resize-c'])
 checks.push('no size dropdown; editable note has bottom-right handle; fixed clock has none; original custom geometry retained')
 const baseline=await api('workbench.get');await begin('a',6.1,7.1);await poll(async()=>{const r=await dom('a');return r.w===6&&r.h===7})
 assert.deepEqual((await api('workbench.get')).layout,baseline.layout)
 await page.screenshot({path:new URL('resize-held.png',out).pathname,fullPage:true});await page.mouse.up();await poll(async()=>{const r=await saved('a');return r.w===6&&r.h===7})
 const after=await api('workbench.get');assert.deepEqual(after.instances,baseline.instances);for(const cols of['6','2'])assert.deepEqual(after.layout.positions[cols],baseline.layout.positions[cols]);assert.deepEqual(after.layout.positions[12]['resize-b'],positions['resize-b']);assert.deepEqual(after.layout.positions[12]['resize-c'],positions['resize-c'])
 checks.push('real corner drag snaps to component-declared 6×7 (not old global catalog); held preview makes no write; release saves only target')
 await begin('a',5.4,6.7);assert.deepEqual(await dom('a'),{x:0,y:0,w:6,h:7});await page.mouse.up();assert.deepEqual(await saved('a'),{x:0,y:0,w:6,h:7})
 checks.push('intermediate pointer dimensions never become an undeclared width/height combination')
 await begin('a',8,8);await poll(async()=>{const r=await dom('a');return r.w===8&&r.h===8});await page.keyboard.press('Escape');await page.mouse.up();await poll(async()=>{const r=await dom('a');return r.w===6&&r.h===7});assert.deepEqual(await saved('a'),{x:0,y:0,w:6,h:7});assert.equal(await page.locator('.dsh-home[data-editing=true]').count(),1)
 checks.push('Escape restores pre-resize dimensions and stays in edit mode without persistence')
 await begin('a',8,8);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();assert.deepEqual(await saved('a'),{x:0,y:0,w:6,h:7})
 checks.push('blur cancels preview and releases gesture cleanly')
 const beforeBlocked=await api('workbench.get');await begin('a',8,12);await handle('a').locator(':scope[data-blocked=true]').waitFor();assert.deepEqual(await dom('a'),{x:0,y:0,w:6,h:7});await page.mouse.up();assert.deepEqual((await api('workbench.get')).layout,beforeBlocked.layout)
 checks.push('blocked declared size cannot overlap or push a neighbor; release leaves all persisted geometry unchanged')
 await begin('a',8,8);await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1,pointerType:'mouse'})));await page.mouse.up();assert.deepEqual(await saved('a'),{x:0,y:0,w:6,h:7})
 checks.push('pointercancel restores the original size without saving')
 // Enlarge at x8 into the right boundary; source remains fixed, neighbors unchanged.
 await handle('c').scrollIntoViewIfNeeded();await handle('c').focus();await page.keyboard.press('ArrowRight');await poll(async()=>{const r=await saved('c');return r.w===4&&r.h===6})
 await done();await home();assert.deepEqual(await saved('a'),{x:0,y:0,w:6,h:7});await edit()
 checks.push('keyboard fallback and Done/reload retain legal component sizes')
 await page.screenshot({path:new URL('resize-wide.png',out).pathname,fullPage:true})
 const beforeNarrow=await api('workbench.get');for(const width of[1050,540]){await page.setViewportSize({width,height:1400});await page.waitForFunction(()=>{const el=document.querySelector('.dsh-spatial-container'),w=el?.clientWidth??0;return el?.dataset.cols===String(w>=950?12:w>=580?6:2)});assert(await page.locator('.dsh-home').evaluate(el=>el.scrollWidth<=el.clientWidth+1));assert.deepEqual((await api('workbench.get')).layout,beforeNarrow.layout);await page.screenshot({path:new URL(`resize-${width}.png`,out).pathname,fullPage:true})}
 checks.push('6/2-column projection has no page overflow and breakpoint browsing does not write layout')
 assert.deepEqual(errors,[])
}catch(error){errors.push(error.stack??String(error));process.exitCode=1;await page?.screenshot({path:new URL('failure.png',out).pathname,fullPage:true}).catch(()=>{})}
finally{await page?.close();if(backup)await api('workbench.set',{instances:backup.instances,layout:backup.layout});if(prefs)await api('prefs.set',{prefs:prefs.prefs});await browser.close();await writeFile(new URL('report.json',out),JSON.stringify({checks,errors},null,2));console.log(out.pathname,JSON.stringify({checks,errors}))}
