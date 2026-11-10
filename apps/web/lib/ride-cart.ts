'use client';
import {useSyncExternalStore} from 'react';

export type RideDraft={
 fromName:string;toName:string;vehicleName:string;
 selection:{from:string;to:string;date:string;time:string;passengers:number;mode:string;roundTrip:boolean;flexMinutes:number;locale:string;returnTime?:string;vehicleId:string;shareSize?:number;poolId?:string;expectedTotal:number};
};
const key='jinmemo-ride-cart';
let memory='null';
function snapshot(){try{return sessionStorage.getItem(key)||'null';}catch{return memory;}}
function subscribe(callback:()=>void){
 window.addEventListener(key,callback);
 return()=>window.removeEventListener(key,callback);
}
export function readRideCart():RideDraft|null{
 try{return JSON.parse(snapshot());}catch{return null;}
}
export function useRideCart(){
 const raw=useSyncExternalStore(subscribe,snapshot,()=> 'null');
 try{return JSON.parse(raw) as RideDraft|null;}catch{return null;}
}
export function writeRideCart(draft:RideDraft|null){
 memory=JSON.stringify(draft);
 try{sessionStorage.setItem(key,memory);}catch{}
 window.dispatchEvent(new Event(key));
}
