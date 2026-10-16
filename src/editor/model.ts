import type {Plan,TextField,TextBox} from '../api'
import type {CanvasElement} from './types'
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v))
export function textBox(p:Plan,e:CanvasElement):TextBox {const [x,y,w,h]=e.rect,old=e.layerId?p.text_layers?.find(l=>l.id===e.layerId):p.text_boxes?.[e.field!];return {...old,x:x/p.size,y:y/p.size,width:w/p.size,height:h/p.size,font_size:old?.font_size??e.fontSize??p.font_size,rotation:e.rotation}}
export function setTextBox(p:Plan,e:CanvasElement,b:TextBox):Plan {return e.layerId?{...p,text_layers:p.text_layers?.map(l=>l.id===e.layerId?{...l,...b}:l)}:{...p,text_boxes:{...p.text_boxes,[e.field!]:b}}}
export function getElementText(p:Plan,e:CanvasElement){return e.layerId?p.text_layers?.find(l=>l.id===e.layerId)?.text||'':p[e.field!]}
export function setElementText(p:Plan,e:CanvasElement,text:string):Plan {return e.layerId?{...p,text_layers:p.text_layers?.map(l=>l.id===e.layerId?{...l,text}:l)}:{...p,[e.field!]:text}}
export function transformElement(p:Plan,e:CanvasElement,mode:'move'|'scale'|'rotate'|'width',dx:number,dy:number):Plan {
 if(e.locked)return p
 if(e.boundPropId)return p
 const s=p.size,[x,y,w,h]=e.rect,cx=x+w/2,cy=y+h/2
 if(e.kind==='prop'){const b=e.basis||[s,0,0,s,0,0],det=b[0]*b[3]-b[1]*b[2];return {...p,prop_layers:p.prop_layers?.map(l=>{if(l.id!==e.layerId)return l;const a={...l};if(mode==='move'&&Math.abs(det)>.00001){a.x=clamp(l.x+(b[3]*dx-b[2]*dy)/det,-2,2);a.y=clamp(l.y+(-b[1]*dx+b[0]*dy)/det,-2,2)}if(mode==='scale'){const k=clamp(1+(dx*w+dy*h)/(w*w+h*h),.2,5);a.width=clamp(l.width*k,.02,2);a.height=clamp(l.height*k,.02,2)}if(mode==='rotate')a.rotation=clamp(l.rotation+dx,-180,180);return a})}}
 if(e.kind==='text'){
  const b=textBox(p,e)
  if(mode==='move'){b.x=clamp(b.x+dx/s,0,1-b.width);b.y=clamp(b.y+dy/s,0,1-b.height)}
  if(mode==='rotate')b.rotation=clamp((b.rotation||0)+dx,-180,180)
  if(mode==='width')b.width=clamp(b.width+dx/s,.06,1-b.x)
  if(mode==='scale'){const ratio=clamp(1+(dx*w+dy*h)/(w*w+h*h),.2,5),width=clamp(b.width*ratio,.06,1-b.x),height=clamp(b.height*ratio,.04,1-b.y),factor=Math.min(width/b.width,height/b.height);b.width=width;b.height=height;b.font_size=clamp((e.fontSize||p.font_size)*factor,8,160)}
  return setTextBox(p,e,b)
 }
 if(e.kind==='actor'){
  const old=p.actor_transforms?.[e.actor!]||{x:cx/s,y:cy/s,scale:1,rotation:0},a={...old}
  if(mode==='move'){a.x=clamp(a.x+dx/s,w>=s?0:w/2/s,w>=s?1:1-w/2/s);a.y=clamp(a.y+dy/s,h>=s?0:h/2/s,h>=s?1:1-h/2/s)}
  if(mode==='scale')a.scale=clamp(a.scale*(1+(dx*w+dy*h)/(w*w+h*h)),.15,4)
  if(mode==='rotate')a.rotation=clamp(a.rotation+dx,-180,180)
  return {...p,actor_transforms:{...p.actor_transforms,[e.actor!]:a}}
 }
 if(mode==='scale')return {...p,background_zoom:clamp((p.background_zoom||1)+(dx+dy)/s,1,3)}
 return p
}
export function setElementFont(p:Plan,e:CanvasElement,value:number){const b=textBox(p,e);b.font_size=clamp(value,8,160);return setTextBox(p,e,b)}
export function panBackground(p:Plan,dx:number,dy:number,width:number,height:number):Plan {const zoom=p.background_zoom||1,scale=Math.max(p.size/width,p.size/height)*zoom,excessX=width*scale-p.size,excessY=height*scale-p.size;return {...p,background_pan_x:excessX>.5?clamp((p.background_pan_x??.5)-dx/excessX,0,1):.5,background_pan_y:excessY>.5?clamp((p.background_pan_y??.5)-dy/excessY,0,1):.5}}
export function resetElement(p:Plan,e:CanvasElement){if(e.kind==='prop')return {...p,prop_layers:p.prop_layers?.map(l=>l.id===e.layerId?{...l,x:l.actor_id?.25:.5,y:l.actor_id?.2:.5,width:.5,height:.3,rotation:0}:l)};if(e.layerId)return setTextBox(p,e,{x:.12,y:.3,width:.76,height:.16,font_size:p.font_size,rotation:0,fit:'fixed'});if(e.kind==='text'){const boxes={...p.text_boxes};delete boxes[e.field!];return {...p,text_boxes:boxes}}if(e.kind==='actor'){const actors={...p.actor_transforms};delete actors[e.actor!];return {...p,actor_transforms:actors}}return {...p,background_zoom:1,background_pan_x:.5,background_pan_y:.5}}

export function rebindProp(p:Plan,e:CanvasElement,actor_id:string|undefined):Plan {const b=actor_id?e.anchorBases?.[actor_id]:[p.size,0,0,p.size,0,0];if(!b)return p;const [xx,yy,w,h]=e.rect,x=xx+w/2-b[4],y=yy+h/2-b[5],det=b[0]*b[3]-b[1]*b[2];if(Math.abs(det)<.00001)return p;return {...p,prop_layers:p.prop_layers?.map(l=>l.id===e.layerId?{...l,actor_id,x:clamp((b[3]*x-b[2]*y)/det,-2,2),y:clamp((-b[1]*x+b[0]*y)/det,-2,2),width:clamp(w/Math.hypot(b[0],b[1]),.02,2),height:clamp(h/Math.hypot(b[2],b[3]),.02,2)}:l)}}
