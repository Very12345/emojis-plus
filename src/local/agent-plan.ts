import {makePlan,type Plan} from '../api'
import type {Catalog} from './types'
import {applyComposition} from '../themes/plans'
import {applyTemplatePlan,validatePlan} from './plans'
export function composeAgentPlan(c:Catalog,data:any):Plan {
 const asset=c.assets.find(a=>a.id===(data.asset_id||data.plan?.asset_id)&&a.enabled&&a.metadata.role!=='background');if(!asset)throw Error('compose 需要有效的 asset_id 或 plan。')
 let p={...makePlan(asset),...data.plan,text:data.text??data.plan?.text??asset.metadata.examples[0]??'',secondary_text:data.secondary_text??data.plan?.secondary_text??'',format:data.format||data.plan?.format||'jpg',size:data.size||data.plan?.size||256}as Plan
 if(data.characters){if(!Array.isArray(data.characters)||data.characters.length>5)throw Error('最多添加5个同框人物。');p.characters=data.characters.map((a:string,i:number)=>({id:'agent-'+i,asset_id:a,x:.5,y:.5,scale:.4,rotation:0,flip:false,opacity:1,effect:'none',strength:.5,speed:1}))}
 if(data.composition_id)p=applyComposition(c,data.composition_id,p,!!data.full_sample)
 else if(data.template_id||p.characters.length)p=applyTemplatePlan(c,data.template_id||'scene',p,p.characters.length+1)
 p={...p,...data.options};validatePlan(p,c);return p
}
