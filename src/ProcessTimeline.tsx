import {useEffect,useState} from 'react'
import type {ProcessEvent} from './local/process'
const labels:Record<string,string>={queued:'已创建',analyzing:'理解意图',receiving:'接收模型响应',planning:'选择构图',validating:'校验方案',rendering:'绘制成品',completed:'制作完成',failed:'制作失败',cancelled:'已取消'}
export default function ProcessTimeline({events,running=false}:{events:ProcessEvent[];running?:boolean}){
 const [now,setNow]=useState(Date.now());useEffect(()=>{if(!running)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[running])
 if(!events.length)return null;const last=events.at(-1)!,first=events[0],elapsed=Math.max(0,((running?now:last.at)-first.at)/1000)
 return <section className="process-timeline" aria-label="制作过程" aria-live="polite"><strong>{labels[last.stage]} <small>{elapsed.toFixed(0)} 秒</small></strong><p>{last.message}</p>{last.percent!==undefined&&<progress max={100} value={last.percent} aria-label="实际渲染进度"/>}<details open={running}><summary>查看制作过程 · {events.length} 条</summary><ol>{events.map(e=><li key={e.seq}><span>{labels[e.stage]} · {((e.at-first.at)/1000).toFixed(1)}s</span><p>{e.message}{e.percent!==undefined?' '+e.percent+'%':''}</p></li>)}</ol></details></section>
}
