import {z} from 'zod';
import {validateDate} from '../pricing/pricing';
const id=z.string().min(1).max(80),name=z.string().trim().min(1).max(150),money=z.number().int().min(0).max(100000000),time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),date=z.string().refine(v=>{try{validateDate(v);return true;}catch{return false;}},'Ngày không hợp lệ');
export const planSchema=z.object({
 enabled:z.boolean().default(false),
 vehicles:z.array(z.object({id,name,seats:z.number().int().min(1).max(60),image:z.object({id:z.uuid(),alt:z.string().max(300)}).strict().nullable().optional(),luggageNote:z.string().trim().max(600).default('')}).strict()).max(20),
 areas:z.array(z.object({id,name,parentId:id.optional(),surcharges:z.record(z.string(),money).default({})}).strict()).max(1000),
 fares:z.array(z.object({id,from:id,to:id,vehicleId:id,privatePrice:money,seatPrice:money,durationMinutes:z.number().int().min(1).max(2880).optional()}).strict()).max(300),
 trips:z.array(z.object({id,from:id,to:id,vehicleId:id,date,start:time,end:time,departure:time,cutoffMinutes:z.number().int().min(0).max(1440),seatPrice:money,status:z.enum(['DRAFT','OPEN','CLOSED'])}).strict()).max(200),
 requests:z.array(z.object({id,label:name,from:id,to:id,date,time,flexMinutes:z.union([z.literal(0),z.literal(30),z.literal(60)]),passengers:z.number().int().min(1).max(60),status:z.enum(['WAITING','HELD','CONFIRMED','CANCELLED']),tripId:id.optional()}).strict()).max(300)
}).strict().superRefine((p,ctx)=>{
 const fail=(message:string)=>ctx.addIssue({code:'custom',message});
 for(const rows of [p.vehicles,p.areas,p.fares,p.trips,p.requests])if(new Set(rows.map(r=>r.id)).size!==rows.length)fail('Mã mục bị trùng.');
 const area=(id:string)=>p.areas.some(a=>a.id===id),vehicle=(id:string)=>p.vehicles.find(v=>v.id===id);
 for(const a of p.areas){if(a.parentId&&!area(a.parentId))fail('Khu vực cha không tồn tại.');const seen=new Set<string>([a.id]);let parent=a.parentId;while(parent){if(seen.has(parent)){fail('Cây khu vực bị vòng lặp.');break;}seen.add(parent);parent=p.areas.find(x=>x.id===parent)?.parentId;}for(const key of Object.keys(a.surcharges))if(!vehicle(key))fail('Phụ thu tham chiếu loại xe không tồn tại.');}
 for(const row of [...p.fares,...p.trips,...p.requests]){if(!area(row.from)||!area(row.to)||row.from===row.to)fail('Chọn điểm đi/đến hợp lệ và khác nhau.');if('vehicleId'in row&&!vehicle(row.vehicleId))fail('Loại xe không tồn tại.');}
 const keys=p.fares.map(f=>JSON.stringify([f.from,f.to,f.vehicleId]));if(new Set(keys).size!==keys.length)fail('Một tuyến/loại xe chỉ có một giá cơ bản; chiều ngược lại là tuyến riêng.');
 for(const t of p.trips){if(t.start>t.end||t.end>t.departure)fail('Giờ đón phải theo thứ tự: bắt đầu ≤ kết thúc ≤ khởi hành.');const used=p.requests.filter(r=>r.tripId===t.id&&(r.status==='HELD'||r.status==='CONFIRMED')).reduce((n,r)=>n+r.passengers,0);if(used>(vehicle(t.vehicleId)?.seats||0))fail('Chuyến ghép vượt số ghế bán được.');}
 for(const r of p.requests){if((r.status==='HELD'||r.status==='CONFIRMED')&&!r.tripId)fail('Khách giữ chỗ/xác nhận cần được gán chuyến.');if(r.status==='WAITING'&&r.tripId)fail('Khách chờ ghép chưa được gán chuyến.');if(r.tripId){const t=p.trips.find(t=>t.id===r.tripId);if(!t)fail('Chuyến được gán không tồn tại.');else if(r.status!=='CANCELLED'&&!compatible(p,r,t))fail('Chuyến khác tuyến, ngày hoặc ngoài giờ khách chấp nhận.');}}
});
export type TransportPlan=z.infer<typeof planSchema>;
export type SharedTrip=TransportPlan['trips'][number];
export type RideRequest=TransportPlan['requests'][number];
function ancestors(plan:TransportPlan,id:string){const result:string[]=[];while(id&&!result.includes(id)){result.push(id);id=plan.areas.find(a=>a.id===id)?.parentId||'';}return result;}
const minute=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3));
export function compatible(p:TransportPlan,r:RideRequest,t:SharedTrip){return r.date===t.date&&ancestors(p,r.from).includes(t.from)&&ancestors(p,r.to).includes(t.to)&&Math.abs(minute(r.time)-minute(t.departure))<=r.flexMinutes;}
export function remainingSeats(p:TransportPlan,t:SharedTrip,excludeRequest?:string){return(p.vehicles.find(v=>v.id===t.vehicleId)?.seats||0)-p.requests.filter(r=>r.id!==excludeRequest&&r.tripId===t.id&&(r.status==='HELD'||r.status==='CONFIRMED')).reduce((n,r)=>n+r.passengers,0);}
export function tripOpen(t:SharedTrip,now=Date.now()){return t.status==='OPEN'&&now<new Date(t.date+'T'+t.departure+':00+07:00').getTime()-t.cutoffMinutes*60000;}
export function suggestTrips(p:TransportPlan,r:RideRequest,now=Date.now()){if(r.status==='CANCELLED')return[];return p.trips.filter(t=>tripOpen(t,now)&&compatible(p,r,t)&&remainingSeats(p,t,r.id)>=r.passengers).map(t=>t.id);}
type PlanQuote={vehicleId:string;error?:string;fareId?:string;base?:number;surcharge?:number;total?:number;seatPrice?:number;exact?:boolean;durationMinutes?:number};
export function quoteRoutes(p:TransportPlan,from:string,to:string,passengers:number){
 const starts=ancestors(p,from),ends=ancestors(p,to);if(!starts.length||!ends.length||from===to)return[];
 return p.vehicles.filter(v=>v.seats>=passengers).flatMap<PlanQuote>(v=>{
  const candidates=p.fares.filter(f=>f.vehicleId===v.id&&starts.includes(f.from)&&ends.includes(f.to)).map(f=>({f,score:starts.indexOf(f.from)+ends.indexOf(f.to)})).sort((a,b)=>a.score-b.score);
  if(!candidates.length)return[];if(candidates[1]?.score===candidates[0].score)return[{vehicleId:v.id,error:'Có nhiều giá tuyến cùng mức ưu tiên. Cần nhập giá riêng cho tuyến này.'}];
  const {f,score}=candidates[0];const traversed=[...starts.slice(0,starts.indexOf(f.from)),...ends.slice(0,ends.indexOf(f.to))],surcharge=traversed.reduce((n,id)=>n+(p.areas.find(a=>a.id===id)?.surcharges[v.id]||0),0);
  return[{vehicleId:v.id,fareId:f.id,base:f.privatePrice,surcharge,total:f.privatePrice+surcharge,seatPrice:f.seatPrice,exact:score===0,durationMinutes:f.durationMinutes}];
 });
}
