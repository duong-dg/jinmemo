export type Vehicle={id:string;name:string;seats:number;luggageNote:string};
export type Area={id:string;name:string;parentId?:string;surcharges:Record<string,number>};
export type Fare={id:string;from:string;to:string;vehicleId:string;privatePrice:number;seatPrice:number};
export type Trip={id:string;from:string;to:string;vehicleId:string;date:string;start:string;end:string;departure:string;cutoffMinutes:number;seatPrice:number;status:'DRAFT'|'OPEN'|'CLOSED'};
export type Ride={id:string;label:string;from:string;to:string;date:string;time:string;flexMinutes:0|30|60;passengers:number;status:'WAITING'|'HELD'|'CONFIRMED'|'CANCELLED';tripId?:string};
export type Plan={vehicles:Vehicle[];areas:Area[];fares:Fare[];trips:Trip[];requests:Ride[]};
export type Preview={quotes:{vehicleId:string;error?:string;base?:number;surcharge?:number;total?:number;seatPrice?:number}[];trips:{id:string;remaining:number;open:boolean}[];suggestions:Record<string,string[]>};
export const emptyPlan=():Plan=>({vehicles:[],areas:[],fares:[],trips:[],requests:[]});
export const tomorrow=()=>new Date(Date.now()+86400000+7*3600000).toISOString().slice(0,10);
export function samplePlan():Plan{const date=tomorrow();return{
 vehicles:[{id:'car4',name:'Xe 4 chỗ',seats:3,luggageNote:'Hành lý nhiều/cồng kềnh vui lòng liên hệ trước.'},{id:'car7',name:'Xe 7 chỗ',seats:6,luggageNote:'Hành lý nhiều/cồng kềnh vui lòng liên hệ trước.'},{id:'car16',name:'Xe 16 chỗ',seats:15,luggageNote:'Hành lý nhiều/cồng kềnh vui lòng liên hệ trước.'}],
 areas:[{id:'hoian',name:'Hội An',surcharges:{}},{id:'danang',name:'Trung tâm Đà Nẵng',surcharges:{}},{id:'hoakhanh',name:'Hòa Khánh',parentId:'danang',surcharges:{car4:70000,car7:100000,car16:150000}},{id:'hoacam',name:'Hòa Cầm',parentId:'danang',surcharges:{car4:50000,car7:70000,car16:100000}},{id:'hoavang',name:'Hòa Vang',parentId:'danang',surcharges:{car4:100000,car7:130000,car16:200000}}],
 fares:[{id:'f4',from:'hoian',to:'danang',vehicleId:'car4',privatePrice:300000,seatPrice:120000},{id:'f7',from:'hoian',to:'danang',vehicleId:'car7',privatePrice:400000,seatPrice:120000},{id:'f16',from:'hoian',to:'danang',vehicleId:'car16',privatePrice:850000,seatPrice:100000}],
 trips:[{id:'demo10',from:'hoian',to:'danang',vehicleId:'car7',date,start:'09:30',end:'10:00',departure:'10:00',cutoffMinutes:30,seatPrice:120000,status:'OPEN'}],
 requests:[{id:'r7',label:'Khách 07:00',from:'hoian',to:'danang',date,time:'07:00',flexMinutes:0,passengers:1,status:'WAITING'},{id:'r9',label:'Khách 09:00',from:'hoian',to:'danang',date,time:'09:00',flexMinutes:60,passengers:2,status:'WAITING'},{id:'r10',label:'Khách 10:00',from:'hoian',to:'danang',date,time:'10:00',flexMinutes:30,passengers:3,status:'WAITING'},{id:'r11',label:'Khách 11:00',from:'hoian',to:'danang',date,time:'11:00',flexMinutes:60,passengers:1,status:'WAITING'}]
};}
