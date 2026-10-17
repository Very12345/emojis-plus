import type {Asset} from './api'
export const materialMoods=[
 {id:'happy',name:'开心',tags:['开心','快乐','兴奋','大笑','偷笑','满足']},
 {id:'angry',name:'生气',tags:['生气','愤怒','不满','恼火']},
 {id:'sad',name:'委屈难过',tags:['难过','委屈','失落','哭泣','大哭','绝望','低落']},
 {id:'surprised',name:'惊讶',tags:['惊讶','震惊','惊吓']},
 {id:'confused',name:'疑惑',tags:['疑惑','困惑','怀疑','思考','迷茫']},
 {id:'speechless',name:'无语',tags:['无语','嫌弃','无奈','不屑']},
 {id:'tired',name:'疲惫困倦',tags:['疲惫','困倦','睡觉','哈欠','躺平','无力']},
 {id:'scared',name:'害怕紧张',tags:['害怕','恐惧','紧张','担心','惊恐','慌张','着急']},
 {id:'proud',name:'得意自信',tags:['得意','自信','傲娇','神气']},
 {id:'warm',name:'亲近安慰',tags:['安慰','温柔','陪伴','友好','亲近','感谢','比心','爱心眼']},
 {id:'awkward',name:'尴尬',tags:['尴尬','心虚','害羞']},
 {id:'hopeful',name:'期待',tags:['期待','好奇','祈求']}
]as const
export const preferredMaterial=(a:Asset)=>a.enabled!==false&&a.metadata.library_status!=='alternate'
export function matchesMaterialMood(a:Asset,mood:string){const group=materialMoods.find(m=>m.id===mood);return !mood||!!group&&group.tags.some(tag=>a.metadata.emotion.includes(tag))}
export function materialChoices(assets:Asset[],currentId=''){return assets.filter(a=>preferredMaterial(a)||a.id===currentId)}
export function intentMoods(text:string){return materialMoods.filter(m=>m.tags.some(t=>text.includes(t))||(m.id==='tired'&&/好累|累了|累死|熬夜|困了|想睡|没力气/.test(text))||(m.id==='sad'&&/伤心|想哭|不高兴/.test(text))||(m.id==='angry'&&/气死|气炸|火大/.test(text))||(m.id==='scared'&&/好慌|吓死|救命/.test(text))).map(m=>m.id)}
