import {actorIds,eventHandlers,reconcileBindings} from '../themes/plans'
import type {Asset,Plan} from '../api'
import {makePlan} from '../api'
import {assetSupportsTemplate} from '../library'
import {preferredMaterial} from '../materials'
import type {Catalog,RuntimeTemplate} from './types'

export function slots(count:number){
 const positions=count===1?[[.5,.5]]:count===2?[[.27,.63],[.73,.63]]:count===3?[[.2,.63],[.5,.63],[.8,.63]]:count===4?[[.27,.29],[.73,.29],[.27,.73],[.73,.73]]:count===5?[[.2,.28],[.5,.28],[.8,.28],[.34,.73],[.66,.73]]:[[.19,.28],[.5,.28],[.81,.28],[.19,.73],[.5,.73],[.81,.73]]
 const scale=({1:1,2:.46,3:.32,4:.39,5:.31,6:.29}as Record<number,number>)[count]
 return positions.map(([x,y])=>({x,y,scale,rotation:0}))
}
export function chooseSubject(assets:Asset[],character='',preferred='',used:string[]=[]){
 const group=assets.filter(a=>preferredMaterial(a)&&a.metadata.role!=='background'&&(!character||a.character===character))
 return group.find(a=>a.id===preferred)||group.find(a=>!used.includes(a.character)&&!['北京大学','清华大学'].includes(a.character)&&a.info.has_transparency)||group.find(a=>a.info.has_transparency)||group[0]
}
export function applyTemplatePlan(catalog:Catalog,id:string,base:Plan,count?:number,additional:string[]=[],defaults=false):Plan{
 const template=catalog.templates.find(t=>t.id===id&&t.enabled);if(!template)throw Error('模板不存在或已停用。')
 let primary=catalog.assets.find(a=>a.id===base.asset_id);if(!primary)throw Error('主体素材不存在。')
 const compatible=catalog.assets.filter(a=>a.character===primary!.character&&assetSupportsTemplate(a,template))
 if(!assetSupportsTemplate(primary,template))primary=compatible.find(a=>a.metadata.derived_from===primary!.id)||chooseSubject(compatible,primary.character)
 if(!primary)throw Error('当前角色没有适配素材，请选择透明版。')
 const oldIds=actorIds(base)
 const others=[...base.characters.map((c,i)=>({...c,id:oldIds[i+1]})),...additional.map(asset_id=>({id:crypto.randomUUID(),asset_id,x:.5,y:.5,scale:.5,rotation:0,flip:false,opacity:1,effect:'none',strength:.5,speed:1}))]
 const desired=count??Math.min(template.max_characters||6,Math.max(template.min_characters||1,template.cast?.length||0,others.length+1))
 if(!Number.isInteger(desired)||desired<1||desired>6)throw Error('画面支持1—6个人物。')
 if(desired<(template.min_characters||1)||desired>(template.max_characters||6))throw Error('人物数量不符合模板要求。')
 const cast=others.slice(0,desired-1),used=[primary.character,...cast.map(c=>catalog.assets.find(a=>a.id===c.asset_id)?.character||'')]
 while(cast.length<desired-1){const other=chooseSubject(catalog.assets,'','',used);if(!other)throw Error('缺少可用人物。');cast.push({id:crypto.randomUUID(),asset_id:other.id,x:.5,y:.5,scale:.5,rotation:0,flip:false,opacity:1,effect:'none',strength:.5,speed:1});used.push(other.character)}
 const positions=template.cast?.length===desired?template.cast:slots(desired)
 cast.forEach((layer,i)=>{let a=catalog.assets.find(a=>a.id===layer.asset_id);if(!a)throw Error('同框素材不可用。');if(template.requires_transparency&&!a.info.has_transparency){a=chooseSubject(catalog.assets.filter(v=>v.info.has_transparency),a.character);if(!a)throw Error('同框人物需要透明素材。');layer.asset_id=a.id}Object.assign(layer,positions[i+1]);if(a.metadata.allow_flip===false||a.metadata.existing_text)layer.flip=false})
 const result={...base,...(defaults?template.defaults:{}),asset_id:primary.id,template_id:id,...(id!==base.template_id?{composition:undefined,narrative:undefined,prop_layers:base.prop_layers?.filter(l=>l.origin!=='theme')}:{}),emblem:false,chat_layout:id===base.template_id&&desired===base.characters.length+1?base.chat_layout:undefined,characters:cast,primary_x:positions[0].x,primary_y:positions[0].y,primary_scale:positions[0].scale,rotation:positions[0].rotation,actor_transforms:undefined,...(id!==base.template_id?{text_boxes:undefined}:{})}
 if(!template.supports_embedded)result.text_placement='caption'
 if(primary.metadata.allow_flip===false||primary.metadata.existing_text)result.flip=false
 if(defaults){if(!result.text.trim())result.text=template.sample.text||'';if(!result.secondary_text.trim())result.secondary_text=template.sample.secondary_text||''}
 return reconcileBindings(result)
}
export function resolvePresets(catalog:Catalog){
 const names=new Map(catalog.categories.map(c=>[c.id,c.name])),replacements=new Map((catalog.curation?.archived||[]).map((r:any)=>[r.id,r.replacement]))
 return catalog.presets.flatMap(raw=>{
  const template=catalog.templates.find(t=>t.id===raw.plan.template_id&&t.enabled);if(!template)return []
  const preferred=String(replacements.get(raw.selector.asset_id)||raw.selector.asset_id||'')
  const asset=chooseSubject(catalog.assets.filter(a=>assetSupportsTemplate(a,template)),raw.selector.character,preferred);if(!asset)return []
  let plan={...makePlan(asset),...template.defaults,...raw.plan,asset_id:asset.id,emblem:false}as Plan
  if(raw.id==='school-actor')plan.asset_id='pku-person-welcome'
  if(raw.id==='school-message')plan.asset_id='pku-logo-avatar'
  if(raw.cast?.length)plan.characters=raw.cast.map((s:any)=>{const a=chooseSubject(catalog.assets,s.character,s.asset_id);if(!a)throw Error('缺少组合人物。');return {asset_id:a.id,x:.5,y:.5,scale:.5,rotation:0,flip:false,opacity:1,effect:'none',strength:.5,speed:1}})
  if(template.cast?.length||raw.cast?.length)plan=applyTemplatePlan(catalog,template.id,plan)
  return [{...raw,plan,category_id:template.category_id,subcategory_id:template.subcategory_id,subcategory_name:names.get(template.subcategory_id),tags:template.tags,animation:template.animation,preview_url:''}]
 })
}
export function validatePlan(plan:Plan,catalog:Catalog){
 const t=catalog.templates.find(t=>t.id===plan.template_id&&t.enabled),a=catalog.assets.find(a=>a.id===plan.asset_id&&a.enabled)
 if(!t||!a||a.metadata.role==='background'||!assetSupportsTemplate(a,t))throw Error('素材或模板不可用，请重新选择。')
 if(typeof plan.text!=='string'||typeof plan.secondary_text!=='string'||[...plan.text].length>160||[...plan.secondary_text].length>100)throw Error('文字格式无效或超出长度限制。')
 if(!['jpg','gif'].includes(plan.format)||![256,512].includes(plan.size))throw Error('不支持的导出格式或尺寸。')
 const count=plan.characters.length+1;if(count<(t.min_characters||1)||count>(t.max_characters||6))throw Error('人物数量不符合模板要求。')
 if(plan.chat_layout){const c=plan.chat_layout;if(!['reaction','duo','group','chase'].includes(c.mode)||typeof c.motion!=='boolean'||!Number.isInteger(c.chaser)||c.chaser<0||c.chaser>=count||c.mode==='chase'&&count!==2||t.layout_id!=='scene')throw Error('聊天构图模式、人数或追赶者无效。')}
 if(a.metadata.existing_text&&plan.text_placement==='embedded'&&!a.metadata.text_safe_area)throw Error('带字底图请使用图外配字。')
 if(plan.flip&&(a.metadata.allow_flip===false||a.metadata.existing_text))throw Error('该素材需要保持原方向。')
 const effects=new Set(['none',...catalog.effects.map(e=>e.id)])
 if(!effects.has(plan.effect)||plan.effects.some(e=>!effects.has(e))||new Set([plan.effect,...plan.effects].filter(e=>e!=='none')).size>4)throw Error('动效无效或超过四种。')
 for(const c of plan.characters){const other=catalog.assets.find(a=>a.id===c.asset_id&&a.enabled);if(!other||other.metadata.role==='background'||t.requires_transparency&&!other.info.has_transparency)throw Error('同框素材不适用，请选择透明主体。');if(c.flip&&(other.metadata.existing_text||other.metadata.allow_flip===false))throw Error('同框素材需要保持原方向。');if(!effects.has(c.effect))throw Error('同框动效无效。')}
 if(plan.background_style==='image'&&!catalog.assets.some(a=>a.id===plan.background_asset_id&&a.metadata.role==='background'))throw Error('背景不可用。')
 const ranges:Record<string,[number,number]>={font_size:[8,160],letter_spacing:[0,.3],line_spacing:[1.1,2],text_x:[-1,1],text_y:[-1,1],strength:[0,1],zoom:[.5,1.8],speed:[.25,2],rotation:[-180,180],copies:[2,8],petals:[4,10],primary_x:[0,1],primary_y:[0,1],primary_scale:[.1,1.5],template_speed:[.25,2],template_strength:[0,1]}
 for(const [key,[min,max]]of Object.entries(ranges)){const v=(plan as any)[key];if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('参数超出范围：'+key)}
 for(const c of plan.characters)for(const [key,min,max]of [['x',0,1],['y',0,1],['scale',.1,1.5],['rotation',-180,180],['opacity',.1,1],['strength',0,1],['speed',.25,2]]as const){if(!Number.isFinite(c[key])||c[key]<min||c[key]>max)throw Error('同框人物参数超出范围。')}
 for(const color of [plan.background,plan.background_secondary,plan.text_color,plan.prop_color])if(!/^#[0-9a-f]{6}$/i.test(color))throw Error('颜色格式无效。')
 if(!['sans','serif','kuaile','xiaowei','qingke','mashan','longcang'].includes(plan.font_family||'sans'))throw Error('字体无效。')
 const enums:Record<string,string[]>={background_style:['solid','gradient','paper','rays','image'],text_placement:['caption','embedded'],font_style:['plain','bold','outline','sticker','handwritten','stamp','shadow'],text_layout:['horizontal','vertical','staggered'],text_backdrop:['auto','none','light','dark'],emblem_mode:['badge','speaker','personified','symbol']}
 for(const [key,values]of Object.entries(enums))if(!values.includes((plan as any)[key]))throw Error('不支持的参数：'+key)
 if(![1,-1].includes(plan.template_direction)||!Number.isInteger(plan.copies)||!Number.isInteger(plan.petals))throw Error('方向或复制数量无效。')
 const number=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max
 if(plan.primary_motion&&(!effects.has(plan.primary_motion.effect)||['typewriter','wave_copy'].includes(catalog.effects.find(e=>e.id===plan.primary_motion!.effect)?.handler||'')||!number(plan.primary_motion.strength,0,1)||!number(plan.primary_motion.speed,.25,2)))throw Error('主角色个人动作参数无效。')
 const validBox=(b:any)=>b&&number(b.x,0,1)&&number(b.y,0,1)&&number(b.width,.01,1)&&number(b.height,.01,1)&&b.x+b.width<=1.001&&b.y+b.height<=1.001&&(b.font_size===undefined||number(b.font_size,8,160))&&(b.rotation===undefined||number(b.rotation,-180,180))&&(b.fit===undefined||['fixed','shrink'].includes(b.fit))
 for(const [key,b]of Object.entries(plan.text_boxes||{}))if(!['text','secondary_text'].includes(key)||!validBox(b))throw Error('文字框位置或字号无效。')
 if(plan.text_fit!==undefined&&!['fixed','shrink'].includes(plan.text_fit))throw Error('文字适应模式无效。')
 if(plan.text_layers!==undefined){if(!Array.isArray(plan.text_layers)||plan.text_layers.length>10)throw Error('最多添加10个独立文字层。');const ids=new Set();for(const layer of plan.text_layers){if(!validBox(layer)||typeof layer.id!=='string'||!/^[-\w]{1,80}$/.test(layer.id)||ids.has(layer.id)||typeof layer.text!=='string'||[...layer.text].length>160||layer.text_color!==undefined&&!/^#[0-9a-f]{6}$/i.test(layer.text_color)||layer.font_family&&!['sans','serif','kuaile','xiaowei','qingke','mashan','longcang'].includes(layer.font_family))throw Error('独立文字层参数无效。');ids.add(layer.id)}}
 for(const [key,a]of Object.entries(plan.actor_transforms||{}))if(!/^[0-5]$/.test(key)||Number(key)>=count||!a||!number(a.x,0,1)||!number(a.y,0,1)||!number(a.scale,.15,4)||!number(a.rotation,-180,180))throw Error('角色自由布局参数无效。')
 if(plan.background_zoom!==undefined&&!number(plan.background_zoom,1,3)||plan.background_pan_x!==undefined&&!number(plan.background_pan_x,0,1)||plan.background_pan_y!==undefined&&!number(plan.background_pan_y,0,1))throw Error('背景裁切参数无效。')
 const color=(v:any)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)
 const style=(v:any)=>{if(v.text_color!==undefined&&!color(v.text_color)||v.emphasis!==undefined&&(!Array.isArray(v.emphasis)||v.emphasis.length>12||v.emphasis.some((m:any)=>typeof m.text!=='string'||m.text.length>80||!color(m.color)||typeof m.bold!=='boolean'))||v.font_style!==undefined&&!enums.font_style.includes(v.font_style)||v.text_backdrop!==undefined&&!enums.text_backdrop.includes(v.text_backdrop)||v.letter_spacing!==undefined&&!number(v.letter_spacing,0,.3)||v.line_spacing!==undefined&&!number(v.line_spacing,1.1,2)||v.stage!==undefined&&!['all','setup','event','reaction'].includes(v.stage)||v.role!==undefined&&!['speech','thought','narration','punchline'].includes(v.role)||v.font_family&&!['sans','serif','kuaile','xiaowei','qingke','mashan','longcang'].includes(v.font_family))throw Error('文字层样式无效。')}
 for(const v of [...Object.values(plan.text_boxes||{}),...plan.text_layers||[]])style(v)
 const ids=actorIds(plan);if(new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(id)))throw Error('人物标识无效或重复。')
 if(plan.composition){const c=plan.composition;if(!catalog.themes?.some(t=>t.id===c.theme_id&&t.enabled)||!catalog.compositions?.some(v=>v.id===c.composition_id&&v.theme_id===c.theme_id&&v.enabled)||!number(c.brightness,.4,1.5)||!number(c.blur,0,12)||!number(c.tint,0,.5)||!number(c.detail,0,1))throw Error('主题构图参数无效。')}
 if(plan.narrative){const n=plan.narrative;if(!number(n.speed,.67,2)||!number(n.strength,0,1)||!number(n.duration_ms,1000,6000)||!eventHandlers.has(n.event_id)||!['cut','fade'].includes(n.transition)||[n.setup,n.event,n.reaction].some(v=>typeof v!=='string'||[...v].length>160))throw Error('阶段叙事参数无效。')}
 if(plan.prop_layers){if(!Array.isArray(plan.prop_layers)||plan.prop_layers.length>24)throw Error('最多24个道具。');const used=new Set();for(const l of plan.prop_layers){if(used.has(l.id)||typeof l.id!=='string'||!/^[-\w]{1,100}$/.test(l.id)||!catalog.props?.some(v=>v.id===l.prop_id&&v.enabled)||l.actor_id&&!ids.includes(l.actor_id)||!number(l.x,-2,2)||!number(l.y,-2,2)||!number(l.width,.02,2)||!number(l.height,.02,2)||!number(l.rotation,-180,180)||!number(l.z,-50,100)||!color(l.color)||l.stage&&!['all','setup','event','reaction'].includes(l.stage))throw Error('道具引用、绑定或参数无效。');if(l.text_id&&!['text','secondary_text',...(plan.text_layers||[]).map(t=>'layer:'+t.id)].includes(l.text_id))throw Error('气泡绑定的文字层不存在。');used.add(l.id)}}
 return {template:t,asset:a}
}
