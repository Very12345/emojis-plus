import fs from 'node:fs/promises'
import path from 'node:path'
import {createCanvas,loadImage,GlobalFonts} from '@napi-rs/canvas'
import {prepareRenderer,RENDER_VERSION} from '../src/render/core'
import {resolvePresets,applyTemplatePlan,chooseSubject,validatePlan} from '../src/local/plans'
import {makePlan} from '../src/api'
import type {Catalog,DecodedSource} from '../src/local/types'
const root=process.cwd(),catalog:Catalog=JSON.parse(await fs.readFile('public/library/catalog.json','utf8')),output=path.join(root,'public/previews')
await fs.mkdir(output,{recursive:true})
const fontFiles={sans:'NotoSansSC.ttf',serif:'NotoSerifSC.ttf',kuaile:'ZCOOLKuaiLe-Regular.ttf',xiaowei:'ZCOOLXiaoWei-Regular.ttf',qingke:'ZCOOLQingKeHuangYou-Regular.ttf',mashan:'MaShanZheng-Regular.ttf',longcang:'LongCang-Regular.ttf'}
for(const [id,file]of Object.entries(fontFiles))GlobalFonts.registerFromPath(path.join(root,'assets/fonts',file),'ep-'+id)
const cache=new Map<string,DecodedSource>(),factory=(w:number,h:number)=>createCanvas(Math.max(1,Math.round(w)),Math.max(1,Math.round(h)))
async function source(id:string,trim=true){const key=id+trim;if(cache.has(key))return cache.get(key)!;const a=catalog.assets.find(a=>a.id===id)!;if(!a)throw Error('Missing '+id);const im=await loadImage(path.join(root,'public',a.url)),canvas=factory(im.width,im.height),ctx=canvas.getContext('2d');ctx.drawImage(im,0,0);let result=canvas;if(trim){const data=ctx.getImageData(0,0,im.width,im.height).data;let l=im.width,t=im.height,r=0,b=0;for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(data[(y*im.width+x)*4+3]>8){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x+1);b=Math.max(b,y+1)}if(r>l&&b>t){result=factory(r-l,b-t);result.getContext('2d').drawImage(canvas,l,t,r-l,b-t,0,0,r-l,b-t)}}const decoded={frames:[result],delays:[100],loop:0,width:result.width,height:result.height};cache.set(key,decoded);return decoded}
const presets=resolvePresets(catalog),tasks:any[]=[]
for(const t of catalog.templates){const a=chooseSubject(catalog.assets.filter(a=>a.info.has_transparency),t.id.includes('flower')?'奶龙（原版）':'Meowl')!;const plan=applyTemplatePlan(catalog,t.id,{...makePlan(a),...t.defaults,...t.sample,format:'jpg',size:256},undefined,[],true);tasks.push({id:'template-'+t.id,plan})}
tasks.push(...presets.map(p=>({id:'preset-'+p.id,plan:{...p.plan,format:'jpg',size:256}})))
const failures:any[]=[],report:any[]=[]
for(const task of tasks){try{const {plan}=task,{template}=validatePlan(plan,catalog),sources=[];for(const id of [plan.asset_id,...plan.characters.map((c:any)=>c.asset_id)])sources.push(await source(id));const bg=plan.background_style==='image'&&plan.background_asset_id?await source(plan.background_asset_id,false):undefined,start=performance.now(),renderer=prepareRenderer({plan,template,assets:catalog.assets,fonts:catalog.fonts,effects:catalog.effects,base:''},sources,factory,bg),canvas=renderer.draw(renderer.poster);await fs.writeFile(path.join(output,task.id+'.jpg'),canvas.toBuffer('image/jpeg',88));report.push({id:task.id,ms:Math.round(performance.now()-start),fit:renderer.fit});if(report.length%48===0)console.log('Previews '+report.length+'/'+tasks.length)}catch(e){failures.push({id:task.id,error:String(e)})}}
await fs.writeFile(path.join(output,'report.json'),JSON.stringify({renderer:RENDER_VERSION,templates:catalog.templates.length,presets:presets.length,success:report.length,failures,report},null,2))
console.log(JSON.stringify({success:report.length,failures}));if(failures.length)process.exitCode=1
