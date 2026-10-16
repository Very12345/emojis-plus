import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {createCanvas,GlobalFonts} from '@napi-rs/canvas'
import {makePlan} from '../src/api'
import {validatePlan,applyTemplatePlan} from '../src/local/plans'
import {textLayout,fitTextRect,prepareRenderer} from '../src/render/core'
import {setElementFont,transformElement,setElementText,resetElement,panBackground} from '../src/editor/model'
import type {Catalog,DecodedSource} from '../src/local/types'
const catalog:Catalog=JSON.parse(await fs.readFile('public/library/catalog.json','utf8'))
for(const [id,file]of Object.entries({sans:'NotoSansSC.ttf',serif:'NotoSerifSC.ttf',kuaile:'ZCOOLKuaiLe-Regular.ttf',xiaowei:'ZCOOLXiaoWei-Regular.ttf',qingke:'ZCOOLQingKeHuangYou-Regular.ttf',mashan:'MaShanZheng-Regular.ttf',longcang:'LongCang-Regular.ttf'}))GlobalFonts.registerFromPath('assets/fonts/'+file,'ep-'+id)
const asset=catalog.assets.find(a=>a.character==='Meowl'&&a.info.has_transparency)!,factory=(w:number,h:number)=>createCanvas(Math.round(w),Math.round(h)),subject=factory(60,90),ctx=subject.getContext('2d');ctx.fillStyle='#ed2020';ctx.fillRect(0,0,60,90)
const source:DecodedSource={frames:[subject],delays:[100],loop:0,width:60,height:90}
function render(p:ReturnType<typeof makePlan>){const input={plan:p,template:catalog.templates.find(t=>t.id===p.template_id)!,assets:catalog.assets,fonts:catalog.fonts,effects:catalog.effects,base:''};return prepareRenderer(input,[source,...p.characters.map(()=>source)],factory)}
test('fixed font size stays exact when newlines are added at 256 and 512',()=>{
 for(const size of [256,512]as const)for(const font of catalog.fonts){const p={...makePlan(asset),size,font_family:font.id,font_size:38},canvas=factory(size,size),ctx=canvas.getContext('2d'),rect:[number,number,number,number]=[size*.08,size*.84,size*.84,size*.11]
  const one=fitTextRect(ctx,'今天，一起去上课。',p,rect),two=fitTextRect(ctx,'今天，一起去上课。\nAgjpqy 123，明天再见。',p,rect)
  assert.equal(textLayout(ctx,'今天，一起去上课。',p,one).size,38*size/512)
  assert.equal(textLayout(ctx,'今天，一起去上课。\nAgjpqy 123，明天再见。',p,two).size,38*size/512)
  assert(two[3]>one[3]);assert(two[1]+two[3]<=size+.1)
 }
})
test('shrink mode is opt-in and oversized fixed text reports a useful error',()=>{
 const p={...makePlan(asset),font_size:160},ctx=factory(512,512).getContext('2d'),rect:[number,number,number,number]=[20,420,460,60]
 assert(textLayout(ctx,'今天我们一起去上课', {...p,text_fit:'shrink'},rect).size<160)
 assert.equal(textLayout(ctx,'今天我们一起去上课',p,rect).size,160)
 assert.throws(()=>fitTextRect(ctx,'一'.repeat(160),p,rect),/超出画布/)
})
test('independent text layers keep their own typography and position in both formats',()=>{
 for(const format of ['jpg','gif']as const){const p={...makePlan(asset),format,text:'主文案',text_layers:[{id:'first',text:'第二句\n第二行',x:.1,y:.1,width:.8,height:.16,font_size:42},{id:'second',text:'第三句',x:.2,y:.4,width:.6,height:.12,font_size:28,font_family:'serif'as const,text_color:'#bb2020'}]};validatePlan(p,catalog);const r=render(p),first=r.elements.find(e=>e.id==='layer:first')!,second=r.elements.find(e=>e.id==='layer:second')!;assert.equal(first.actualFontSize,42);assert.equal(second.actualFontSize,28);const moved=transformElement(p,first,'move',25,35);assert.equal(moved.text_layers![1].x,p.text_layers[1].x);assert.equal(moved.text_layers![0].x,first.rect[0]/p.size+25/p.size);const changed=setElementFont(moved,first,60);assert.equal(changed.text_layers![0].font_size,60);assert.equal(changed.text_layers![1].font_size,28);assert.equal(setElementText(changed,second,'只修改第三句').text,'主文案');r.draw(r.poster)}
})
test('direct manipulation geometry matches actual actor pixels and leaves other actors alone',()=>{
 const p={...makePlan(asset),text:''},initial=render(p),actor=initial.elements.find(e=>e.id==='actor:0')!,moved=transformElement(p,actor,'move',-40,20),r=render(moved),element=r.elements.find(e=>e.id==='actor:0')!;assert(Math.abs(element.rect[0]-actor.rect[0]+40)<.01);assert(Math.abs(element.rect[1]-actor.rect[1]-20)<.01)
 const data=r.draw(r.poster).getContext('2d').getImageData(0,0,512,512).data;let left=512,right=0,top=512,bottom=0;for(let y=0;y<512;y++)for(let x=0;x<512;x++){const i=(y*512+x)*4;if(data[i]>150&&data[i+1]<90&&data[i+2]<90){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}assert(Math.abs(left-element.rect[0])<2);assert(Math.abs(top-element.rect[1])<2);assert(Math.abs(right+1-element.rect[0]-element.rect[2])<2);assert(Math.abs(bottom+1-element.rect[1]-element.rect[3])<2)
 const duo=applyTemplatePlan(catalog,'cast-duo',p),before=render(duo),one=before.elements.find(e=>e.id==='actor:1')!,after=render(transformElement(duo,one,'scale',40,40));assert.deepEqual(after.elements.find(e=>e.id==='actor:0')!.rect,before.elements.find(e=>e.id==='actor:0')!.rect);assert.notDeepEqual(after.elements.find(e=>e.id==='actor:1')!.rect,one.rect)
 assert.equal(resetElement(moved,element).actor_transforms?.[0],undefined)
})
test('free layout validates IDs and survives export size changes; background pan stays covered',()=>{
 const p={...makePlan(asset),text_boxes:{text:{x:.1,y:.7,width:.8,height:.1,font_size:40}},text_layers:[{id:'a',text:'独立',x:.2,y:.1,width:.6,height:.1,font_size:32}]};validatePlan(p,catalog);assert.throws(()=>validatePlan({...p,text_layers:[...p.text_layers,...p.text_layers]},catalog),/文字层/);assert.throws(()=>validatePlan({...p,text_layers:[{...p.text_layers[0],x:NaN}]},catalog),/文字层/)
 const a=render({...p,size:256}),b=render({...p,size:512});assert.equal(a.elements.find(e=>e.id==='layer:a')!.rect[0]/256,b.elements.find(e=>e.id==='layer:a')!.rect[0]/512)
 const bg=panBackground({...p,background_zoom:2},100,-100,512,512);assert(bg.background_pan_x!>=0&&bg.background_pan_x!<=1);assert(bg.background_pan_y!>=0&&bg.background_pan_y!<=1)
})
