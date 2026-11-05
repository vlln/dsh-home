import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { readFile,writeFile } from 'node:fs/promises'
const url=process.env.DSH_VERIFY_URL
assert(url && new URL(url).port==='3186')
const out=new URL('../../.work/dsh-home/evidence/',import.meta.url)
const browser=await chromium.launch({channel:'chrome',headless:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'})
 await page.addLocatorHandler(page.getByRole('button',{name:'Continue',exact:true}),async()=>page.getByRole('button',{name:'Continue',exact:true}).click())
 await page.addLocatorHandler(page.getByRole('heading',{name:/^(Get started|开始使用)$/}),async()=>page.getByRole('button',{name:/^(Close|关闭)$/}).last().click())
 await page.goto(url)
 const open=async()=>{await page.getByRole('button',{name:/^(Home|首页)$/}).first().click();await page.locator('.dsh-spatial-grid').waitFor()}
 await open()
 // Prior failed test runs only introduced our known two-card coordinates and seven hidden fixture IDs.
 // Keep preexisting order/size/focus preferences; remove ONLY test-introduced spatial and hidden values.
 const baseline=JSON.parse(await readFile(new URL('spatial-before-layout.json',out),'utf8'))
 const fixtureIds=new Set(['resume','queue','today','running','areas','rhythm','quick'])
 const restored={...baseline,hidden:baseline.hidden.filter(id=>!fixtureIds.has(id))}
 if(restored.positions){restored.positions={...restored.positions};delete restored.positions['12']}
 await page.evaluate(async layout=>{
  const r=await fetch('/plugins/dsh-home/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({op:'layout.set',layout})});const j=await r.json();if(!j.ok)throw Error('Restore failed')
 },restored)
 await page.reload();await open()
 assert.equal(await page.locator('[data-widget-id]').count(),9)
 await page.getByRole('button',{name:/^(Edit layout|编辑布局)$/}).click()
 await page.screenshot({path:new URL('spatial-all-widgets.png',out).pathname,fullPage:true})
 await page.keyboard.press('Escape');await page.locator('.dsh-home[data-editing=false]').waitFor()
 for(const width of [920,540]){
  await page.setViewportSize({width,height:1000})
  await page.locator('.dsh-spatial-container').evaluate(el=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  const overflow=await page.locator('.dsh-home').evaluate(el=>el.scrollWidth>el.clientWidth+1)
  assert(!overflow,'No horizontal overflow at '+width)
  await page.screenshot({path:new URL(`spatial-width-${width}.png`,out).pathname,fullPage:true})
 }
 console.log('PASS restored nine widgets and preserved legacy preferences; responsive 920/540 widths do not overflow')
 await writeFile(new URL('spatial-responsive-report.json',out),JSON.stringify({allWidgets:9,widths:[920,540],overflow:false},null,2))
}finally{await browser.close()}
