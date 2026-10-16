import type {Plan,Rendered} from '../api'
import type {Catalog,RenderInput} from '../local/types'
import {validatePlan} from '../local/plans'
import {RENDER_VERSION} from './core'
type Task={id:string;input:RenderInput;resolve:(r:any)=>void;reject:(e:any)=>void;signal?:AbortSignal;abort?:()=>void;settled?:boolean}
export class RenderQueue {
 worker:Worker|null=null;queue:Task[]=[];running:Task|null=null
 constructor(){if(typeof Worker!=='undefined'&&typeof OffscreenCanvas!=='undefined')this.worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});if(this.worker){this.worker.onmessage=({data})=>{const t=this.running;if(!t||data.id!==t.id)return;if(data.result){t.settled=true;t.resolve(data.result)}else if(data.error){t.settled=true;t.reject(data.aborted?new DOMException('Aborted','AbortError'):Error(data.error))}if(data.done){t.signal?.removeEventListener('abort',t.abort!);this.running=null;this.next()}};this.worker.onerror=()=>{const t=this.running;t?.reject(Error('浏览器渲染线程启动失败，请刷新页面。'));this.running=null;this.worker?.terminate();this.worker=null;this.next()}}}
 run(input:RenderInput,signal?:AbortSignal){return new Promise<any>((resolve,reject)=>{if(signal?.aborted){reject(new DOMException('Aborted','AbortError'));return}const t:Task={id:crypto.randomUUID(),input,resolve,reject,signal};t.abort=()=>{if(t.settled)return;t.settled=true;reject(new DOMException('Aborted','AbortError'));this.queue=this.queue.filter(v=>v!==t);if(this.running===t)this.worker?.postMessage({cancel:t.id})};signal?.addEventListener('abort',t.abort,{once:true});this.queue.push(t);this.next()})}
 next(){if(this.running)return;const t=this.queue.shift();if(!t)return;if(t.signal?.aborted){this.next();return}this.running=t;if(this.worker)this.worker.postMessage({id:t.id,input:t.input});else import('./browser').then(m=>m.renderBrowser(t.input,()=>!!t.signal?.aborted)).then(t.resolve,t.reject).finally(()=>{t.signal?.removeEventListener('abort',t.abort!);this.running=null;this.next()})}
}
let editor:RenderQueue,background:RenderQueue
const resultCache={editor:new Map<string,Rendered>(),background:new Map<string,Rendered>()}
export async function renderLocal(catalog:Catalog,plan:Plan,signal?:AbortSignal,thumbnail=false):Promise<Rendered>{
 const {template}=validatePlan(plan,catalog),input={plan,template,effects:catalog.effects,assets:catalog.assets.filter(a=>[plan.asset_id,...plan.characters.map(c=>c.asset_id),plan.background_asset_id].includes(a.id)),fonts:catalog.fonts,base:new URL(import.meta.env.BASE_URL,location.href).href}
 const cache=thumbnail?resultCache.background:resultCache.editor,key=RENDER_VERSION+JSON.stringify(input),cached=cache.get(key);if(cached){cache.delete(key);cache.set(key,cached);return {...cached,plan:structuredClone(plan),info:{...cached.info,elapsed_ms:0,cache_hit:true}}}
 const started=performance.now(),q=thumbnail?(background??=new RenderQueue()):(editor??=new RenderQueue()),result=await q.run(input,signal);if(signal?.aborted)throw new DOMException('Aborted','AbortError')
 const rendered={url:URL.createObjectURL(result.blob),filename:'emojis-plus-'+Date.now()+'.'+plan.format,info:{...result.info,elapsed_ms:Math.round(performance.now()-started),cache_hit:false},plan:structuredClone(plan)};cache.set(key,rendered);while(cache.size>16){const oldest=cache.keys().next().value!;URL.revokeObjectURL(cache.get(oldest)!.url);cache.delete(oldest)}return rendered
}
