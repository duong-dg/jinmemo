export function parseRideDuration(value:string):number|undefined|null{
 const text=value.trim().toLowerCase().replace(/giờ|tiếng|hours?|hrs?/g,'h').replace(/phút|minutes?|mins?/g,'m').replace(/\s+/g,'');
 if(!text)return undefined;
 let total:number;
 if(/^\d+(?:['’′pm])?$/.test(text))total=Number(text.replace(/['’′pm]$/,''));
 else{const match=text.match(/^(\d+)h(?:(\d{1,2})(?:['’′pm])?)?$/);if(!match||Number(match[2]||0)>59)return null;total=Number(match[1])*60+Number(match[2]||0);}
 return Number.isSafeInteger(total)&&total>=1&&total<=2880?total:null;
}
export function rideDurationInput(minutes?:number){if(!minutes)return '';const h=Math.floor(minutes/60),m=minutes%60;return h?`${h}h${m||''}`:`${m}'`;}
export function formatRideDuration(minutes:number,en=false){const h=Math.floor(minutes/60),m=minutes%60;return[h?`${h} ${en?'h':'giờ'}`:'',m?`${m} ${en?'min':'phút'}`:''].filter(Boolean).join(' ');}
