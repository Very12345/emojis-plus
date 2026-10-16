import {parseGIF,decompressFrame} from 'gifuct-js'
import * as gifencModule from 'gifenc'
// gifenc's ESM default is the encoder function; its CommonJS default is an object.
const {GIFEncoder,quantize,applyPalette}=typeof (gifencModule as any).GIFEncoder==='function'?gifencModule:gifencModule.default
import {prepareRenderer} from './core'
import type {DecodedSource,RenderInput} from '../local/types'
const factory=(w:number,h:number)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(Math.max(1,Math.round(w)),Math.max(1,Math.round(h))):Object.assign(document.createElement('canvas'),{width:Math.max(1,Math.round(w)),height:Math.max(1,Math.round(h))})
const yieldUI=()=>new Promise<void>(resolve=>setTimeout(resolve,0))
const check=(cancel:()=>boolean)=>{if(cancel())throw new DOMException('Aborted','AbortError')}
export function inspectLoop(gif:any):number|null{for(const frame of gif.frames){if(frame.application?.id?.startsWith('NETSCAPE')){const b=frame.application.blocks;return b?.length>=3?b[1]+256*b[2]:0}}return null}
export async function decodeSource(bytes:ArrayBuffer,type:string,maxDimension=1024,trim=true,cancel=()=>false,pixelBudget=48_000_000):Promise<DecodedSource>{
 const frames:any[]=[],delays:number[]=[];let loop:number|null=null
 if(type==='gif'||new Uint8Array(bytes,0,Math.min(3,bytes.byteLength)).toString()==='71,73,70'){
  const gif=parseGIF(bytes),w=gif.lsd.width,h=gif.lsd.height;if(!w||!h||w*h>16_000_000)throw Error('GIF 单帧尺寸过大。');loop=inspectLoop(gif)
  const full=factory(w,h),ctx=full.getContext('2d',{willReadFrequently:true})!,patch=factory(1,1),background=gif.gct?.[(gif.lsd as any).backgroundColorIndex];let previous:any,restore:any,duration=0,pixels=0
  for(const raw of gif.frames as any[]){if(!raw.image)continue;check(cancel);const f=decompressFrame(raw,gif.gct,true);if(!f)continue
   if(!previous&&f.transparentIndex===undefined&&background){ctx.fillStyle=`rgb(${background.join(',')})`;ctx.fillRect(0,0,w,h)}
   if(previous?.disposalType===2){ctx.clearRect(previous.dims.left,previous.dims.top,previous.dims.width,previous.dims.height);if(previous.transparentIndex===undefined&&background){ctx.fillStyle=`rgb(${background.join(',')})`;ctx.fillRect(previous.dims.left,previous.dims.top,previous.dims.width,previous.dims.height)}}
   if(previous?.disposalType===3&&restore)ctx.putImageData(restore,0,0)
   restore=f.disposalType===3?ctx.getImageData(0,0,w,h):null
   patch.width=f.dims.width;patch.height=f.dims.height;patch.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(f.patch!),f.dims.width,f.dims.height),0,0);ctx.drawImage(patch,f.dims.left,f.dims.top)
   const scale=Math.min(1,maxDimension/Math.max(w,h)),copy=factory(w*scale,h*scale);copy.getContext('2d')!.drawImage(full,0,0,copy.width,copy.height);pixels+=copy.width*copy.height;if(pixels>pixelBudget)throw Error('GIF 解码超过浏览器内存预算，请缩小尺寸或时长。')
   frames.push(copy);delays.push(Math.max(20,Math.min(f.delay||100,6000-duration)));duration+=delays.at(-1)!;previous=f;if(duration>=6000)break;if(frames.length%4===0)await yieldUI()
  }
 }else{const image=await createImageBitmap(new Blob([bytes]));check(cancel);if(image.width*image.height>30_000_000){image.close();throw Error('图片尺寸过大。')}const scale=Math.min(1,maxDimension/Math.max(image.width,image.height)),copy=factory(image.width*scale,image.height*scale);copy.getContext('2d')!.drawImage(image,0,0,copy.width,copy.height);image.close();frames.push(copy);delays.push(100)}
 if(!frames.length)throw Error('素材没有可解码的画面。')
 if(trim){let left=frames[0].width,top=frames[0].height,right=0,bottom=0;for(let i=0;i<frames.length;i++){const c=frames[i],data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>8){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1)}if(i%4===0){check(cancel);await yieldUI()}}
  if(right>left&&bottom>top&&(left||top||right<frames[0].width||bottom<frames[0].height))for(let i=0;i<frames.length;i++){const c=factory(right-left,bottom-top);c.getContext('2d')!.drawImage(frames[i],left,top,right-left,bottom-top,0,0,c.width,c.height);frames[i]=c}
 }
 return {frames,delays,loop,width:frames[0].width,height:frames[0].height}
}
const fonts=new Map<string,Promise<void>>()
const decodedCache=new Map<string,DecodedSource>()
const pixels=(s:DecodedSource)=>s.width*s.height*s.frames.length
export async function loadFont(font:any,base:string){const url=new URL(font.url,base).href,key=font.id+url;if(!fonts.has(key)){const promise=(async()=>{const face=new FontFace('ep-'+font.id,`url("${url}")`,{weight:font.weight||'400'});await face.load();(globalThis as any).fonts?.add(face);if(typeof document!=='undefined')document.fonts.add(face)})();fonts.set(key,promise);promise.catch(()=>fonts.delete(key))}return fonts.get(key)!}
export function assertGlyphs(input:RenderInput){const id=input.plan.font_family||(input.plan.font_style==='handwritten'?'kuaile':'sans'),font=input.fonts.find(f=>f.id===id);if(!font)throw Error('字体未注册。');const missing=[...new Set([...input.plan.text,...input.plan.secondary_text].filter(c=>!/[\n\r\t ]/.test(c)&&!font.coverage.some(([a,b])=>c.codePointAt(0)!>=a&&c.codePointAt(0)!<=b)))];if(missing.length)throw Error('当前字体缺少字形：'+missing.slice(0,12).join(' ')+'。请换用其他字体。')}
export async function renderBrowser(input:RenderInput,cancel=()=>false,progress=(n:number)=>{}){
 assertGlyphs(input);const selected=input.fonts.find(f=>f.id===(input.plan.font_family||(input.plan.font_style==='handwritten'?'kuaile':'sans')))!,sans=input.fonts.find(f=>f.id==='sans')!;await Promise.all([loadFont(selected,input.base),loadFont(sans,input.base)]);check(cancel)
 let budget=64_000_000
 const ids=[input.plan.asset_id,...input.plan.characters.map(c=>c.asset_id)],load=async(id:string,trim:boolean)=>{const a=input.assets.find(a=>a.id===id);if(!a)throw Error('素材不存在。');const url=new URL(a.url,input.base),key=url.href+input.plan.size+trim;let source=decodedCache.get(key)
  if(source){decodedCache.delete(key);decodedCache.set(key,source)}else{const r=await fetch(url);if(!r.ok)throw Error('素材加载失败：'+a.name);source=await decodeSource(await r.arrayBuffer(),a.info.format.toLowerCase(),input.plan.size*1.5,trim,cancel,Math.min(budget,48_000_000));decodedCache.set(key,source);while([...decodedCache.values()].reduce((n,s)=>n+pixels(s),0)>48_000_000&&decodedCache.size>1)decodedCache.delete(decodedCache.keys().next().value!)}budget-=pixels(source);if(budget<0)throw Error('多角色 GIF 超过当前内存预算，请改用256尺寸或减少动态素材。');return source}
 const sources:DecodedSource[]=[];for(const id of ids){sources.push(await load(id,true));check(cancel)}const bg=input.plan.background_style==='image'&&input.plan.background_asset_id?await load(input.plan.background_asset_id,false):undefined
 const renderer=prepareRenderer(input,sources,factory,bg),p=input.plan
 if(p.format==='jpg'){const canvas=renderer.draw(renderer.poster);const blob=await canvasBlob(canvas,'image/jpeg');return {blob,info:{width:p.size,height:p.size,frames:1,duration_ms:0}}}
 return encodeAnimation(renderer,p,cancel,progress)
}
export async function encodeAnimation(renderer:ReturnType<typeof prepareRenderer>,p:RenderInput['plan'],cancel=()=>false,progress=(n:number)=>{}){
 const gif=GIFEncoder(),samples:number[]=[];for(let i=0;i<8;i++){const data=renderer.draw(i*renderer.duration/8).getContext('2d').getImageData(0,0,p.size,p.size).data;for(let j=0;j<data.length;j+=16)samples.push(data[j],data[j+1],data[j+2],255)}const palette=quantize(new Uint8Array(samples),256,{format:'rgb565'});let ms=0
 for(let i=0;i<renderer.delays.length;i++){check(cancel);const data=renderer.draw(ms).getContext('2d').getImageData(0,0,p.size,p.size).data,index=applyPalette(data,palette,'rgb565');gif.writeFrame(index,p.size,p.size,{palette,delay:renderer.delays[i],repeat:renderer.loop===null?-1:renderer.loop,dispose:2});ms+=renderer.delays[i];progress((i+1)/renderer.delays.length);await yieldUI()}
 gif.finish();return {blob:new Blob([gif.bytesView()],{type:'image/gif'}),info:{width:p.size,height:p.size,frames:renderer.delays.length,duration_ms:renderer.duration}}
}
function canvasBlob(canvas:any,type:string):Promise<Blob>{return canvas.convertToBlob?canvas.convertToBlob({type,quality:.94}):new Promise((resolve,reject)=>canvas.toBlob((b:Blob|null)=>b?resolve(b):reject(Error('图片编码失败')),type,.94))}
