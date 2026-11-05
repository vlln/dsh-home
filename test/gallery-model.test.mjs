import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { filterWidgetDefinitions, galleryText, isBuiltinDefinition } from '../src/client/gallery-model.ts'
import { HomeWidgetRegistry } from '../src/client/widget-registry.ts'
function definition(typeId, title, description='', source='') {
 return {typeId,title,description,source,apiVersion:1,configVersion:1,Content:()=>null, defaultConfig:()=>({}), validateConfig:()=>true}
}
const definitions = [definition('@vlln/dsh-home:notes',()=> '便笺 Notes','Keep plain text','@vlln/dsh-home'),definition('@acme/weather:forecast','天气 Weather','Local forecast','Acme')]
test('gallery search matches localized title, source, id, description and AND tokens',()=>{
 for(const search of ['便笺','notes','plain text','@vlln/dsh-home:notes'])assert.equal(filterWidgetDefinitions(definitions,search,'all')[0],definitions[0])
 assert.equal(filterWidgetDefinitions(definitions,' weather  acme ','all')[0],definitions[1])
 assert.equal(filterWidgetDefinitions(definitions,'notes weather','all').length,0)
 assert.equal(filterWidgetDefinitions(definitions,'   ','all').length,2)
 assert.equal(filterWidgetDefinitions(definitions,'none','all').length,0)
})
test('gallery source filters use registered identity, not claimed source strings',()=>{
 assert.equal(isBuiltinDefinition(definitions[0]),true)
 assert.equal(isBuiltinDefinition(definitions[1]),false)
 assert.deepEqual(filterWidgetDefinitions(definitions,'','builtin'),[definitions[0]])
 assert.deepEqual(filterWidgetDefinitions(definitions,'','extension'),[definitions[1]])
})
test('bad metadata callback is isolated and does not mount Content or config factories',()=>{
 let calls=0
 const broken={...definitions[0],title:()=>{throw Error('fail')},defaultConfig:()=>{calls++;return{}},Content:()=>{calls++}}
 assert.equal(galleryText(broken.title,'fallback'),'fallback')
 assert.equal(filterWidgetDefinitions([broken],'notes','all').length,1)
 assert.equal(calls,0)
})
test('registry accepts optional static preview without mounting it and rejects invalid preview',()=>{
 const registry=new HomeWidgetRegistry();let calls=0
 const Preview=()=>{calls++;return null}
 const d={...definition('@test/pkg:preview','Preview'),description:'Sample',source:'test',Preview}
 registry.register(d);assert.equal(registry.get(d.typeId).Preview,Preview);assert.equal(calls,0)
 assert.throws(()=>new HomeWidgetRegistry().register({...d,Preview:'bad'}),/Preview/)
 const legacy={...d,typeId:'@test/pkg:no-preview'};delete legacy.Preview
 registry.register(legacy);assert.equal(registry.get(legacy.typeId).Preview,undefined)
})
test('gallery uses isolated real Content preview and wide desktop has no fixed content cap',()=>{
 const gallery=readFileSync(new URL('../src/client/widget-gallery.tsx',import.meta.url),'utf8')
 assert.ok(!gallery.includes('definition.Content'))
 assert.ok(!gallery.includes('defaultConfig('))
 assert.match(gallery,/<WidgetPreview definition=/)
 assert.ok(!gallery.includes('onAdd'))
 const styles=readFileSync(new URL('../src/client/styles.ts',import.meta.url),'utf8')
 assert.match(styles,/\.dsh-home-inner \{ width: 100%; max-width: none; min-width: 0; flex: none;/)
})
