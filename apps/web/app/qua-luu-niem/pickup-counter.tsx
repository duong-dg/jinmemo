export type PickupLocation={id:string;name:string;address:string};

export function PickupCounter({locations,id,onChange}:{locations:PickupLocation[];id:string;onChange:(id:string)=>void}){
 const selected=locations.find(location=>location.id===id)||locations[0];
 if(!selected)return <p>JinMemo sẽ liên hệ để xác nhận địa chỉ nhận hàng.</p>;
 return <div className="gift-pickup-location">
  {locations.length>1?<label>Quầy nhận hàng
   <select value={selected.id} onChange={event=>onChange(event.target.value)}>
    {locations.map(location=><option key={location.id} value={location.id}>{location.name}</option>)}
   </select>
  </label>:<strong>{selected.name}</strong>}
  <p>{selected.address}</p>
 </div>;
}
