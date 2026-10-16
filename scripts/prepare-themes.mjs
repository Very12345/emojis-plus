import fs from 'node:fs/promises'
// Authored scene definitions. All geometry is drawn by the trusted Canvas renderer.
const rows=[
 ['early-class','早八课堂','campus','classroom',['早八','上课','起床','困'],['疲惫','困倦'],'#f3ecd8','#d6dfcb','#65806b','clock','shake',['人到了，脑子还在路上','早八已签到','灵魂稍后抵达','今天一定认真听','老师开始讲了','眼睛：已退出会议']],
 ['exam','考场应试','campus','exam',['考试','考场','复习','挂科'],['紧张','害怕'],'#f4ebda','#e0d0ae','#b07953','paper','panic',['会的全没考','开考之前：稳了','翻开试卷：完了','这题我见过','答案离我很近','它只是拒绝出现']],
 ['deadline','作业 DDL','campus','desk',['作业','DDL','代码','提交','报错'],['焦虑','崩溃'],'#e7e9fa','#bbc4df','#bf626d','error','collapse',['写完了，但没交上','最后再改一行','提交失败','我宣布大功告成','错误窗口出现','庆功宴改追悼会']],
 ['library','图书馆自习','campus','library',['图书馆','自习','学习','读书'],['认真','疲惫'],'#eee8da','#c9d7cf','#638775','book','nod',['坐在知识的海洋里发呆','这章看完就休息','怎么还是第一页','今日目标：学懂','书翻开了','知识从旁边绕过去了']],
 ['dorm-night','宿舍熬夜','campus','dorm',['宿舍','熬夜','凌晨','睡觉'],['疲惫','困倦'],'#292e51','#53547a','#e5be79','cup','collapse',['再五分钟就睡','最后看一眼','窗外怎么亮了','早睡计划启动','手机亮了一下','计划明天再启动']],
 ['groupwork','小组作业','campus','meeting',['小组','组队','合作','队友'],['无语','生气'],'#e9f0e6','#c4d6c1','#6b8b6c','laptop','shake',['小组作业，单人通关','大家都看见了吗','收到一个已读','我们有四个人','分工完毕','我负责其余所有']],
 ['canteen','食堂排队','campus','canteen',['食堂','吃饭','排队','午饭'],['期待','委屈'],'#fff0dc','#ead7ba','#d58b58','tray','bounce',['排到我，刚好卖完','今天一定吃到','前面还有亿个人','只想吃顿热饭','窗口开始收摊','我来洗盘子也行']],
 ['notice','临时通知','campus','notice',['通知','安排','改期','学校','临时'],['震惊','无语'],'#e9eff6','#cfdae7','#c16f69','notice','recoil',['收到，又改了','一切按原计划','新的通知来了','计划做得很完美','临时调整一下','完美地全部作废']],
 ['waiting','消息等待','daily','phone-room',['消息','回复','不回','聊天','等'],['期待','委屈'],'#edf0ff','#d4d9ef','#8d7eb8','phone','nod',['正在等一个奇迹回复','对方正在输入','输入了半个世纪','我一点也不在意','屏幕亮了','是电量不足提醒']],
 ['office','开会打工','daily','office',['工作','上班','开会','老板','打工'],['疲惫','无语'],'#e8eff2','#c1d0d9','#718994','laptop','collapse',['身体在开会，灵魂在下班','简单说两句','两个小时过去了','今天准时下班','老板发来消息','明天的我开始上班']],
 ['commute','通勤赶路','daily','station',['通勤','地铁','赶路','迟到','公交'],['焦虑','疲惫'],'#e8f0f2','#c2d9db','#5c969f','clock','recoil',['差一点就赶上了','这班一定赶得上','车门正在关闭','我已经提前出门','前方临时停车','迟到从不辜负我']],
 ['weekend','周末休息','daily','living',['周末','休息','躺平','放假'],['平静','开心'],'#f8eadf','#e4cdb9','#b78a6e','cup','nod',['今天的任务是休息','终于可以躺下','不接受任何安排','周末要做很多事','先躺五分钟','周一怎么来了']],
 ['celebrate','庆祝成功','daily','party',['成功','庆祝','通过','跑通','开心'],['开心','得意'],'#fff0ce','#f7d5a6','#d18b54','confetti','bounce',['这次真的成了','让我再试一次','成功了','小小成功一下','礼花准备完毕','本人的伟大时刻']],
 ['comfort','安慰陪伴','daily','rain-window',['安慰','难过','陪伴','抱抱','伤心'],['温柔','委屈'],'#e9e9f4','#cdd5e5','#9191b3','heart','nod',['没关系，我陪你','今天不太顺利','先喝口热的','世界有点吵','给你留了位置','来这边歇一会儿']],
 ['spectator','围观吃瓜','daily','cinema',['吃瓜','围观','八卦','看戏'],['好奇','震惊'],'#ede5f5','#cfc0dd','#9875a5','question','recoil',['我就坐这儿看看','事情应该很简单','还有这种展开','路过，绝不参与','掏出小板凳','瓜怎么长到我头上了']],
 ['awkward','社交尴尬','daily','doorway',['尴尬','社交','认错','打招呼','冷场'],['害羞','紧张'],'#f4e8e7','#dfcacc','#b3858f','sweat','collapse',['现在换个星球还来得及','热情地打个招呼','对方是谁来着','我很擅长社交','空气突然安静','好的，我先蒸发']],
]
const props=[['laptop','电脑'],['book','书本'],['paper','作业纸'],['notice','通知单'],['error','错误窗口'],['phone','手机'],['cup','茶杯'],['tray','餐盘'],['clock','时钟'],['question','问号'],['sweat','汗滴'],['heart','爱心'],['confetti','礼花'],['speech','对话气泡'],['thought','思考气泡']].map(([id,name])=>({id,name,handler:id,description:`可绑定人物或固定场景的${name}`,tags:[name,'互动'],enabled:true}))
const themes=rows.map(([id,name,category,environment,tags,emotion,background,secondary,accent])=>({id,name,category,description:`${name}：环境交代情境，角色响应事件，文案完成表达。`,tags,emotion,palette:{background,secondary,accent,ink:id==='dorm-night'?'#fff6df':'#28373b'},environment,layers:['background','midground','foreground'],focus:[.5,.52],safe_area:{x:.08,y:.77,width:.84,height:.18},occlusion:[{x:.02,y:.71,width:.96,height:.035}],enabled:true}))
const roles=['Meowl','奶蛙','猫耳修女','毛毛虫','肥嘟嘟','奶蛋','牛来','奶龙（原版）']
const compositions=rows.flatMap(([id,name,,,,,,,,prop,event,lines],i)=>['direct','story','contrast'].map((variant,v)=>({id:id+'-'+variant,theme_id:id,name:name+' · '+['直白表达','情境叙事','反差玩梗'][v],variant,description:[`突出角色与一句直接回应`, `通过${props.find(p=>p.id===prop)?.name}触发角色反应`, `先铺垫期待，再出现反差落点`][v],sample:{text:lines[v===0?0:v===1?1:3],secondary_text:lines[v===0?0:v===1?2:5],event:lines[v===1?2:4],character:roles[(i+v)%roles.length]},event:variant==='direct'?'nod':variant==='contrast'?(event==='bounce'?'bounce':'recoil'):event,props:[prop,...(v===2?['thought']:[])],default_people:['groupwork','comfort'].includes(id)?2:1,enabled:true})))
await fs.mkdir('assets/registry',{recursive:true})
for(const [key,value] of Object.entries({themes,props,compositions}))await fs.writeFile(`assets/registry/${key}.json`,JSON.stringify({schema_version:1,[key]:value},null,2)+'\n')
console.log('Registered 16 themes, 15 props, 48 compositions')
