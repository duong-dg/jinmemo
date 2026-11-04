import {z} from 'zod';
import {BadRequestException} from '@nestjs/common';
import {validateDate} from '../pricing/pricing';
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const date=z.string().refine(v=>{try{validateDate(v);return true;}catch{return false;}},'Ngày không hợp lệ');
export const transportConfig=z.object({mode:z.enum(['PRIVATE','SHARED']),origin:z.string().trim().min(2).max(200),destination:z.string().trim().min(2).max(200),leadMinutes:z.number().int().min(0).max(10080).default(60)}).strict();
export const transportInput=z.object({pickup:z.string().trim().min(3).max(300),dropoff:z.string().trim().min(3).max(300),pickupTime:time,passengers:z.number().int().min(1).max(150),flightNumber:z.string().trim().max(40).default(''),returnDate:date.optional(),returnTime:time.optional()}).strict();
export type TripInput=z.infer<typeof transportInput>;
export function validateTrip(product:any,variantId:string,date:string,slotId:string|undefined,quantities:Record<string,number|undefined>,trip:TripInput|undefined,now=Date.now()){
 const config=product.transport;
 if(!config){if(trip)throw new BadRequestException('Sản phẩm này không phải dịch vụ xe.');return undefined;}
 const parsed=transportInput.safeParse(trip);if(!parsed.success)throw new BadRequestException('Điền đủ điểm đón, điểm trả, giờ đón và số hành khách.');
 const info=parsed.data,variant=product.variants.find((v:any)=>v.id===variantId);
 if(!variant)throw new BadRequestException('Loại xe không tồn tại.');
 const units=quantities.ADULT||0;
 if(Object.entries(quantities).some(([g,n])=>g!=='ADULT'&&!!n)||units<1)throw new BadRequestException('Xe chỉ tính theo số chuyến hoặc số chỗ.');
 if(config.mode==='PRIVATE'&&(units!==1||info.passengers>(variant.maxPassengers||1)))throw new BadRequestException('Mỗi dòng đặt một xe; số khách không được vượt sức chứa xe.');
 if(config.mode==='SHARED'){
  const slots=variant.timeSlots||[],slot=slots.find((s:any)=>s.id===slotId)||(slots.length===1?slots[0]:undefined);
  if(!slot||slot.start!==info.pickupTime||info.passengers!==units)throw new BadRequestException('Số khách xe ghép phải bằng số chỗ; giờ đón phải đúng suất đã chọn.');
 }
 const departure=new Date(date+'T'+info.pickupTime+':00+07:00').getTime();
 if(!Number.isFinite(departure)||departure<=now+(config.leadMinutes||0)*60000)throw new BadRequestException('Đã qua hạn nhận chuyến này. Chọn ngày hoặc giờ khác.');
 if(variant.roundTrip){if(!info.returnDate||!info.returnTime||new Date(info.returnDate+'T'+info.returnTime+':00+07:00').getTime()<=departure)throw new BadRequestException('Chọn ngày giờ về sau chuyến đi.');}
 else if(info.returnDate||info.returnTime)throw new BadRequestException('Gói một chiều không có chuyến về.');
 return {...info,mode:config.mode,origin:config.origin,destination:config.destination,maxPassengers:variant.maxPassengers,roundTrip:!!variant.roundTrip};
}
