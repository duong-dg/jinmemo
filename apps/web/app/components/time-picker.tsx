import {useId} from 'react';
import {useLocale} from './locale-context';

const hours = Array.from({length:24}, (_, i) => String(i).padStart(2, '0'));
const minutes = Array.from({length:60}, (_, i) => String(i).padStart(2, '0'));

export function TimePicker({label,value,onChange,required=false,en}:{label:string;value:string;onChange:(value:string)=>void;required?:boolean;en?:boolean}){
  const locale=useLocale();
  const english=en??(locale==='en');
  const id=useId();
  const [hour='',minute='00']=value.split(':');
  return <div className="time-picker" role="group" aria-labelledby={id}>
    <span id={id} className="date-label">{label}</span>
    <div className="time-picker-controls">
      <select aria-label={label+' · '+(english?'Hour':'Giờ')} value={hour} required={required} onChange={e=>onChange(e.target.value?e.target.value+':'+minute:'')}>
        <option value="">{english?'Hour':'Giờ'}</option>
        {hours.map(h=><option key={h} value={h}>{h}</option>)}
      </select>
      <span aria-hidden="true">:</span>
      <select aria-label={label+' · '+(english?'Minute':'Phút')} value={minute} disabled={!hour} onChange={e=>onChange(hour+':'+e.target.value)}>
        {minutes.map(m=><option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  </div>;
}
