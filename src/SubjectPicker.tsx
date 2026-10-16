import {characterLabel} from './library'
import {useEffect,useRef} from 'react'
import type {Asset,Plan,Template} from './api'
import {isCutout,preferredCharacterAsset,sortCharacters} from './library'

export default function SubjectPicker({assets,templates,plan,onChoose}:{assets:Asset[];templates:Template[];plan:Plan;onChoose:(a:Asset)=>void}){
  const selected=assets.find(a=>a.id===plan.asset_id)
  const last=useRef<Record<string,string>>({})
  useEffect(()=>{if(selected)last.current[selected.character]=selected.id},[selected])
  const characters=sortCharacters([...new Set(assets.filter(a=>a.metadata.role!=='background').map(a=>a.character))])
  const group=assets.filter(a=>a.character===selected?.character&&a.metadata.role!=='background')
  return <div className="subject-picker">
    <label className="field-label">主体角色<select aria-label="主体角色" value={selected?.character||''} onChange={e=>{const asset=preferredCharacterAsset(assets,e.target.value,plan,last.current[e.target.value],templates);if(asset)onChoose(asset)}}>{characters.map(c=><option key={c} value={c}>{characterLabel(c)}</option>)}</select></label>
    {selected&&<><label className="field-label">角色状态<span className="label-meta">{group.length} 种 · 抠图 {group.filter(isCutout).length}</span><select aria-label="角色状态" value={selected.id} onChange={e=>{const asset=assets.find(a=>a.id===e.target.value);if(asset)onChoose(asset)}}>{group.map(a=><option key={a.id} value={a.id}>{a.name}{isCutout(a)?' · 透明':a.info.frames>1?' · GIF':''}</option>)}</select></label>
      <div className="selected-subject"><img src={selected.url} alt={selected.name}/><span><strong>{characterLabel(selected.character)}</strong><small>{isCutout(selected)?'透明主体，可单独换背景':selected.metadata.existing_text?'原图配字保留':'完整原图'}</small><small>{selected.metadata.action}</small></span></div></>}
  </div>
}
