import ThemeWorkbench from './ThemeWorkbench'
import {reconcileBindings} from './themes/plans'
import {characterLabel} from './library'
import {useEffect, useRef, useState, type FormEvent} from 'react'
import {ArrowDownToLine, ArrowRight, Check, ChevronDown, ChevronRight, CircleHelp, Eye, FlipHorizontal,
  ImagePlus, Layers3, LoaderCircle, LockKeyhole, LogOut, Pencil, Plus, RefreshCw, Search, Settings2,
  ShieldCheck, SlidersHorizontal, Smile, Sparkles, Sticker, Type, WandSparkles, X} from 'lucide-react'
import {api, emptyMetadata, makePlan, samePlan, waitJob, type Asset, type Candidate, type Generation, type Metadata,
  type ModelConfig, type Plan, type Preset, type Caption, type Effect, type EffectOption, type FontOption, type Rendered, type Template, type TemplateId} from './api'
import CanvasEditor from './CanvasEditor'
import FontPreview from './FontPreview'
import {exportRegistry} from './local/service'
import ContentLibrary from './ContentLibrary'
import AssetLibrary from './AssetLibrary'
import {balancedAssets,templateChoices,replaceSubject,sortCharacters,assetSupportsTemplate} from './library'
import TemplateCatalog from './TemplateCatalog'
import TemplateThumbnail from './TemplateThumbnail'
import SubjectPicker from './SubjectPicker'
import ScenePicker from './ScenePicker'
import CharacterLayers from './CharacterLayers'

const ideas = ['学校又临时改安排，我真的很无语', '考试没考好，求老师捞一下', '代码终于跑通了，我要庆祝一下', '朋友又不回我消息，假装生气']
const errorText = (e: unknown) => e instanceof Error ? e.message : '操作失败，请再试一次。'

function Brand({small=false}: {small?: boolean}) {
  return <div className={'brand ' + (small?'brand-small':'')}><span className="brand-icon"><Smile size={24}/><i/></span>
    <div><strong>Emojis<span> Plus</span></strong>{!small && <small>表情实验室</small>}</div></div>
}
function Modal({title, children, onClose, wide=false}: {title: string; children: React.ReactNode; onClose: ()=>void; wide?:boolean}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(()=>{dialog.current?.showModal(); return ()=>dialog.current?.close()},[])
  return <dialog ref={dialog} className={'modal '+(wide?'modal-wide':'')} onCancel={onClose} onClick={e=>{if(e.target===dialog.current)onClose()}}>
    <div className="modal-top"><h2>{title}</h2><button aria-label="关闭" className="icon-button" onClick={onClose}><X size={20}/></button></div>{children}
  </dialog>
}
export default function App(){
  const [loading,setLoading]=useState(true), [role]=useState<string|null>('local')
  const [status,setStatus]=useState<{initialized:boolean;can_setup:boolean;model_configured:boolean}|null>(null)
  const [assets,setAssets]=useState<Asset[]>([]), [templates,setTemplates]=useState<Template[]>([])
  const [presets,setPresets]=useState<Preset[]>([])
  const [effects,setEffects]=useState<EffectOption[]>([])
  const [fonts,setFonts]=useState<FontOption[]>([])
  const [captions,setCaptions]=useState<Caption[]>([]),[contentTab,setContentTab]=useState<'captions'|'presets'|'layouts'>('captions')
  const [view,setView]=useState<'workbench'|'library'|'content'>('workbench')
  const [prompt,setPrompt]=useState(()=>localStorage.getItem('ep-intent')||'')
  const [character,setCharacter]=useState(''), [outputFormat,setOutputFormat]=useState<'jpg'|'gif'>('jpg')
  const [candidates,setCandidates]=useState<Candidate[]>([]), [generation,setGeneration]=useState<Generation|null>(null)
  const [generating,setGenerating]=useState(false), [genStatus,setGenStatus]=useState('')
  const [plan,setPlan]=useState<Plan|null>(null), [rendered,setRendered]=useState<Rendered|null>(null)
  const [canvasGesture,setCanvasGesture]=useState(false)
  const [renderBusy,setRenderBusy]=useState(false), [renderError,setRenderError]=useState('')
  const [notice,setNotice]=useState(''), [adminOpen,setAdminOpen]=useState(false)
  const [advanced,setAdvanced]=useState(false),[castBusy,setCastBusy]=useState(false)
  const [templateScope,setTemplateScope]=useState<'all'|'cast'>('all')
  const castSequence=useRef(0)
  const alive=useRef(true), revision=useRef(0),editorId=useRef(crypto.randomUUID())
  const selected=assets.find(a=>a.id===plan?.asset_id)
  const selectedTemplate=templates.find(t=>t.id===plan?.template_id)
  const selectedLayout=selectedTemplate?.layout_id||plan?.template_id||'bottom'
  const subjects=assets.filter(a=>a.metadata.role!=='background')
  const characters=sortCharacters(Array.from(new Set(subjects.map(a=>a.character))))
  useEffect(()=>{alive.current=true; return()=>{alive.current=false}},[])
  async function reload(){
    const [a,t,s,f,motions]=await Promise.all([api<Asset[]>('/assets'),api<Template[]>('/templates'),
      api<{role:string;model_configured:boolean}>('/session'),api<FontOption[]>('/fonts'),api<EffectOption[]>('/effects')])
    setAssets(a);setTemplates(t);setFonts(f);setEffects(motions)
    setStatus(old=>old?{...old,model_configured:s.model_configured}:old)
    const first=a.find(x=>x.metadata.is_cutout&&x.metadata.role==='subject')||a.find(x=>x.metadata.role!=='background')
    setPlan(current=>current&&a.some(x=>x.id===current.asset_id)?current:first?makePlan(first):null)
    setLoading(false)
    const [p,c]=await Promise.all([api<Preset[]>('/creative-presets'),api<Caption[]>('/captions')])
    setPresets(p);setCaptions(c)
  }
  useEffect(()=>{(async()=>{
    try {const st=await api<typeof status>('/status');setStatus(st)
      if(st?.initialized){const s=await api<{role:string}>('/session');await reload()}
    }catch(e){setNotice(errorText(e))}finally{setLoading(false)}
  })()},[])
  useEffect(()=>{localStorage.setItem('ep-intent',prompt)},[prompt])
  useEffect(()=>{
    if(!plan||!role)return
    const version=++revision.current,controller=new AbortController()
    setRenderBusy(true)
    const timer=setTimeout(async()=>{
      try{
        setRenderError('')
        const {job_id}=await api<{job_id:string}>('/renders?purpose=preview&editor_id='+editorId.current+'&revision='+version,{method:'POST',body:JSON.stringify(plan),signal:controller.signal})
        const result=await waitJob<Rendered>(job_id,undefined,controller.signal)
        if(alive.current&&version===revision.current){setRendered(result);setRenderError('')}
      }catch(e){if(!controller.signal.aborted&&alive.current&&version===revision.current)setRenderError(errorText(e))}
      finally{if(!controller.signal.aborted&&alive.current&&version===revision.current)setRenderBusy(false)}
    },300)
    return()=>{clearTimeout(timer);controller.abort()}
  },[plan,role])
  function update(values:Partial<Plan>){setPlan(p=>p?reconcileBindings({...p,...values}):p)}
  async function commitCast(id:TemplateId,base:Plan,count?:number,additional:string[]=[],applyDefaults=true){
    const before=plan,sequence=++castSequence.current
    setCastBusy(true);setRenderError('')
    try{
      const next=await api<Plan>('/templates/'+id+'/apply',{method:'POST',body:JSON.stringify({plan:{...base,emblem:false},count,additional_asset_ids:additional,apply_defaults:applyDefaults})})
      if(sequence!==castSequence.current)return
      setPlan(current=>{
        if(before&&current&&current.asset_id!==before.asset_id)return current
        const edits=current&&before?Object.fromEntries((Object.keys(current) as (keyof Plan)[]).filter(k=>JSON.stringify(current[k])!==JSON.stringify(before[k])).map(k=>[k,current[k]])):{}
        return {...next,...edits} as Plan
      })
      setView('workbench')
    }catch(e){setNotice(errorText(e))}finally{if(sequence===castSequence.current)setCastBusy(false)}
  }
  async function applyTemplate(id:TemplateId){
    const choice=templateChoices(assets,templates,plan).find(c=>c.template.id===id)
    if(!choice?.asset){setNotice(choice?.reason||'请先选择主体素材。');return}
    const asset=choice.asset,base=plan||makePlan(asset),defaults=choice.template.defaults||{}
    const beforeCount=base.characters.length+1
    await commitCast(id,{...base,asset_id:asset.id,format:choice.template.animation?'gif':base.format,size:choice.template.animation?256:base.size,template_motion:defaults.template_motion??true,
      flip:asset.metadata.existing_text||asset.metadata.allow_flip===false?false:base.flip,
      text_placement:choice.template.supports_embedded?defaults.text_placement||base.text_placement:'caption'},undefined,[],false)
    if(beforeCount>(choice.template.max_characters||6))setNotice('已保留前 '+choice.template.max_characters+' 人，其余人物已移出本次画面。')
    if(choice.switchAsset)setNotice('已切换为'+asset.name+'，继续使用原文案。')
  }
  async function arrangePeople(count:number,assetId?:string,removeIndex?:number){
    if(!plan)return
    const base={...plan,characters:removeIndex===undefined?plan.characters:plan.characters.filter((_,i)=>i!==removeIndex)}
    const active=templates.find(t=>t.id===base.template_id)
    const id=base.composition?'scene':count===1?'bottom':active?.cast?.length&&count>=(active.min_characters||1)&&count<=(active.max_characters||6)?active.id:({2:'cast-duo',3:'cast-trio',4:'cast-quad',6:'cast-six'} as Record<number,string>)[count]||'scene'
    setTemplateScope(count>1?'cast':'all')
    await commitCast(id,base,count,assetId?[assetId]:[],false)
  }
  function openContent(tab:'captions'|'presets'|'layouts'){setContentTab(tab);setView('content')}
  function useCaption(c:Caption){
    const first=selected||subjects[0]
    if(!first){setNotice('请先导入一张主体素材。');return}
    const pairs=templates.filter(t=>(['split','dialogue','comic'].includes(t.layout_id||t.id)||t.layout?.captions.some(c=>c.field==='secondary_text'))&&assetSupportsTemplate(first,t)).map(t=>t.id)
    if(c.secondary_text&&!pairs.length){setNotice('双句文案需要启用上下双行、双人对话或漫画双格。');return}
    setPlan(p=>{const base=p||makePlan(first);const tid=c.secondary_text?(pairs.includes(base.template_id)?base.template_id:pairs[0]):base.template_id;
      return {...base,text:c.text,secondary_text:c.secondary_text,template_id:tid,text_placement:c.secondary_text?'caption':base.text_placement,emblem_mode:base.emblem&&base.emblem_mode==='speaker'&&tid!=='message'?'symbol':base.emblem_mode}})
    setView('workbench');setRenderError('')
  }
  function chooseAsset(asset:Asset, usePrompt=false){
    if(asset.metadata.role==='background'){setPlan(p=>{if(!p)return p;const keep=!!templates.find(t=>t.id===p.template_id)?.cast?.length||p.characters.length>0;return {...p,background_style:'image',background_asset_id:asset.id,template_id:keep?p.template_id:'scene',text_placement:'caption',primary_scale:keep||p.template_id==='scene'?p.primary_scale:.60,primary_y:keep||p.template_id==='scene'?p.primary_y:.62}});setView('workbench');return}
    if(plan?.composition&&!asset.info.has_transparency){const cut=assets.find(a=>a.enabled&&a.character===asset.character&&a.info.has_transparency&&a.metadata.derived_from===asset.id)||assets.find(a=>a.enabled&&a.character===asset.character&&a.info.has_transparency);if(!cut){setNotice(asset.character+'缺少透明素材，当前场景保持不变。');return}asset=cut;setNotice('主题构图需要透明人物，已使用同角色透明素材：'+cut.name)}
    const text=usePrompt&&prompt.trim()&&prompt.length<=160?prompt.trim():undefined
    setPlan(p=>{
      const base=p||{...makePlan(asset,text),format:outputFormat,size:outputFormat==='gif'?256:512} as Plan
      return {...replaceSubject(base,asset,templates),text:text||p?.text||asset.metadata.examples[0]||'让我先缓一缓'}
    })
    setView('workbench');setRenderError('')
  }
  async function generate(){
    if(!prompt.trim()){setNotice('先写下你想表达的意思吧。');return}
    setGenerating(true);setGenStatus('analyzing');setNotice('')
    try {
      const {job_id}=await api<{job_id:string}>('/generations',{method:'POST',body:JSON.stringify({prompt,format:outputFormat,character:character||null})})
      const result=await waitJob<Generation>(job_id,setGenStatus)
      setCandidates(result.candidates);setGeneration(result);setPlan(result.candidates[0].plan);setRendered(result.candidates[0])
    }catch(e){setNotice(errorText(e)+'；也可以在预览下方选择主题，继续手动制作。')}finally{setGenerating(false);setGenStatus('')}
  }
  if(loading)return <div className="loading-page"><Brand/><LoaderCircle className="spin" size={26}/></div>
  const inspirationAssets=balancedAssets(subjects.filter(a=>!character||a.character===character))
  const choices=templateChoices(assets,templates,plan)
  const isFresh=rendered&&plan&&samePlan(rendered.plan,plan)
  return <div className="app-shell">
    <header className="header"><Brand/><nav aria-label="主导航">
      <button className={view==='workbench'?'nav-active':''} onClick={()=>setView('workbench')}><WandSparkles size={16}/>制作工作台</button>
      <button className={view==='library'?'nav-active':''} onClick={()=>setView('library')}><Layers3 size={16}/>灵感素材库<span>{assets.length}</span></button>
      <button className={view==='content'?'nav-active':''} onClick={()=>openContent('captions')}><Type size={16}/>文案与模板<span>{captions.length}</span></button>
    </nav><div className="header-actions"><span className={'connection '+(status?.model_configured?'online':'')}><i/>{status?.model_configured?'AI 已配置':'AI 待配置'}</span>
      <button className="icon-button" title="浏览器设置" aria-label="浏览器设置" onClick={()=>setAdminOpen(true)}><Settings2 size={19}/></button>
          </div></header>
    <main>
      <section className="intro"><div><div className="eyebrow"><span/>一点灵感，无限表情</div><h1>{view==='workbench'?<>把想说的话，<em>变成表情。</em></>:view==='content'?'差一句话，还是一个好点子？':'每一种情绪，都有一张脸。'}</h1>
        <p>{view==='workbench'?'说出你的意思，选一个对味的表情。剩下的，交给一点小创作。':view==='content'?'从常用文案和现成组合开始。找到喜欢的，再改成自己的。':'熟悉的面孔，新鲜的表达。从一张喜欢的素材开始。'}</p></div>
        <div className="intro-badge"><Sticker size={24}/><span><strong>{characters.length} 个熟悉面孔</strong><small>校内原创 × 日常热梗</small></span><span className="badge-spark">✦</span></div>
      </section>
      {notice&&<div className="notice dismissible" role="alert"><CircleHelp size={17}/><span>{notice}</span><button className="icon-button" aria-label="关闭提示" onClick={()=>setNotice('')}><X size={16}/></button></div>}
      {assets.length===0&&<div className="empty-state"><ImagePlus size={36}/><h2>素材库还是空的</h2><p>可以在浏览器设置中导入图片，再开始创作。</p><button className="button primary" onClick={()=>setAdminOpen(true)}>管理素材</button></div>}
      {view==='workbench'&&assets.length>0&&<div className="workbench">
        <aside className="intent-column"><section className="panel intent-panel">
          <div className="section-heading"><span className="step">01</span><h2>先说说你的意思</h2><span className="tiny-label">IDEA</span></div>
          <label className="sr-only" htmlFor="intent">想表达的意思</label>
          <div className="prompt-wrap"><textarea id="intent" value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={1000} placeholder="比如：明明什么都没做，&#10;却已经开始想放假了……"/><span>{prompt.length}/1000</span></div>
          <div className="example-heading"><Sparkles size={13}/>还没想好？试试这些</div>
          <div className="idea-list">{ideas.map((idea,i)=><button key={idea} onClick={()=>setPrompt(idea)}><span>{['◌','✎','⌘','♡'][i]}</span>{['吐槽一下学校','求老师捞一捞','代码终于跑通了','假装生朋友的气'][i]}<ArrowRight size={13}/></button>)}</div>
          <div className="divider"/>
          <label className="field-label">AI 推荐角色（可选）<div className="select-wrap"><select value={character} onChange={e=>setCharacter(e.target.value)}><option value="">交给 AI 挑选</option>{characters.map(c=><option key={c} value={c}>{characterLabel(c)}</option>)}</select><ChevronDown size={15}/></div></label>
          <div className="field-label">生成什么格式？</div><div className="segmented">{(['jpg','gif']as const).map(f=><button key={f} className={outputFormat===f?'selected':''} onClick={()=>setOutputFormat(f)}>{f.toUpperCase()}<small>{f==='jpg'?'静态图片':'动态表情'}</small></button>)}</div>
          <button className="button primary generate-button" disabled={generating} onClick={generate}>{generating?<LoaderCircle className="spin" size={18}/>:<WandSparkles size={18}/>}
            {generating?(genStatus==='rendering'?'正在绘制表情…':'正在寻找灵感…'):'帮我做个表情'}{!generating&&<span>↗</span>}</button>
          <p className="under-button">一次给你直白、情境、反差三种完整构图</p>
          {!status?.model_configured&&<div className="model-note"><span className="small-dot"/>AI 尚未配置，手动制作已就绪。<button onClick={()=>setAdminOpen(true)}>去设置<ChevronRight size={12}/></button></div>}
          <button className="manual-button" onClick={()=>{if(selected)chooseAsset(selected,true);setNotice('已进入手动制作。你可以直接修改右侧文案。')}}>我自己来，直接编辑<ArrowRight size={14}/></button>
        </section>
        <section className="little-note"><span>✳</span><div><strong>好表情，不一定要大制作。</strong><p>一句话、一张脸，刚刚好就很好。</p></div></section></aside>
        <section className="creation-column">
          <section className="panel preview-panel"><div className="section-heading"><span className="step">02</span><h2>看看表达的样子</h2><span className="preview-live"><i/>{renderBusy?'正在更新':'实时预览'}</span></div>
            {plan&&<CanvasEditor plan={plan} rendered={rendered} fallback={selected?.url} onChange={setPlan} onInteraction={setCanvasGesture}/>}
            {renderError&&<div className="render-error" role="alert">{renderError}<button onClick={()=>setPlan(p=>p?{...p}:p)}>重新渲染</button></div>}
            <div className="preview-footer"><span className="character-label"><Smile size={14}/>{selected?.character}<span>·</span>{plan?.format.toUpperCase()} {plan?.size} × {plan?.size}</span>
              <button className="text-button" onClick={()=>setView('library')}>换个表情<RefreshCw size={13}/></button></div>
          </section>
          {plan&&<ThemeWorkbench plan={plan} onChange={setPlan} onNotice={setNotice}/>}
          <div className="candidate-heading"><h2>{candidates.length?'为你找到三种表达':'从一个熟悉的表情开始'}</h2><span>{candidates.length?'点击切换方案':'灵感素材 · 点击试用'}</span></div>
          {generation&&<div className="intent-tags">{[generation.intent.scene,generation.intent.emotion,generation.intent.tone].map(x=><span key={x}>{x}</span>)}</div>}
          <div className="candidate-grid">{candidates.length?candidates.map((c,i)=><button key={i} className={'candidate '+(plan?.asset_id===c.plan.asset_id&&plan?.text===c.plan.text?'candidate-active':'')} onClick={()=>{setPlan(c.plan);setRendered(c)}}><span className="candidate-style">{c.style}<span>0{i+1}</span></span><img src={c.url} alt={c.plan.text}/><strong>{c.plan.text}</strong><small>{c.reason}</small></button>):
            inspirationAssets.slice(0,3).map((a,i)=><button key={a.id} className={'candidate sample-candidate '+(a.id===selected?.id?'candidate-active':'')} onClick={()=>chooseAsset(a)}><span className="candidate-style">{a.character}<span>0{i+1}</span></span><img src={a.poster_url||a.url} alt={a.name}/><strong>{a.metadata.is_cutout?'透明主体 · 自由组合':a.metadata.emotion.slice(0,2).join(' / ')||a.name}</strong><small>{a.metadata.scenes[0]||'日常表达'}</small></button>)}</div>
          {presets.length>0&&<><div className="candidate-heading"><h2>换一种玩法</h2><button className="text-button" onClick={()=>openContent('presets')}>查看全部 {presets.length} 种<ArrowRight size={12}/></button></div><div className="preset-grid">{presets.slice(0,4).map(p=><button key={p.id} className="preset-card" onClick={()=>{setPlan(p.plan);setRenderError('')}}><img className="preset-sample" src={p.preview_url} alt={p.name+'组合样例'} loading="lazy"/><div><strong>{p.name}</strong><small>{p.description}</small></div><ArrowRight size={14}/></button>)}</div></>}
        </section>
        <aside className="panel editor-panel"><div className="section-heading"><span className="step">03</span><h2>调成你的语气</h2><SlidersHorizontal size={16}/></div>
          {plan&&<><label className="field-label">表情文案<span className="label-meta">{plan.text.length}/160</span><textarea className="caption-input" value={plan.text} maxLength={160} onChange={e=>update({text:e.target.value})} placeholder="想说的话写在这里"/></label>
          <button className="caption-library-button" onClick={()=>openContent('captions')}><Type size={13}/>从 {captions.length} 条常用文案里挑一句<ArrowRight size={12}/></button>
          {(plan.composition||['split','dialogue','comic'].includes(selectedLayout)||selectedTemplate?.layout?.captions.some(c=>c.field==='secondary_text'))&&<label className="field-label">{plan.composition?'铺垫文案':selectedLayout==='dialogue'?'对方的回复':'下半句'}<textarea className="caption-input secondary-caption" value={plan.secondary_text} maxLength={100} onChange={e=>update({secondary_text:e.target.value})}/></label>}
          <SubjectPicker assets={assets} templates={templates} plan={plan} onChoose={chooseAsset}/>
          <CharacterLayers assets={assets} effects={effects} plan={plan} busy={castBusy} onArrange={arrangePeople} onUpdate={update}/>
          {selected?.metadata.existing_text&&<p className="baked-note">底图原有文字保留；嵌入配字需要先标注文字安全区域。</p>}
          <div className="field-label label-row">排版模板 · {templates.length} 种 · 可滚动浏览<button className="text-button" onClick={()=>openContent('layouts')}>查看全部版式<ArrowRight size={11}/></button></div>

<TemplateCatalog compact selectedId={plan.template_id} choices={choices} count={1+plan.characters.length} onSelect={id=>{if(!castBusy)void applyTemplate(id)}}/>
          {(selectedLayout==='flower'||selectedTemplate?.layout?.subject_mode==='flower')&&<label className="field-label range-label">花瓣数量<span>{plan.petals}</span><input type="range" min={4} max={10} value={plan.petals} onChange={e=>update({petals:+e.target.value})}/></label>}
          {selectedLayout==='message'?<label className="field-label">发言者名称<input maxLength={24} value={plan.speaker_name} placeholder={plan.emblem?'北京大学':selected?.character} onChange={e=>update({speaker_name:e.target.value})}/></label>:selectedTemplate?.supports_embedded&&<div className="field-label">文字位置<div className="choice-row">{(['caption','embedded']as const).map(v=><button key={v} disabled={v==='embedded'&&!!selected?.metadata.existing_text&&!selected.metadata.text_safe_area} className={plan.text_placement===v?'active':''} onClick={()=>update({text_placement:v})}>{v==='caption'?'图外配字':'嵌入画面'}</button>)}</div></div>}
          <label className="field-label">中文字库<select aria-label="中文字库" value={plan.font_family||(plan.font_style==='handwritten'?'kuaile':'sans')} onChange={e=>update({font_family:e.target.value as Plan['font_family'],font_style:plan.font_style==='handwritten'?'plain':plan.font_style})}>{fonts.map(f=><option key={f.id} value={f.id}>{f.name} · {f.description}</option>)}</select></label>
          <FontPreview family={plan.font_family||(plan.font_style==='handwritten'?'kuaile':'sans')}/>
          <label className="field-label">字形效果<select aria-label="字形效果" value={plan.font_style==='handwritten'?'plain':plan.font_style} onChange={e=>update({font_style:e.target.value as Plan['font_style'],font_family:plan.font_family||(plan.font_style==='handwritten'?'kuaile':'sans')})}><option value="plain">标准排字</option><option value="bold">加粗大字</option><option value="outline">描边字</option><option value="sticker">立体贴纸字</option><option value="stamp">红色印章字</option><option value="shadow">立体阴影字</option></select></label>
          <label className="field-label">文字形式<select value={plan.text_layout} onChange={e=>update({text_layout:e.target.value as Plan['text_layout']})}><option value="horizontal">横排 · 自动换行</option><option value="vertical">竖排 · 从右至左</option><option value="staggered">错落跳字 · 轻快语气</option></select></label>
          <label className="field-label range-label">默认字号（导出 px）<span>{(plan.font_size*plan.size/512).toFixed(1)}</span><input aria-label="默认文字字号" type="range" min={8*plan.size/512} max={160*plan.size/512} step={.5} value={plan.font_size*plan.size/512} onChange={e=>update({font_size:+e.target.value*512/plan.size})}/></label><label className="check-label"><input type="checkbox" checked={plan.text_fit==='shrink'} onChange={e=>update({text_fit:e.target.checked?'shrink':'fixed'})}/>默认自动缩字（独立文字层可覆盖）</label><p className="baked-note">独立文字层在预览中选择并调整；默认字号只影响未单独设置的文字。</p>
          <details className="typography-controls"><summary>字距、行距与文字衬底</summary><label className="field-label range-label">字间距<span>{((plan.letter_spacing??.06)*100).toFixed(0)}%</span><input type="range" min={0} max={.3} step={.01} value={plan.letter_spacing??.06} onChange={e=>update({letter_spacing:+e.target.value})}/></label><label className="field-label range-label">行间距<span>{(plan.line_spacing??1.45).toFixed(2)}×</span><input type="range" min={1.1} max={2} step={.05} value={plan.line_spacing??1.45} onChange={e=>update({line_spacing:+e.target.value})}/></label><label className="field-label">文字衬底<select value={plan.text_backdrop||'auto'} onChange={e=>update({text_backdrop:e.target.value as Plan['text_backdrop']})}><option value="auto">自动 · 对比不足时增加衬底</option><option value="none">不加衬底</option><option value="light">浅色衬底</option><option value="dark">深色衬底</option></select></label></details>
          <ScenePicker assets={assets} selected={plan.background_style==='image'?plan.background_asset_id:null} onChoose={chooseAsset}/>
          <label className="field-label">独立背景<select value={plan.background_style} onChange={e=>update({background_style:e.target.value as Plan['background_style'],background_asset_id:plan.background_asset_id||assets.find(a=>a.metadata.role==='background')?.id||null})}><option value="solid">纯色背景</option><option value="gradient">双色渐变</option><option value="paper">横线纸张</option><option value="rays">放射光芒</option><option value="image">背景图片</option></select></label>
          {plan.background_style==='image'&&<label className="field-label">背景素材<select value={plan.background_asset_id||''} onChange={e=>update({background_asset_id:e.target.value||null})}><option value="">请选择；可在设置中导入</option>{assets.filter(a=>a.metadata.role==='background'&&a.info.frames===1).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
          <div className="color-row"><label><span className="color-well" style={{background:plan.background}}><input aria-label="背景颜色" type="color" value={plan.background} onChange={e=>update({background:e.target.value})}/></span>底色</label>
            {['gradient','paper','rays'].includes(plan.background_style)&&<label><span className="color-well" style={{background:plan.background_secondary}}><input aria-label="背景辅助颜色" type="color" value={plan.background_secondary} onChange={e=>update({background_secondary:e.target.value})}/></span>辅色</label>}
            <label><span className="color-well" style={{background:plan.text_color}}><input aria-label="文字颜色" type="color" value={plan.text_color} onChange={e=>update({text_color:e.target.value})}/></span>文字</label>
            <button title={selected?.metadata.allow_flip===false?'该人物保持原方向':selected?.metadata.existing_text?'带字素材保持原图方向':'翻转素材'} disabled={!!selected?.metadata.existing_text||selected?.metadata.allow_flip===false} aria-label="水平翻转素材" className={'icon-button '+(plan.flip?'toggled':'')} onClick={()=>update({flip:!plan.flip})}><FlipHorizontal size={17}/></button></div>
          <div className="divider"/>
          <div className="label-row field-label">导出格式<div className="mini-segment">{(['jpg','gif']as const).map(f=><button key={f} className={plan.format===f?'selected':''} onClick={()=>update({format:f,size:f==='gif'?256:512,effect:f==='jpg'?'none':selected?.info.frames===1?'breathe':'none'})}>{f.toUpperCase()}</button>)}</div></div>
          {(!!selectedTemplate?.animation||(selectedTemplate?.motions?.length||0)>0)&&<div className="template-motion-control"><label className="check-label"><input type="checkbox" checked={plan.template_motion??true} onChange={e=>update({template_motion:e.target.checked})}/>模板自带动作 · {selectedTemplate?.animation?selectedTemplate.name:selectedTemplate?.motions?.map(m=>effects.find(e=>e.id===m.effect_id)?.name||m.effect_id).join('、')}</label><small>{plan.format==='jpg'?'静图使用清晰代表帧，选择 GIF 可播放。':'文字保持独立，可在此关闭模板动作。'}</small>{plan.format==='gif'&&plan.template_motion&&<label className="field-label range-label">模板动作速度<span>{(plan.template_speed??1).toFixed(2)}×</span><input type="range" min={.25} max={2} step={.25} value={plan.template_speed??1} onChange={e=>update({template_speed:+e.target.value})}/></label>}</div>}
          {selectedTemplate?.animation&&plan.format==='gif'&&plan.template_motion&&<div className="animation-parameters">{selectedTemplate.animation.duration_ms/(plan.template_speed||1)>6000&&<p className="baked-note">已按6秒完成一个循环，低速播放受到导出时长上限限制。</p>}
            {selectedTemplate.animation.parameters.includes('strength')&&<label className="field-label range-label">模板动作强度<span>{Math.round((plan.template_strength??.7)*100)}%</span><input aria-label="模板动作强度" type="range" min={0} max={1} step={.05} value={plan.template_strength??.7} onChange={e=>update({template_strength:+e.target.value})}/></label>}
            {selectedTemplate.animation.parameters.includes('copies')&&<label className="field-label range-label">模板复制数量<span>{plan.copies}</span><input type="range" min={2} max={8} value={plan.copies} onChange={e=>update({copies:+e.target.value})}/></label>}
            {selectedTemplate.animation.parameters.includes('direction')&&<label className="field-label">动作方向<select value={plan.template_direction??1} onChange={e=>update({template_direction:+e.target.value as 1|-1})}><option value={1}>正向</option><option value={-1}>反向</option></select></label>}
            {selectedTemplate.animation.parameters.includes('prop_color')&&<label className="field-label">道具颜色<input aria-label="道具颜色" type="color" value={plan.prop_color||'#e990a0'} onChange={e=>update({prop_color:e.target.value})}/></label>}
          </div>}
          {plan.format==='gif'&&<><div className="field-label label-row">共享额外动效 · 全部角色<button className="text-button" onClick={()=>update({effect:'none',effects:[]})}>清除额外动效</button></div>
            <p className="baked-note">作用于所有人物；同框角色还可单独添加动效。逐字出现作用于文案。</p>
            {!!selected&&selected.info.duration_ms>6000&&<p className="baked-note">原动图长 {(selected.info.duration_ms/1000).toFixed(1)} 秒，成品使用前 6 秒。</p>}
            <div className="field-label">叠加动效<span className="label-meta">最多四种</span><div className="effect-chips">{effects.filter(e=>e.id!=='none').map(e=>{const active:Effect[]=[...new Set([plan.effect,...plan.effects])].filter(x=>x!=='none');return <button key={e.id} className={active.includes(e.id)?'active':''} disabled={!active.includes(e.id)&&active.length>=4} onClick={()=>update({effect:'none',effects:active.includes(e.id)?active.filter(x=>x!==e.id):[...active,e.id]})}>{e.name}</button>})}</div></div>
            {(plan.effect!=='none'||plan.effects.length>0)&&<><label className="field-label range-label">动效强度<span>{Math.round(plan.strength*100)}%</span><input type="range" min={0} max={1} step={.05} value={plan.strength} onChange={e=>update({strength:+e.target.value})}/></label><label className="field-label range-label">播放速度<span>{plan.speed.toFixed(2)}×</span><input type="range" min={.25} max={2} step={.25} value={plan.speed} onChange={e=>update({speed:+e.target.value})}/></label></>}
            {(plan.effect==='wave_copy'||plan.effects.includes('wave_copy'))&&<label className="field-label range-label">复制数量<span>{plan.copies}</span><input type="range" min={2} max={8} value={plan.copies} onChange={e=>update({copies:+e.target.value})}/></label>}</>}
          <label className="field-label">图片尺寸<div className="select-wrap"><select value={plan.size} onChange={e=>update({size:+e.target.value as 256|512})}><option value="256">256 × 256 · 轻巧分享</option><option value="512">512 × 512 · 清晰大图</option></select><ChevronDown size={14}/></div></label>
          <button className="advanced-button" onClick={()=>setAdvanced(!advanced)}>更多位置调整<ChevronDown size={14} className={advanced?'rotate':''}/></button>
          {advanced&&<div className="advanced-controls">{(['zoom','rotation']as const).map(key=>{const free=plan.actor_transforms?.[0],value=free?(key==='zoom'?free.scale:free.rotation):plan[key];return <label key={key} className="field-label range-label">{key==='zoom'?'主角色缩放':'主角色旋转'}<span>{value.toFixed(1)}</span><input type="range" min={key==='zoom'?(free?.15:.5):-180} max={key==='zoom'?(free?4:1.8):180} step={key==='rotation'?5:.05} value={value} onChange={e=>update(free?{actor_transforms:{...plan.actor_transforms,0:{...free,[key==='zoom'?'scale':'rotation']:+e.target.value}}}:{[key]:+e.target.value})}/></label>})}</div>}
          <a className={'button download-button '+(!isFresh||renderBusy||canvasGesture||renderError?'disabled':'')} href={isFresh&&!renderBusy&&!canvasGesture&&!renderError?rendered!.url:undefined} download={rendered?.filename} aria-disabled={!isFresh||renderBusy||canvasGesture||!!renderError}><ArrowDownToLine size={18}/>下载表情<span>{plan.format.toUpperCase()}</span></a>
          <p className="export-note">预览即成品 · 请及时下载{isFresh&&<><br/>{rendered.info.cache_hit?'已读取浏览器缓存':'本次浏览器合成 '+((rendered.info.elapsed_ms||0)/1000).toFixed(2)+' 秒（含加载与排队）'}</>}</p></>}
        </aside>
      </div>}
      {view==='library'&&<AssetLibrary assets={assets} character={character} onCharacter={setCharacter} onSelect={chooseAsset}/>}
      {view==='content'&&<ContentLibrary initialTab={contentTab} captions={captions} presets={presets} assets={assets} choices={choices} onTemplate={applyTemplate} onCaption={useCaption} onPreset={p=>{setPlan(p.plan);setView('workbench');setRenderError('')}}/>}
      <footer className="footer"><span>EMOJIS PLUS <i/>给情绪一个出口。</span><span>精挑素材 · 自由表达 · 随手分享</span></footer>
    </main>
    {adminOpen&&<Admin onClose={()=>{setAdminOpen(false);void reload()}} onNotice={setNotice} onPreview={a=>{chooseAsset(a);setAdminOpen(false);void reload()}}/>}
  </div>
}

function Admin({onClose,onNotice,onPreview}:{onClose:()=>void;onNotice:(s:string)=>void;onPreview:(a:Asset)=>void}){
  const [tab,setTab]=useState<'model'|'assets'|'templates'|'registry'>('model')
  const [registryText,setRegistryText]=useState(JSON.stringify({schema_version:1,templates:[{id:'my-flower',name:'我的旋转花环',layout_id:'flower',requires_transparency:true,supports_embedded:true,defaults:{format:'gif',size:256,font_style:'plain'},sample:{text:'今天也要开心'},motions:[{effect_id:'spin',target:'composition',strength:1,speed:1}]}]},null,2))
  const [replaceRegistry,setReplaceRegistry]=useState(false)
  const [model,setModel]=useState<ModelConfig|null>(null), [key,setKey]=useState(''), [busy,setBusy]=useState(false), [message,setMessage]=useState('')
  const [assets,setAssets]=useState<Asset[]>([]), [templates,setTemplates]=useState<Template[]>([]), [editing,setEditing]=useState<Asset|'new'|null>(null)
  const [curation,setCuration]=useState<{archived:{id:string;replacement:string;reason:string}[]}>({archived:[]})
  async function load(){const [m,a,t,c]=await Promise.all([api<ModelConfig>('/admin/model'),api<Asset[]>('/admin/assets'),api<Template[]>('/admin/templates'),api<{archived:{id:string;replacement:string;reason:string}[]}>('/admin/curation')]);setModel(m);setAssets(a);setTemplates(t);setCuration(c)}
  useEffect(()=>{void load().catch(e=>setMessage(errorText(e)))},[])
  async function saveModel(e:FormEvent){e.preventDefault();if(!model)return;setBusy(true);setMessage('')
    try{const m=await api<ModelConfig>('/admin/model',{method:'PUT',body:JSON.stringify({...model,api_key:key||undefined})});setModel(m);setKey('');setMessage(m.configured?'模型配置已保存，可以回工作台生成表情。':'配置已保存。填写接口地址、模型名和密钥后即可使用 AI。')}
    catch(e){setMessage(errorText(e))}finally{setBusy(false)}}
  return <Modal title="当前浏览器设置" onClose={onClose} wide><div className="admin-tabs">{(['model','assets','templates','registry']as const).map(t=><button key={t} className={tab===t?'active':''} onClick={()=>{setTab(t);setMessage('')}}>{{model:'模型接口',assets:'素材管理',templates:'排版模板',registry:'JSON 注册'}[t]}</button>)}</div>
    {message&&<div className="notice" role="status">{message}</div>}
    {tab==='model'&&model&&<form className="admin-form" onSubmit={saveModel}><div className="admin-description"><Sparkles size={20}/><div><h3>让灵感接上线。</h3><p>配置支持浏览器 CORS 的 Chat Completions 接口。密钥仅保存在当前浏览器；其他访问者需各自填写。</p></div></div>
      <label>接口地址<input value={model.base_url} onChange={e=>setModel({...model,base_url:e.target.value})} placeholder="https://你的服务地址/v1" type="url"/></label>
      <label>模型名称<input value={model.model} onChange={e=>setModel({...model,model:e.target.value})} placeholder="服务商提供的模型 ID"/></label>
      <label>API 密钥<span className="label-meta">{model.has_api_key?'已保存 · 留空保留':'尚未填写'}</span><input type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} placeholder={model.has_api_key?'••••••••（已保存）':'输入 API 密钥'}/></label>
      <label>输出模式<select value={model.response_mode} onChange={e=>setModel({...model,response_mode:e.target.value})}><option value="json_object">JSON 模式 · 适合多数兼容接口</option><option value="json_schema">严格 JSON Schema · 接口需支持</option><option value="text">文本 JSON · 用于基础兼容接口</option></select></label>
      <div className="form-footer"><p>返回内容在浏览器校验，异常最多重试一次。留空密钥保留现有值。</p><button type="button" className="button secondary" onClick={async()=>{await api("/admin/model",{method:"PUT",body:JSON.stringify({...model,api_key:""})});await load();setMessage("此浏览器保存的密钥已清除。");}}>清除密钥</button><button className="button primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={16}/>:<Check size={16}/>}保存配置</button></div></form>}
    {tab==='assets'&&<><div className="admin-description"><div><h3>每张表情，都有自己的性格。</h3><p>导入与修改仅保存在当前浏览器。共享素材库需更新项目 JSON 并重新构建。</p></div><button className="button primary" onClick={()=>setEditing('new')}><Plus size={16}/>导入素材</button></div>
      <details className="source-details"><summary>已归档的冗余原图 · {curation.archived.length} 张</summary>{curation.archived.map(item=><p key={item.id}><strong>{item.id}</strong> → {item.replacement}：{item.reason}</p>)}</details><div className="admin-asset-list">{assets.map(a=><div key={a.id} className={!a.enabled?'asset-disabled':''}><img src={a.poster_url||a.url} alt={a.name}/><span><strong>{a.name}</strong><small>{a.character} · {a.info.frames>1?'GIF · '+(a.info.duration_ms/1000).toFixed(1)+'s':'静态图片'} · {a.enabled?'已启用':'已停用'}</small></span><button className="icon-button" aria-label={'编辑'+a.name} onClick={()=>setEditing(a)}><Pencil size={16}/></button></div>)}</div></>}
    {tab==='templates'&&<div className="admin-template-list">{templates.map(t=><form key={t.id} onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await api('/admin/templates/'+t.id,{method:'PATCH',body:JSON.stringify({name:f.get('name'),enabled:f.get('enabled')==='on'})});await load();setMessage('模板已更新。')}catch(e){setMessage(errorText(e))}}}><TemplateThumbnail id={t.id} name={t.name}/><label>模板名称<input name="name" defaultValue={t.name} required maxLength={80}/></label><label className="check-label"><input type="checkbox" name="enabled" defaultChecked={!!t.enabled}/>启用</label><button className="button secondary">保存</button></form>)}</div>}
    {tab==='registry'&&<form className="registry-editor" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{const payload=JSON.parse(registryText);const response=await api<{registered:Record<string,number>}>('/admin/registry?replace='+replaceRegistry,{method:'POST',body:JSON.stringify(payload)});await load();setMessage('注册成功：'+Object.entries(response.registered).filter(([,n])=>n).map(([kind,n])=>kind+' '+n+' 项').join('，')+'。关闭管理空间后即可使用。')}catch(error){setMessage(errorText(error))}finally{setBusy(false)}}}><h3>排版、动作和预设一起登记</h3><p>添加模板可选择已有排版与默认动作；也可在 layouts 中定义新的图片区、文字区。保存前会校验 ID、引用和参数范围。</p><div className="registry-actions"><label className="button secondary">读取 JSON 文件<input type="file" accept=".json,application/json" onChange={async e=>{const file=e.target.files?.[0];if(file){if(file.size>512000){setMessage('JSON 文件最多 512 KB。');return}setRegistryText(await file.text())}}}/></label><button type="button" className="button secondary" onClick={async()=>{const data=await exportRegistry(),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="emojis-registry.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}}>导出定义（不含AI配置）</button></div><textarea aria-label="注册定义 JSON" spellCheck={false} value={registryText} onChange={e=>setRegistryText(e.target.value)}/><label className="check-label"><input type="checkbox" checked={replaceRegistry} onChange={e=>setReplaceRegistry(e.target.checked)}/>允许更新已有 ID（默认只新增）</label><button className="button primary" disabled={busy}>{busy?'正在校验…':'校验并注册'}</button></form>}
    {editing&&<AssetEditor templates={templates} asset={editing==='new'?null:editing} onClose={()=>setEditing(null)} onSaved={async a=>{await load();setEditing(null);onNotice('素材已保存。');if(a.enabled)onPreview(a)}}/>}
  </Modal>
}

function AssetEditor({asset,templates,onClose,onSaved}:{asset:Asset|null;templates:Template[];onClose:()=>void;onSaved:(a:Asset)=>void}){
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(asset?.url||'')
  const [metadata,setMetadata]=useState<Metadata>(asset?.metadata||{...emptyMetadata})
  useEffect(()=>{if(!file)return;const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file])
  function tags(field:'emotion'|'scenes'|'examples',value:string){setMetadata(m=>({...m,[field]:value.split(field==='examples'?'\n':/[，,]/).map(x=>x.trim()).filter(Boolean)}))}
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError('')
    const fields=new FormData(e.currentTarget), name=String(fields.get('name')), character=String(fields.get('character'))
    try {
      if(!metadata.templates.length)throw new Error('请至少选择一种适用模板。')
      if(asset){await api('/admin/assets/'+asset.id,{method:'PATCH',body:JSON.stringify({name,character,metadata,enabled:fields.get('enabled')==='on'})});
        onSaved({...asset,name,character,metadata,enabled:fields.get('enabled')==='on'})}
      else{if(!file)throw new Error('请选择图片或 GIF。');const data=new FormData();data.set('file',file);data.set('name',name);data.set('character',character);data.set('metadata',JSON.stringify(metadata));onSaved(await api<Asset>('/admin/assets',{method:'POST',body:data}))}
    }catch(e){setError(errorText(e))}finally{setBusy(false)}
  }
  return <Modal title={asset?'编辑素材标注':'导入新素材'} onClose={onClose} wide><form className="asset-edit-form" onSubmit={submit}>
    <div className="asset-edit-preview">{preview?<img src={preview} alt="素材预览"/>:<ImagePlus size={36}/>}<span>{asset?'原始素材预览':'PNG / JPG / WebP / GIF · 最大 12 MB'}</span>
      {!asset&&<label className="button secondary">选择文件<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>setFile(e.target.files?.[0]||null)} hidden/></label>}</div>
    <div className="form-grid"><label>素材名称<input name="name" defaultValue={asset?.name} required maxLength={100} placeholder="例如：猫耳修女 · 无语"/></label><label>所属角色<input name="character" defaultValue={asset?.character} required maxLength={100} placeholder="角色名称，可创建新角色"/></label>
      <label>情绪标签<input defaultValue={metadata.emotion.join('，')} onChange={e=>tags('emotion',e.target.value)} placeholder="无语，生气，嫌弃"/></label><label>适用场景<input defaultValue={metadata.scenes.join('，')} onChange={e=>tags('scenes',e.target.value)} placeholder="考试，写代码，校园吐槽"/></label>
      <label>动作描述<input value={metadata.action} onChange={e=>setMetadata({...metadata,action:e.target.value})} placeholder="例如：抬头、捧腹大笑"/></label><label>情绪强度<select value={metadata.intensity} onChange={e=>setMetadata({...metadata,intensity:+e.target.value})}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} · {['轻微','温和','明显','强烈','夸张'][n-1]}</option>)}</select></label>
      <label className="span-two">示例文案 <small>每行一句</small><textarea defaultValue={metadata.examples.join('\n')} onChange={e=>tags('examples',e.target.value)} rows={2}/></label>
      <label className="span-two">底图已有文字<textarea value={metadata.existing_text} onChange={e=>setMetadata({...metadata,existing_text:e.target.value})} rows={2} placeholder="没有则留空；已有文字会完整保留"/></label>
      <label>素材类型<select value={metadata.source_type} onChange={e=>setMetadata({...metadata,source_type:e.target.value})}><option value="user_original">用户提供的原创</option><option value="reference">已有角色 / 网络素材</option><option value="unknown">来源待补充</option></select></label>
      <label>作者<input value={metadata.author} onChange={e=>setMetadata({...metadata,author:e.target.value})}/></label>
      <label>图层用途<select value={metadata.role} onChange={e=>setMetadata({...metadata,role:e.target.value as Metadata['role']})}><option value="subject">角色主体</option><option value="background">独立背景</option><option value="symbol">象征 / 道具</option></select></label><label className="check-label"><input type="checkbox" checked={metadata.is_cutout} onChange={e=>setMetadata({...metadata,is_cutout:e.target.checked})}/>已加工为透明主体（仍会检测文件透明度）</label>
      <label className="span-two">派生自素材 ID<input value={metadata.derived_from} maxLength={80} onChange={e=>setMetadata({...metadata,derived_from:e.target.value})} placeholder="可选，例如 meowl；保留原图关联"/></label>
      <label className="span-two">来源链接<input type="url" value={metadata.source_url} onChange={e=>setMetadata({...metadata,source_url:e.target.value})}/></label>
      <label className="span-two">来源说明与角色背景<textarea value={metadata.source_note} onChange={e=>setMetadata({...metadata,source_note:e.target.value})} rows={3} placeholder="如用户提供、校内计算机手册作者等，帮助模型理解语境"/></label>
      <div className="span-two"><span className="field-label">适用模板</span><div className="inline-checks">{templates.map(t=><label className="check-label" key={t.id}><input type="checkbox" checked={metadata.templates.includes(t.id)} onChange={e=>setMetadata({...metadata,templates:e.target.checked?[...metadata.templates,t.id]:metadata.templates.filter(id=>id!==t.id)})}/>{t.name}</label>)}</div></div>
      <div className="span-two"><label className="check-label"><input type="checkbox" checked={!!metadata.text_safe_area} onChange={e=>setMetadata({...metadata,text_safe_area:e.target.checked?{x:0,y:.7,width:1,height:.3}:null})}/>标注嵌入文字安全区域（比例坐标）</label>
        {metadata.text_safe_area&&<div className="coordinate-inputs">{(['x','y','width','height']as const).map(k=><label key={k}>{k}<input type="number" min={0} max={1} step={.01} value={metadata.text_safe_area![k]} onChange={e=>setMetadata({...metadata,text_safe_area:{...metadata.text_safe_area!,[k]:+e.target.value}})}/></label>)}</div>}
        <small className="muted">嵌入文字限制在此区域；带字底图未标注时只能图外配字。建议在“保存并预览”后检查位置。</small></div>
      {asset&&<label className="check-label span-two"><input type="checkbox" name="enabled" defaultChecked={asset.enabled}/>启用这张素材</label>}
    </div>{error&&<div className="error-message" role="alert">{error}</div>}<div className="form-footer"><button type="button" className="button secondary" onClick={onClose}>取消</button><button className="button primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={16}/>:<Eye size={16}/>}保存并在工作台预览</button></div>
  </form></Modal>
}
