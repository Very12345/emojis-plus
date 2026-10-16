import {renderBrowser} from './browser'
let active='',cancelled=new Set<string>()
self.onmessage=async({data})=>{if(data.cancel){cancelled.add(data.cancel);return}const {id,input}=data;active=id;try{const result=await renderBrowser(input,()=>cancelled.has(id),progress=>self.postMessage({id,progress}));if(!cancelled.has(id))self.postMessage({id,result})}catch(e){self.postMessage({id,error:e instanceof Error?e.message:'绘制失败',aborted:cancelled.has(id)})}finally{cancelled.delete(id);active='';self.postMessage({id,done:true})}}
