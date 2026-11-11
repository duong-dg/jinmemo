import {scheduleSlots,scheduleClosureApplies,type SchedulePeriod} from './time-slots';
export type SaleClosure={variantId?:string;startDate:string;endDate:string;weekdays?:number[]};
export type CalendarProduct={saleClosures?:SaleClosure[];variants:{saleWindow?:{startDate?:string;endDate?:string};id:string;schedulePeriods?:SchedulePeriod[];timeSlots?:{id:string;start:string;end?:string}[]}[]};
export const vietnamToday=(now=Date.now())=>new Date(now+7*3600000).toISOString().slice(0,10);
export function saleDayAvailable(product:CalendarProduct,date:string,now=Date.now(),variantId?:string){
 if(date<vietnamToday(now))return false;
 return product.variants.filter(v=>!variantId||v.id===variantId).some(v=>(!v.saleWindow?.startDate||date>=v.saleWindow.startDate)&&(!v.saleWindow?.endDate||date<=v.saleWindow.endDate)&&!(product.saleClosures||[]).some(c=>(!c.variantId||c.variantId===v.id)&&scheduleClosureApplies(v,date,c))&&(!scheduleSlots(v,date).length||scheduleSlots(v,date).some(slot=>now<new Date(date+'T'+slot.start+':00+07:00').getTime())));
}
export function nextSaleDay(product:CalendarProduct,from:string,now=Date.now(),variantId?:string){const start=from<vietnamToday(now)?vietnamToday(now):from;for(let n=0;n<=366;n++){const date=new Date(new Date(start+'T00:00:00Z').getTime()+n*86400000).toISOString().slice(0,10);if(saleDayAvailable(product,date,now,variantId))return date;}return null;}
