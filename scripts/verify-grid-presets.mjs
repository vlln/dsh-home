/** Finite host preset controls in installed private GUI; fixtures and state are restored. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
const url=new URL(process.env.DSH_VERIFY_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'3186')
const out=new URL(`../../.work/dsh-home/evidence/presets-${Date.now()}/`,import.meta.url);await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1600,height:1200},reducedMotion:'reduce'})
let page,backup,prefs;const errors=[],checks=[]
const api=async(op,extra={})=>{const r=await context.request.post(new URL('/plugins/dsh-home/api',url).href,{headers:{Origin:url.origin},data:{op,...extra}}),j=await r.json();assert(j.ok,JSON.stringify(j));return j.value}
const poll=async fn=>{for(let n=0;n<100;n++){if(await fn())return;await new Promise(r=>setTimeout(r,30))}throw Error('condition timed out')}
const rect=async id=>{const s=await api('workbench.get');return s.layout.positions[12][id]}
try{
 await context.request.get(url.href);backup=await api('workbench.get');prefs=await api('prefs.get');await writeFile(new URL('backup.json',out),JSON.stringify({backup,prefs},null,2))
 const fixture=[['a','notes',{title:'Grid preset acceptance',text:'Keep my text and configuration.'}],['b','clock',{label:'Fixed grid clock',timeZone:'UTC',hour12:false}],['c','notes',{title:'Original custom size',text:'This old 5 by 7 rectangle must survive.'}]].map(([id,type,config])=>({instanceId:`preset-${id}`,typeId:`@vlln/dsh-home:${type}`,configVersion:1,config}))
 const positions={'preset-a':{x:0,y:0,w:4,h:6},'preset-b':{x:8,y:0,w:4,h:4},'preset-c':{x:0,y:12,w:5,h:7}}
 const layout={...backup.layout,instanceLayout:true,hidden:backup.instances.map(i=>i.instanceId),order:[...backup.layout.order,...fixture.map(i=>i.instanceId)],positions:{...backup.layout.positions,12:{...backup.layout.positions?.[12],...positions}}}
 await api('workbench.set',{instances:[...backup.instances,...fixture],layout})
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
 const home=async()=>{await page.goto(url.href);await page.getByRole('button',{name:/^(Home|首页)$/}).first().click();await page.locator('[data-widget-id="preset-a"]').waitFor()}
 const edit=async()=>page.getByRole('button',{name:/^(Edit layout|编辑布局)$/}).click()
 const done=async()=>page.getByRole('button',{name:/^(Done|完成)$/}).click()
 const widget=id=>page.locator(`[data-widget-id="preset-${id}"]`),select=id=>widget(id).locator('.dsh-widget-size-select')
 await home();assert.equal(await page.locator('.dsh-widget-size-select').count(),0);await edit()
 assert.equal(await page.locator('.react-resizable-handle').count(),0)
 assert.equal(await select('b').locator('option').count(),1)
 assert.equal(await select('c').inputValue(),'');assert.match(await select('c').locator('option:checked').innerText(),/5 × 7/)
 checks.push('reading mode has no size controls; edit has finite grid choices and no free-resize handles; fixed clock has one option; custom size identified')
 await select('a').selectOption('8x6');await poll(async()=>JSON.stringify(await rect('preset-a'))===JSON.stringify({x:0,y:0,w:8,h:6}))
 const expanded=await api('workbench.get');assert.deepEqual(expanded.layout.positions[12]['preset-b'],positions['preset-b']);assert.deepEqual(expanded.layout.positions[12]['preset-c'],positions['preset-c']);assert.deepEqual(expanded.instances,[...backup.instances,...fixture]);for(const cols of['6','2'])assert.deepEqual(expanded.layout.positions[cols],layout.positions[cols]);assert.deepEqual(expanded.layout.size,layout.size)
 checks.push('anchored expansion changes target only; config, peers, original custom and other breakpoints preserved')
 await select('a').selectOption('12x8');await page.getByRole('alert').filter({hasText:/does not fit|放不下/}).waitFor();assert.equal(await select('a').inputValue(),'8x6');assert.deepEqual((await api('workbench.get')).layout,expanded.layout)
 checks.push('blocked expansion is rejected with localized message; target/peers unchanged and control reverts')
 await select('a').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await select('a').selectOption('4x6')
 await select('c').selectOption('4x6');await poll(async()=>{const r=await rect('preset-c');return r.w===4&&r.h===6&&r.x===0&&r.y===12})
 await done();await home();assert.deepEqual(await rect('preset-a'),positions['preset-a']);assert.deepEqual(await rect('preset-c'),{x:0,y:12,w:4,h:6});await edit()
 await page.screenshot({path:new URL('presets-wide.png',out).pathname,fullPage:true})
 checks.push('native selector supports keyboard; explicit original-to-preset conversion and Done/reload retain chosen geometry')
 // Width-only remapping must not write any new breakpoint just by rendering options.
 const beforeNarrow=await api('workbench.get')
 for(const width of[1050,540]){
  await page.setViewportSize({width,height:1200});await page.waitForFunction(()=>{const el=document.querySelector('.dsh-spatial-container');const w=el?.clientWidth??0;return el?.dataset.cols===String(w>=950?12:w>=580?6:2)})
  const cols=Number(await page.locator('.dsh-spatial-container').getAttribute('data-cols'));assert(cols!==12)
  const options=await select('a').locator('option').evaluateAll(nodes=>nodes.map(n=>n.textContent))
  assert.equal(new Set(options).size,options.length)
  assert.equal(await page.locator('.react-resizable-handle').count(),0)
  assert(await page.locator('.dsh-home').evaluate(el=>el.scrollWidth<=el.clientWidth+1))
  assert.deepEqual((await api('workbench.get')).layout,beforeNarrow.layout)
  await page.screenshot({path:new URL(`presets-${cols}cols.png`,out).pathname,fullPage:true})
 }
 checks.push('6/2-column options deduplicated; no page overflow; breakpoint browsing makes no layout writes')
 await page.setViewportSize({width:1600,height:1200});await page.waitForFunction(()=>document.querySelector('.dsh-spatial-container')?.dataset.cols==='12')
 // Exercise a real library drop after policy change, not just fabricated persistence.
 await page.locator('.dsh-edit-bar').getByRole('button',{name:/^(Widgets|小组件)$/}).click();const panel=page.locator('.dsh-library-panel')
 await panel.getByRole('searchbox').fill('recent');const source=panel.locator('[data-widget-type="@vlln/dsh-home:recent"] .dsh-w-title');await source.waitFor()
 await page.locator('.dsh-home').evaluate(el=>{el.scrollTop=0})
 const from=await source.boundingBox(),grid=await page.locator('.dsh-spatial-grid').boundingBox();const beforeDrop=await api('workbench.get')
 // Empty rectangle x4/y4/w8/h8: touches clock's bottom and custom note's right,
 // never below the scrollable canvas or behind the library overlay.
 await page.mouse.move(from.x+8,from.y+8);await page.mouse.down();await page.mouse.move(grid.x+4*((grid.width+12)/12)+65,grid.y+4*56+25,{steps:12});await page.mouse.up()
 await poll(async()=>await page.locator('.dsh-library-ghost').count()===0)
 await poll(async()=>(await api('workbench.get')).instances.length===beforeDrop.instances.length+1)
 const afterDrop=await api('workbench.get'),created=afterDrop.instances.filter(i=>!beforeDrop.instances.some(x=>x.instanceId===i.instanceId))
 assert.equal(created.length,1,'real library drop must create one recent widget')
 const added=afterDrop.layout.positions[12][created[0].instanceId];assert.equal(added.w,8);assert.equal(added.h,8)
 checks.push('real library drag creates one recent widget using host default 8 × 8')
 assert.deepEqual(errors,[])
}catch(error){errors.push(error.stack??String(error));process.exitCode=1;await page?.screenshot({path:new URL('failure.png',out).pathname,fullPage:true}).catch(()=>{})}
finally{await page?.close();if(backup)await api('workbench.set',{instances:backup.instances,layout:backup.layout});if(prefs)await api('prefs.set',{prefs:prefs.prefs});await browser.close();await writeFile(new URL('report.json',out),JSON.stringify({checks,errors},null,2));console.log(out.pathname,JSON.stringify({checks,errors}))}
