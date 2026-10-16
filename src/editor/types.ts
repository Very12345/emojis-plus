import type {TextField} from '../api'
export interface CanvasElement {
 id:string;kind:'text'|'actor'|'background';label:string
 rect:[number,number,number,number];actor?:number;field?:TextField;layerId?:string
 scale?:number;rotation:number;fontSize?:number;actualFontSize?:number
}
