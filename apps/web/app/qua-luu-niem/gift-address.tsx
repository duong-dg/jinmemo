'use client';
import {useEffect,useState} from 'react';
import {RideAreaSearch} from '../components/ride-area-search';

type Area={code:number;name:string};
export function GiftAddress({onChange}:{onChange:(value:string)=>void}){
 const [provinces,setProvinces]=useState<Area[]>([]),[wards,setWards]=useState<Area[]>([]);
 const [province,setProvince]=useState(''),[ward,setWard]=useState(''),[street,setStreet]=useState('');
 const [error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  setError('');
  if(province)setWards([]);
  fetch('/api/v1/gifts/addresses'+(province?'?province='+encodeURIComponent(province):''),{signal:controller.signal})
   .then(async response=>{
    if(!response.ok)throw new Error('Chưa tải được danh mục địa chỉ.');
    const {data}=await response.json();
    if(!controller.signal.aborted)(province?setWards:setProvinces)(data);
   }).catch(err=>{if(!controller.signal.aborted)setError(err.message);});
  return()=>controller.abort();
 },[province,retry]);
 const provinceName=provinces.find(a=>String(a.code)===province)?.name;
 const wardName=wards.find(a=>String(a.code)===ward)?.name;
 const address=provinceName&&wardName&&street.trim().length>=3?[street.trim(),wardName,provinceName,'Việt Nam'].join(', '):'';
 useEffect(()=>{onChange(address);},[address,onChange]);
 const options=(areas:Area[])=>areas.map(a=>({id:String(a.code),label:a.name}));
 return <>
  <RideAreaSearch label="Tỉnh / Thành phố" placeholder="Gõ tên tỉnh hoặc thành phố…" options={options(provinces)} value={province} onChange={id=>{if(id!==province){setWard('');setWards([]);setProvince(id);}}}/>
  {province&&<RideAreaSearch key={province} label="Xã / Phường" placeholder="Gõ tên xã hoặc phường…" options={options(wards)} value={ward} onChange={setWard}/>}
  <label>Số nhà, tên đường, thôn/tổ <textarea required minLength={3} maxLength={180} autoComplete="street-address" value={street} onChange={e=>setStreet(e.target.value)}/></label>
  {address&&<small>Giao tới {address}</small>}
  {error&&<div role="alert">{error} <button type="button" onClick={()=>setRetry(n=>n+1)}>Thử lại</button></div>}
 </>;
}
