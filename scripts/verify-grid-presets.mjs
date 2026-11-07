/** Fixed-size widgets in installed private GUI. All disposable records are restored. */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
const url=new URL(process.env.DSH_VERIFY_URL);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'3186')
const out=new URL(`../../.work/dsh-home/evidence/fixed-${Date.now()}/`,import.meta.url);await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1600,height:1200},reducedMotion:'reduce'})
let page,backup,prefs;const errors=[],checks=[]
const api=async(op,extra={})=>{const r=await context.request.post(new URL('/plugins/dsh-home/api',url).href,{headers:{Origin:url.origin},data:{op,...extra}}),j=await r.json();assert(j.ok,JSON.stringify(j));return j.value}
try{
 await context.request.get(url.href);backup=await api('workbench.get');prefs=await api('prefs.get');await writeFile(new URL('backup.json',out),JSON.stringify({backup,prefs},null,2))
 // The fixture writes into the 12-column breakpoint, so pin the board to the default
 // 12 columns instead of inheriting whatever width the station was last left at
 // (another breakpoint's map is intentionally independent and would not hold this id).
 await api('prefs.set',{prefs:{...prefs.prefs,canvasWidth:null}})
 const fixture={instanceId:'fixed-note',typeId:'@vlln/dsh-home:notes',configVersion:2,config:{text:'Fixed-size widget\n\nKeep my original custom dimensions and text.'}}
 const original={x:0,y:0,w:5,h:7},layout={...backup.layout,instanceLayout:true,hidden:backup.instances.map(i=>i.instanceId),order:[...backup.layout.order,fixture.instanceId],positions:{...backup.layout.positions,12:{...backup.layout.positions?.[12],[fixture.instanceId]:original}}}
 await api('workbench.set',{instances:[...backup.instances,fixture],layout})
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
 const home=async()=>{await page.goto(url.href);await page.getByRole('button',{name:/^(Home|首页)$/}).first().click();await page.locator('[data-widget-id="fixed-note"]').waitFor()}
 const widget=()=>page.locator('[data-widget-id="fixed-note"]')
 const colsNow=async()=>Number(await page.locator('.dsh-spatial-container').getAttribute('data-cols'))
 const geometry=async()=>{const cols=await colsNow(),g=await page.locator('.dsh-spatial-grid').boundingBox(),b=await widget().boundingBox(),stride=(g.width+12)/cols;return{x:Math.round((b.x-g.x)/stride),y:Math.round((b.y-g.y)/56),w:Math.round((b.width+12)/stride),h:Math.round((b.height+12)/56)}}
 const noResize=async()=>assert.equal(await page.locator('.dsh-widget-resize-handle,.react-resizable-handle,.dsh-widget-size-select').count(),0)
 await home();await noResize();await page.getByRole('button',{name:/^(Edit layout|编辑布局)$/}).click();await noResize();assert.deepEqual(await geometry(),original)
 checks.push('reading and editing expose no pointer or keyboard resize controls; historical 5×7 retained')
 const before=await geometry(),box=await widget().boundingBox();await page.mouse.move(box.x+box.width-8,box.y+box.height-8);await page.mouse.down();await page.mouse.move(box.x+box.width+100,box.y+box.height+80,{steps:8});await page.mouse.up();assert.deepEqual(await geometry(),before);assert.equal(await page.locator('body.dsh-home-resizing').count(),0)
 checks.push('dragging former bottom-right resize area does not resize or create a gesture')
 await widget().locator('.dsh-tools .dsh-widget-grip').focus();await page.keyboard.press('ArrowRight');await page.getByRole('button',{name:/^(Done|完成)$/}).click();await home();assert.deepEqual(await geometry(),{...original,x:1});assert.deepEqual((await api('workbench.get')).instances.find(i=>i.instanceId===fixture.instanceId),fixture)
 checks.push('keyboard movement and Done/reload preserve width, height and configuration')
 await page.getByRole('button',{name:/^(Edit layout|编辑布局)$/}).click();await page.getByRole('button',{name:/^(Tidy layout|整理布局)$/}).click();await page.getByRole('button',{name:/^(Done|完成)$/}).click();const tidied=await api('workbench.get'),key=String(await colsNow());assert.equal(tidied.layout.positions[key]['fixed-note'].w,5);assert.equal(tidied.layout.positions[key]['fixed-note'].h,7)
 checks.push('explicit tidying preserves original non-default dimensions')
 await page.getByRole('button',{name:/^(Edit layout|编辑布局)$/}).click();await page.screenshot({path:new URL('fixed-wide.png',out).pathname,fullPage:true})
 const beforeNarrow=await api('workbench.get');for(const width of[1050,540]){await page.setViewportSize({width,height:1200});await page.waitForFunction(()=>{const el=document.querySelector('.dsh-spatial-container'),cols=Number(el?.dataset.cols??0),board=el?.clientWidth??0;return cols>=12&&Math.abs(board-(cols*96-12))<2});await noResize();const narrow=await page.evaluate(()=>{const home=document.querySelector('.dsh-home');return{boardScrolls:home.scrollWidth>home.clientWidth+1,documentOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1}});assert(narrow.boardScrolls,'board scrolls at '+width);assert(!narrow.documentOverflow,'document must not overflow at '+width);assert.deepEqual((await api('workbench.get')).layout,beforeNarrow.layout);await page.screenshot({path:new URL(`fixed-${width}.png`,out).pathname,fullPage:true})}
 checks.push('narrow windows keep fixed widget sizes, scroll the board, never overflow the page and do not overwrite saved layouts')
 assert.deepEqual(errors,[])
}catch(error){errors.push(error.stack??String(error));process.exitCode=1;await page?.screenshot({path:new URL('failure.png',out).pathname,fullPage:true}).catch(()=>{})}
finally{await page?.close();if(backup)await api('workbench.set',{instances:backup.instances,layout:backup.layout});if(prefs)await api('prefs.set',{prefs:prefs.prefs});await browser.close();await writeFile(new URL('report.json',out),JSON.stringify({checks,errors},null,2));console.log(out.pathname,JSON.stringify({checks,errors}))}
