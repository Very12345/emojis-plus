import type {Plan,Rendered} from '../api'
import type {Renderer} from './core'
export function chatQuality(p:Plan,renderer:Renderer):NonNullable<Rendered['info']['quality']>{
 const actors=renderer.elements.filter(e=>e.kind==='actor'&&!e.hidden),text=renderer.elements.find(e=>e.kind==='text'&&e.field==='text'&&!e.hidden),s=p.size;
 const largest=Math.max(0,...actors.map(a=>a.rect[3]))/s,textPx=p.text?((text?.fontSize??p.font_size)*128/512):0,warnings:string[]=[];
 if(largest<(actors.length>3?.23:.44)&&Math.max(0,...actors.map(a=>a.rect[2]))/s<(actors.length>1?.42:.62))warnings.push('人物偏小，建议放大主体或使用紧凑排版。');
 if(p.text&&textPx<12)warnings.push('文字缩到聊天气泡后偏小，建议放大字号，优先使用短句。');
 if(p.text&&p.font_style==='plain'&&(p.text_boxes?.text?.font_style??'plain')==='plain')warnings.push('文字较细，建议使用加粗或贴纸字。');
 if(text&&actors.length&&text.rect[1]-Math.max(...actors.map(a=>a.rect[1]+a.rect[3]))>s*.13)warnings.push('人物与文案相距较远，建议把文字移近主体。');
 if(text&&p.text_placement==='caption'&&actors.some(a=>Math.max(0,Math.min(text.rect[0]+text.rect[2],a.rect[0]+a.rect[2])-Math.max(text.rect[0],a.rect[0]))*Math.max(0,Math.min(text.rect[1]+text.rect[3],a.rect[1]+a.rect[3])-Math.max(text.rect[1],a.rect[1]))>a.rect[2]*a.rect[3]*.1))warnings.push('主文案正在遮住人物，建议缩短文案或重新安排位置。');
 return {warnings,subject_height:Math.round(largest*100)/100,text_px_at_128:Math.round(textPx*10)/10}
}
