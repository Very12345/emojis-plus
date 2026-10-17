import {preferredMaterial} from '../materials'
import {composeAgentPlan} from './agent-plan'
import {getCatalog} from './catalog'
import {configured} from './ai'
import {dispatch,subscribeJob,waitLocalJob} from './service'
import {applyTemplatePlan,validatePlan} from './plans'
import {applyComposition} from '../themes/plans'
import {makePlan,type Plan,type Rendered,type Generation} from '../api'
import type {Catalog} from './types'
import {appendProcessEvent,type ProcessEvent} from './process'
import {captureOutputs} from './projects'
export interface BridgeTask {id:string;operation:string;status:string;events:ProcessEvent[];files:Rendered[];project_ids?:string[];error?:string}
const privateHost=(host:string)=>{if(['localhost','127.0.0.1','[::1]'].includes(host))return true;if(!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host))return false;const n=host.split('.').map(Number);return n.every(v=>v<=255)&&(n[0]===10||n[0]===192&&n[1]===168||n[0]===172&&n[1]>=16&&n[1]<=31)}
export function bridgeAddress(raw:string){const u=new URL(raw);if(u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('请填写通信桥根地址，不要添加路径或参数。');if(!['http:','https:'].includes(u.protocol)||!privateHost(u.hostname))throw Error('请使用本机或局域网通信桥地址。');return u.origin}

export async function connectBridge(address:string,token:string,name:string,onTask:(t:BridgeTask)=>void,onStatus:(s:string)=>void){
 const base=bridgeAddress(address);if(!token.trim())throw Error('请填写通信桥配对码。');const controller=new AbortController(),active=new Map<string,AbortController>();let browserId='',browserKey=''
 const request=async(path:string,body?:any,signal:AbortSignal=controller.signal,binary=false)=>{const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(browserKey?{'X-EP-Browser-Key':browserKey}:{}),...(body!==undefined&&!binary?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:binary?body:JSON.stringify(body),signal:AbortSignal.any([signal,controller.signal,AbortSignal.timeout(path.startsWith('/bridge/poll/')?30000:20000)]),credentials:'omit',referrerPolicy:'no-referrer',targetAddressSpace:['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname)?'loopback':'local'}as RequestInit);const result=await response.json();if(!response.ok)throw Error(result.error||'通信桥 HTTP '+response.status);return result}
 const c=await getCatalog(),catalog={schema_version:1,capabilities:{generate:configured(),compose:true,render:true,formats:['jpg','gif'],sizes:[256,512],max_characters:6,presentations:['chat','original'],interactions:['chase']},assets:c.assets.filter(preferredMaterial).map(a=>({...a,url:a.url.startsWith('blob:')?undefined:a.url,poster_url:a.poster_url?.startsWith('blob:')?undefined:a.poster_url})),templates:c.templates,themes:c.themes,props:c.props,compositions:c.compositions,effects:c.effects,fonts:c.fonts.map(({id,name,description})=>({id,name,description})),categories:c.categories}
 let clientId=localStorage.getItem('ep-agent-client-id');if(!clientId){clientId=crypto.randomUUID();localStorage.setItem('ep-agent-client-id',clientId)}const registered=await request('/bridge/register',{name,catalog,client_id:clientId});browserId=registered.browser_id;browserKey=registered.browser_key;onStatus('已连接 · '+browserId.slice(0,8))
 async function execute(command:any){const task:BridgeTask={id:command.id,operation:command.operation,status:'working',events:[],files:[]},abort=new AbortController();active.set(task.id,abort);const stop=()=>abort.abort();controller.signal.addEventListener('abort',stop,{once:true});let unsubscribe=()=>{},eventQueue=Promise.resolve();onTask({...task})
  const event=(e:ProcessEvent)=>{task.events=appendProcessEvent(task.events,e);task.status=e.stage;onTask({...task});if(!['completed','failed','cancelled'].includes(e.stage))eventQueue=eventQueue.then(()=>request('/bridge/jobs/'+task.id+'/events',e,abort.signal)).catch(()=>{})}
  try{
   let result:Rendered|Generation
   if(command.operation==='generate'){const data=command.payload,{job_id}=await dispatch('/generations?purpose=agent',{method:'POST',body:JSON.stringify({prompt:data.prompt,format:data.format||'jpg',character:data.character||null}),signal:abort.signal});unsubscribe=subscribeJob(job_id,event);result=await waitLocalJob<Generation>(job_id,undefined,abort.signal)}
   else{const plan=command.operation==='compose'?composeAgentPlan(c,command.payload):command.payload.plan;validatePlan(plan,c);const {job_id}=await dispatch('/renders?purpose=agent',{method:'POST',body:JSON.stringify(plan),signal:abort.signal});unsubscribe=subscribeJob(job_id,event);result=await waitLocalJob<Rendered>(job_id,undefined,abort.signal)}
   task.status='rendering';event({seq:(task.events.at(-1)?.seq||0)+1,at:Date.now(),stage:'rendering',message:'浏览器绘制完成，正在交付成品。',percent:100});await eventQueue;const results='candidates'in result?result.candidates:[result],descriptions=[]
   try{task.project_ids=await captureOutputs(results,'agent',task.id)}catch{/* Keep the downloadable API result available even if browser storage is full. */}
   for(let i=0;i<results.length;i++){const r=results[i],blob=await fetch(r.url,{signal:abort.signal}).then(r=>r.blob()),filename=(results.length>1?'candidate-'+(i+1):'render')+'.'+r.plan.format;task.files.push({...r,filename,url:URL.createObjectURL(blob)});descriptions.push({plan:r.plan,info:r.info,file_name:filename,project_id:task.project_ids?.[i],...('reason'in r?{reason:r.reason}:{}),...('style'in r?{style:r.style}:{})})}
   onTask({...task});for(const r of task.files)await request('/bridge/jobs/'+task.id+'/files/'+r.filename,await fetch(r.url,{signal:abort.signal}).then(r=>r.blob()),abort.signal,true)
   await request('/bridge/jobs/'+task.id+'/complete',{result:'candidates'in result?{intent:result.intent,candidates:descriptions}:descriptions[0]},abort.signal);event({seq:(task.events.at(-1)?.seq||0)+1,at:Date.now(),stage:'completed',message:'成品已交付，可载入或下载。',percent:100})
  }catch(e){task.error=abort.signal.aborted?'Agent 任务已取消。':e instanceof Error?e.message:'任务失败';event({seq:(task.events.at(-1)?.seq||0)+1,at:Date.now(),stage:abort.signal.aborted?'cancelled':'failed',message:task.error});if(!controller.signal.aborted)await request('/bridge/jobs/'+task.id+'/complete',{error:task.error}).catch(()=>{})}finally{unsubscribe();active.delete(task.id);controller.signal.removeEventListener('abort',stop)}
 }
 const polling=(async()=>{try{while(!controller.signal.aborted){const {command}=await request('/bridge/poll/'+browserId);if(command?.type==='cancel')active.get(command.job_id)?.abort();else if(command?.type==='job')void execute(command.job)}}catch(e){if(!controller.signal.aborted){onStatus('连接中断：'+(e instanceof Error?e.message:'网络错误'));active.forEach(a=>a.abort());throw e}}})()
 return {browserId,polling,disconnect:async()=>{await request('/bridge/disconnect',{browser_id:browserId},AbortSignal.timeout(2000)).catch(()=>{});controller.abort();active.forEach(a=>a.abort())}}
}
