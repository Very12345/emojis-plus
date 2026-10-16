declare module 'gifenc' {
 export function GIFEncoder():any
 export function quantize(data:Uint8Array|Uint8ClampedArray,max:number,options?:any):number[][]
 export function applyPalette(data:Uint8Array|Uint8ClampedArray,palette:number[][],format?:string):Uint8Array
 const gifenc:{GIFEncoder:typeof GIFEncoder;quantize:typeof quantize;applyPalette:typeof applyPalette}
 export default gifenc
}
