'use client';
import {useEffect,useState} from 'react';
export function PostViews({id,initial=0,en=false,track=false}:{id:string;initial?:number;en?:boolean;track?:boolean}){
 const[views,setViews]=useState(initial);
 useEffect(()=>{setViews(initial);if(!track)return;let timer:ReturnType<typeof setTimeout>|undefined,submitted=false,active=true;
  const schedule=()=>{clearTimeout(timer);if(document.visibilityState!=='visible'||submitted)return;timer=setTimeout(()=>{submitted=true;fetch('/api/v1/posts/'+encodeURIComponent(id)+'/view?lang='+(en?'en':'vi'),{method:'POST',headers:{'X-JinMemo-Request':'1'},cache:'no-store'}).then(async res=>res.ok?res.json():null).then(data=>{if(active&&Number.isSafeInteger(data?.views))setViews(data.views);}).catch(()=>{});},8000);};
  schedule();document.addEventListener('visibilitychange',schedule);return()=>{active=false;clearTimeout(timer);document.removeEventListener('visibilitychange',schedule);};
 },[id,initial,en,track]);
 return <span>{views.toLocaleString(en?'en-GB':'vi-VN')} {en?'views':'lượt xem'}</span>;
}
