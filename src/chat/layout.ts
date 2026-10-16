import type {Plan} from '../api'
export type ChatMode=NonNullable<Plan['chat_layout']>['mode']
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v))
const lines=(text:string,font:number,width=.92)=>text.split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil([...line].reduce((w,ch)=>w+(/[\u0000-\u00ff]/.test(ch)?.55:1),0)/Math.max(1,width*512/font))),0)
export function chatRegions(p:Plan,useBoxes=false){
 const mainFont=p.text_boxes?.text?.font_size??p.font_size,topFont=p.text_boxes?.secondary_text?.font_size??p.font_size;
 const main=p.text?clamp(lines(p.text,mainFont)*mainFont/512*(p.text_boxes?.text?.line_spacing??p.line_spacing)+.02,.13,.38):0;
 const topText=[p.secondary_text,p.narrative?.enabled?p.narrative.event:''].sort((a,b)=>(b?.length||0)-(a?.length||0))[0]||'',top=topText?clamp(lines(topText,topFont)*topFont/512*1.18+.02,.105,.22):0;
 const y=.025+(top?(useBoxes&&p.text_boxes?.secondary_text?p.text_boxes.secondary_text.y+p.text_boxes.secondary_text.height:top)+.025:0),bottom=main&&useBoxes&&p.text_boxes?.text?p.text_boxes.text.y-.012:1-.025-(main?main+.012:0);
 return {image:[.035,y,.93,Math.max(.28,bottom-y)]as [number,number,number,number],text:{x:.04,y:1-.025-main,width:.92,height:main||.13},secondary:{x:.05,y:.025,width:.90,height:top||.105}}
}
export function chatReady(p:Plan,mode?:ChatMode,chaser=1):Plan{
 const count=p.characters.length+1,kind=mode||(count===1?'reaction':count===2?'duo':'group');
 if(kind==='chase'&&(count!==2||![0,1].includes(chaser)))throw Error('追逐打闹需要两个人物，并指定追赶者为0或1。')
 if(Object.entries(p.element_states||{}).some(([id,v])=>v.locked&&(/^(actor:|text$|secondary_text$)/.test(id)))||p.text_boxes?.text?.locked||p.text_boxes?.secondary_text?.locked)throw Error('请先解锁人物或主副文案，再重新安排聊天构图。')
 let next=structuredClone(p);const font=[...p.text].length>24?48:56;
 next={...next,template_id:next.composition?'scene':(['top','bottom','scene','frame','cast-duo','cast-dialogue','cast-trio','cast-quad','cast-six'].includes(next.template_id)?'scene':next.template_id),font_size:font,font_style:'bold',text_color:'#15231d',letter_spacing:0,line_spacing:1.16,text_fit:'fixed',text_placement:'caption',actor_transforms:undefined};
 if(kind==='chase')next.template_id='scene';
 if(next.template_id!=='scene'&&!next.composition)return {...next,text_boxes:next.text_boxes?Object.fromEntries(Object.entries(next.text_boxes).map(([k,b])=>[k,{...b,font_size:k==='text'?font:40,font_style:'bold',letter_spacing:0}])):undefined}
 next.chat_layout={mode:kind,chaser:kind==='chase'?chaser:0,motion:kind==='chase'};
 const positions=count===1?[[.5,.51]]:count===2?[[.27,.52],[.73,.52]]:count===3?[[.18,.52],[.5,.52],[.82,.52]]:Array.from({length:count},(_,i)=>[(i%3+.5)/3,.26+Math.floor(i/3)*.49]);
 if(kind==='chase'){positions[chaser]=[.28,.47];positions[1-chaser]=[.72,.56]}
 next.primary_x=positions[0][0];next.primary_y=positions[0][1];next.primary_scale=1;next.rotation=kind==='chase'?-8:0;
 next.characters=next.characters.map((a,i)=>({...a,x:positions[i+1][0],y:positions[i+1][1],scale:1,rotation:kind==='chase'?-8:0}));
 const original=next.text_boxes,main={...original?.text};for(const key of ['font_size','font_style','text_color','letter_spacing','line_spacing']as const)delete main[key];next.text_boxes={text:{...main,x:.04,y:.75,width:.92,height:.20,fit:'fixed',text_backdrop:next.composition?'light':'none'},secondary_text:{...original?.secondary_text,x:.05,y:.025,width:.90,height:.12,font_size:40,font_style:'bold',text_color:'#334439',letter_spacing:0,line_spacing:1.16,fit:'fixed',text_backdrop:next.composition?'light':'none'}};
 const r=chatRegions(next);Object.assign(next.text_boxes.text!,r.text);Object.assign(next.text_boxes.secondary_text!,r.secondary);
 if(kind==='chase'&&!next.composition&&next.background_style!=='image'){next.background_style='gradient';next.background='#fff2d4';next.background_secondary='#ffdca9';next.prop_color='#ed7045'}
 return next
}
