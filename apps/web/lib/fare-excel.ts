import type {Plan,Fare} from '../app/admin/khung-xe/plan-model';
export function areaPath(plan:Plan,id:string){const names:string[]=[],seen=new Set<string>();while(id&&!seen.has(id)){seen.add(id);const a=plan.areas.find(a=>a.id===id);if(!a)break;names.unshift(a.name);id=a.parentId||'';}return names.join(' / ');}
export const fareColumns=(plan:Plan)=>[
 {key:'from',label:'Nơi đi'}, {key:'to',label:'Nơi đến'}, {key:'twoWay',label:'Chiều ngược cùng giá (1/0)'}, {key:'sharedEnabled',label:'Cho phép xe ghép (1/0)'},
 ...plan.vehicles.flatMap(v=>[{key:v.id+':price',label:v.name+' · Giá (VND)'},{key:v.id+':only',label:v.name+' · Giá đã gồm 2 chiều (1/0)'},{key:v.id+':minutes',label:v.name+' · Phút'}])
];
export function fareRows(plan:Plan){const routes=new Map<string,Fare[]>();for(const f of plan.fares){const key=JSON.stringify([f.from,f.to]);routes.set(key,[...(routes.get(key)||[]),f]);}return [...routes.values()].map(group=>[areaPath(plan,group[0].from),areaPath(plan,group[0].to),group.every(f=>f.twoWay)?1:0,group.every(f=>f.sharedEnabled)?1:0,...plan.vehicles.flatMap(v=>{const f=group.find(f=>f.vehicleId===v.id);return f?[f.privatePrice,f.roundTripOnly?1:0,f.durationMinutes??'']:['','',''];})]);}
type Cell=string|number|boolean|null|undefined;
export function mergeFareRows(plan:Plan,keys:string[],rows:Cell[][],newId:()=>string){
 if(!['from','to','twoWay'].every(k=>keys.includes(k)))throw new Error('Thiếu cột nơi đi, nơi đến hoặc chiều ngược. Hãy dùng file Excel xuất từ JinMemo.');
 const expected=new Set([...fareColumns(plan).map(c=>c.key),...plan.vehicles.map(v=>v.id+':return')]);
 if(keys.some(k=>k&&!expected.has(k)))throw new Error('File có loại xe không còn tồn tại. Xuất file mới rồi nhập lại.');
 if(new Set(keys).size!==keys.length)throw new Error('File bị trùng cột.');
 if(rows.length>300)throw new Error('Tối đa 300 tuyến mỗi file.');
 const clean=(v:Cell)=>String(v??'').trim();
 const resolve=(v:Cell,line:number)=>{const text=clean(v);const exact=plan.areas.filter(a=>areaPath(plan,a.id)===text);const matches=exact.length?exact:plan.areas.filter(a=>a.id===text||a.name===text);if(matches.length!==1)throw new Error(`Dòng ${line}: khu vực “${text}” không tồn tại hoặc trùng tên. Chọn đường dẫn đầy đủ trong sheet Khu vuc.`);return matches[0].id;};
 const number=(v:Cell,max:number,line:number)=>{if(clean(v)==='')return undefined;const n=typeof v==='number'?v:Number(clean(v));if(!Number.isSafeInteger(n)||n<0||n>max)throw new Error(`Dòng ${line}: số tiền/thời gian không hợp lệ. Nhập số nguyên, không kèm dấu phân cách hoặc đơn vị.`);return n;};
 const flag=(v:Cell,line:number)=>{const text=clean(v).toLowerCase();if(['','0','false'].includes(text))return false;if(['1','true'].includes(text))return true;throw new Error(`Dòng ${line}: ô chọn chỉ nhận 1 hoặc 0.`);};
 const next=plan.fares.map(f=>({...f})),seen=new Set<string>();let added=0,updated=0;
 for(const [index,row] of rows.entries()){
  if(row.every(v=>clean(v)===''))continue;const line=index+3;
  const get=(key:string)=>row[keys.indexOf(key)];
  const from=resolve(get('from'),line),to=resolve(get('to'),line);if(from===to)throw new Error(`Dòng ${line}: nơi đi và đến phải khác nhau.`);
  const routeKey=JSON.stringify([from,to]);if(seen.has(routeKey))throw new Error(`Dòng ${line}: tuyến bị trùng trong file.`);seen.add(routeKey);
  const twoWay=flag(get('twoWay'),line),sharedEnabled=flag(get('sharedEnabled'),line);
  // Direction is a route-level choice, including vehicles not supplied in the file.
  for(const f of next)if(f.from===from&&f.to===to){f.twoWay=twoWay;f.sharedEnabled=sharedEnabled;}
  for(const v of plan.vehicles){
   if(!keys.includes(v.id+':price'))continue;
   const price=number(get(v.id+':price'),100000000,line);
   if(price===undefined)continue; // Blank cells preserve existing fares; zero explicitly stops selling.
   const roundTripOnly=flag(get(v.id+':only'),line),durationMinutes=number(get(v.id+':minutes'),2880,line);
   if(durationMinutes===0)throw new Error(`Dòng ${line}: thời gian phải lớn hơn 0.`);
   const old=next.find(f=>f.from===from&&f.to===to&&f.vehicleId===v.id);
   const data={from,to,vehicleId:v.id,twoWay,sharedEnabled,privatePrice:price,roundTripOnly,durationMinutes,seatPrice:old?.seatPrice??0};
   if(old){Object.assign(old,data);updated++;}else{next.push({id:newId(),...data});added++;}
  }
 }
 if(next.length>300)throw new Error('Tổng bảng giá vượt 300 giá tuyến/loại xe.');
 const conflicts=next.some(f=>f.twoWay&&next.some(g=>g.id!==f.id&&g.vehicleId===f.vehicleId&&g.from===f.to&&g.to===f.from));
 if(conflicts)throw new Error('Tuyến cùng giá chiều ngược đang trùng với tuyến ngược đã có. Bỏ lựa chọn hoặc gộp tuyến trước khi nhập.');
 return{fares:next,added,updated};
}
