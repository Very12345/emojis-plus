import type {TextField} from '../api'
export interface CanvasElement {
 id:string;kind:'text'|'actor'|'background'|'prop';label:string
 rect:[number,number,number,number];actor?:number;field?:TextField;layerId?:string
 boundPropId?:string;basis?:[number,number,number,number,number,number];anchorBases?:Record<string,[number,number,number,number,number,number]>;locked?:boolean;hidden?:boolean;scale?:number;rotation:number;fontSize?:number;actualFontSize?:number
}
