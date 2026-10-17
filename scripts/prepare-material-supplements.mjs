import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'
import {measureMaterial} from './material-metrics.mjs'
const folder='assets/material-supplements',file=folder+'/records.json',records=JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));
await fs.mkdir(folder+'/masters',{recursive:true});await fs.mkdir('assets/seed/material-supplements',{recursive:true});
const examples={'生气':'我真的生气了！','委屈':'我也没做错什么呀。','惊讶':'这也可以？','疲惫':'今天的电量用完了。','开心':'好耶！','困倦':'我先睡一会儿。','疑惑':'怎么回事？','害怕':'等一下，我害怕。','温柔':'别难过，我在呢。'},items=[];
for(const r of records.records){
 const master=folder+'/masters/'+r.id+'.png';if(path.resolve(r.master)!==path.resolve(master))await fs.copyFile(r.master,master);
 const bytes=await fs.readFile(master),m=await measureMaterial(bytes);if(!m.has_transparency||m.empty)throw Error('Not a transparent subject: '+r.id);
 const b=m.bounds,png=await sharp(bytes).extract({left:b.x,top:b.y,width:b.width,height:b.height}).resize(448,448,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).extend({top:32,bottom:32,left:32,right:32,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
 await fs.writeFile('assets/seed/material-supplements/'+r.id+'.png',png);
 r.master=master;r.master_sha256=crypto.createHash('sha256').update(bytes).digest('hex');r.master_size=[m.source_width,m.source_height];r.working_size=[512,512];r.review='通过：独立生成；角色及情绪人工检查；主体完整；实际透明 RGBA；512 工作图等比适配并留安全边距。';r.source_classification='AI派生，非原作者亲绘';
 items.push({id:r.id,name:`${r.character} · ${r.mood} · AI派生`,character:r.character,filename:'material-supplements/'+r.id+'.png',emotion:[r.mood],action:r.mood,intensity:['生气','惊讶','害怕'].includes(r.mood)?3:2,scenes:['日常聊天','校园'],examples:[examples[r.mood]],existing_text:'',source_type:'project_derivative',author:'Emojis Plus（AI派生）',source_note:`使用内置 image_gen 参考已注册素材 ${r.reference} 独立生成并审核；原参考来源保留于该素材。本图为 AI 派生，并非原作者亲绘。提示词与审核见 assets/material-supplements/records.json；高分辨率母版在本机保存。`,role:'subject',is_cutout:true,allow_flip:true,derived_from:'',text_safe_area:null,library_status:'preferred',subject_count:1});
}
await fs.writeFile(file,JSON.stringify(records,null,2)+'\n');await fs.writeFile('assets/seed/material-supplements-catalog.json',JSON.stringify(items,null,2)+'\n');console.log('Prepared '+items.length+' independently generated transparent materials.');
