import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nearestResizeChoice } from '../src/client/resize-model.ts'
import { normalizeWidgetSizing, projectedWidgetPresets } from '../src/client/widget-sizing.ts'
test('resize snaps to complete widget declarations, never a bounds cross product',()=>{
 const sizing=normalizeWidgetSizing({default:{w:4,h:6},supported:[{w:4,h:6},{w:6,h:7},{w:8,h:8},{w:8,h:12}]})
 const choices=projectedWidgetPresets(sizing,12)
 for(let w=1;w<14;w+=.3)for(let h=2;h<16;h+=.4){const result=nearestResizeChoice(choices,w,h,96);assert.ok(choices.includes(result));assert.notDeepEqual({w:result.w,h:result.h},{w:6,h:8})}
 assert.equal(nearestResizeChoice(choices,6.1,7.1,96).w,6)
 assert.equal(nearestResizeChoice(choices,5.4,6.7,96).h,7)
})
test('pixel distance and equal-distance prior selection keep discrete corner snapping stable',()=>{
 const options=[{preset:{w:4,h:6},w:4,h:6},{preset:{w:6,h:6},w:6,h:6}]
 assert.strictEqual(nearestResizeChoice(options,5,6,100,{w:6,h:6}),options[1])
 assert.strictEqual(nearestResizeChoice(options,5,6,100),options[0])
 assert.equal(nearestResizeChoice([],1,1,100),undefined)
})
