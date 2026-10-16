import {useState} from 'react'
import {Check,ImagePlus} from 'lucide-react'
import type {Asset} from './api'

export default function ScenePicker({assets,selected,onChoose}:{assets:Asset[];selected:string|null;onChoose:(a:Asset)=>void}){
  const [open,setOpen]=useState(false)
  const backgrounds=assets.filter(a=>a.metadata.role==='background')
  const current=backgrounds.find(a=>a.id===selected)
  return <section className="scene-picker"><div className="label-row field-label">场景背景<span>{backgrounds.length} 个场景</span></div><button className="scene-current" onClick={()=>setOpen(!open)}>{current?<img src={current.poster_url||current.url} alt={current.name}/>:<ImagePlus size={24}/>}<span><strong>{current?.name||'选择一张场景背景'}</strong><small>牛来同人场景、自然景色、教室与图书馆</small></span></button>
    {open&&<div className="scene-option-grid">{backgrounds.map(a=><button key={a.id} className={selected===a.id?'active':''} title={a.metadata.source_note} onClick={()=>{onChoose(a);setOpen(false)}}><img src={a.poster_url||a.url} alt={a.name} loading="lazy"/><span>{a.name}</span>{selected===a.id&&<Check size={13}/>}</button>)}</div>}
    {!backgrounds.length&&<p className="muted">在设置中导入时选择“独立背景”即可加入场景库。</p>}
  </section>
}
