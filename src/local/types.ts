import type {Theme,PropDefinition,Composition} from '../themes/types'
import type {Asset,Template,Preset,Caption,EffectOption,FontOption,Plan} from '../api'
export interface RuntimeFont extends FontOption {url:string;coverage:[number,number][]}
export type RuntimeTemplate=Template&{layout_id:string;defaults:Partial<Plan>;sample:Partial<Plan>;layout?:any;animation?:any;motions:any[]}
export interface Catalog {assets:Asset[];templates:RuntimeTemplate[];presets:any[];captions:Caption[];effects:EffectOption[];fonts:RuntimeFont[];categories:any[];curation:any;themes?:Theme[];props?:PropDefinition[];compositions?:Composition[];emblem_url?:string}
export interface DecodedSource {frames:any[];delays:number[];loop:number|null;width:number;height:number}
export interface RenderInput {plan:Plan;template:RuntimeTemplate;effects:EffectOption[];assets:Asset[];fonts:RuntimeFont[];base:string;themes?:Theme[];props?:PropDefinition[];compositions?:Composition[]}
export interface AISettings {base_url:string;model:string;api_key:string;response_mode:'json'|'strict'|'text'}
