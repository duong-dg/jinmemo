'use client';
import {useState} from 'react';
import {DatePicker} from '../../components/date-picker';

type Group='ADULT'|'CHILD'|'SENIOR'|'LOCAL_ADULT'|'LOCAL_CHILD'|'LOCAL_SENIOR';
const labels:Record<Group,string>={ADULT:'Người lớn',CHILD:'Trẻ em',SENIOR:'Người cao tuổi',LOCAL_ADULT:'Người lớn · Địa phương',LOCAL_CHILD:'Trẻ em · Địa phương',LOCAL_SENIOR:'Người cao tuổi · Địa phương'};
interface Rule{id:string;productId:string;variantId:string;customerType:Group;startDate:string;endDate:string;priority:number;amount:number;weekdays?:number[]}
interface Variant{id:string;name:string;prices:Partial<Record<Group,number>>}
interface Schedule{id:string;variantId:string;startDate:string;endDate:string;priority:number;weekdays?:number[];entries:Rule[]}
const days=[1,2,3,4,5,6,7];
const id=()=>`id-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
function collect(rules:Rule[]):Schedule[]{
  const result:Schedule[]=[];
  for(const rule of rules){
    const key=(v:Pick<Rule,'variantId'|'startDate'|'endDate'|'priority'|'weekdays'>)=>JSON.stringify([v.variantId,v.startDate,v.endDate,v.priority,[...(v.weekdays||days)].sort()]);
    const existing=result.find(s=>key(s)===key(rule)&&!s.entries.some(e=>e.customerType===rule.customerType));
    if(existing)existing.entries.push({...rule});
    else result.push({...rule,entries:[{...rule}]});
  }
  return result;
}
export function SpecialPriceEditor({productId,variants,rules,onChange}:{productId:string;variants:Variant[];rules:Rule[];onChange:(rules:Rule[])=>void}){
  const [schedules,setSchedules]=useState(()=>collect(rules));
  function publish(next:Schedule[]){
    setSchedules(next);
    onChange(next.flatMap(s=>s.entries.map(e=>({...e,variantId:s.variantId,startDate:s.startDate,endDate:s.endDate,priority:s.priority,weekdays:s.weekdays}))));
  }
  const update=(index:number,patch:Partial<Schedule>)=>publish(schedules.map((s,i)=>i===index?{...s,...patch}:s));
  return <><p className="admin-hint">Chọn gói, ngày áp dụng rồi bật các nhóm khách cần đổi giá và nhập cùng lúc. Nhóm không bật vẫn dùng giá thông thường. Ưu tiên lớn hơn được áp dụng trước.</p>
    {schedules.map((s,index)=>{const variant=variants.find(v=>v.id===s.variantId);const selectedDays=s.weekdays||days;return <div className="config-card" key={s.id}>
      <div className="field-grid"><label>Gói<select value={s.variantId} onChange={e=>update(index,{variantId:e.target.value,entries:[]})}>{variants.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
        <label>Độ ưu tiên<input type="number" min={0} max={10000} value={s.priority} onChange={e=>update(index,{priority:Number(e.target.value)})}/></label>
        <DatePicker label="Từ ngày" value={s.startDate} onChange={value=>update(index,{startDate:value,...(s.endDate<value?{endDate:value}:{})})}/>
        <DatePicker label="Đến ngày" min={s.startDate} value={s.endDate} onChange={value=>update(index,{endDate:value})}/>
      </div>
      <div className="weekday-options">{days.map(day=><label key={day}><input type="checkbox" checked={selectedDays.includes(day)} disabled={selectedDays.length===1&&selectedDays.includes(day)} onChange={e=>update(index,{weekdays:e.target.checked?[...selectedDays,day].sort((a,b)=>a-b):selectedDays.filter(d=>d!==day)})}/>{day===7?'CN':`T${day+1}`}</label>)}</div>
      <div className="field-grid">{(Object.keys(labels) as Group[]).filter(g=>variant?.prices[g]!==undefined||s.entries.some(e=>e.customerType===g)).map(group=>{const entry=s.entries.find(e=>e.customerType===group);return <div key={group}>
        <label className="checkbox-label"><input type="checkbox" checked={!!entry} onChange={e=>update(index,{entries:e.target.checked?[...s.entries,{id:id(),productId,variantId:s.variantId,customerType:group,startDate:s.startDate,endDate:s.endDate,priority:s.priority,amount:variant?.prices[group]??0}]:s.entries.filter(r=>r.customerType!==group)})}/>{labels[group]}</label>
        {entry&&<label>Giá đặc biệt (VND)<input aria-label={`${variant?.name} - giá đặc biệt ${labels[group]}`} type="number" min={0} max={100000000} step={1} value={entry.amount} onChange={e=>update(index,{entries:s.entries.map(r=>r.id===entry.id?{...r,amount:Number(e.target.value)}:r)})}/></label>}
      </div>;})}</div>
      <button type="button" className="danger-link" onClick={()=>publish(schedules.filter((_,i)=>i!==index))}>Xóa lịch giá</button>
    </div>;})}
    <button type="button" className="outline-button" disabled={!variants.length} onClick={()=>{const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());publish([...schedules,{id:id(),variantId:variants[0].id,startDate:date,endDate:date,priority:10,entries:[]}]);}}>＋ Thêm lịch giá</button>
  </>;
}
