'use client';
import {useEffect,useRef,useState} from 'react';
import {adminApi} from '../shared/admin-api';
import {DatePicker} from '../../components/date-picker';
import {giftMoney} from '../../qua-luu-niem/shop';
import './refunds.css';

type Target={code:string;paid:number;refunded:number;remaining:number;payer:string;phone:string;payeeType:'CUSTOMER'|'PARTNER'};
type Entry={id:string;root_code:string;amount:number;refunded_on:string;created_at:string;data:{recipient:string;method:string;reference:string;note:string;payer:string;payeeType:string;actor:string;actorName?:string}};
type Payload={requestId:string;code:string;amount:number;recipient:string;method:string;reference:string;refundedOn:string;note:string;verified:true};
const pendingKey='jinmemo-refund-pending-v1';
const day=()=>new Date(Date.now()+7*3600000).toISOString().slice(0,10);
const methodLabels:Record<string,string>={BANK:'Chuyển khoản',CASH:'Tiền mặt',GATEWAY:'Hoàn qua cổng'};
export function RefundLedger(){
 const [code,setCode]=useState(''),[target,setTarget]=useState<Target|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [amount,setAmount]=useState(''),[recipient,setRecipient]=useState(''),[method,setMethod]=useState('BANK'),[reference,setReference]=useState(''),[date,setDate]=useState(day),[note,setNote]=useState('');
 const [pending,setPending]=useState<Payload|null>(null),pendingRef=useRef<Payload|null>(null);
 const [query,setQuery]=useState(''),[applied,setApplied]=useState(''),[page,setPage]=useState(1),[reload,setReload]=useState(0),[history,setHistory]=useState<{data:Entry[];total:number;page:number;pageSize:number}>();
 useEffect(()=>{const initial=new URLSearchParams(window.location.search).get('code');if(initial)setCode(initial);try{const saved=JSON.parse(sessionStorage.getItem(pendingKey)||'null');if(saved?.requestId){pendingRef.current=saved;setPending(saved);}}catch{}},[]);
 useEffect(()=>{let active=true;adminApi('refunds?'+new URLSearchParams({q:applied,page:String(page)})).then(result=>{if(active)setHistory(result);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[applied,page,reload]);
 async function preview(){setBusy(true);setError('');setNotice('');setTarget(null);try{const result=await adminApi('refunds/preview',{code:code.trim().toUpperCase()});setTarget(result);setCode(result.code);setRecipient(result.payer);setAmount('');setReference('');setNote('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function submit(payload:Payload){
  setBusy(true);setError('');setNotice('');
  try{
   // Persist the immutable request before sending: network retries never get a new cash reference.
   sessionStorage.setItem(pendingKey,JSON.stringify(payload));pendingRef.current=payload;setPending(payload);
   await adminApi('refunds',payload);
   sessionStorage.removeItem(pendingKey);pendingRef.current=null;setPending(null);setReload(value=>value+1);setNotice('Đã ghi nhận hoàn '+giftMoney(payload.amount)+' cho đơn '+payload.code+'.');
   setTarget(null);setAmount('');setReference('');setNote('');
  }catch(e){
   const failure=e as Error&{status?:number};
   if(failure.status===400||failure.status===409){sessionStorage.removeItem(pendingKey);pendingRef.current=null;setPending(null);setTarget(null);}
   setError(failure.message);
  }finally{setBusy(false);}
 }
 return <section className="refund-ledger"><p className="refund-intro">Ghi lại khoản <strong>đã thực hiện hoàn</strong> cho khách hoặc CTV. Mục này không tự chuyển tiền và không tự hủy đơn. Khoản đã thu và khoản đã hoàn được lưu riêng để đối chiếu.</p>
 {pending?<section className="config-card refund-retry"><h2>Kiểm tra bản ghi chưa nhận đủ kết quả</h2><p>{pending.code} · {giftMoney(pending.amount)} · {pending.recipient}</p><p>Gửi lại dùng đúng mã yêu cầu cũ, không tạo thêm khoản hoàn. Không thực hiện chuyển tiền lần nữa.</p><button className="button" disabled={busy} onClick={()=>void submit(pendingRef.current!)}>{busy?'Đang kiểm tra…':'Gửi lại bản ghi cũ'}</button></section>:<form className="config-card refund-lookup" onSubmit={e=>{e.preventDefault();void preview();}}><label>Mã đơn đã thu tiền<input required maxLength={30} value={code} onChange={e=>{setCode(e.target.value);setTarget(null);}} placeholder="JB…, JC…, JM…, JM-X… hoặc JM-G…"/></label><button className="outline-button" disabled={busy}>{busy?'Đang kiểm tra…':'Kiểm tra khoản thu'}</button></form>}
 {target&&!pending&&<form className="config-card" onSubmit={e=>{e.preventDefault();if(!e.currentTarget.reportValidity()||busy)return;void submit({requestId:crypto.randomUUID(),code:target.code,amount:Number(amount),recipient:recipient.trim(),method,reference:method==='CASH'?'':reference.trim(),refundedOn:date,note:note.trim(),verified:true});}}>
 <h2>{target.code}</h2><p>{target.payeeType==='PARTNER'?'CTV nhận hoàn':'Người đặt / người thanh toán'}: <strong>{target.payer}</strong> {target.phone}</p>
 <div className="refund-totals"><div><small>Đã thu</small><strong>{giftMoney(target.paid)}</strong></div><div><small>Đã ghi hoàn</small><strong>{giftMoney(target.refunded)}</strong></div><div><small>Còn có thể ghi hoàn</small><strong>{giftMoney(target.remaining)}</strong></div></div>
 {target.remaining>0?<fieldset disabled={busy}><div className="field-grid"><label>Số tiền đã hoàn (VND)<input type="number" required min={1} max={target.remaining} step={1} value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Người nhận / chủ tài khoản<input required minLength={2} maxLength={150} value={recipient} onChange={e=>setRecipient(e.target.value)}/></label><label>Hình thức hoàn<select value={method} onChange={e=>{setMethod(e.target.value);setReference('');}}>{Object.entries(methodLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><DatePicker label="Ngày đã hoàn" value={date} max={day()} onChange={setDate}/>{method!=='CASH'&&<label>Mã giao dịch hoàn tiền<input required minLength={3} maxLength={150} value={reference} onChange={e=>setReference(e.target.value)} placeholder={method==='GATEWAY'?'Ví dụ PAYPAL: mã refund thực tế':'Mã giao dịch ngân hàng đã hoàn'}/></label>}<label className="refund-note">Lý do và nội dung đối chiếu<textarea required minLength={5} maxLength={1000} rows={3} value={note} onChange={e=>setNote(e.target.value)}/></label></div>
 <label className="refund-verified"><input type="checkbox" required/>{target.payeeType==='PARTNER'?'Tôi đã hoàn tiền cho CTV đã thanh toán đơn và đối chiếu đúng số tiền, người nhận, chứng từ.':'Tôi đã hoàn tiền và đối chiếu đúng số tiền, người nhận, chứng từ.'}</label><button className="button" disabled={busy}>{busy?'Đang lưu…':'Lưu khoản đã hoàn'}</button></fieldset>:<p>Đơn đã được ghi hoàn hết khoản thực thu.</p>}</form>}
 {error&&<p role="alert" className="admin-error">{error}</p>}{notice&&<p role="status" className="admin-success">{notice}</p>}
 <section className="config-card"><h2>Lịch sử ghi nhận hoàn tiền</h2><form className="refund-lookup" onSubmit={e=>{e.preventDefault();setApplied(query);setPage(1);setReload(value=>value+1);}}><label>Tìm bản ghi<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Mã đơn, người nhận, mã giao dịch…"/></label><button className="outline-button">Tìm kiếm</button></form>
 <div className="refund-table"><table><thead><tr><th>Ngày hoàn / Ghi nhận</th><th>Đơn</th><th>Người nhận</th><th>Số tiền</th><th>Phương thức / Tham chiếu</th><th>Lý do / Người ghi nhận</th></tr></thead><tbody>{history?.data.map(row=><tr key={row.id}><td>{row.refunded_on}<small>{new Date(row.created_at).toLocaleString('vi-VN')}</small></td><td><strong>{row.root_code}</strong></td><td>{row.data.recipient}<small>{row.data.payeeType==='PARTNER'?'CTV: ':'Người đặt: '}{row.data.payer}</small></td><td><strong>{giftMoney(row.amount)}</strong></td><td>{methodLabels[row.data.method]}<small>{row.data.reference}</small></td><td>{row.data.note}<small>{row.data.actorName||row.data.actor}</small></td></tr>)}</tbody></table>{history&&!history.data.length&&<p>Chưa có bản ghi phù hợp.</p>}</div>
 {history&&<div className="refund-pagination"><button className="outline-button" disabled={page<=1} onClick={()=>setPage(page-1)}>← Trước</button><span>{history.total} bản ghi · Trang {history.page}/{Math.max(1,Math.ceil(history.total/history.pageSize))}</span><button className="outline-button" disabled={history.page*history.pageSize>=history.total} onClick={()=>setPage(page+1)}>Sau →</button></div>}</section></section>;
}
