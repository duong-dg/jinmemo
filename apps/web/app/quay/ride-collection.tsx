 'use client';
import {useEffect,useState} from 'react';
import {posApi} from '../../lib/pos-api';
import {RidePayment,type RideQR} from '../components/ride-payment';
export function RideCollection(){const[code,setCode]=useState(''),[qr,setQr]=useState<RideQR>(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[paid,setPaid]=useState(false);
 useEffect(()=>{if(!qr||paid)return;let stopped=false;const timer=setInterval(async()=>{if(document.visibilityState!=='visible')return;try{const data=await posApi('rides/status',{code:qr.code});if(!stopped)setPaid(data.paymentStatus==='PAID');}catch{}},5000);return()=>{stopped=true;clearInterval(timer);};},[qr,paid]);
 return <section className="config-card"><h2>Thu tiền đơn xe</h2><p>Nhập mã booking xe đã xác nhận / chốt nhóm để tạo QR. Khách quét mã, trạng thái tự cập nhật khi nhận tiền.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');setQr(undefined);setPaid(false);try{setQr(await posApi('rides/payment',{code:code.trim().toUpperCase()}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><label>Mã booking xe<input required maxLength={16} placeholder="JM-X…" value={code} onChange={e=>setCode(e.target.value)}/></label><button className="button" disabled={busy}>{busy?'Đang tạo…':'Tạo / làm mới QR'}</button></form>{error&&<p role="alert" className="admin-error">{error}</p>}<RidePayment qr={qr} paid={paid}/></section>;
}
