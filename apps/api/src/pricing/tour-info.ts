import {z} from 'zod';
export const tourInfoSchema=z.object({duration:z.string().trim().max(150).optional(),durationEn:z.string().trim().max(150).optional(),minGuests:z.number().int().min(1).max(150).optional(),maxGuests:z.number().int().min(1).max(150).optional()}).strict();
export type TourInfo=z.infer<typeof tourInfoSchema>;
export function effectiveTourInfo(product:{tourInfo?:TourInfo},variant:{tourInfo?:TourInfo}):TourInfo{const a=product.tourInfo,b=variant.tourInfo;return{duration:b?.duration||a?.duration,durationEn:b?.durationEn||a?.durationEn,minGuests:b?.minGuests??a?.minGuests,maxGuests:b?.maxGuests??a?.maxGuests};}
export function checkTourGuests(info:TourInfo,count:number){if(info.minGuests&&count<info.minGuests)throw new Error('Gói tour cần ít nhất '+info.minGuests+' khách. Vui lòng thêm '+(info.minGuests-count)+' khách.');if(info.maxGuests&&count>info.maxGuests)throw new Error('Gói tour nhận tối đa '+info.maxGuests+' khách mỗi đơn. Đoàn lớn vui lòng liên hệ.');}
