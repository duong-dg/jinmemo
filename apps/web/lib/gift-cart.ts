'use client';
import {useSyncExternalStore} from 'react';

type GiftLine={name:string;quantity:number};
type GiftCart=Record<string,GiftLine>;
const key='jinmemo-gift-cart';
const eventName='jinmemo-gift-cart-change';
let fallback='{}';

function snapshot(){
 try{return localStorage.getItem(key)||'{}';}catch{return fallback;}
}
function subscribe(callback:()=>void){
 window.addEventListener(eventName,callback);
 window.addEventListener('storage',callback);
 return()=>{window.removeEventListener(eventName,callback);window.removeEventListener('storage',callback);};
}
function parse(raw:string):GiftCart{
 try{
  return Object.fromEntries(Object.entries(JSON.parse(raw) as GiftCart).filter(([id,line])=>
   /^[0-9a-f-]{36}$/i.test(id)&&typeof line?.name==='string'&&Number.isInteger(line.quantity)&&line.quantity>0&&line.quantity<=50
  ).slice(0,20));
 }catch{return {};}
}
export function useGiftCart(){return parse(useSyncExternalStore(subscribe,snapshot,()=> '{}'));}
export function updateGiftCart(update:(cart:GiftCart)=>GiftCart){
 const next=JSON.stringify(update(parse(snapshot())));
 fallback=next;
 try{localStorage.setItem(key,next);}catch{}
 window.dispatchEvent(new Event(eventName));
}
