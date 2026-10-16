import {useEffect,useState,type InputHTMLAttributes} from 'react'
type Props=Omit<InputHTMLAttributes<HTMLInputElement>,'value'|'min'|'max'|'onChange'|'type'>&{value:number;min:number;max:number;type?:'number';onChange:(event:{target:{value:string}})=>void}
export default function NumberInput({value,min,max,onChange,...props}:Props){
 const [raw,setRaw]=useState(String(value)),[focused,setFocused]=useState(false)
 useEffect(()=>{if(!focused)setRaw(String(value))},[value,focused])
 function finish(){setFocused(false);const n=Number(raw);if(raw.trim()&&Number.isFinite(n)){const bounded=Math.max(min,Math.min(max,n));setRaw(String(bounded));onChange({target:{value:String(bounded)}})}else setRaw(String(value))}
 return <input {...props} type="number" min={min} max={max} value={focused?raw:value} onFocus={()=>{setFocused(true);setRaw(String(value))}} onChange={e=>{const text=e.target.value;setRaw(text);const n=Number(text);if(text.trim()&&Number.isFinite(n)&&n>=min&&n<=max)onChange({target:{value:text}})}} onBlur={finish} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur()}}}/>
}
