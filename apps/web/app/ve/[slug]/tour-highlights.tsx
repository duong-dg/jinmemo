import type {Product} from '../../../lib/content-api';
import {effectiveTourInfo} from '../../../lib/tour-info';

export function TourHighlights({product,en}:{product:Product;en:boolean}){
  const facts=product.variants.map(variant=>({id:variant.id,name:variant.name,...effectiveTourInfo(product,variant)}));
  const visible=facts.filter(info=>info.duration||info.durationEn||info.minGuests||info.maxGuests);
  const same=visible.length===facts.length&&visible.every(info=>info.duration===visible[0]?.duration&&info.durationEn===visible[0]?.durationEn&&info.minGuests===visible[0]?.minGuests&&info.maxGuests===visible[0]?.maxGuests);
  return <>{(same?visible.slice(0,1):visible).map(info=>{
    const duration=en?info.durationEn||info.duration:info.duration;
    return <div className="tour-highlights" key={info.id}>
      {!same&&<strong>{info.name}</strong>}
      {duration&&<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>{en?'Duration':'Thời lượng'}<b>{duration}</b></span></span>}
      {(info.minGuests||info.maxGuests)&&<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m1 4a5 5 0 0 1 4 5v2"/></svg><span>{info.minGuests?(en?'Minimum guests':'Khách tối thiểu'):(en?'Maximum guests':'Khách tối đa')}<b>{info.minGuests||info.maxGuests}{info.minGuests&&info.maxGuests?' · '+(en?'Max ':'Tối đa ')+info.maxGuests:''}</b></span></span>}
    </div>;
  })}</>;
}
