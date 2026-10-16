import {useEffect,useRef,useState} from 'react'
import {samePlan,type Plan,type Rendered} from './api'
import {getProject,lastProject,newProject,putProject,saveSnapshot,rememberProject,renameProject,projectRendered,type Project} from './local/projects'

export default function useProjects(plan:Plan|null,prompt:string,rendered:Rendered|null,apply:(p:Plan,prompt:string,r:Rendered|null)=>void){
 const [project,setProject]=useState<Project|null>(null),[ready,setReady]=useState(false),[saveStatus,setSaveStatus]=useState('正在读取项目…'),[error,setError]=useState('')
 const active=useRef<Project|null>(null),latest=useRef({plan,prompt,rendered}),queue=useRef(Promise.resolve()),restore=useRef(false),restoredURL=useRef(''),known=useRef(new Map<string,Project>()),pending=useRef(0)
 latest.current={plan,prompt,rendered}
 function activate(p:Project){active.current=p;known.current.set(p.id,p);setProject(p);setSaveStatus('已保存到此浏览器');setError('');void rememberProject(p.id).catch(e=>setError(String(e)));if(restoredURL.current)URL.revokeObjectURL(restoredURL.current);const result=projectRendered(p);restoredURL.current=result?.url||'';latest.current={plan:p.plan,prompt:p.prompt,rendered:result};apply(p.plan,p.prompt,result)}
 useEffect(()=>{if(restore.current)return;restore.current=true;void lastProject().then(p=>{if(p)activate(p)}).catch(e=>setError(e instanceof Error?e.message:'项目读取失败')).finally(()=>setReady(true))},[])
 async function save(){
  const snapshot=latest.current;if(!snapshot.plan)return;
  if(!active.current){active.current=newProject(snapshot.plan,snapshot.prompt);setProject(active.current);void rememberProject(active.current.id).catch(()=>{})}
  const base=active.current,id=base.id,copy=structuredClone(snapshot.plan),text=snapshot.prompt,result=snapshot.rendered&&samePlan(snapshot.rendered.plan,copy)?snapshot.rendered:null;
  setSaveStatus('正在保存…');pending.current++;
  const task=queue.current.catch(()=>{}).then(async()=>{
   // Read the latest persisted metadata so autosave cannot undo a rename in another tab.
   const baseline=known.current.get(id)||base;let preview:Partial<Pick<Project,'blob'|'render_plan'|'info'|'filename'>>={};
   if(result){try{const response=await fetch(result.url);if(response.ok)preview={blob:await response.blob(),render_plan:copy,info:result.info,filename:result.filename}}catch{/* A worker-cache eviction must never prevent saving editable content. */}}
   const {project:next,fork,unchanged}=await saveSnapshot(baseline,{plan:copy,prompt:text,...preview});if(unchanged){setSaveStatus('另一标签页已更新，重新打开可载入');return}known.current.set(next.id,next);
   if(active.current?.id===id){active.current=next;setProject(next);if(fork)void rememberProject(next.id);setSaveStatus(fork?'另一页也有修改，已另存为副本':latest.current.plan&&samePlan(copy,latest.current.plan)&&text===latest.current.prompt?'已自动保存':'有修改，等待保存');setError('')}
  });queue.current=task;try{await task}catch(e){setSaveStatus('保存失败');setError(e instanceof Error?e.message:'本地存储空间不足，请备份作品后清理空间。');throw e}finally{pending.current--}
 }
 useEffect(()=>{if(!ready||!plan)return;setSaveStatus('有修改，等待保存');const timer=setTimeout(()=>void save().catch(()=>{}),700);return()=>clearTimeout(timer)},[ready,plan,prompt,rendered])
 useEffect(()=>{const flush=()=>{if(document.visibilityState==='hidden')void save().catch(()=>{})};document.addEventListener('visibilitychange',flush);return()=>document.removeEventListener('visibilitychange',flush)},[])
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{const v=latest.current,p=active.current;if(pending.current||v.plan&&(!p||!samePlan(v.plan,p.plan)||v.prompt!==p.prompt)){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[])
 async function open(id:string){await save();const next=await getProject(id);if(!next)throw Error('这个项目已被删除。');activate(next)}
 async function create(p:Plan){await save();const next=newProject(p);await putProject(next);activate(next)}
 async function rename(name:string){await save();if(!active.current)return;await renameProject(active.current.id,name);active.current={...active.current,name:name.trim().slice(0,100)};setProject(active.current)}
 return {project,ready,saveStatus,error,save,open,create,rename}
}
