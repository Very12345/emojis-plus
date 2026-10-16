import type {Plan,CharacterLayer} from '../api'
import type {RuntimeTemplate} from '../local/types'
export type Matrix=[number,number,number,number,number,number]
export type SurfaceFactory=(w:number,h:number)=>any
export interface Sprite {image:any;matrix:Matrix;alpha:number;ghost?:boolean;actor?:number}
export interface Scene {sprites:Sprite[];before:((ctx:any)=>void)[];after:((ctx:any)=>void)[];clip:boolean}
const TAU=Math.PI*2
const sin=Math.sin,cos=Math.cos,abs=Math.abs
export const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v))
const pulse=(u:number)=>Math.max(0,sin(Math.PI*u))
const smooth=(u:number)=>{u=clamp(u);return u*u*(3-2*u)}
const mod=(v:number,n=1)=>(v%n+n)%n
export function multiply(a:Matrix,b:Matrix):Matrix{return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]]}
export function matrix(x:number,y:number,sx=1,sy=1,angle=0):Matrix{const a=-angle*Math.PI/180;return [cos(a)*sx,sin(a)*sx,-sin(a)*sy,cos(a)*sy,x,y]}
export function bounds(sprite:Sprite){const m=sprite.matrix,w=sprite.image.width/2,h=sprite.image.height/2,points=[[-w,-h],[w,-h],[w,h],[-w,h]].map(([x,y])=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]]);return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]}
type ActorMotion=Pick<CharacterLayer,'effect'|'strength'|'speed'>
export function primitive(plan:Plan,t:number,phase:number,effects:any[],target='subject',template?:RuntimeTemplate,actor?:ActorMotion){
 const v={sx:1,sy:1,angle:0,dx:0,dy:0}
 const specs:any[]=target==='subject'?[...new Set([plan.effect,...plan.effects])].filter(e=>e!=='none').map(effect_id=>({effect_id,strength:plan.strength,speed:plan.speed,direction:1})):[]
 // Shared extras apply to the entire cast. A matching actor effect overrides its parameters once.
 if(target==='subject'&&actor&&actor.effect!=='none'){const index=specs.findIndex(s=>s.effect_id===actor.effect),own={effect_id:actor.effect,strength:actor.strength,speed:actor.speed,direction:1};if(index<0)specs.push(own);else specs[index]=own}
 if(plan.template_motion&&plan.format==='gif')specs.push(...(template?.motions||[]).filter(m=>m.target===target).map(m=>({...m,speed:m.speed*plan.template_speed})))
 for(const spec of specs){const e=effects.find(e=>e.id===spec.effect_id&&e.enabled!==false);if(!e)continue;const s=spec.strength*(e.strength_scale??1),p=t*spec.speed*(e.speed_scale??1);switch(e.handler){
 case 'breathe':v.sx*=1+.08*s*sin(p*Math.PI+phase);v.sy*=1+.08*s*sin(p*Math.PI+phase);break
 case 'stretch':{const sy=1+.28*s*sin(p*TAU+phase);v.sy*=sy;v.sx/=Math.sqrt(sy);break}
 case 'rotate':v.angle+=sin(p*TAU+phase)*45*s;break
 case 'spin':v.angle+=p*180*(spec.direction??1)*(s?1:0);break
 case 'shake':v.dx+=sin(p*Math.PI*12)*.025*s;v.dy+=cos(p*Math.PI*10)*.012*s;break
 case 'bounce':v.dy-=abs(sin(p*TAU))*.09*s;break
 case 'move':v.dx+=sin(p*Math.PI)*.14*s;v.dy+=sin(p*TAU)*.08*s;break
 }}return v
}
export function buildScene(images:any[],p:Plan,template:RuntimeTemplate,effects:any[],t:number,w:number,h:number,duration:number):Scene{
 const scene:Scene={sprites:[],before:[],after:[],clip:false},a=template.animation,active=!!a&&p.template_motion
 const u=mod(t*1000/duration),s=p.template_strength??.7,dir=p.template_direction??1,angle=u*TAU*dir,q=Math.max(0,sin(angle)),wave=sin(angle),kind=a?.handler,props=new Set<string>(a?.props||[]),ink=p.prop_color||'#e990a0'
 const specs=[{x:p.primary_x,y:p.primary_y,scale:p.primary_scale,rotation:p.rotation,opacity:1,flip:p.flip,effect:p.effect,strength:p.strength,speed:p.speed,...p.primary_motion},...p.characters]
 const add=(i:number,x:number,y:number,scale=1,sx=1,sy=1,rotation=0,alpha=1,phase=0,ghost=false,diameter?:number)=>{
  const im=images[i%images.length],spec=specs[i%specs.length],local=i===0?p:{...p,zoom:1,rotation:0}as Plan
  const v=primitive(local,t,phase,effects,'subject',active?undefined:template,i?spec:p.primary_motion),base=diameter??Math.min(w,h)*(images.length===1?.62*Math.min(1.4,spec.scale):spec.scale*.94),fit=base/Math.max(im.width,im.height)
  const homeX=spec.x*w,homeY=spec.y*h
  if(active&&kind!=='loading'){const k=s/.7;x=homeX+(x-(images.length===1?.5*w:homeX))*k;y=homeY+(y-(images.length===1?.52*h:homeY))*k;sx=1+(sx-1)*k;sy=1+(sy-1)*k;rotation*=k}
  const zoom=i===0?p.zoom:1
  const waveCopy=[p.effect,...p.effects].some(id=>effects.find(e=>e.id===id)?.handler==='wave_copy'),copies=waveCopy?p.copies:1
  for(let copy=0;copy<copies;copy++){const k=waveCopy?1/(copies*.55):1,dx=waveCopy?(copy-(copies-1)/2)*base/(copies+1):0,dy=waveCopy?sin(t*p.speed*TAU+copy*.85)*base*.18*p.strength:0
   scene.sprites.push({image:im,actor:i%images.length,matrix:matrix(x+v.dx*w+dx,y+v.dy*h+dy,fit*scale*sx*v.sx*zoom*k*(spec.flip?-1:1),fit*scale*sy*v.sy*zoom*k,rotation+v.angle+(images.length===1?spec.rotation:0)),alpha:clamp(alpha*spec.opacity),ghost})
  }
 }
 const paint=(i=0,x=.5,y=.52,scale=1,sx=1,sy=1,rotation=0,opacity=1,ghost=false)=>add(i,x*w,y*h,scale,sx,sy,rotation,opacity,0,ghost)
 const label=(text:string,x:number,y:number,color=ink,size=.07)=>scene.after.push(ctx=>{ctx.save();ctx.font=`${Math.max(9,w*size)}px ep-sans`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,x*w,y*h);ctx.restore()})
 const heart=(x:number,y:number,r:number)=>{if(!props.has('hearts'))return;scene.after.push(ctx=>{ctx.save();ctx.fillStyle=ink;ctx.beginPath();for(let j=0;j<=40;j++){const z=j*TAU/40,xx=(x+r*sin(z)**3)*w,yy=(y-r*(13*cos(z)-5*cos(2*z)-2*cos(3*z)-cos(4*z))/16)*h;j?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.closePath();ctx.fill();ctx.restore()})}
 const star=(x:number,y:number,r:number,before=false)=>{if(!props.has('stars')&&!props.has('fireworks'))return;(before?scene.before:scene.after).push(ctx=>{ctx.save();ctx.fillStyle=ink;ctx.beginPath();for(let j=0;j<10;j++){const radius=j%2?r*.45:r,xx=(x+radius*sin(j*Math.PI/5))*w,yy=(y-radius*cos(j*Math.PI/5))*h;j?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.closePath();ctx.fill();ctx.restore()})}
 const hand=(x:number,y:number)=>{if(!props.has('hands'))return;scene.after.push(ctx=>{ctx.save();ctx.fillStyle='#ffe1c7';ctx.strokeStyle='#795d49';ctx.lineWidth=Math.max(1,w*.006);const box=(xx:number,yy:number,ww:number,hh:number)=>{ctx.beginPath();ctx.roundRect(xx,yy,ww,hh,Math.max(1,hh*.3));ctx.fill();ctx.stroke()};box((x-.168)*w,(y-.03)*h,.168*w,.07*h);for(let j=0;j<4;j++)box((x-.024)*w,(y-.045+j*.022)*h,(.12-.0144*abs(j-1)+.024)*w,.026*h);ctx.strokeStyle='#ffe1c7';ctx.lineWidth=h*.035;ctx.beginPath();ctx.moveTo((x-.048)*w,(y+.01)*h);ctx.lineTo((x+.0096)*w,(y+.056)*h);ctx.stroke();ctx.restore()})}
 if(p.chat_layout){
  const count=images.length,chase=p.chat_layout.mode==='chase',animated=chase&&p.chat_layout.motion,phase=animated?mod(t*1000/duration):.14,stride=sin(phase*TAU*2),push=animated?Math.max(0,sin(phase*TAU)):0,d=p.template_direction;
  images.forEach((im,i)=>{const spec=specs[i],isChaser=i===p.chat_layout!.chaser,local=i?{...p,zoom:1}as Plan:p,v=primitive(local,t,0,effects,'subject',undefined,i?spec:p.primary_motion),scale=spec.scale,slotW=count===1?.96:count===2?.56:count===3?.34:.33,slotH=count<=3?.97:.48,fit=Math.min(w*slotW/im.width,h*slotH/im.height)*scale*(i?1:p.zoom);
   const dx=chase?d*((isChaser?.045:.035)*sin(phase*TAU)+(isChaser?.055:0)*push):0,dy=animated?-.025*abs(sin(phase*TAU*2+(isChaser?.4:0))):0,angle=spec.rotation+v.angle+(chase?d*(isChaser?-4:-8)+(animated?stride*(isChaser?5:9):0):0);
   const homeY=count<=3?(chase?(isChaser?.82:.94):.95)*h-im.height*fit/2+(spec.y-(chase?(isChaser?.47:.56):count===1?.51:.52))*h:spec.y*h;
   scene.sprites.push({image:im,actor:i,matrix:matrix((spec.x+v.dx+dx)*w,homeY+(v.dy+dy)*h,fit*v.sx*(spec.flip?-1:1),fit*v.sy,angle),alpha:spec.opacity})
  });
  if(chase){scene.before.push(ctx=>{ctx.save();ctx.strokeStyle='#d58e40';ctx.lineCap='round';ctx.lineWidth=Math.max(1,w*.008);ctx.globalAlpha=.55;for(let j=0;j<7;j++){const yy=h*(.17+j*.095),offset=animated?mod(phase+j*.13)*w*.05:0;ctx.beginPath();ctx.moveTo((d>0?.01:.99)*w+d*offset,yy);ctx.lineTo((d>0?.10+j%3*.03:.90-j%3*.03)*w+d*offset,yy-.01*h);ctx.stroke()}ctx.restore()});
   scene.after.push(ctx=>{if(animated&&(phase<.25||phase>.53))return;ctx.save();ctx.translate(w*.53,h*.68);ctx.fillStyle='#ffcf59';ctx.strokeStyle='#e4653c';ctx.lineWidth=w*.01;ctx.beginPath();for(let j=0;j<16;j++){const r=(j%2?.045:.085)*Math.min(w,h),a=j*Math.PI/8;j?ctx.lineTo(cos(a)*r,sin(a)*r):ctx.moveTo(cos(a)*r,sin(a)*r)}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()})
  }
  return scene
 }
 if(!active){
  const mode=template.layout?.subject_mode||template.layout_id
  const single=(i:number,cx:number,cy:number,width:number,height:number,local:Plan)=>{
   const im=images[i],fit=Math.min(width/im.width,height/im.height),v=primitive(local,t,0,effects,'subject',template,i?specs[i]:p.primary_motion)
   const image=(x:number,y:number,scale:number,phase=0,extra=0)=>{const z=primitive(local,t,phase,effects,'subject',template,i?specs[i]:p.primary_motion);scene.sprites.push({image:im,actor:i,matrix:matrix(x+v.dx*width,y+v.dy*height,fit*scale*z.sx*local.zoom*(local.flip?-1:1),fit*scale*z.sy*local.zoom,z.angle+local.rotation+extra),alpha:i?specs[i].opacity:1})}
   const waveEffect=[p.effect,...p.effects,...(p.template_motion?(template.motions||[]).filter(m=>m.target==='subject').map(m=>m.effect_id):[])].map(id=>effects.find(e=>e.id===id)).find(e=>e?.handler==='wave_copy')
   if(i===0&&mode==='flower'){const small=Math.min(width*.26/im.width,height*.34/im.height)/fit;for(let j=0;j<p.petals;j++){const z=j*TAU/p.petals;image(cx+cos(z)*Math.min(width,height)*.27,cy+sin(z)*Math.min(width,height)*.27,small,j*.7,-z*180/Math.PI-90)}scene.after.push(ctx=>{ctx.fillStyle='#f5d977';ctx.strokeStyle='#eac75d';ctx.beginPath();ctx.ellipse(cx,cy,Math.min(width,height)*.13,Math.min(width,height)*.13,0,0,TAU);ctx.fill();ctx.stroke()})}
   else if(i===0&&mode==='grid'){const small=Math.min(width*.25/im.width,height*.25/im.height)/fit;for(let row=0;row<3;row++)for(let col=0;col<3;col++){const phase=(row+col)*.7;image(cx-width/2+width*(col+.5)/3,cy-height/2+height*(row+.5)/3+(waveEffect?sin(t*p.speed*TAU+phase)*height*.05*p.strength:0),small,phase)}}
   else if(waveEffect){const small=Math.min(width/(p.copies+1)/im.width,height*.52/im.height)/fit;for(let j=0;j<p.copies;j++){const phase=j*.85;image(cx-width/2+width*(j+1)/(p.copies+1),cy+sin(t*p.speed*TAU+phase)*height*.18*p.strength,small,phase)}}
   else image(cx,cy,1)
  }
  const grouped=images.length>1||p.primary_x!==.5||p.primary_y!==.5||p.primary_scale!==1
  if(grouped)images.forEach((_,i)=>{const spec=specs[i],local=i?{...p,rotation:spec.rotation,flip:spec.flip,zoom:1}as Plan:p;single(i,spec.x*w,spec.y*h,w*spec.scale,h*spec.scale,local)})
  else single(0,w/2,h/2,w,h,p)
  const v=primitive(p,t,0,effects,'composition',template),parent=multiply(matrix(w/2+v.dx*w,h/2+v.dy*h,v.sx,v.sy,v.angle),matrix(-w/2,-h/2))
  scene.sprites.forEach(sprite=>sprite.matrix=multiply(parent,sprite.matrix))
  return scene
 }
 if(['dash-trail','sway-trail','echo-zoom','pop-clones','orbit','satellite','figure-eight','spiral','clone-clap','ring-pulse','merge','grid-relay','loading'].includes(kind)){
  const count=kind==='grid-relay'?9:kind==='satellite'?3:p.copies
  if(kind==='satellite')paint(0,.5,.52,.72,1,1,-wave*8*s)
  for(let j=0;j<count;j++){const v=mod(u-j/count),theta=angle+j*TAU/count
   switch(kind){
    case 'dash-trail':paint(0,.5+.27*sin(angle-j*.16),.52,.8,1,1,0,(j+1)/count*.75);break
    case 'sway-trail':paint(0,.5+sin(angle-j*.35)*.24,.53,.75,1,1,sin(angle-j*.35)*18,.2+.65*(1-j/count));break
    case 'echo-zoom':paint(0,.5,.52,.45+v*.75,1,1,0,(1-v)*.55,true);break
    case 'pop-clones':paint(0,.5+cos(theta)*.27*pulse(v),.52+sin(theta)*.26*pulse(v),.45+.25*pulse(v));break
    case 'orbit':case 'satellite':case 'ring-pulse':case 'loading':paint(0,.5+cos(theta)*.29,.5+sin(theta)*.30,.28+(['ring-pulse','loading'].includes(kind)?Math.max(0,cos(theta-angle*2))*.13*s/.7:0));break
    case 'figure-eight':paint(0,.5+.30*sin(theta),.5+.22*sin(2*theta),.33);break
    case 'spiral':paint(0,.5+cos(theta)*.32*pulse(u),.5+sin(theta)*.32*pulse(u),.23+.1*pulse(u));break
    case 'clone-clap':paint(0,.5+(j%2?-1:1)*(.12+.20*abs(cos(angle))),.23+Math.floor(j/2)*.23,.34);break
    case 'merge':paint(0,.5+cos(j*TAU/count)*.30*(1-pulse(u)),.5+sin(j*TAU/count)*.30*(1-pulse(u)),.35+.5*pulse(u)/count);break
    default:paint(0,(j%3+.5)/3,(Math.floor(j/3)+.5)/3,.30*(.55+.45*Math.max(0,sin(angle-j*.7))))
   }}if(kind==='dash-trail')paint(0,.5+.27*wave,.52,.8);if(kind==='echo-zoom')paint(0,.5,.52,.55)
 }else if(['pet','cheek','shoulder','lift','hearts','stars','confetti','fireworks','questions','sweat','ghost'].includes(kind)){
  let y=.54,sy=1,x=.5,rotation=0
  if(kind==='pet'){sy=1-.22*q*s;y+=.04*q}if(kind==='cheek')sy=1+.15*q*s;if(kind==='shoulder'){x+=.025*wave*s;rotation=8*wave*s}if(kind==='lift')y-=.18*q
  if(kind==='ghost'&&props.has('ghost'))paint(0,.5,.53-.28*q,.9,1,1,0,q*.55,true)
  if(kind==='fireworks')for(let j=0;j<16;j++)star(.5+cos(j*TAU/16)*.38*u,.48+sin(j*TAU/16)*.35*u,.016*(1-u)+.006,true)
  paint(0,x,y,1,1+(1-sy)*.4,sy,rotation)
  if(kind==='pet')hand(.5,.21+.055*q)
  if(kind==='cheek'){hand(.22+.05*q,.53);hand(.78-.05*q,.53)}if(kind==='shoulder')hand(.77-.02*q,.56+.025*q);if(kind==='lift')hand(.5,y+.28)
  if(kind==='hearts')for(let j=0;j<7;j++){const v=mod(u+j/7);heart(.5+sin(j*2.4)*v*.30,.83-v*.72,.025+.015*v)}
  if(kind==='stars')for(let j=0;j<7;j++)star(.5+cos(j*TAU/7+angle*.3)*(.30+.04*wave),.5+sin(j*TAU/7+angle*.3)*.34,.025+.015*pulse(mod(u+j/7)))
  if(kind==='confetti'&&props.has('confetti'))scene.after.push(ctx=>{ctx.save();for(let j=0;j<20;j++){const x=mod(j*.618+u*.10)*w,y=mod(u+j*.137)*h;ctx.strokeStyle=[ink,'#efc75e','#83b7c4','#a7c88a'][j%4];ctx.lineWidth=Math.max(2,w*.009);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+sin(angle+j)*w*.025,y+h*.02);ctx.stroke()}ctx.restore()})
  if(kind==='questions'&&props.has('questions'))for(let j=0;j<3;j++)label('？',.5+sin(angle+j*2)*.28,.18+cos(angle+j*2)*.07,ink,.12)
  if(kind==='sweat'&&props.has('sweat'))scene.after.push(ctx=>{const v=mod(u*2);ctx.fillStyle='#83c5e5';ctx.beginPath();ctx.ellipse(w*.76,h*(.305+v*.30),w*.03,h*.055,0,0,TAU);ctx.fill()})
 }else if(images.length>1){
  const n=images.length,active=Math.floor(u*n)%n,ordered=Array.from({length:n},(_,i)=>i)
  if(['cross','chase','group-orbit'].includes(kind))ordered.sort((i,j)=>sin(angle+i*TAU/n)-sin(angle+j*TAU/n))
  if(kind==='seesaw'&&props.has('seesaw'))scene.before.push(ctx=>{ctx.fillStyle='#aa9972';ctx.beginPath();ctx.moveTo(w*.45,h*.9);ctx.lineTo(w*.55,h*.9);ctx.lineTo(w*.5,h*.72);ctx.fill();ctx.strokeStyle='#8a7356';ctx.lineWidth=w*.025;ctx.beginPath();ctx.moveTo(w*.18,h*(.72+wave*.10));ctx.lineTo(w*.82,h*(.72-wave*.10));ctx.stroke()})
  if(kind==='heart-pass')heart(.5+.25*wave,.36,.055)
  for(const i of ordered){const slot=specs[i],side=i%2?1:-1;let {x,y}=slot,scale=1,rotation=slot.rotation,opacity=slot.opacity
   if(['talk','interrupt','repeat','silence'].includes(kind)){if(captionVisibility(kind,u)[i%2])y-=.035*pulse(mod(u*2));if(kind==='silence')y+=.12*smooth((u-.2)/.5)}
   else if(['bump','cuddle','repel'].includes(kind)){const approach=pulse(u);let amount=.16*approach;if(kind==='cuddle')amount=.16*Math.min(1,approach*1.8);if(kind==='repel')amount=u<.5?.19*pulse(u*2):-.09*pulse((u-.5)*2);x-=side*amount;rotation+=side*approach*6}
   else if(kind==='cross'){x=.5+side*.30*cos(angle);y+=side*.04*wave}
   else if(kind==='chase'){x=.5+.29*cos(angle+i*.85);y=.50+.17*sin(angle+i*.85)}
   else if(['up-down','seesaw'].includes(kind)){y+=side*.12*wave;rotation+=kind==='seesaw'?side*wave*12:0}
   else if(kind==='parade'){x=mod(u*1.6-i/n,1.6)-.3;y=.55+.04*sin(angle*3-i)}
   else if(kind==='group-orbit'){x=.5+.31*cos(angle+i*TAU/n);y=.48+.26*sin(angle+i*TAU/n);scale=.85+.12*sin(angle+i*TAU/n)}
   else if(kind==='elevator'){const half=Math.ceil(n/2);y=mod(u+Math.floor(i/half)*.5)*1.5-.25;x=(i%half+1)/(half+1)}
   else if(kind==='race'){x=i===active?.15+mod(u*n)*.7:slot.x;y=i===active?.54:slot.y;opacity=i===active?1:.25;scale=i===active?1:.7}
   else if(['wave','leader','ripple'].includes(kind)){const delay=kind==='wave'?i*.13:kind==='leader'?(i===0?0:.30+i*.035):Math.floor(i/2)*.23+(i%2)*.06,b=Math.max(0,sin((u-delay)*TAU));y-=.15*b*s;scale=1+.10*b*s;rotation+=sin((u-delay)*TAU)*8*s}
   else if(kind==='team-clap'){x-=side*.10*Math.max(0,sin(angle+(i%2)*Math.PI));rotation=side*8*wave}
   else if(['gather','spread'].includes(kind)){const f=kind==='gather'?pulse(u):1-pulse(u);x+=(.5-x)*f*.5;y+=(.5-y)*f*.5;scale=1-.35*f}
   else if(kind==='boards')y-=i===active?.025:0
   else if(kind==='countdown'&&u>.6&&u<.85)y-=.12*Math.max(0,sin((u-.6)*TAU*2))
   const track=a.tracks?.find((track:any)=>track.actor===i);let sx=1,sy=1;if(track){const v=trackAt(track,u);x+=v.x;y+=v.y;sx=v.sx;sy=v.sy;rotation+=v.angle;opacity*=v.opacity}
   paint(i,x,y,scale,sx,sy,rotation,opacity)
   if(kind==='boards'&&i===active&&props.has('boards')){const yy=Math.max(.04,y-.20);scene.after.push(ctx=>{ctx.fillStyle='#fff9e8';ctx.strokeStyle=ink;ctx.beginPath();ctx.roundRect(w*(x-.14),h*(yy-.05),w*.28,h*.10,4);ctx.fill();ctx.stroke()});label('我来啦',x,yy,'#344f3a',.045)}
  }if(kind==='countdown'&&u<.6)label(String(3-Math.floor(u/.2)),.5,.18,ink,.16)
 }else{
  let v={x:0,y:0,sx:1,sy:1,angle:0,opacity:1}
  if(a.tracks?.length)v=trackAt(a.tracks[0],u)
  else switch(kind){
   case 'jelly':Object.assign(v,{sy:1-.3*sin(angle*2)*Math.exp(-u*2)*s,sx:1+.15*sin(angle*2)*s});break
   case 'push':Object.assign(v,{x:.16*sin(angle)*Math.exp(-u*2)*s,angle:-18*sin(angle)*s});break
   case 'charge':Object.assign(v,{y:-.23*pulse(u),sy:1-.18*cos(angle*2)*s});break
   case 'drop':Object.assign(v,{y:u<.45?-.35*(1-smooth(u/.45)):.05*pulse((u-.45)/.55),sy:u>.45?1-.22*pulse((u-.45)/.55):1});break
   case 'shock':v.sx=v.sy=u<.5?1+.35*pulse(u*2):1-.15*pulse((u-.5)*2);break
   case 'puff':Object.assign(v,{sx:1+.2*q*s,sy:1+.15*q*s,y:.025*sin(angle*5)*q});break
   case 'tired':Object.assign(v,{y:.12*q,sy:1-.38*q*s,sx:1+.2*q*s});break
   case 'nod':Object.assign(v,{angle:22*q*s,y:.05*q});break
   case 'step':Object.assign(v,{x:.09*wave*s,y:.035*abs(sin(angle*2)),sy:1-.12*abs(sin(angle*2))*s,angle:wave*8});break
   case 'roly':Object.assign(v,{angle:wave*24*s,x:-wave*.12*s,y:.04*abs(wave)});break
   case 'slide':Object.assign(v,{x:.2*cos(angle)*s,y:.045*sin(angle),angle:-8*sin(angle)});break
   case 'triple':Object.assign(v,{x:[-.16,0,.16][Math.min(2,Math.floor(u*3))]*s,y:-.12*abs(sin(angle*1.5))*s});break
   case 'peek-bottom':Object.assign(v,{y:.68*(1-pulse(u)),angle:wave*5});break
   case 'peek-side':Object.assign(v,{x:dir*.68*(1-pulse(u)),angle:-dir*15*pulse(u)});break
   case 'window-pop':Object.assign(v,{y:.5*(1-pulse(u)),sx:.8,sy:.8});break
   case 'zoom':v.sx=v.sy=.65+.7*q;break
   case 'launch':v.y=u<.25?.7*(1-smooth(u/.25)):-.08*sin((u-.25)*TAU*2)*(1-u);break
   case 'spin-in':Object.assign(v,{angle:360*(1-smooth(u/.65)),sx:.3+.7*pulse(u),sy:.3+.7*pulse(u)});break
   case 'brake':Object.assign(v,{x:-dir*.75*(1-smooth(u/.35)),angle:20*sin(Math.min(1,u/.7)*Math.PI)*dir});break
   case 'ascend':Object.assign(v,{y:-u*.65,opacity:1-smooth((u-.55)/.4)});break
   case 'burrow':Object.assign(v,{y:.5*smooth(u),sy:Math.max(.1,1-.85*smooth(u)),opacity:1-smooth((u-.8)/.2)});break
   case 'escape':Object.assign(v,{x:dir*u*.5,y:-u*.3,sx:Math.max(.1,1-u),sy:Math.max(.1,1-u),opacity:1-smooth((u-.7)/.3)});break
   case 'portal':Object.assign(v,{x:dir*(u-.5)*1.1,opacity:pulse(u)**.4})
  }
  if(['ascend','drop','launch','brake','escape','spin-in','portal','burrow'].includes(kind))v.opacity*=smooth(u/.08)*(1-smooth((u-.92)/.08))
  if(kind==='portal'&&props.has('portals'))scene.before.push(ctx=>{ctx.strokeStyle=ink;ctx.lineWidth=Math.max(3,w*.02);for(const x of [.13,.87]){ctx.beginPath();ctx.ellipse(w*x,h*.515,w*.08,h*.275,0,0,TAU);ctx.stroke()}})
  if(kind==='burrow'&&props.has('hole'))scene.before.push(ctx=>{ctx.fillStyle='#627256';ctx.beginPath();ctx.ellipse(w*.5,h*.84,w*.28,h*.06,0,0,TAU);ctx.fill()})
  paint(0,.5+v.x,.52+v.y,1,v.sx,v.sy,v.angle,v.opacity)
  if(kind==='curtain'&&props.has('curtain'))scene.after.push(ctx=>{const edge=.5*(1-pulse(u));ctx.fillStyle=ink;ctx.fillRect(0,0,w*edge,h);ctx.fillRect(w*(1-edge),0,w*edge,h)})
  if(kind==='window-pop'&&props.has('window'))scene.after.push(ctx=>{ctx.strokeStyle=ink;ctx.lineWidth=Math.max(2,w*.01);ctx.beginPath();ctx.roundRect(w*.15,h*.2,w*.7,h*.62,w*.08);ctx.stroke()})
 }
 scene.clip=['peek-bottom','peek-side','curtain','window-pop','launch','drop','brake','ascend','burrow','escape','portal','parade','elevator'].includes(kind)
 return scene
}
export function trackAt(track:any,u:number){const frames=track.keyframes;for(let i=0;i<frames.length-1;i++){const l=frames[i],r=frames[i+1];if(u>=l.time&&u<=r.time){const f=smooth((u-l.time)/(r.time-l.time)),v:any={};for(const k of ['x','y','sx','sy','angle','opacity']){const base=['sx','sy','opacity'].includes(k)?1:0;v[k]=(l[k]??base)+((r[k]??base)-(l[k]??base))*f}return v}}return {x:0,y:0,sx:1,sy:1,angle:0,opacity:1,...frames.at(-1)}}
export function captionVisibility(kind:string|undefined,u:number){return kind==='talk'?[u<.5,u>=.5]:kind==='interrupt'?[Math.floor(u*8)%2===0,Math.floor(u*8)%2===1]:kind==='repeat'?[u<.7,u>=.3]:kind==='silence'?[u<.25,u<.25]:[true,true]}
