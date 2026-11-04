 'use client';
import {useEffect,useRef,useState} from 'react';
import {adminApi} from './admin-api';
type Counts={cursor:number;ticket:number;car:number};
export function useOrderNotifications(active:string){const[data,setData]=useState<Counts>({cursor:0,ticket:0,car:0}),latest=useRef(data);latest.current=data;
 async function seen(kind:'TICKET'|'CAR'){try{await adminApi('notifications/read',{cursor:latest.current.cursor,kind});const next=await adminApi('notifications');latest.current=next;setData(next);}catch{}}
 useEffect(()=>{let stopped=false;const load=async(first=false)=>{try{const next=await adminApi('notifications');if(stopped)return;latest.current=next;setData(next);if(first&&(active==='orders'||active==='transport'))await seen(active==='transport'?'CAR':'TICKET');}catch{}};void load(true);const timer=setInterval(()=>{if(document.visibilityState==='visible')void load();},20000);return()=>{stopped=true;clearInterval(timer);};},[active]);return{...data,seen};
}
