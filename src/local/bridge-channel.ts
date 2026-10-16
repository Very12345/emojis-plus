import {connectBridge,type BridgeTask} from './bridge'
import {captureOutputs,getProject,projectRendered} from './projects'
export interface Pairing {address:string;token:string;name:string;enabled:boolean}
const key='ep-agent-pairing-v1',channelName='ep-agent-workbench-v2'
export function savedPairing():Pairing|null{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
export function savePairing(p:Pairing){localStorage.setItem(key,JSON.stringify(p));window.dispatchEvent(new Event('ep-pairing'))}
// One transport per origin, shared by all open workbenches. Files are stored before
// publishing IDs, so a closing worker tab cannot invalidate another tab's history.
export function shareBridge(onTask:(t:BridgeTask)=>void,onStatus:(s:string)=>void,onResults:(ids:string[])=>void,onError:(s:string)=>void){
 const channel=new BroadcastChannel(channelName),instance=crypto.randomUUID(),seen=new Set<string>();let stopped=false,session:Awaited<ReturnType<typeof connectBridge>>|null=null,owner=false,status='未连接',lastHeartbeat=0,configVersion=0;
 const send=(data:any)=>{if(!stopped)channel.postMessage({...data,sender:instance})}
 const report=(s:string)=>{status=s;onStatus(s);if(owner)send({type:'status',status:s})}
 async function receiveResults(ids:string[]){const files=[];for(const id of ids){const p=await getProject(id),file=p&&projectRendered(p);if(file)files.push(file)}return files}
 channel.onmessage=event=>{const d=event.data;if(d?.sender===instance)return;if(d?.type==='status'){lastHeartbeat=Date.now();if(!owner)onStatus(d.status.startsWith('已连接')?d.status+' · 同浏览器共享':d.status)}if(d?.type==='task'&&!owner)onTask(d.task);if(d?.type==='results'&&!seen.has(d.id)){seen.add(d.id);void receiveResults(d.ids).then(files=>{onTask({...d.task,files});onResults(d.ids)}).catch(e=>onError(String(e)))}}
 const changed=()=>{configVersion++;void session?.disconnect();session=null;if(!savedPairing()?.enabled)report('未连接 · 自动连接已关闭')}
 const storage=(e:StorageEvent)=>{if(e.key===key)changed()}
 window.addEventListener('ep-pairing',changed);window.addEventListener('storage',storage)
 const delay=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms))
 const task=(t:BridgeTask)=>{
  onTask(t);send({type:'task',task:{...t,files:[]}})
  if((t.project_ids?.length||t.status==='completed')&&t.files.length&&!seen.has(t.id)){seen.add(t.id);void (t.project_ids?Promise.resolve(t.project_ids):captureOutputs(t.files,'agent',t.id)).then(ids=>{send({type:'results',id:t.id,ids,task:{...t,files:[]}});onResults(ids)}).catch(e=>onError('Agent 成品已完成，但项目保存失败：'+String(e)))}
 }
 void(async()=>{let failures=0;
  while(!stopped){const pairing=savedPairing();if(!pairing?.enabled){if(!owner)onStatus('未连接');await delay(1000);continue}
   if(!navigator.locks){onStatus('此浏览器不支持共享连接，请使用新版 Chrome、Edge 或 Firefox。');await delay(5000);continue}
   await navigator.locks.request('emojis-plus-agent-transport',{ifAvailable:true},async lock=>{
    if(!lock||stopped)return;owner=true;const version=configVersion;report(failures?'正在重新连接…':'正在连接通信桥…');const heartbeat=setInterval(()=>send({type:'status',status}),2000)
    try{const connected=await connectBridge(pairing.address,pairing.token,pairing.name,task,report);session=connected;if(stopped||version!==configVersion){await connected.disconnect();return}failures=0;await connected.polling}
    catch(e){failures++;report('连接中断，将自动重试 · '+(e instanceof Error?e.message:String(e)))}
    finally{clearInterval(heartbeat);await session?.disconnect();session=null;owner=false}
   }).catch(e=>onError(String(e)))
   if(!owner&&Date.now()-lastHeartbeat>7000&&failures===0)onStatus('正在等待共享连接…')
   await delay(Math.min(10000,failures?1000*2**Math.min(failures,3):1000))
  }
 })()
 return()=>{stopped=true;configVersion++;window.removeEventListener('ep-pairing',changed);window.removeEventListener('storage',storage);void session?.disconnect();channel.close()}
}
