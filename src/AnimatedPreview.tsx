import {useEffect,useRef,useState} from 'react'
import {renderPreview} from './local/service'

export default function AnimatedPreview({still,motion,fallback,name,active,onPlay,onStop}:{still:string;motion?:string;fallback?:string;name:string;active:boolean;onPlay:()=>void;onStop:()=>void}){
  const host=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false),[image,setImage]=useState(''),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('')
  useEffect(()=>{const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting),{rootMargin:'80px'});if(host.current)observer.observe(host.current);return()=>observer.disconnect()},[])
  const [poster,setPoster]=useState(''),[stillFailed,setStillFailed]=useState(false)
  useEffect(()=>{setPoster('');setStillFailed(false);setFailed(false)},[still,fallback])
  useEffect(()=>{if(!visible||!stillFailed||!fallback)return;const controller=new AbortController(),u=new URL(fallback.replace('preview:','https://preview.local/'));renderPreview(u.pathname.slice(1),u.searchParams.get('asset_id')||undefined,'jpg',controller.signal).then(r=>{if(!controller.signal.aborted){setPoster(r.url);setFailed(false)}}).catch(e=>{if(e.name!=='AbortError'){setFailed(true);setError(e.message)}});return()=>controller.abort()},[visible,stillFailed,fallback,attempt])
  useEffect(()=>{
    if(!active||!visible||!motion){setImage('');setBusy(false);return}
    const controller=new AbortController();let url='';setBusy(true);setFailed(false)
    const u=new URL(motion.replace('preview:','https://preview.local/'))
    renderPreview(u.pathname.slice(1),u.searchParams.get('asset_id')||undefined,'gif',controller.signal).then(result=>{if(controller.signal.aborted)return;url=result.url;setImage(url);setBusy(false)}).catch(e=>{if(e.name!=='AbortError'){setFailed(true);setError(e.message||'生成失败');setBusy(false)}})
    return()=>{controller.abort()}
  },[active,visible,motion,attempt])
  return <div className="animated-preview" ref={host} tabIndex={motion?0:-1} onFocus={e=>{if(e.target===e.currentTarget&&motion)onPlay()}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))onStop()}} onMouseEnter={()=>{if(motion&&matchMedia('(hover:hover)').matches)onPlay()}} onMouseLeave={onStop}>
    <img loading="lazy" src={image||poster||(still+(attempt?(still.includes('?')?'&':'?')+'retry='+attempt:''))} alt={name+'样例预览'} onError={()=>{if(fallback&&!poster)setStillFailed(true);else setFailed(true)}}/>
    {motion&&<button type="button" className="preview-play" aria-label={(active&&image?'暂停':'播放')+name+'预览'} onClick={()=>active&&image?onStop():onPlay()}>{busy?'加载中…':active&&image?'Ⅱ 暂停':'▷ 播放'}</button>}
    {failed&&<button type="button" className="preview-retry" title={error} onClick={()=>{setFailed(false);setAttempt(x=>x+1);onPlay()}}>样例暂不可用 · {error} · 重试</button>}
  </div>
}
