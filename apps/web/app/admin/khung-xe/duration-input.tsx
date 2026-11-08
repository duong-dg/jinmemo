'use client';
import {useEffect,useRef,useState} from 'react';
import {parseRideDuration,rideDurationInput,formatRideDuration} from '../../../lib/ride-duration';
export function DurationInput({value,mixed,label,onChange}:{value?:number;mixed:boolean;label:string;onChange:(value:number|undefined)=>void}){
 const focused=useRef(false),[text,setText]=useState(mixed?'':rideDurationInput(value)),[invalid,setInvalid]=useState(false);
 useEffect(()=>{if(!focused.current){setText(mixed?'':rideDurationInput(value));setInvalid(false);}},[value,mixed]);
 return <label>Giờ / phút<input aria-label={label} type="text" placeholder={mixed?'Khác nhau':"30' / 1h30"} value={text} onFocus={()=>{focused.current=true;}} onChange={e=>{const next=e.target.value,parsed=parseRideDuration(next);setText(next);setInvalid(parsed===null);e.target.setCustomValidity(parsed===null?"Nhập 30, 30' hoặc 1h30; tối đa 48 giờ.":'');if(parsed!==null)onChange(parsed);}} onBlur={()=>{focused.current=false;const parsed=parseRideDuration(text);if(parsed!==null)setText(rideDurationInput(parsed));}}/>{invalid?<small role="alert">Ví dụ: 30' hoặc 1h30</small>:!mixed&&value?<small>{formatRideDuration(value)}</small>:null}</label>;
}
