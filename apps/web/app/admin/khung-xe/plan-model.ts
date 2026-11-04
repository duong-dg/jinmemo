export type Vehicle={id:string;name:string;sharedSizes?:number[];image?:{id:string;alt:string}|null;seats:number;luggageNote:string};
export type Area={id:string;name:string;parentId?:string;surcharges:Record<string,number>};
export type Fare={id:string;from:string;to:string;vehicleId:string;privatePrice:number;seatPrice:number;durationMinutes?:number};
export type Trip={id:string;from:string;to:string;vehicleId:string;date:string;start:string;end:string;departure:string;cutoffMinutes:number;seatPrice:number;status:'DRAFT'|'OPEN'|'CLOSED'};
export type Ride={id:string;label:string;from:string;to:string;date:string;time:string;flexMinutes:0|30|60;passengers:number;status:'WAITING'|'HELD'|'CONFIRMED'|'CANCELLED';tripId?:string};
export type Plan={enabled?:boolean;vehicles:Vehicle[];areas:Area[];fares:Fare[];trips:Trip[];requests:Ride[]};
export type Preview={quotes:{vehicleId:string;error?:string;base?:number;surcharge?:number;total?:number;seatPrice?:number;durationMinutes?:number}[];trips:{id:string;remaining:number;open:boolean}[];suggestions:Record<string,string[]>};
export const emptyPlan=():Plan=>({vehicles:[],areas:[],fares:[],trips:[],requests:[]});
export const tomorrow=()=>new Date(Date.now()+86400000+7*3600000).toISOString().slice(0,10);
