import type {Plan,TextBox,FontFamily} from '../api'
export type CaptionRole='speech'|'thought'|'narration'|'punchline'
export interface TextStyle {
 font_family?:FontFamily|null;text_color?:string;font_style?:Plan['font_style'];text_backdrop?:Plan['text_backdrop'];letter_spacing?:number;line_spacing?:number
 emphasis?:{text:string;color:string;bold:boolean}[]
 role?:CaptionRole;stage?:'all'|'setup'|'event'|'reaction';locked?:boolean;hidden?:boolean;z?:number
}
export interface PropDefinition {id:string;name:string;handler:string;description:string;tags:string[];enabled:boolean}
export interface PropLayer {id:string;prop_id:string;actor_id?:string;text_id?:string;x:number;y:number;width:number;height:number;rotation:number;color:string;z:number;hidden?:boolean;locked?:boolean;stage?:'all'|'setup'|'event'|'reaction';origin?:'theme'|'user'}
export interface Theme {id:string;name:string;category:'campus'|'daily';description:string;tags:string[];emotion:string[];palette:{background:string;secondary:string;accent:string;ink:string};environment:string;layers:string[];focus:[number,number];safe_area:TextBox;occlusion:{x:number;y:number;width:number;height:number}[];enabled:boolean}
export interface Composition {id:string;theme_id:string;name:string;variant:'direct'|'story'|'contrast';description:string;sample:{text:string;secondary_text:string;character:string};event:string;props:string[];default_people:number;enabled:boolean}
export interface ThemeState {theme_id:string;composition_id:string;brightness:number;blur:number;tint:number;detail:number;shadow:boolean}
export interface Narrative {enabled:boolean;speed:number;strength:number;duration_ms:number;setup:string;event:string;reaction:string;transition:'cut'|'fade';event_id:string}
