import {projectDatabase as database,readLocal,writeLocal} from './storage'
import {samePlan,type Plan,type Rendered} from '../api'

export interface Project {
 id:string;name:string;plan:Plan;prompt:string;created_at:number;updated_at:number;
 source:'manual'|'ai'|'agent';source_id?:string;blob?:Blob;render_plan?:Plan;
 info?:Rendered['info'];filename?:string
}
export const projectName=(p:Plan)=>((p.text||p.secondary_text||'未命名创作').replace(/\s+/g,' ').trim().slice(0,32)||'未命名创作')
const announce=()=>{window.dispatchEvent(new Event('ep-projects'));try{localStorage.setItem('ep-projects-changed',crypto.randomUUID())}catch{/* IDB remains usable when localStorage is blocked. */}}
export async function listProjects():Promise<Project[]>{const db=await database;return new Promise((resolve,reject)=>{const r=db.transaction('projects').objectStore('projects').getAll();r.onsuccess=()=>resolve(r.result.sort((a:Project,b:Project)=>b.updated_at-a.updated_at));r.onerror=()=>reject(r.error)})}
export async function getProject(id:string):Promise<Project|undefined>{const db=await database;return new Promise((resolve,reject)=>{const r=db.transaction('projects').objectStore('projects').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function putProject(project:Project,onlyNew=false){const db=await database;await new Promise<void>((resolve,reject)=>{const tx=db.transaction('projects','readwrite'),store=tx.objectStore('projects');if(onlyNew){const r=store.get(project.id);r.onsuccess=()=>{if(!r.result)store.put(project)}}else store.put(project);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});announce()}
export async function saveSnapshot(base:Project,snapshot:Pick<Project,'plan'|'prompt'>&Partial<Pick<Project,'blob'|'render_plan'|'info'|'filename'>>){
 const db=await database;const result=await new Promise<{project:Project;fork:boolean;unchanged:boolean}>((resolve,reject)=>{const tx=db.transaction('projects','readwrite'),store=tx.objectStore('projects'),read=store.get(base.id);let answer:{project:Project;fork:boolean;unchanged:boolean};read.onsuccess=()=>{const previous:Project=read.result||base,conflict=!samePlan(previous.plan,base.plan)||previous.prompt!==base.prompt;
  if(conflict&&samePlan(snapshot.plan,base.plan)&&snapshot.prompt===base.prompt){answer={project:previous,fork:false,unchanged:true};return}
  const fork=conflict&&(!samePlan(snapshot.plan,previous.plan)||snapshot.prompt!==previous.prompt),metadata=fork?{...base,id:crypto.randomUUID(),name:base.name+' · 此页副本',created_at:Date.now()}:previous,project={...metadata,...snapshot,updated_at:Date.now()};store.put(project);answer={project,fork,unchanged:false}
 };tx.oncomplete=()=>resolve(answer);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});if(!result.unchanged)announce();return result
}
export async function renameProject(id:string,name:string){name=name.trim().slice(0,100);if(!name)throw Error('项目名称不能为空。');const db=await database;await new Promise<void>((resolve,reject)=>{const tx=db.transaction('projects','readwrite'),store=tx.objectStore('projects'),r=store.get(id);r.onsuccess=()=>{if(r.result)store.put({...r.result,name,updated_at:Date.now()})};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});announce()}
export async function removeProject(id:string){const db=await database;await new Promise<void>((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});announce()}
export function newProject(plan:Plan,prompt=''):Project{const time=Date.now();return {id:crypto.randomUUID(),name:projectName(plan),plan:structuredClone(plan),prompt,source:'manual',created_at:time,updated_at:time}}
export async function rememberProject(id:string){sessionStorage.setItem('ep-current-project',id);await writeLocal('last-project',id)}
export async function lastProject(){const id=sessionStorage.getItem('ep-current-project')||await readLocal<string>('last-project');return id?getProject(id):undefined}
export async function captureOutputs(files:Rendered[],source:'agent'|'ai',sourceId:string,prompt=''){
 const ids:string[]=[];
 for(let i=0;i<files.length;i++){const r=files[i],id=source+'-'+sourceId+'-'+i,now=Date.now(),response=await fetch(r.url);if(!response.ok)throw Error('成品文件已失效，请重新生成。');const blob=await response.blob();await putProject({id,name:projectName(r.plan)+(files.length>1?' · '+(i+1):''),plan:structuredClone(r.plan),prompt,source,source_id:sourceId,created_at:now,updated_at:now,blob,render_plan:structuredClone(r.plan),info:r.info,filename:r.filename},true);ids.push(id)}return ids
}
export function projectRendered(p:Project):Rendered|null{return p.blob&&p.info&&p.render_plan&&samePlan(p.plan,p.render_plan)?{url:URL.createObjectURL(p.blob),plan:structuredClone(p.render_plan),info:p.info,filename:p.filename||p.name+'.'+p.plan.format}:null}
