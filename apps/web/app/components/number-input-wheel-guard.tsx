 'use client';
import {useEffect} from 'react';
export function NumberInputWheelGuard(){
 useEffect(()=>{
  // Remove number-input focus before the browser's native wheel step.
  // Keep the event passive so the same wheel gesture can scroll the page/dialog.
  const onWheel=(event:WheelEvent)=>{const input=event.target;if(input instanceof HTMLInputElement&&input.type==='number'&&document.activeElement===input)input.blur();};
  document.addEventListener('wheel',onWheel,{capture:true,passive:true});
  return()=>document.removeEventListener('wheel',onWheel,true);
 },[]);
 return null;
}
