import{z}from'zod';
export const slotSchema=z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),start:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),end:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).optional()}).strict().refine(slot=>!slot.end||slot.end>slot.start,'Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.');
export type TimeSlot=z.infer<typeof slotSchema>;
const scheduleDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;},'Ngày lịch suất không hợp lệ.');
export const schedulePeriodSchema=z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),startDate:scheduleDate,endDate:scheduleDate,weekdays:z.array(z.number().int().min(1).max(7)).min(1).max(7).refine(v=>new Set(v).size===v.length).optional(),priority:z.number().int().min(0).max(10000).default(10),reopenWeeklyClosures:z.boolean().default(false),timeSlots:z.array(slotSchema).min(1).max(30)}).strict().refine(p=>p.startDate<=p.endDate,'Ngày kết thúc phải sau ngày bắt đầu.').refine(p=>new Set(p.timeSlots.map(s=>s.id)).size===p.timeSlots.length&&new Set(p.timeSlots.map(s=>s.start)).size===p.timeSlots.length,'Suất trong giai đoạn bị trùng.');
export type SchedulePeriod=z.infer<typeof schedulePeriodSchema>;
export type ScheduledVariant={timeSlots?:TimeSlot[];schedulePeriods?:SchedulePeriod[]};
export function schedulePeriod(variant:ScheduledVariant,date:string){const day=new Date(date+'T00:00:00Z').getUTCDay()||7;return (variant.schedulePeriods||[]).map((p,index)=>({...p,index})).filter(p=>p.startDate<=date&&date<=p.endDate&&(!p.weekdays||p.weekdays.includes(day))).sort((a,b)=>b.priority-a.priority||(Date.parse(a.endDate)-Date.parse(a.startDate))-(Date.parse(b.endDate)-Date.parse(b.startDate))||b.index-a.index)[0];}
export function scheduleSlots(variant:ScheduledVariant,date:string){return schedulePeriod(variant,date)?.timeSlots??variant.timeSlots??[];}
export function allScheduleSlots(variant:ScheduledVariant){return [...new Map([...(variant.timeSlots||[]),...(variant.schedulePeriods||[]).flatMap(p=>p.timeSlots)].map(s=>[s.id,s])).values()];}
export function scheduleClosureApplies(variant:ScheduledVariant,date:string,closure:{startDate:string;endDate:string;weekdays?:number[]}){const day=new Date(date+'T00:00:00Z').getUTCDay()||7;return closure.startDate<=date&&date<=closure.endDate&&(!closure.weekdays||closure.weekdays.includes(day))&&!(closure.startDate!==closure.endDate&&closure.weekdays?.length&&schedulePeriod(variant,date)?.reopenWeeklyClosures);}
export function checkSchedule(variant:ScheduledVariant,date:string,slotId?:string,now=Date.now()){
 const slots=scheduleSlots(variant,date);
 if(!slots.length){if(slotId)throw new Error('Gói này không sử dụng khung giờ.');return undefined;}
 const slot=slots.find(slot=>slot.id===slotId);if(!slot)throw new Error('Chọn khung giờ sử dụng.');
 if(now>=new Date(`${date}T${slot.start}:00+07:00`).getTime())throw new Error('Đã quá giờ bắt đầu. Vui lòng chọn khung giờ hoặc ngày khác.');
 return {...slot,requiresSelection:slots.length>1};
}
