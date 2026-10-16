import {useEffect,useState} from 'react'
import {getCatalog} from './local/catalog'
import {loadFont} from './render/browser'
export default function FontPreview({family}:{family:string}){const [ready,setReady]=useState('');useEffect(()=>{let alive=true;getCatalog().then(c=>loadFont(c.fonts.find(f=>f.id===family)!,location.href)).then(()=>{if(alive)setReady(family)}).catch(()=>{if(alive)setReady('')});return()=>{alive=false}},[family]);return <div className="font-family-preview" style={{fontFamily:ready===family?'ep-'+family:undefined,padding:14,fontSize:20}}>{ready===family?'今天，一起去上课。':'正在加载字库…'}</div>}
