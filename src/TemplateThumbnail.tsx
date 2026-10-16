import {RENDER_VERSION} from './render/core'
import {useState} from 'react'
import type {TemplateId} from './api'
import {publicURL} from './local/catalog'

export default function TemplateThumbnail({id,assetId,name}:{id:TemplateId;assetId?:string;name:string}){
  const [failed,setFailed]=useState('')
  const url=publicURL('previews/template-'+id+'.jpg')+'?v='+RENDER_VERSION
  return <div className="layout-thumbnail">{failed===url?<span>样例暂不可用</span>:<img loading="lazy" src={url} alt={name+'样例预览'} onError={()=>setFailed(url)}/>}</div>
}
