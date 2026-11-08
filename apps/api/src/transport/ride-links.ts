import {quoteRoutes,type TransportPlan} from './planning.schema';
export function rideLinks(plan:TransportPlan,en=false,admin=false){
 if(!admin&&!plan.enabled)return[];
 const plain=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D');
 const name=(id:string)=>{const a=plan.areas.find(a=>a.id===id)!;return en?(a.englishName?.trim()||plain(a.name)):a.name;};
 return plan.fares.flatMap(f=>{const v=plan.vehicles.find(v=>v.id===f.vehicleId);if(!v||f.privatePrice<=0)return[];const quote=quoteRoutes(plan,f.from,f.to,1).find(q=>q.vehicleId===v.id&&!q.error);if(!quote?.total||!quote.base)return[];
 const base={from:f.from,to:f.to,vehicleId:v.id,fromName:name(f.from),toName:name(f.to),vehicleName:en?(v.englishName||plain(v.name)):v.name,seats:v.seats,image:v.image||null,durationMinutes:quote.durationMinutes||null,roundTrip:!!f.roundTripOnly,twoWay:!!f.twoWay};
 return[{...base,id:f.id+'/PRIVATE',mode:'PRIVATE' as const,shareSize:null as number|null,price:quote.total},...(f.roundTripOnly?[]:v.sharedSizes).map(size=>({...base,id:f.id+'/SHARED/'+size,mode:'SHARED' as const,shareSize:size,price:Math.floor(quote.total!/size)}))];});
}
