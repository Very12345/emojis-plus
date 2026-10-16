import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {makePlan,type Plan} from '../src/api'
import {applyTemplatePlan} from '../src/local/plans'
import {buildScene,primitive} from '../src/render/scene'
import type {Catalog,RuntimeTemplate} from '../src/local/types'

const catalog:Catalog=JSON.parse(await fs.readFile('public/library/catalog.json','utf8'))
const asset=catalog.assets.find(a=>a.info.has_transparency&&a.character==='Meowl')!
const scene=(p:Plan,t?:RuntimeTemplate)=>buildScene(Array.from({length:p.characters.length+1},(_,actor)=>({width:90,height:120,actor})),p,t||catalog.templates.find(t=>t.id===p.template_id)!,catalog.effects,.137,400,320,2000)
const plan=(count:number,id?:string)=>applyTemplatePlan(catalog,id||({2:'cast-duo',4:'cast-quad',6:'cast-six'}as Record<number,string>)[count],{...makePlan(asset),format:'gif'},count)

test('shared extra motions animate every actor in classic and choreography templates',()=>{
 for(const count of [2,4,6])for(const animated of [false,true])for(const effect of ['shake','breathe','bounce','stretch','rotate','move','spin'])for(const useArray of [false,true]){
  const id=animated?catalog.templates.find(t=>t.category_id===(count===2?'duo':'ensemble'))!.id:undefined,p=plan(count,id),base=scene(p),changed=scene({...p,effect:useArray?'none':effect,effects:useArray?[effect]:[]})
  assert.equal(changed.sprites.length,count)
  for(let i=0;i<count;i++)assert.notDeepEqual(changed.sprites.find(s=>s.image.actor===i)!.matrix,base.sprites.find(s=>s.image.actor===i)!.matrix,`${count} actors, ${id||'classic'}, ${effect}, actor ${i+1}`)
 }
})
test('wave copies include all actors and retain each actors own appearance',()=>{
 for(const count of [2,4,6])for(const animated of [false,true]){const id=animated?catalog.templates.find(t=>t.category_id===(count===2?'duo':'ensemble'))!.id:undefined,p={...plan(count,id),effect:'wave_copy',copies:4},s=scene(p);assert.equal(s.sprites.length,count*4);for(let actor=0;actor<count;actor++)assert.equal(s.sprites.filter(s=>s.image.actor===actor).length,4)}
})
test('per-actor motions add to shared motions and duplicate effects use actor parameters once',()=>{
 const p=plan(2),common={...p,effect:'breathe'},own={...common,characters:p.characters.map(c=>({...c,effect:'spin',speed:2}))},a=scene(common),b=scene(own)
 assert.deepEqual(a.sprites[0].matrix,b.sprites[0].matrix)
 assert.notDeepEqual(a.sprites[1].matrix,b.sprites[1].matrix)
 const same=scene({...p,effect:'spin',characters:p.characters.map(c=>({...c,effect:'spin',speed:2,strength:.8}))})
 const reference=scene({...p,effect:'spin',speed:2,strength:.8})
 assert.deepEqual(same.sprites[1].matrix,reference.sprites[1].matrix)
 const isolated=scene({...p,characters:p.characters.map(c=>({...c,effect:'spin'}))}),still=scene(p)
 assert.deepEqual(isolated.sprites[0].matrix,still.sprites[0].matrix)
 assert.notDeepEqual(isolated.sprites[1].matrix,still.sprites[1].matrix)
})
test('registered subject motions reach all actors and their switch remains independent of extras',()=>{
 const p=plan(4),template={...catalog.templates.find(t=>t.id===p.template_id)!,motions:[{effect_id:'breathe',target:'subject',strength:1,speed:1}]},moving=scene(p,template),still=scene({...p,template_motion:false},template)
 for(let i=0;i<4;i++)assert.notDeepEqual(moving.sprites[i].matrix,still.sprites[i].matrix)
 const extra=scene({...p,template_motion:false,effect:'rotate'},template)
 for(let i=0;i<4;i++)assert.notDeepEqual(extra.sprites[i].matrix,still.sprites[i].matrix)
})
