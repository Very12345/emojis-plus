import type {Plan} from '../api'
import type {DecodedSource} from '../local/types'
import type {PropLayer,Theme} from './types'
import {actorIds} from './plans'
import {matrix,multiply,type Matrix,type Sprite,type SurfaceFactory} from '../render/scene'
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v))
export function narrativePhase(p:Plan,ms:number,duration:number){return p.narrative?.enabled?clamp(ms/duration,0,.999):.85}
export function stageVisible(stage:string|undefined,phase:number){return !stage||stage==='all'||stage==='setup'&&phase<.25||stage==='event'&&phase>=.25||stage==='reaction'&&phase>=.6}
export function narrativeMatrix(p:Plan,u:number,actor:number,s:number):Matrix {
 if(!p.narrative?.enabled)return matrix(0,0)
 const strength=p.narrative.strength,t=clamp((u-.25)/.35),pulse=Math.sin(t*Math.PI),settle=u>=.6?1:0,sign=actor%2?-1:1
 let dx=0,dy=0,angle=0,sx=1,sy=1
 switch(p.narrative.event_id){
 case 'shake':dx=Math.sin(t*8*Math.PI)*pulse*.025*s*strength;angle=Math.sin(t*6*Math.PI)*pulse*8*strength;break
 case 'panic':sx=1+pulse*.15*strength;sy=1+pulse*.15*strength;angle=Math.sin(t*10*Math.PI)*pulse*9*strength;break
 case 'collapse':dy=(t*.07+settle*.03)*s*strength;sy=1-t*.18*strength;sx=1+t*.08*strength;break
 case 'nod':dy=Math.sin(t*2*Math.PI)*pulse*.025*s*strength;angle=Math.sin(t*Math.PI)*10*strength;break
 case 'bounce':dy=-pulse*.10*s*strength;sy=1+Math.sin(t*2*Math.PI)*.08*strength;break
 case 'recoil':dx=-sign*pulse*.055*s*strength;sx=1-pulse*.12*strength;angle=sign*pulse*12*strength;break
 }
 return matrix(dx,dy,sx,sy,angle)
}
export function applyNarrative(sprite:Sprite,p:Plan,u:number,s:number):Sprite {
 const n=narrativeMatrix(p,u,sprite.actor||0,s),m=sprite.matrix
 return {...sprite,matrix:multiply(matrix(m[4]+n[4],m[5]+n[5]),multiply([n[0],n[1],n[2],n[3],0,0],[m[0],m[1],m[2],m[3],0,0]))}
}
export function propMatrix(layer:PropLayer,p:Plan,sprites:Sprite[],world:Matrix,manual:Map<number,Matrix>):Matrix {
 if(layer.actor_id){const actor=actorIds(p).indexOf(layer.actor_id),sprite=sprites.find(s=>s.actor===actor&&!s.ghost)||sprites.find(s=>s.actor===actor)
  if(sprite){let m=multiply(world,sprite.matrix);if(manual.has(actor))m=multiply(manual.get(actor)!,m);return multiply(m,multiply(matrix(layer.x*sprite.image.width,layer.y*sprite.image.height,1,1,-layer.rotation),matrix(0,0,layer.width*Math.max(sprite.image.width,sprite.image.height),layer.height*Math.max(sprite.image.width,sprite.image.height))))}
 }
 return matrix(layer.x*p.size,layer.y*p.size,layer.width*p.size,layer.height*p.size,-layer.rotation)
}
export function drawProp(ctx:any,id:string,color:string){
 const box=(x:number,y:number,w:number,h:number,fill:string,r=.06)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.stroke()},line=(x:number,y:number,xx:number,yy:number)=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke()},circle=(x:number,y:number,r:number,fill:string)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke()}
 ctx.save();ctx.strokeStyle='#3c4b53';ctx.lineWidth=.025;ctx.lineJoin='round';ctx.lineCap='round'
 switch(id){
 case 'laptop':box(-.45,-.45,.9,.68,'#48576b');box(-.38,-.38,.76,.51,'#c7e7eb',.02);box(-.50,.23,1,.20,'#aeb8c6',.02);line(-.24,.29,.24,.29);break
 case 'book':box(-.46,-.42,.92,.84,color);line(0,-.4,0,.40);ctx.strokeStyle='#fff9e9';for(let j=0;j<4;j++){line(-.36,-.23+j*.14,-.08,-.23+j*.14);line(.08,-.23+j*.14,.36,-.23+j*.14)}break
 case 'paper':case 'notice':box(-.39,-.47,.78,.94,'#fffaf0',.025);ctx.strokeStyle=color;ctx.lineWidth=.055;for(let j=0;j<4;j++)line(-.26,-.25+j*.16,.24-(j%2)*.12,-.25+j*.16);if(id==='notice'){circle(0,-.42,.045,color)}break
 case 'error':box(-.49,-.44,.98,.88,'#fff6ec');box(-.49,-.44,.98,.22,color,.04);circle(0,.04,.16,color);ctx.strokeStyle='#fff';line(-.07,-.03,.07,.11);line(.07,-.03,-.07,.11);ctx.strokeStyle='#8c939a';line(-.25,.31,.25,.31);break
 case 'phone':box(-.30,-.49,.60,.98,'#475365');box(-.24,-.39,.48,.70,'#e2edf1',.02);circle(0,.40,.04,'#e2edf1');box(-.15,-.2,.35,.18,color);break
 case 'cup':ctx.lineWidth=.07;circle(.34,.02,.18,'#ffffff');box(-.39,-.28,.65,.65,'#fff9eb');ctx.strokeStyle=color;line(-.25,-.40,-.23,-.49);line(-.04,-.38,-.06,-.49);break
 case 'tray':box(-.49,-.34,.98,.68,'#d7e1db');circle(-.18,0,.22,'#fff9e9');circle(.24,-.09,.12,'#dba77d');circle(.24,.15,.10,'#90b37d');break
 case 'clock':circle(0,0,.46,'#fffaf1');ctx.strokeStyle=color;ctx.lineWidth=.05;line(0,0,0,-.26);line(0,0,.22,.1);for(let j=0;j<12;j++){const a=j*Math.PI/6;line(Math.sin(a)*.36,Math.cos(a)*.36,Math.sin(a)*.40,Math.cos(a)*.40)}break
 case 'question':ctx.fillStyle=color;ctx.font='bold .88px ep-sans';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('?',0,0);break
 case 'sweat':ctx.fillStyle='#87c7ea';ctx.beginPath();ctx.moveTo(0,-.48);ctx.bezierCurveTo(-.65,.2,-.24,.52,0,.46);ctx.bezierCurveTo(.55,.42,.29,-.08,0,-.48);ctx.fill();ctx.stroke();break
 case 'heart':ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,.45);ctx.bezierCurveTo(-.9,-.1,-.4,-.8,0,-.24);ctx.bezierCurveTo(.4,-.8,.9,-.1,0,.45);ctx.fill();ctx.stroke();break
 case 'confetti':for(let j=0;j<12;j++){ctx.save();ctx.translate(Math.sin(j*2.4)*.44,Math.cos(j*2.4)*.40);ctx.rotate(j);box(-.035,-.07,.07,.14,['#df8684','#e6bf69','#8ebca3','#9e9fcd'][j%4],.01);ctx.restore()}break
 case 'speech':case 'thought':box(-.49,-.43,.98,.78,'#fffef7',.16);if(id==='speech'){ctx.fillStyle='#fffef7';ctx.beginPath();ctx.moveTo(-.2,.34);ctx.lineTo(-.3,.51);ctx.lineTo(.01,.34);ctx.fill();ctx.stroke()}else{circle(-.25,.42,.06,'#fffef7');circle(-.32,.53,.035,'#fffef7')}break
 }ctx.restore()
}
export function drawEnvironment(ctx:any,theme:Theme,p:Plan,foreground=false){
 const size=p.size,kind=theme.environment,palette=theme.palette,detail=p.composition?.detail??.75
 ctx.save();ctx.scale(size,size);ctx.lineWidth=.004;ctx.strokeStyle=palette.accent
 const r=(x:number,y:number,w:number,h:number,color:string,radius=.012)=>{ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,radius);ctx.fill()},line=(x:number,y:number,xx:number,yy:number)=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke()},circle=(x:number,y:number,rr:number,color:string)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,rr,0,Math.PI*2);ctx.fill()}
 const window=(night=false)=>{r(.62,.24,.31,.31,night?'#242b52':'#d6ebee');line(.775,.24,.775,.55);line(.62,.395,.93,.395);if(night)circle(.84,.30,.035,'#f4e7b3')},desk=()=>{r(.05,.71,.90,.032,palette.accent);r(.09,.74,.025,.07,palette.accent);r(.86,.74,.025,.07,palette.accent)},shelves=()=>{for(let j=0;j<3;j++){r(.06,.26+j*.145,.88,.012,palette.accent);for(let i=0;i<Math.round(detail*14);i++)r(.075+i*.061,.17+j*.145,.034,.085,['#b9987e','#91ad9e','#d9bd87','#91a3b9'][i%4])}}
 if(foreground){if(['classroom','exam','desk','meeting','canteen','office','dorm'].includes(kind))desk();if(kind==='cinema'){r(.05,.70,.22,.055,palette.accent);r(.73,.70,.22,.055,palette.accent)}ctx.restore();return}
 r(0,0,1,1,palette.background,0);const g=ctx.createLinearGradient(0,.18,0,.76);g.addColorStop(0,palette.secondary);g.addColorStop(1,palette.background);ctx.fillStyle=g;ctx.fillRect(0,.18,1,.58);r(0,.68,1,.32,palette.secondary,0)
 switch(kind){
 case 'classroom':case 'exam':r(.07,.25,.63,.25,'#668576');r(.085,.266,.60,.218,'#3f6254');ctx.strokeStyle='#e3ebcd';for(let i=0;i<5*detail;i++)line(.14,.30+i*.03,.34+(i%2)*.21,.30+i*.03);r(.76,.27,.15,.15,'#fff9eb');ctx.strokeStyle=palette.accent;line(.835,.30,.835,.35);line(.835,.35,.88,.37);break
 case 'desk':window();r(.09,.26,.24,.26,'#fff6df');for(let j=0;j<4*detail;j++)r(.13,.30+j*.045,.15,.009,palette.accent);line(.39,.30,.46,.48);r(.34,.25,.17,.04,palette.accent);break
 case 'library':shelves();break
 case 'dorm':window(true);r(.04,.50,.31,.17,'#777899');r(.03,.64,.34,.04,'#c1b1ac');r(.05,.68,.02,.07,'#c1b1ac');circle(.44,.32,.08,'#f4daa1');r(.43,.38,.02,.28,palette.accent);break
 case 'meeting':case 'office':window();r(.08,.24,.42,.24,'#f8fbf6');for(let i=0;i<5*detail;i++)r(.12+i*.07,.43-i*.027,.035,.02+i*.027,palette.accent);r(.07,.56,.20,.11,'#9babb4');r(.75,.56,.18,.11,'#9babb4');break
 case 'canteen':r(.06,.24,.88,.30,'#fff8dc');r(.06,.24,.88,.065,palette.accent);for(let i=0;i<3;i++){r(.11+i*.28,.36,.21,.14,palette.secondary);r(.13+i*.28,.38,.17,.02,palette.accent)}for(let i=0;i<4*detail;i++){circle(.1+i*.21,.64,.016,palette.accent);line(.1+i*.21,.65,.1+i*.21,.71)}break
 case 'notice':r(.10,.25,.8,.36,palette.accent);for(let i=0;i<4;i++){r(.14+(i%2)*.39,.28+Math.floor(i/2)*.15,.30,.12,'#fffae8');circle(.29+(i%2)*.39,.29+Math.floor(i/2)*.15,.009,'#c6776b')}break
 case 'phone-room':window();r(.09,.56,.28,.13,palette.accent);r(.10,.48,.24,.10,palette.secondary);for(let i=0;i<4*detail;i++)circle(.16+i*.14,.32,.013,palette.accent);break
 case 'station':r(.05,.26,.9,.30,'#89a9ae');for(let i=0;i<4;i++)r(.09+i*.22,.30,.17,.20,'#e2eff0');r(.05,.57,.90,.025,palette.accent);r(.03,.68,.94,.026,'#cbb370');line(.15,.75,.85,.75);break
 case 'living':r(.10,.51,.80,.18,palette.accent,.05);r(.17,.48,.30,.17,palette.secondary,.035);r(.53,.48,.30,.17,palette.secondary,.035);circle(.85,.30,.07,'#f5d9a2');line(.85,.37,.85,.61);break
 case 'party':for(let j=0;j<9*detail;j++){line(.1,.24,.9,.24);ctx.fillStyle=['#e2a29a','#c4c987','#9bb9c2'][j%3];ctx.beginPath();ctx.moveTo(.1+j*.09,.24);ctx.lineTo(.14+j*.09,.34);ctx.lineTo(.18+j*.09,.24);ctx.fill()}for(let j=0;j<5*detail;j++)circle(.12+j*.18,.46+(j%2)*.07,.018,palette.accent);break
 case 'rain-window':window();ctx.strokeStyle='#92a5c0';for(let j=0;j<14*detail;j++){const x=.64+(j%5)*.054,y=.26+Math.floor(j/5)*.08;line(x,y,x-.012,y+.04)}r(.12,.57,.37,.12,palette.accent);break
 case 'cinema':r(.09,.25,.82,.27,palette.accent);r(.11,.27,.78,.23,'#f5ead8');for(let j=0;j<6*detail;j++)r(.04+j*.16,.62,.12,.08,palette.accent);break
 case 'doorway':r(.11,.24,.29,.43,palette.accent);r(.13,.26,.25,.41,palette.secondary);circle(.34,.48,.012,palette.accent);r(.65,.41,.24,.08,'#fff8eb');for(let j=0;j<3;j++)circle(.70+j*.07,.45,.009,palette.accent);break
 }
 // Quiet caption region keeps the environment away from the punchline.
 ctx.fillStyle=theme.id==='dorm-night'?'rgba(247,241,224,.97)':'rgba(255,253,245,.94)';ctx.beginPath();ctx.roundRect(.045,.77,.91,.20,.035);ctx.fill();ctx.restore()
}
export function prepareEnvironment(theme:Theme,p:Plan,factory:SurfaceFactory,bg?:DecodedSource){const c=factory(p.size,p.size),ctx=c.getContext('2d');drawEnvironment(ctx,theme,p);if(p.background_style==='image'&&bg){const im=bg.frames[0],scale=Math.max(p.size/im.width,p.size/im.height)*(p.background_zoom||1);ctx.clearRect(0,0,p.size,p.size);ctx.drawImage(im,(p.size-im.width*scale)*(p.background_pan_x??.5),(p.size-im.height*scale)*(p.background_pan_y??.5),im.width*scale,im.height*scale)}const output=factory(p.size,p.size),out=output.getContext('2d');out.fillStyle=theme.palette.background;out.fillRect(0,0,p.size,p.size);out.filter=`brightness(${p.composition?.brightness??1}) blur(${(p.composition?.blur||0)*p.size/512}px)`;out.drawImage(c,0,0);out.filter='none';if(p.composition?.tint){out.globalAlpha=p.composition.tint;out.fillStyle=theme.palette.accent;out.fillRect(0,0,p.size,p.size);out.globalAlpha=1}return output}

export function readablePlate(color:string):'light'|'dark'{const channels=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4),luminance=channels.reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);return luminance>.179?'dark':'light'}
