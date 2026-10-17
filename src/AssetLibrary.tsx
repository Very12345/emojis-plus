import {preferredMaterial,materialMoods,matchesMaterialMood} from './materials'
import './materials.css'
import {characterLabel} from './library'
import {useEffect,useState,useRef} from 'react'
import {ArrowRight, Check, CircleHelp, Search} from 'lucide-react'
import type {Asset} from './api'
import {balancedAssets,characterCoverIds,isCutout,originalAssetKey,sortCharacters} from './library'

export default function AssetLibrary({assets,character,onCharacter,onSelect}:{assets:Asset[];character:string;onCharacter:(c:string)=>void;onSelect:(a:Asset)=>void}){
  const gallery=useRef<HTMLDivElement>(null)
  const [kind,setKind]=useState<'all'|'cutout'|'gif'>('all'),[search,setSearch]=useState(''),[includeAlternates,setIncludeAlternates]=useState(false),[mood,setMood]=useState('')
  useEffect(()=>{setKind('all');setSearch('');setMood('');setPage(1)},[character])
  const [section,setSection]=useState<'subjects'|'backgrounds'>('subjects'),[backgroundGroup,setBackgroundGroup]=useState(''),[page,setPage]=useState(1)
  const allCollection=assets.filter(a=>section==='backgrounds'?a.metadata.role==='background':a.metadata.role!=='background'),collection=allCollection.filter(a=>includeAlternates||preferredMaterial(a))
  const activeRole=section==='backgrounds'?backgroundGroup:character
  const roles=sortCharacters([...new Set(collection.map(a=>a.character))])
  const summary=(items:Asset[])=>({total:items.length,originals:new Set(items.map(a=>originalAssetKey(a,assets))).size,cutouts:items.filter(isCutout).length,gifs:items.filter(a=>a.info.frames>1).length})
  const scoped=collection.filter(a=>!activeRole||a.character===activeRole)
  const counts=summary(scoped)
  const shown=balancedAssets(scoped.filter(a=>(kind==='all'||kind==='cutout'&&isCutout(a)||kind==='gif'&&a.info.frames>1)&&
    matchesMaterialMood(a,mood)&&(!search||[a.name,a.character,a.metadata.action,...a.metadata.emotion,...a.metadata.scenes,a.metadata.source_note].join(' ').toLowerCase().includes(search.toLowerCase()))),true)
  const pages=Math.max(1,Math.ceil(shown.length/48)),currentPage=Math.min(page,pages),visible=shown.slice((currentPage-1)*48,currentPage*48)
  function chooseRole(c:string){if(section==='backgrounds')setBackgroundGroup(c);else onCharacter(c);setKind('all');setSearch('');setMood('');setPage(1)}
  function changeSection(s:'subjects'|'backgrounds'){setSection(s);setKind('all');setSearch('');setMood('');setPage(1)}
  return <section className="library-panel"><div className="asset-library-modes"><button className={section==='subjects'?'active':''} onClick={()=>changeSection('subjects')}>角色素材 · {assets.filter(a=>a.metadata.role!=='background').length}</button><button className={section==='backgrounds'?'active':''} onClick={()=>changeSection('backgrounds')}>场景背景 · {assets.filter(a=>a.metadata.role==='background').length}</button></div>
    <div className="role-overview-heading"><div><h2>{section==='backgrounds'?'选择场景背景':'按角色挑素材'}</h2><p>{section==='backgrounds'?'背景单独更换，可与多个透明角色组合。':'默认精选清晰、有区别的状态；备选、原始文件和旧作品仍保留。'}</p></div><button className={!activeRole?'active':''} onClick={()=>chooseRole('')}>{section==='backgrounds'?'全部场景':'全部角色'} · {collection.length}</button></div>
    <div className="role-grid">{roles.map(c=>{const group=collection.filter(a=>a.character===c),stats=summary(group),cover=group.find(a=>a.id===characterCoverIds[c])||group.find(isCutout)||group[0];return <button key={c} className={'role-card '+(activeRole===c?'active':'')} aria-label={'查看'+c+'素材'} onClick={()=>chooseRole(c)}><div className="role-avatar"><img src={cover.poster_url||cover.url} alt="" loading="lazy"/></div><span><strong>{characterLabel(c)}<i>{stats.originals} 份原始</i></strong><small>{section==='backgrounds'?'场景图片 '+stats.total:'抠图 '+stats.cutouts+' · GIF '+stats.gifs}</small></span>{activeRole===c&&<Check size={15}/>}</button>})}</div>
    <div className="library-usage-note"><CircleHelp size={15}/><p>{section==='backgrounds'?'场景来源与加工方式可在每张图的说明中查看；牛来同人场景与电影原帧分别标注。':<><strong>透明抠图</strong>可单独换背景、复制和做花瓣组合；<strong>原图带字</strong>会保留原有文字。两种版本分别存放，可随时切换。</>}</p></div>
    <div className="library-toolbar"><div className="search-field"><Search size={17}/><input aria-label="搜索素材" placeholder="搜索角色、动作、情绪或场景…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></div><span className="library-scope">{activeRole||(section==='backgrounds'?'全部场景':'全部角色')} · 原始 {counts.originals} / 文件 {shown.length}</span></div>
    {section==='subjects'&&<><div className="material-review-toolbar"><label className="check-label"><input aria-label="显示备选素材" type="checkbox" checked={includeAlternates} onChange={e=>{setIncludeAlternates(e.target.checked);setPage(1)}}/>显示备选版本 · {allCollection.filter(a=>a.metadata.library_status==='alternate').length}</label><span>保留全部文件与来源，备选不参与默认推荐</span></div><details className="material-mood-panel"><summary>按心情挑选{mood?' · '+materialMoods.find(m=>m.id===mood)?.name:''}</summary><div className="material-mood-chips"><button className={!mood?'active':''} onClick={()=>{setMood('');setPage(1)}}>全部心情</button>{materialMoods.map(m=><button key={m.id} className={mood===m.id?'active':''} onClick={()=>{setMood(m.id);setPage(1)}}>{m.name} · {scoped.filter(a=>matchesMaterialMood(a,m.id)).length}</button>)}</div></details></>}
    {section==='subjects'&&<div className="asset-kind-tabs"><span>素材形式</span>{(['all','cutout','gif']as const).map(k=><button key={k} className={kind===k?'active':''} onClick={()=>{setKind(k);setPage(1)}}>{{all:'全部素材',cutout:'抠图透明版',gif:'原生 GIF'}[k]}<span>{k==='all'?counts.total:k==='cutout'?counts.cutouts:counts.gifs}</span></button>)}</div>}
    <div className="library-grid" ref={gallery}>{visible.map(a=>{
      const original=assets.find(x=>x.id===a.metadata.derived_from)
      const cutout=assets.find(x=>x.metadata.derived_from===a.id&&isCutout(x))
      return <article className="asset-card" key={a.id}><div className="asset-picture"><img src={a.poster_url||a.url} alt={a.name} loading="lazy"/><span className={'asset-type-badge '+(isCutout(a)?'is-cutout':'')}>{a.metadata.role==='background'?'场景背景':isCutout(a)?'透明抠图':a.info.frames>1?'原生 GIF':a.metadata.existing_text?'原图带字':'原图'}</span></div><div className="asset-card-body"><div className="asset-title"><h3>{characterLabel(a.character)}</h3>{/AI/.test(a.metadata.author)&&<span className="derived-badge">AI派生</span>}{a.metadata.source_type==='user_original'&&<span className="original-badge">原创角色</span>}</div><p>{a.name}</p>{a.metadata.library_status==='alternate'&&<p className="material-hint">备选 · {a.metadata.review_note}</p>}{(a.metadata.subject_count||1)>1&&<p className="material-hint">组合素材 · 含{a.metadata.subject_count}个主体，不能分别移动</p>}<div className="asset-tags">{a.metadata.emotion.slice(0,3).map(t=><span key={t}>{t}</span>)}</div><button className="button secondary" onClick={()=>onSelect(a)}>{a.metadata.role==='background'?'设为背景':isCutout(a)?'用这张抠图制作':'用这张制作'}<ArrowRight size={15}/></button>
        {(original||cutout)&&<button className="paired-asset-button" onClick={()=>onSelect((original||cutout)!)}>{original?'改用保留的原图':'改用对应的透明抠图'}<ArrowRight size={12}/></button>}
        <details className="source-details"><summary>来源与加工说明<CircleHelp size={12}/></summary><p>{a.metadata.author&&('作者：'+a.metadata.author+'。')}{a.metadata.source_note||'来源待补充。'}</p>{a.metadata.source_url&&<a href={a.metadata.source_url} target="_blank" rel="noreferrer">查看来源 ↗</a>}</details></div></article>
    })}</div>
    {pages>1&&<div className="asset-pagination"><button className="button secondary" disabled={currentPage===1} onClick={()=>{setPage(currentPage-1);gallery.current?.scrollIntoView({block:'start'})}}>上一页</button><span>第 {currentPage} / {pages} 页 · 每页 48 张</span><button className="button secondary" disabled={currentPage===pages} onClick={()=>{setPage(currentPage+1);gallery.current?.scrollIntoView({block:'start'})}}>下一页</button></div>}
    {!shown.length&&<div className="empty-state"><Search size={30}/><p>{mood?'当前心情没有匹配的精选状态，可查看备选或选择其他心情。':kind==='gif'?`${character||'当前筛选'}没有匹配的 GIF，静图与抠图仍可使用。`:kind==='cutout'?'当前筛选没有匹配的透明主体。':'没有匹配素材，试试其他关键词。'}</p><button className="button secondary" onClick={()=>{setKind('all');setSearch('');setMood('')}}>清除筛选，查看全部素材</button></div>}
  </section>
}
