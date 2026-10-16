import type {Asset, Plan, Template, TemplateId} from './api'
export function characterLabel(name:string){return name==='猫耳修女'?'可爱大笨蛋（猫耳修女）':name}

export function sortCharacters(names:string[]){
  const order=['北京大学','奶蛙','奶龙（原版）','奶蛋','肥嘟嘟']
  const rank=(name:string)=>order.includes(name)?order.indexOf(name):order.length
  return [...names].sort((a,b)=>rank(a)-rank(b))
}

export function isCutout(asset:Asset){return asset.metadata.is_cutout&&asset.info.has_transparency}
export function originalAssetKey(asset:Asset,all:Asset[]){
  let current=asset;const visited=new Set<string>()
  while(current.metadata.derived_from&&!visited.has(current.id)){
    visited.add(current.id)
    const parent=all.find(a=>a.id===current.metadata.derived_from)
    if(!parent)return current.metadata.derived_from
    current=parent
  }
  return current.id
}
export function balancedAssets(assets:Asset[]){
  const characters=[...new Set(assets.map(a=>a.character))]
  const buckets=characters.map(c=>assets.filter(a=>a.character===c).sort((a,b)=>Number(isCutout(b))-Number(isCutout(a))))
  const result:Asset[]=[]
  for(let i=0;i<Math.max(0,...buckets.map(b=>b.length));i++)for(const bucket of buckets)if(bucket[i])result.push(bucket[i])
  return result
}
export interface TemplateChoice {template:Template; asset:Asset|null; switchAsset:boolean; reason:string}
export function assetSupportsTemplate(asset:Asset,template:Template){
  const layout=template.layout_id||template.id
  return (asset.metadata.templates.includes(template.id)||asset.metadata.templates.includes(layout)||!!template.layout&&asset.metadata.templates.includes('frame'))&&
    (!(template.requires_transparency||layout==='flower')||isCutout(asset))
}
export function templateChoices(assets:Asset[],templates:Template[],plan:Plan|null):TemplateChoice[]{
  const selected=assets.find(a=>a.id===plan?.asset_id)
  return templates.map(template=>{
    const supports=(a:Asset)=>a.metadata.role!=='background'&&(assetSupportsTemplate(a,template)||!!(plan?.emblem&&['personified','symbol'].includes(plan.emblem_mode)&&(template.layout_id||template.id)==='flower'&&a.metadata.templates.includes('flower')))
    if(selected&&supports(selected))return {template,asset:selected,switchAsset:false,reason:''}
    const alternative=assets.find(a=>a.metadata.derived_from===selected?.id&&a.character===selected?.character&&supports(a))||
      assets.find(a=>a.character===selected?.character&&supports(a))
    if(alternative)return {template,asset:alternative,switchAsset:true,reason:isCutout(alternative)?'使用本角色抠图':'切换适配素材'}
    return {template,asset:null,switchAsset:false,reason:template.id==='flower'?'需要透明主体':'当前素材未适配'}
  })
}

export function preferredCharacterAsset(assets:Asset[],character:string,plan:Plan|null,remembered?:string,templates:Template[]=[]){
  const group=assets.filter(a=>a.character===character&&a.metadata.role!=='background')
  const template=templates.find(t=>t.id===plan?.template_id)
  const compatible=(a:Asset)=>!plan||(template?assetSupportsTemplate(a,template):(a.metadata.templates.includes(plan.template_id)&&(plan.template_id!=='flower'||isCutout(a))))
  return group.find(a=>a.id===remembered&&compatible(a))||group.find(a=>isCutout(a)&&compatible(a))||group.find(compatible)||group[0]
}

export function replaceSubject(previous:Plan,asset:Asset,templates:Template[]=[]):Plan{
  const format=asset.info.frames>1?'gif':previous.format
  const template=templates.find(t=>t.id===previous.template_id)
  const compatible=template?assetSupportsTemplate(asset,template):asset.metadata.templates.includes(previous.template_id)&&(previous.template_id!=='flower'||isCutout(asset))
  return {...previous,asset_id:asset.id,
    emblem:previous.emblem_mode==='badge'?previous.emblem:false,
    speaker_name:previous.emblem&&previous.emblem_mode!=='badge'?'':previous.speaker_name,
    format,size:previous.format===format?previous.size:format==='gif'?256:512,
    flip:asset.metadata.existing_text||asset.metadata.allow_flip===false?false:previous.flip,
    text_placement:asset.metadata.existing_text&&!asset.metadata.text_safe_area?'caption':previous.text_placement,
    effect:format==='gif'?(asset.info.frames>1?'none':previous.effect!=='none'?previous.effect:previous.composition?'none':template?.animation||template?.motions?.length?'none':'breathe'):'none',
    template_id:compatible?previous.template_id:(template?.layout_id||previous.template_id)==='flower'?'bottom':asset.metadata.templates[0]||'bottom'}
}
