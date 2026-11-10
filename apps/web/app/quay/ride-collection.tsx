 'use client';
import {useEffect,useState} from 'react';
import {posApi} from '../../lib/pos-api';
import {RidePayment,type RideQR} from '../components/ride-payment';

type Counter={id:string;name:string;status:string};
type RideSummary={status:string;paymentStatus:string;total:number;from:string;to:string;cashReceipt?:CashReceipt};
type CashReceipt={id:string;code:string;amount:number;paidAt:string;counterName:string;shiftId:string;actorName:string;from:string;to:string;date:string;time:string};
const money=(amount:number)=>amount.toLocaleString('vi-VN')+' đ';
const blocked=['PENDING','WAITING_MATCH','CANCELLED'];

export function RideCollection(){
 const [code,setCode]=useState(''),[selected,setSelected]=useState(''),[summary,setSummary]=useState<RideSummary>();
 const [counters,setCounters]=useState<Counter[]>([]),[counterId,setCounterId]=useState('');
 const [qr,setQr]=useState<RideQR>(),[receipt,setReceipt]=useState<CashReceipt>(),[busy,setBusy]=useState(false),[error,setError]=useState('');

 useEffect(()=>{
  let active=true;
  posApi('counters').then(result=>{
   if(!active)return;
   const available=(result.data as Counter[]).filter(counter=>counter.status==='ACTIVE');
   setCounters(available);setCounterId(available[0]?.id||'');
  }).catch(err=>{if(active)setError(err.message);});
  return()=>{active=false;};
 },[]);
 useEffect(()=>{
  if(!qr||summary?.paymentStatus==='PAID')return;
  let stopped=false;
  const timer=setInterval(async()=>{
   if(document.visibilityState!=='visible')return;
   try{const data=await posApi('rides/status',{code:qr.code});if(!stopped)setSummary(data);}catch{}
  },5000);
  return()=>{stopped=true;clearInterval(timer);};
 },[qr,summary?.paymentStatus]);

 async function run(action:()=>Promise<void>){
  setBusy(true);setError('');
  try{await action();}catch(err){setError((err as Error).message);}finally{setBusy(false);}
 }
 const canPay=!!summary&&summary.paymentStatus!=='PAID'&&!blocked.includes(summary.status)&&summary.total>0;
 return <section className="config-card ride-collection">
  <h2>Thu tiền đơn xe</h2>
  <form className="field-grid" onSubmit={e=>{e.preventDefault();const value=code.trim().toUpperCase();setSelected('');setSummary(undefined);setReceipt(undefined);setQr(undefined);void run(async()=>{const data:RideSummary=await posApi('rides/status',{code:value});setSummary(data);setReceipt(data.cashReceipt);setSelected(value);});}}>
   <label>Mã booking xe<input required maxLength={16} placeholder="JM-X…" value={code} disabled={busy} onChange={e=>setCode(e.target.value)}/></label>
   <button className="button" disabled={busy}>{busy?'Đang xử lý…':'Tra cứu đơn xe'}</button>
  </form>
  {summary&&<section className="config-card">
   <h3>{selected} · {summary.from} → {summary.to}</h3>
   <p><strong>{money(summary.total)}</strong> · {summary.paymentStatus==='PAID'?'Đã thanh toán':summary.status==='CANCELLED'?'Đã hủy':blocked.includes(summary.status)?'Chờ xác nhận chuyến':'Chưa thanh toán'}</p>
   {canPay&&<div className="field-grid">
    <label>Quầy thu tiền mặt<select value={counterId} onChange={e=>setCounterId(e.target.value)} disabled={busy}>{!counters.length&&<option value="">Chưa có quầy được cấp</option>}{counters.map(counter=><option key={counter.id} value={counter.id}>{counter.name}</option>)}</select></label>
    <button type="button" className="button" disabled={busy||!counterId} onClick={()=>{if(!window.confirm('Xác nhận đã nhận '+money(summary.total)+' tiền mặt cho '+selected+'?'))return;void run(async()=>{
     const result=await posApi('rides/cash',{code:selected,counterId,expectedTotal:summary.total});
     setReceipt(result);setQr(undefined);setSummary({...summary,paymentStatus:'PAID'});
    });}}>Ghi nhận đã thu tiền mặt</button>
    <button type="button" className="outline-button" disabled={busy} onClick={()=>void run(async()=>{setQr(await posApi('rides/payment',{code:selected}));})}>Tạo / làm mới QR</button>
   </div>}
  </section>}
  {error&&<p role="alert" className="admin-error">{error}</p>}
  <RidePayment qr={qr} paid={summary?.paymentStatus==='PAID'}/>
  {receipt&&<section className="config-card ride-cash-receipt">
   <h2>Phiếu thu tiền mặt</h2><p><strong>{receipt.code}</strong> · {receipt.from} → {receipt.to}</p>
   <p>Chuyến đi {receipt.date} · {receipt.time}</p>
   <p>Đã thu <strong>{money(receipt.amount)}</strong></p>
   <p>{new Date(receipt.paidAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} · {receipt.counterName}</p>
   <p>Người thu {receipt.actorName}</p><p>Mã phiếu {receipt.id}</p><p>Mã ca {receipt.shiftId}</p>
   <button type="button" className="outline-button" onClick={()=>window.print()}>In phiếu thu</button>
  </section>}
 </section>;
}
