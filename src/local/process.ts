export type ProcessStage='queued'|'analyzing'|'receiving'|'planning'|'validating'|'rendering'|'completed'|'failed'|'cancelled'
export interface ProcessUpdate {stage:ProcessStage;message:string;percent?:number;candidate?:number;received_chars?:number}
export interface ProcessEvent extends ProcessUpdate {seq:number;at:number}
export type ProcessReporter=(update:ProcessUpdate)=>void

export function appendProcessEvent(events:ProcessEvent[],event:ProcessEvent){const last=events.at(-1),replace=last&&last.stage===event.stage&&(event.stage==='receiving'||event.stage==='rendering'&&last.candidate===event.candidate&&last.message===event.message),next=replace?[...events.slice(0,-1),event]:[...events,event];return next.length>100?[next[0],...next.slice(-99)]:next}
