import type {Catalog} from './types'
import {readLocal} from './storage'
export const publicURL=(url:string)=>new URL(url,new URL(import.meta.env.BASE_URL,location.href)).href
let catalog:Promise<Catalog>|undefined
export function resetCatalog(){catalog=undefined}
export function getCatalog(){return catalog??=(async()=>{const r=await fetch(publicURL('library/catalog.json'));if(!r.ok)throw Error('静态素材目录加载失败，请运行 npm run build。');const c:Catalog=await r.json(),local=await readLocal<any>('library')||{},blobs=await readLocal<any[]>('imports')||[]
 for(const kind of ['assets','templates','presets','effects','categories','layouts','captions','themes','props','compositions'])if(local[kind]){const original=(c as any)[kind]||[],overrides=new Map(local[kind].map((v:any)=>[v.id,v]));(c as any)[kind]=[...original.map((v:any)=>{const o=overrides.get(v.id)as any;return {...v,...o,...(kind==='assets'?{url:v.url,poster_url:v.poster_url,info:v.info,metadata:{...v.metadata,...o?.metadata}}:{})}}),...local[kind].filter((v:any)=>!original.some((o:any)=>o.id===v.id))]}
 for(const {asset,blob}of blobs)c.assets.push({...asset,url:URL.createObjectURL(blob),poster_url:URL.createObjectURL(blob)})
 c.assets=c.assets.map(a=>({...a,url:publicURL(a.url),poster_url:a.poster_url?publicURL(a.poster_url):undefined}));c.fonts=c.fonts.map(f=>({...f,url:publicURL(f.url)}));return c})()}
