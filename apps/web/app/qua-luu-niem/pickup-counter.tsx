'use client';
import {useLocale} from '../components/locale-context';
export type PickupLocation={id:string;name:string;address:string;addressEn?:string;nameEn?:string};

export function PickupCounter({locations,id,onChange}:{locations:PickupLocation[];id:string;onChange:(id:string)=>void}){
 const en=useLocale()==='en';
 const name=(location:PickupLocation)=>en&&location.nameEn?location.nameEn:location.name;
 const selected=locations.find(location=>location.id===id)||locations[0];
 if(!selected)return <p>{en?'JinMemo will contact you to confirm the pickup address.':'JinMemo sẽ liên hệ để xác nhận địa chỉ nhận hàng.'}</p>;
 return <div className="gift-pickup-location">
  {locations.length>1?<label>{en?'Pickup counter':'Quầy nhận hàng'}
   <select value={selected.id} onChange={event=>onChange(event.target.value)}>
    {locations.map(location=><option key={location.id} value={location.id}>{name(location)}</option>)}
   </select>
  </label>:<strong>{name(selected)}</strong>}
  <p>{en&&selected.addressEn?selected.addressEn:selected.address}</p>
 </div>;
}
