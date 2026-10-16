import {actorIds} from '../themes/plans'
import {propMatrix,drawProp,stageVisible} from '../themes/drawing'
import {prepareThemedRenderer} from '../themes/renderer'
import type {Plan,Asset,TextField} from '../api'
import type {CanvasElement} from '../editor/types'
import type {RenderInput,DecodedSource} from '../local/types'
import {buildScene,bounds,captionVisibility,clamp,matrix,multiply,type Matrix,type SurfaceFactory} from './scene'
export const RENDER_VERSION='browser-canvas-v4-theme-composition'
export type Rect=[number,number,number,number]
export function regions(p:Plan,t:any):{image:Rect;captions:{field:string;rect:Rect}[]} {
 const s=p.size,m=s*.045,rect=(v:number[])=>v.map(x=>x*s) as Rect,caption=(r:number[],field='text')=>({field,rect:rect(r)})
 const custom=t.layout
 if(custom?.image){const r=custom.image;return {image:rect(Array.isArray(r)?r:[r.x,r.y,r.width,r.height]),captions:custom.captions.map((c:any)=>({field:c.field,rect:rect(c.rect?Object.values(c.rect):[c.x,c.y,c.width,c.height])}))}}
 const defs:Record<string,number[][]>={message:[[.08,.24,.22,.22],[.34,.38,.56,.37]],poster:[[.15,.38,.70,.56],[.07,.055,.86,.27]],side:[[.045,.12,.42,.77],[.52,.12,.42,.77]],polaroid:[[.105,.10,.79,.61],[.11,.76,.78,.15]],bubble:[[.19,.50,.62,.45],[.115,.105,.77,.29]],dialogue:[[.055,.14,.23,.25],[.34,.16,.56,.22],[.10,.63,.56,.22]],spotlight:[[.14,.11,.72,.64],[.07,.81,.86,.14]],comic:[[.10,.055,.80,.30],[.08,.385,.84,.085],[.08,.89,.84,.08]],subtitle:[[.055,.055,.89,.64],[.09,.765,.82,.15]],note:[[.25,.40,.50,.47],[.12,.14,.76,.20]],window:[[.29,.42,.42,.36],[.12,.23,.76,.15]],ticket:[[.10,.25,.43,.60],[.59,.25,.27,.60]],medal:[[.24,.17,.52,.52],[.17,.765,.66,.13]],scene:[[.03,.02,.94,p.text?.80:.96],[.065,.865,.87,.09]]}
 const id=t.layout_id||t.id
 if(defs[id]){const [im,a,b]=defs[id];return {image:rect(im),captions:[caption(a),...(b?[caption(b,'secondary_text')]:[])]}}
 if(p.text_placement==='embedded'&&id!=='split')return {image:[m,m,s-2*m,s-2*m],captions:[caption(id==='flower'?[.35,.39,.30,.22]:[.09,.70,.82,.24])]}
 const band=(text:string)=>s*Math.min(.47,Math.max(.20,Math.max(Math.ceil([...text].length/12),text.split('\n').length)*.085))
 if(id==='top'){const b=band(p.text);return {image:[m,b,s-2*m,s-b-m],captions:[{field:'text',rect:[m,m,s-2*m,b-1.4*m]}]}}
 if(id==='split'){const a=s*Math.min(.34,Math.max(.18,Math.ceil(p.text.length/12)*.065)),b=s*Math.min(.34,Math.max(.18,Math.ceil(p.secondary_text.length/12)*.065));return {image:[m,a,s-2*m,s-a-b],captions:[{field:'text',rect:[m,m,s-2*m,a-1.4*m]},{field:'secondary_text',rect:[m,s-b+.35*m,s-2*m,b-1.4*m]}]}}
 const b=band(p.text),pad=id==='frame'?m*1.8:m
 return {image:[pad,pad,s-2*pad,s-b-pad],captions:[{field:'text',rect:[m,s-b+.35*m,s-2*m,b-1.4*m]}]}
}
export function timing(input:RenderInput,sources:DecodedSource[]){
 const p=input.plan,a=input.template.animation
 const animated=p.template_motion&&(a||input.template.motions.length),extra=[p.effect,...p.effects,...p.characters.map(c=>c.effect)].some(e=>e!=='none')
 if(animated||extra||sources.every(s=>s.frames.length===1)){const duration=Math.min(6000,Math.max(200,(a?.duration_ms||2000)/(a?p.template_speed:1))),count=Math.max(2,Math.round(duration/100));return {duration,delays:Array(count).fill(duration/count),loop:0}}
 const source=sources.find(s=>s.frames.length>1)!,delays:number[]=[];let duration=0
 for(const delay of source.delays){if(duration>=6000)break;delays.push(Math.min(delay,6000-duration));duration+=delays.at(-1)!}
 return {duration,delays,loop:source.loop}
}
export function frameAt(source:DecodedSource,time:number){let duration=source.delays.reduce((a,b)=>a+b,0);if(!duration)return source.frames[0];const cycles=Math.floor(time/duration);if(source.loop===null&&cycles>0||source.loop!==null&&source.loop>0&&cycles>source.loop)return source.frames.at(-1);time%=duration;let end=0;for(let i=0;i<source.frames.length;i++){end+=source.delays[i];if(time<end)return source.frames[i]}return source.frames.at(-1)}
const closing=/^[，。！？；：、,.!?;:)\]】》〉」』”’％%]/u,opening=/[（(\[【《〈「『“‘]$/u
export function wrapText(ctx:any,text:string,width:number,spacing:number){
 const measure=(s:string)=>ctx.measureText(s).width+Math.max(0,[...s].length-1)*spacing,lines:string[]=[]
 for(const paragraph of text.split('\n')){let line='';for(const ch of paragraph){if(line&&measure(line+ch)>width){if(closing.test(ch)){line+=ch;lines.push(line);line='';continue}if(opening.test(line)){const last=[...line].pop()!;lines.push([...line].slice(0,-1).join(''));line=last+ch}else{lines.push(line);line=ch}}else line+=ch}lines.push(line)}
 return {lines,width:Math.max(0,...lines.map(measure)),measure}
}
const textLayouts=new Map<string,any>()
export function textLayout(ctx:any,text:string,p:Plan,rect:Rect){
 const cacheKey=JSON.stringify([text,p.font_family,p.font_style,p.font_size,p.size,p.letter_spacing,p.line_spacing,p.text_layout,p.text_fit,rect[2],rect[3]]),cached=textLayouts.get(cacheKey)
 if(cached){textLayouts.delete(cacheKey);textLayouts.set(cacheKey,cached);return cached}
 const family='ep-'+(p.font_family||(p.font_style==='handwritten'?'kuaile':'sans')),weight=p.font_style==='bold'?'bold':'normal',vertical=p.text_layout==='vertical'
 let size=p.font_size*p.size/512,layout:any;const minimum=Math.min(7,size),fixed=p.text_fit!=='shrink'
 for(;size>=minimum;size-=.5){ctx.font=`${weight} ${size}px "${family}"`;const spacing=size*p.letter_spacing,stroke=['sticker','outline'].includes(p.font_style)?Math.ceil(size*.14):p.font_style==='bold'?size*.018:0,shadow=['sticker','shadow'].includes(p.font_style)?Math.ceil(size*.11):0,pad=stroke+shadow+2,step=size*p.line_spacing
  const metrics=ctx.measureText('国Agjpqy，。一'),ascent=Math.max(size*.8,metrics.actualBoundingBoxAscent||size),descent=Math.max(size*.2,metrics.actualBoundingBoxDescent||size*.25),w=rect[2]-2*pad,h=rect[3]-2*pad
  if(vertical){const per=Math.max(1,Math.floor((h-size)/(size*Math.max(1.3,p.line_spacing)))+1),columns=text.split('\n').flatMap(line=>{const chars=[...line];return Array.from({length:Math.max(1,Math.ceil(chars.length/per))},(_,i)=>chars.slice(i*per,(i+1)*per))}),ww=columns.length*size*1.25,hh=size+Math.max(0,...columns.map(c=>c.length-1))*size*Math.max(1.3,p.line_spacing);layout={vertical,columns,ww,hh,size,pad,ascent,descent,step,spacing,family,weight};if(fixed||ww<=w&&hh<=h)break
  }else{const wrap=wrapText(ctx,text,w,spacing),hh=ascent+descent+Math.max(0,wrap.lines.length-1)*step+(p.text_layout==='staggered'?size*.22:0);layout={...wrap,vertical,size,pad,ascent,descent,step,spacing,family,weight,hh};if(fixed||wrap.width<=w&&hh<=h)break}
 }
 if(size<minimum)throw Error('文字过长，当前文字区域放不下；请缩短文案或更换模板。')
 if(!layout.vertical){const widths=new Map(layout.lines.map((line:string)=>[line,layout.measure(line)]));layout.measure=(line:string)=>widths.get(line)||0}
 textLayouts.set(cacheKey,layout);while(textLayouts.size>192)textLayouts.delete(textLayouts.keys().next().value!)
 return layout
}
export function fitTextRect(ctx:any,text:string,p:Plan,rect:Rect):Rect {
 if(!text||p.text_fit==='shrink')return rect
 let result=[...rect]as Rect
 for(let i=0;i<3;i++){const l=textLayout(ctx,text,p,result),width=Math.max(result[2],(l.vertical?l.ww:l.width)+2*l.pad),height=Math.max(result[3],l.hh+2*l.pad);if(width>p.size+.1||height>p.size+.1)throw Error('当前字号和文字超出画布，请缩短文案、降低字号，或开启此文字层的自动缩字。');result=[Math.max(0,Math.min(result[0],p.size-width)),Math.max(0,Math.min(result[1],p.size-height)),width,height]}
 return result
}
export function drawText(ctx:any,text:string,p:Plan,rect:Rect,reveal=Infinity){
 if(!text)return;const l=textLayout(ctx,text,p,rect),[rx,ry,rw,rh]=rect,size=l.size,stamp=p.font_style==='stamp',color=stamp&&p.text_color==='#202522'?'#b33136':p.text_color
 ctx.save();ctx.font=`${l.weight} ${size}px "ep-${p.font_family||(p.font_style==='handwritten'?'kuaile':'sans')}"`;ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.lineJoin='round'
 const darkPlate=p.text_backdrop==='dark'||p.text_backdrop==='auto'&&(parseInt(color.slice(1,3),16)*.2126+parseInt(color.slice(3,5),16)*.7152+parseInt(color.slice(5,7),16)*.0722)>140
 if(p.text_backdrop==='light'||p.text_backdrop==='dark'||p.text_backdrop==='auto'&&needsPlate(ctx,rect,color)){ctx.fillStyle=darkPlate?'rgba(20,25,22,.88)':'rgba(255,255,255,.93)';ctx.beginPath();ctx.roundRect(rx,ry,rw,rh,Math.min(10,rh*.13));ctx.fill();if(p.text_backdrop==='dark'&&!(p as any).__preserve_color)ctx.fillStyle='#ffffff';else ctx.fillStyle=color}else ctx.fillStyle=color
 const fill=ctx.fillStyle,paint=(s:string,x:number,baseline:number,highlight?:{color:string;bold:boolean})=>{const activeFill=highlight?.color||fill;if(['shadow','sticker'].includes(p.font_style)){ctx.fillStyle=p.font_style==='sticker'?'#263228':p.background_secondary;ctx.fillText(s,x+size*.1,baseline+size*.1)}ctx.fillStyle=activeFill;if(['outline','sticker','bold'].includes(p.font_style)){ctx.lineWidth=size*(p.font_style==='sticker'?.13:p.font_style==='outline'?.08:.02);ctx.strokeStyle=p.font_style==='outline'?'#263228':p.font_style==='sticker'?'#ffffff':fill;ctx.strokeText(s,x,baseline)}if(highlight?.bold){ctx.lineWidth=size*.025;ctx.strokeStyle=activeFill;ctx.strokeText(s,x,baseline)}ctx.fillText(s,x,baseline)}
 const marks=((p as any).emphasis||[])as {text:string;color:string;bold:boolean}[]
 const mark=(line:string,i:number)=>marks.find(m=>m.text&&Array.from({length:line.length},(_,start)=>line.startsWith(m.text,start)&&i>=start&&i<start+m.text.length).some(Boolean))
 let index=0
 if(l.vertical){const x=rx+(rw+l.ww)/2-size,y=ry+(rh-l.hh)/2+l.ascent;l.columns.forEach((column:string[],c:number)=>column.forEach((char,j)=>{if(index++<reveal){const advance=ctx.measureText(char).width;paint(char,x-c*size*1.25+(size-advance)/2,y+j*size*Math.max(1.3,p.line_spacing))}}))}
 else{const top=ry+(rh-l.hh)/2+l.ascent+(p.text_layout==='staggered'?size*.11:0);l.lines.forEach((line:string,row:number)=>{const chars=[...line],x=rx+(rw-l.measure(line))/2,baseline=top+row*l.step
  if(!l.spacing&&p.text_layout==='horizontal'&&!marks.length){const visible=chars.slice(0,Math.max(0,reveal-index)).join('');paint(visible,x,baseline);index+=chars.length}
  else chars.forEach((char,i)=>{const prefix=chars.slice(0,i).join(''),advance=ctx.measureText(prefix+char).width-ctx.measureText(char).width+i*l.spacing;if(index++<reveal)paint(char,x+advance,baseline+(p.text_layout==='staggered'?(i%2?1:-1)*size*.1:0),mark(line,chars.slice(0,i).join('').length))})
 })}
 if(stamp){ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,size*.06);ctx.strokeRect(rx+1,ry+1,rw-2,rh-2)}ctx.restore()
}
function needsPlate(ctx:any,r:Rect,color:string){try{const [x,y,w,h]=r.map(Math.round),pixels=ctx.getImageData(Math.max(0,x),Math.max(0,y),Math.max(1,w),Math.max(1,h)).data,lum=(r:number,g:number,b:number)=>[r,g,b].map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,b,i)=>a+b*[.2126,.7152,.0722][i],0),c=lum(parseInt(color.slice(1,3),16),parseInt(color.slice(3,5),16),parseInt(color.slice(5,7),16));let bad=0,total=0;for(let i=0;i<pixels.length;i+=Math.max(4,Math.floor(pixels.length/128/4)*4)){const l=lum(pixels[i],pixels[i+1],pixels[i+2]);if((Math.max(c,l)+.05)/(Math.min(c,l)+.05)<4.5)bad++;total++}return bad/total>.15}catch{return true}}
export function decorate(ctx:any,p:Plan,id:string){const s=p.size,r=(x:number,y:number,w:number,h:number,color:string,round=.025)=>{ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x*s,y*s,w*s,h*s,round*s);ctx.fill()};ctx.save()
 if(id==='message'){r(.02,.17,.96,.57,'#ffffff');ctx.fillStyle='#8d998d';ctx.font=`${s*.045}px ep-sans`;ctx.fillText(p.speaker_name||'说点什么',s*.34,s*.29)}
 if(id==='polaroid'){r(.055,.05,.89,.93,'#ffffff');r(.10,.095,.80,.62,'#edf0e6',0)}
 if(id==='bubble'||id==='dialogue'){r(.06,.06,.88,.36,'#ffffff',.07);if(id==='dialogue')r(.05,.56,.62,.36,'#e9f0d8',.06)}
 if(id==='spotlight'){const g=ctx.createRadialGradient(.5*s,.43*s,0,.5*s,.43*s,.49*s);g.addColorStop(0,'#fff9c9');g.addColorStop(1,'#dce5cd');ctx.fillStyle=g;ctx.fillRect(0,0,s,s)}
 if(id==='comic'){r(.045,.025,.91,.47,'#ffffff',0);r(.045,.525,.91,.45,'#ffffff',0);ctx.strokeStyle='#344039';ctx.lineWidth=s*.006;ctx.strokeRect(.045*s,.025*s,.91*s,.47*s);ctx.strokeRect(.045*s,.525*s,.91*s,.45*s)}
 if(id==='subtitle')r(.025,.72,.95,.25,'#18201c',0)
 if(id==='note'){r(.055,.06,.89,.89,'#fff5cc');ctx.strokeStyle='#ead79f';for(let y=.31;y<.9;y+=.085){ctx.beginPath();ctx.moveTo(.10*s,y*s);ctx.lineTo(.90*s,y*s);ctx.stroke()}}
 if(id==='window'){r(.18,.35,.64,.49,'#ffffff');r(.18,.35,.64,.055,'#a7ba8c');ctx.strokeStyle='#8c9a7a';ctx.strokeRect(.18*s,.35*s,.64*s,.49*s)}
 if(id==='ticket'){r(.045,.13,.91,.79,'#fff9df');ctx.setLineDash([s*.012,s*.016]);ctx.strokeStyle='#b9ab7c';ctx.beginPath();ctx.moveTo(.55*s,.18*s);ctx.lineTo(.55*s,.87*s);ctx.stroke()}
 if(id==='medal'){ctx.fillStyle='#e8c463';ctx.beginPath();ctx.arc(.5*s,.43*s,.34*s,0,Math.PI*2);ctx.fill();r(.1,.73,.8,.2,'#fff7db')}
 ctx.restore()}
export function background(ctx:any,p:Plan,source?:DecodedSource){const s=p.size;ctx.fillStyle=p.background;ctx.fillRect(0,0,s,s)
 if(p.background_style==='gradient'){const g=ctx.createLinearGradient(0,0,s,s);g.addColorStop(0,p.background);g.addColorStop(1,p.background_secondary);ctx.fillStyle=g;ctx.fillRect(0,0,s,s)}
 if(p.background_style==='paper'){ctx.strokeStyle=p.background_secondary;ctx.lineWidth=1;for(let y=s*.08;y<s;y+=s*.08){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(s,y);ctx.stroke()}}
 if(p.background_style==='rays'){ctx.fillStyle=p.background_secondary;for(let i=0;i<16;i++){const a=i*Math.PI/8;ctx.beginPath();ctx.moveTo(s/2,s/2);ctx.lineTo(s/2+Math.cos(a)*s,s/2+Math.sin(a)*s);ctx.lineTo(s/2+Math.cos(a+.10)*s,s/2+Math.sin(a+.10)*s);ctx.fill()}}
 if(p.background_style==='image'&&source){const im=source.frames[0],scale=Math.max(s/im.width,s/im.height)*(p.background_zoom||1);ctx.drawImage(im,(s-im.width*scale)*(p.background_pan_x??.5),(s-im.height*scale)*(p.background_pan_y??.5),im.width*scale,im.height*scale)}
}
export interface Renderer {draw:(ms:number)=>any;duration:number;delays:number[];loop:number|null;poster:number;fit:number;union:number[];elements:CanvasElement[]}
export function prepareRenderer(input:RenderInput,sources:DecodedSource[],factory:SurfaceFactory,bg?:DecodedSource):Renderer {
 if(input.plan.composition)return prepareThemedRenderer(input,sources,factory,bg)
 const p=input.plan,t=input.template,layout=regions(p,t),[x,y,w,h]=layout.image,time=timing(input,sources),images=sources.map(s=>s.frames[0]);let union=[0,0,w,h]
 const samples=Math.max(120,time.delays.length),scenes=Array.from({length:samples},(_,i)=>buildScene(images,p,t,input.effects,i/samples*time.duration/1000,w,h,time.duration))
 if(!scenes[0].clip){const boxes=scenes.flatMap(s=>s.sprites.filter(s=>s.alpha>.001).map(bounds));if(boxes.length)union=[Math.min(0,...boxes.map(b=>b[0]))-2,Math.min(0,...boxes.map(b=>b[1]))-2,Math.max(w,...boxes.map(b=>b[2]))+2,Math.max(h,...boxes.map(b=>b[3]))+2]}
 const fit=scenes[0].clip?1:Math.min(1,w/(union[2]-union[0]),h/(union[3]-union[1])),dx=(w-(union[2]-union[0])*fit)/2-union[0]*fit,dy=(h-(union[3]-union[1])*fit)/2-union[1]*fit
 const canvas=factory(p.size,p.size),ctx=canvas.getContext('2d'),subjectAsset=input.assets.find(a=>a.id===p.asset_id)!,world:Matrix=[fit,0,0,fit,x+dx,y+dy],poster=Math.max(0,Math.min(.99,t.animation?.poster_time??.45))*time.duration
 const posterScene=buildScene(images,p,t,input.effects,poster/1000,w,h,time.duration),actorRects=new Map<number,Rect>(),transforms=new Map<number,Matrix>()
 for(let actor=0;actor<sources.length;actor++){const boxes=posterScene.sprites.filter(s=>s.actor===actor).map(s=>bounds({...s,matrix:multiply(world,s.matrix)}));if(!boxes.length)continue;const left=Math.min(...boxes.map(b=>b[0])),top=Math.min(...boxes.map(b=>b[1])),right=Math.max(...boxes.map(b=>b[2])),bottom=Math.max(...boxes.map(b=>b[3])),rect:Rect=[left,top,right-left,bottom-top];actorRects.set(actor,rect);const a=p.actor_transforms?.[actor];if(a)transforms.set(actor,multiply(matrix(a.x*p.size,a.y*p.size,a.scale,a.scale,-a.rotation),matrix(-(left+right)/2,-(top+bottom)/2)))}
 let captions=layout.captions
 if(p.text_placement==='embedded'&&subjectAsset.metadata.text_safe_area){const a=subjectAsset.metadata.text_safe_area,im=sources[0],scale=Math.min(w/im.width,h/im.height)*p.zoom,ww=im.width*scale,hh=im.height*scale;captions=[{field:'text',rect:[x+(w-ww)/2+a.x*ww,y+(h-hh)/2+a.y*hh,a.width*ww,a.height*hh]}]}
 const resolvedCaptions=captions.map(c=>{const field=c.field as TextField,b=p.text_boxes?.[field],rect=b?[b.x*p.size,b.y*p.size,b.width*p.size,b.height*p.size]as Rect:c.rect.map((v,j)=>v+(j===0?p.text_x*p.size:j===1?p.text_y*p.size:0))as Rect;return {id:String(field),field,layerId:undefined as string|undefined,text:p[field],rect,rotation:b?.rotation||0,settings:{...p,...b,font_family:b?.font_family??p.font_family,font_size:b?.font_size??p.font_size,text_fit:b?.fit??p.text_fit}}})
 for(const layer of p.text_layers||[])resolvedCaptions.push({id:'layer:'+layer.id,field:'text',layerId:layer.id,text:layer.text,rect:[layer.x*p.size,layer.y*p.size,layer.width*p.size,layer.height*p.size],rotation:layer.rotation||0,settings:{...p,...layer,font_size:layer.font_size??p.font_size,font_family:layer.font_family??p.font_family,text_color:layer.text_color??p.text_color,text_fit:layer.fit??p.text_fit}})
 for(const c of resolvedCaptions){c.rect=fitTextRect(ctx,c.text,c.settings,c.rect);if(c.rotation){const angle=c.rotation*Math.PI/180,[xx,yy,ww,hh]=c.rect,rw=Math.abs(ww*Math.cos(angle))+Math.abs(hh*Math.sin(angle)),rh=Math.abs(ww*Math.sin(angle))+Math.abs(hh*Math.cos(angle));if(rw>p.size+.1||rh>p.size+.1)throw Error('旋转后的文字超出画布，请调整宽度、字号或旋转角度。');const halfW=Math.max(ww,rw)/2,halfH=Math.max(hh,rh)/2;c.rect=[Math.max(halfW,Math.min(p.size-halfW,xx+ww/2))-ww/2,Math.max(halfH,Math.min(p.size-halfH,yy+hh/2))-hh/2,ww,hh]}}
 const elements:CanvasElement[]=[...(p.background_style==='image'?[{id:'background',kind:'background' as const,label:'场景背景',rect:[0,0,p.size,p.size]as Rect,rotation:0,scale:p.background_zoom||1}]:[])]
 for(const [actor,rect]of actorRects){const transform=transforms.get(actor),[xx,yy,ww,hh]=rect,box=transform?bounds({image:{width:ww,height:hh},matrix:multiply(transform,matrix(xx+ww/2,yy+hh/2)),alpha:1}):[xx,yy,xx+ww,yy+hh];elements.push({id:'actor:'+actor,kind:'actor',actor,label:actor===0?'主角色':'角色 '+(actor+1),rect:[box[0],box[1],box[2]-box[0],box[3]-box[1]],rotation:p.actor_transforms?.[actor]?.rotation||0,scale:p.actor_transforms?.[actor]?.scale||1})}
 for(const [index,c]of resolvedCaptions.entries()){const l=c.text?textLayout(ctx,c.text,c.settings,c.rect):null;elements.push({id:c.id,kind:'text',field:c.layerId?undefined:c.field,layerId:c.layerId,label:c.layerId?'文字 '+(index+1):c.field==='text'?'主文案':'第二段文案',rect:c.rect,rotation:c.rotation,fontSize:c.settings.font_size,actualFontSize:l?l.size*512/p.size:c.settings.font_size})}
 const anchorBases:Record<string,Matrix>={}
 for(let i=0;i<sources.length;i++){const sprite=posterScene.sprites.find(v=>v.actor===i);if(sprite)anchorBases[actorIds(p)[i]]=multiply(transforms.get(i)||matrix(0,0),multiply(world,multiply(sprite.matrix,matrix(0,0,sprite.image.width,sprite.image.height))))}
 for(const l of p.prop_layers||[]){const def=input.props?.find(v=>v.id===l.prop_id),m=propMatrix(l,p,posterScene.sprites,world,transforms),b=bounds({image:{width:1,height:1},matrix:m,alpha:1});elements.push({id:'prop:'+l.id,kind:'prop',layerId:l.id,label:def?.name||l.prop_id,rect:[b[0],b[1],b[2]-b[0],b[3]-b[1]],rotation:l.rotation,basis:l.actor_id?anchorBases[l.actor_id]:matrix(0,0,p.size,p.size),anchorBases,locked:l.locked,hidden:l.hidden})}
 for(const l of p.prop_layers||[]){if(!l.text_id)continue;const text=elements.find(e=>e.id===l.text_id),prop=elements.find(e=>e.id==='prop:'+l.id);if(text&&prop){text.rect=prop.rect;text.rotation=prop.rotation;text.boundPropId=l.id}}
 for(const e of elements){e.locked||=p.element_states?.[e.id]?.locked;e.hidden||=p.element_states?.[e.id]?.hidden}
 const draw=(ms:number)=>{background(ctx,p,bg);decorate(ctx,p,t.layout_id);const visible=captionVisibility(p.template_motion?t.animation?.handler:undefined,ms/time.duration)
  for(const [i,panel]of (t.layout?.panels||[]).entries()){if(!visible[i])continue;ctx.save();ctx.fillStyle=panel.fill||'#ffffff';ctx.strokeStyle=panel.outline||'#d4dfcc';ctx.lineWidth=Math.max(1,p.size*.003);ctx.beginPath();ctx.roundRect(panel.x*p.size,panel.y*p.size,panel.width*p.size,panel.height*p.size,(panel.radius??.035)*p.size);ctx.fill();ctx.stroke();ctx.restore()}
  const scene=buildScene(sources.map(s=>frameAt(s,ms)),p,t,input.effects,ms/1000,w,h,time.duration)
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.translate(x+dx,y+dy);ctx.scale(fit,fit)
  if(t.animation?.handler==='window-pop'&&p.template_motion){ctx.beginPath();ctx.roundRect(w*.15,h*.2,w*.7,h*.62,w*.08);ctx.clip()}
  scene.before.forEach(f=>f(ctx));ctx.restore()
  const drawTasks:{z:number;draw:()=>void}[]=[]
  for(const sprite of scene.sprites){if(p.element_states?.['actor:'+(sprite.actor||0)]?.hidden)continue;drawTasks.push({z:p.element_states?.['actor:'+(sprite.actor||0)]?.z??10+(sprite.actor||0),draw:()=>{ctx.save();const manual=transforms.get(sprite.actor??0);if(manual)ctx.transform(...manual);ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.transform(...world);if(t.animation?.handler==='window-pop'&&p.template_motion){ctx.beginPath();ctx.roundRect(w*.15,h*.2,w*.7,h*.62,w*.08);ctx.clip()}ctx.globalAlpha=sprite.alpha;if(sprite.ghost)ctx.filter='brightness(1.7) saturate(.15)';ctx.transform(...sprite.matrix);ctx.drawImage(sprite.image,-sprite.image.width/2,-sprite.image.height/2);ctx.restore()}})}
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.transform(...world);scene.after.forEach(f=>f(ctx));ctx.restore()
  if(['dialogue','comic'].includes(t.layout_id)&&sources.length===1&&!t.animation){const r=t.layout_id==='dialogue'?[.715,.61,.23,.25]:[.10,.555,.80,.30],im=frameAt(sources[0],ms),scale=Math.min(r[2]*p.size/im.width,r[3]*p.size/im.height);ctx.save();const manual=transforms.get(0);if(manual)ctx.transform(...manual);ctx.translate((r[0]+r[2]/2)*p.size,(r[1]+r[3]/2)*p.size);ctx.scale(-scale,scale);ctx.drawImage(im,-im.width/2,-im.height/2);ctx.restore()}
  const typewriter=[p.effect,...p.effects].some(id=>input.effects.find(e=>e.id===id)?.handler==='typewriter')&&p.format==='gif'
  resolvedCaptions.forEach((c,i)=>{if(p.prop_layers?.some(l=>l.text_id===c.id)||p.element_states?.[c.id]?.hidden||c.settings.hidden||!c.layerId&&!visible[i])return;drawTasks.push({z:p.element_states?.[c.id]?.z??40,draw:()=>{const text=c.text,rect=c.rect;ctx.save();if(c.rotation){ctx.translate(rect[0]+rect[2]/2,rect[1]+rect[3]/2);ctx.rotate(c.rotation*Math.PI/180);ctx.translate(-rect[0]-rect[2]/2,-rect[1]-rect[3]/2)}drawText(ctx,text,t.layout_id==='subtitle'&&!c.layerId?{...c.settings,text_color:'#ffffff',text_backdrop:'none'}:c.settings,rect,typewriter?Math.ceil([...text].length*clamp(ms/time.duration/.75)):Infinity);ctx.restore()}})})
  for(const l of p.prop_layers||[]){if(l.hidden||p.element_states?.['prop:'+l.id]?.hidden||!stageVisible(l.stage,ms/time.duration))continue;const def=input.props?.find(v=>v.id===l.prop_id&&v.enabled);if(!def)continue;drawTasks.push({z:l.z,draw:()=>{ctx.save();ctx.transform(...propMatrix(l,p,scene.sprites,world,transforms));drawProp(ctx,def.handler,l.color);ctx.restore();if(l.text_id){const c=resolvedCaptions.find(c=>c.id===l.text_id);if(c){const m=propMatrix(l,p,scene.sprites,world,transforms),ww=Math.hypot(m[0],m[1]),hh=Math.hypot(m[2],m[3]);ctx.save();ctx.translate(m[4],m[5]);ctx.rotate(Math.atan2(m[1],m[0])+(m[0]*m[3]-m[1]*m[2]<0?Math.PI:0));const boundRect:Rect=[-ww*.42,-hh*.35,ww*.84,hh*.63],layout=textLayout(ctx,c.text,c.settings,boundRect);if(c.settings.text_fit!=='shrink'&&((layout.width??layout.ww)+2*layout.pad>boundRect[2]||layout.hh+2*layout.pad>boundRect[3]))throw Error('气泡内的文字放不下，请放大气泡、降低字号或开启此文字层自动缩字。');drawText(ctx,c.text,{...c.settings,text_backdrop:'none'},boundRect);ctx.restore()}}}})}
  drawTasks.sort((a,b)=>a.z-b.z).forEach(t=>t.draw())
  return canvas
 }
 return {draw,...time,poster,fit,union,elements}
}
