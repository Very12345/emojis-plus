export type TemplateId = string
export type FontFamily = 'sans' | 'serif' | 'kuaile' | 'xiaowei' | 'qingke' | 'mashan' | 'longcang'
export interface FontOption {id:FontFamily;name:string;description:string;sample_url:string}
export type Effect = string
export interface EffectOption {id:string;name:string;handler:string}
export interface CharacterLayer {asset_id:string;x:number;y:number;scale:number;rotation:number;flip:boolean;opacity:number;effect:Effect;strength:number;speed:number}
export interface Metadata {
  emotion: string[]; scenes: string[]; examples: string[]; action: string; intensity: number;
  existing_text: string; source_type: string; author: string; source_url: string; source_note: string;
  text_safe_area: {x: number; y: number; width: number; height: number} | null;
  templates: TemplateId[]
  role: 'subject' | 'background' | 'symbol'; is_cutout: boolean; derived_from: string
  allow_flip?:boolean
}
export interface Asset {
  id: string; name: string; character: string; url: string; poster_url?:string; enabled: boolean; metadata: Metadata;
  info: {width: number; height: number; frames: number; duration_ms: number; format: string; has_transparency: boolean}
}
export interface Animation {handler:string;duration_ms:number;poster_time:number;parameters:('strength'|'copies'|'direction'|'prop_color')[]}
export interface Template {id: TemplateId; name: string; description: string; enabled: boolean;layout_id?:string;requires_transparency?:boolean;supports_embedded?:boolean;defaults?:Partial<Plan>;motions?:{effect_id:string;target:string;speed:number}[];layout?:{captions:{field:string}[];subject_mode:string};cast?:{x:number;y:number;scale:number;rotation:number}[];min_characters?:number;max_characters?:number;category_id?:string;subcategory_id?:string;category_name?:string;subcategory_name?:string;tags?:string[];animation?:Animation|null;preview_version?:string;sample?:Partial<Plan>}
export interface Plan {
  asset_id: string; template_id: TemplateId; text: string; secondary_text: string;
  format: 'jpg' | 'gif'; size: 256 | 512; font_size: number; background: string; text_color: string;
  text_x: number; text_y: number; effect: Effect; strength: number; flip: boolean; zoom: number; emblem: boolean
  background_style: 'solid' | 'gradient' | 'paper' | 'rays' | 'image'; background_secondary: string; background_asset_id: string | null;
  text_placement: 'caption' | 'embedded'; font_style: 'plain' | 'bold' | 'outline' | 'sticker' | 'handwritten' | 'stamp' | 'shadow';
  font_family: FontFamily | null;
  text_layout: 'horizontal' | 'vertical' | 'staggered';
  effects: Effect[]; speed: number; rotation: number; copies: number; petals: number;
  emblem_mode: 'badge' | 'speaker' | 'personified' | 'symbol'; speaker_name: string
  characters:CharacterLayer[];primary_x:number;primary_y:number;primary_scale:number
  template_motion:boolean;template_speed:number;letter_spacing:number;line_spacing:number;text_backdrop:'auto'|'none'|'light'|'dark'
  template_strength:number;template_direction:1|-1;prop_color:string
}
export interface Preset {id: string; name: string; description: string; category: string; preview_url: string; plan: Plan;category_id?:string;subcategory_id?:string;subcategory_name?:string;tags?:string[];animation?:Animation|null}
export interface Caption {id: string; category: string; text: string; secondary_text: string; tags: string[]}
export function samePlan(a: Plan, b: Plan) {return (Object.keys(a) as (keyof Plan)[]).every(k=>JSON.stringify(a[k])===JSON.stringify(b[k])) && Object.keys(a).length===Object.keys(b).length}
export interface Rendered {
  url: string; filename: string; info: {width: number; height: number; frames: number; duration_ms: number;elapsed_ms?:number;cache_hit?:boolean}; plan: Plan
}
export interface Candidate extends Rendered {style: string; reason: string}
export interface Generation {intent: {scene: string; target: string; emotion: string; tone: string}; candidates: Candidate[]}
export interface ModelConfig {base_url: string; model: string; response_mode: string; configured: boolean; has_api_key: boolean}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Compatibility dispatcher for existing components; no HTTP API/server involved.
  return (await import('./local/service')).dispatch(path,options)
}
export async function waitJob<T>(id: string, onStatus?: (status: string) => void,signal?:AbortSignal): Promise<T> {
  return (await import('./local/service')).waitLocalJob(id,onStatus,signal)
}
export function makePlan(asset: Asset, text?: string): Plan {
  return {asset_id: asset.id, template_id: 'bottom',
    text: text || asset.metadata.examples[0] || '今天也在努力保持冷静', secondary_text: '',
    format: 'jpg', size: 512, font_size: 34, background: '#ffffff', text_color: '#202522',
    text_x: 0, text_y: 0, effect: 'none', strength: .5, flip: false, zoom: 1, emblem: false,template_motion:true,template_speed:1,template_strength:.7,template_direction:1,prop_color:'#e990a0',letter_spacing:.06,line_spacing:1.45,text_backdrop:'auto',
    background_style: 'solid', background_secondary: '#e7efd2', background_asset_id: null,
    text_placement: 'caption', font_style: 'plain', effects: [], speed: 1, rotation: 0, copies: 5, petals: 6,
    text_layout: 'horizontal',
    font_family: 'sans',
    emblem_mode: 'speaker', speaker_name: '',characters:[],primary_x:.5,primary_y:.5,primary_scale:1}
}
export const emptyMetadata: Metadata = {
  emotion: [], scenes: [], examples: [], action: '', intensity: 2, existing_text: '',
  source_type: 'reference', author: '', source_url: '', source_note: '', text_safe_area: null,
  templates: ['top', 'bottom', 'split', 'frame', 'flower', 'grid', 'message', 'poster', 'side', 'polaroid', 'bubble', 'dialogue', 'spotlight', 'comic', 'subtitle', 'note', 'window', 'ticket', 'medal', 'scene'],
  role: 'subject', is_cutout: false, derived_from: '',
}
