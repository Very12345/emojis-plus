import {characterLabel,assetSupportsTemplate} from './library'
import {useEffect,useRef,useState} from 'react'
import type {Asset,Plan,Template} from './api'
import {isCutout,preferredCharacterAsset,sortCharacters} from './library'
import {materialChoices,materialMoods,matchesMaterialMood,preferredMaterial} from './materials'

export default function SubjectPicker({assets,templates,plan,onChoose}:{assets:Asset[];templates:Template[];plan:Plan;onChoose:(a:Asset)=>void}){
 const selected=assets.find(a=>a.id===plan.asset_id),last=useRef<Record<string,string>>({}),[mood,setMood]=useState('')
 useEffect(()=>{if(selected)last.current[selected.character]=selected.id},[selected])
 useEffect(()=>setMood(''),[selected?.character])
 const characters=sortCharacters([...new Set(assets.filter(a=>a.metadata.role!=='background').map(a=>a.character))]),all=assets.filter(a=>a.character===selected?.character&&a.metadata.role!=='background'),group=materialChoices(all,selected?.id),shown=group.filter(a=>matchesMaterialMood(a,mood)),template=templates.find(t=>t.id===plan.template_id)
 function chooseMood(value:string){setMood(value);if(!value||selected&&matchesMaterialMood(selected,value))return;const choices=group.filter(a=>matchesMaterialMood(a,value)&&(!template||assetSupportsTemplate(a,template)));const next=choices.find(isCutout)||choices[0];if(next)onChoose(next)}
 return <div className="subject-picker">
  <label className="field-label">主体角色<select aria-label="主体角色" value={selected?.character||''} onChange={e=>{const asset=preferredCharacterAsset(assets,e.target.value,plan,last.current[e.target.value],templates);if(asset)onChoose(asset)}}>{characters.map(c=><option key={c} value={c}>{characterLabel(c)}</option>)}</select></label>
  {selected&&<><label className="field-label">按心情找状态<select aria-label="主体心情" value={mood} onChange={e=>chooseMood(e.target.value)}><option value="">全部心情</option>{materialMoods.map(m=><option key={m.id} value={m.id}>{m.name} · {group.filter(a=>matchesMaterialMood(a,m.id)).length}</option>)}</select></label>
   <label className="field-label">角色状态<span className="label-meta">精选 {all.filter(preferredMaterial).length} · 全部 {all.length}</span><select aria-label="角色状态" value={selected.id} onChange={e=>{const asset=assets.find(a=>a.id===e.target.value);if(asset)onChoose(asset)}}>{!shown.some(a=>a.id===selected.id)&&<option value={selected.id}>{selected.name} · 当前素材</option>}{shown.map(a=><option key={a.id} value={a.id}>{a.name}{a.metadata.library_status==='alternate'?' · 备选':isCutout(a)?' · 透明':a.info.frames>1?' · GIF':''}</option>)}</select></label>
   {mood&&!shown.length&&<p className="material-hint">当前精选暂无这一心情，原素材保持不变。可清除心情筛选，或在素材库查看备选版本。</p>}
   <div className="selected-subject"><img src={selected.poster_url||selected.url} alt={selected.name}/><span><strong>{characterLabel(selected.character)}</strong><small>{isCutout(selected)?'透明主体，可单独换背景':selected.metadata.existing_text?'原图配字保留':'完整原图'}</small><small>{selected.metadata.action}</small>{(selected.metadata.subject_count||1)>1&&<small>组合素材 · 含{selected.metadata.subject_count}个主体</small>}</span></div>
  </>}
 </div>
}
