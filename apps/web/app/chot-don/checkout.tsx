'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import './checkout.css';
import {useTicketCart,readCart,writeCart,cartKeys,type CartLine} from '../../lib/ticket-cart';
import {useGiftCart,updateGiftCart} from '../../lib/gift-cart';
import {useRideCart,readRideCart,writeRideCart} from '../../lib/ride-cart';
import {useLocale} from '../components/locale-context';
import {localizedPath} from '../../lib/i18n';
import {cartApi} from '../components/cart-receipt';
import {TransportFields,readTrip} from '../components/transport-fields';
import {GiftAddress} from '../qua-luu-niem/gift-address';
import {giftMoney,type GiftConfig} from '../qua-luu-niem/shop';

type Group='tickets'|'ride'|'gifts';
type Result={code:string;accessKey?:string};
type Attempt={body:Record<string,unknown>;result?:Result;source?:unknown};
type Journal=Partial<Record<Group,Attempt>>;
const journalKey='jinmemo-combined-checkout-v1';
const labels={tickets:'Vé',ride:'Xe',gifts:'Quà'};
const endpoints={tickets:['carts','X-JinMemo-Request'],ride:['rides','X-JinMemo-Ride'],gifts:['gifts','X-JinMemo-Gifts']};

async function submitGroup(group:Group,body:Attempt['body']):Promise<Result>{
 const [path,header]=endpoints[group];
 const response=await fetch('/api/v1/'+path,{method:'POST',headers:{'Content-Type':'application/json',[header]:'1'},body:JSON.stringify(body)});
 const data=await response.json();
 if(!response.ok)throw Object.assign(new Error(Array.isArray(data.message)?data.message.join(' · '):data.message||'Chưa tạo được đơn.'),{status:response.status});
 if(typeof data.code!=='string'||group==='tickets'&&typeof data.accessKey!=='string')throw new Error('Chưa nhận được mã đơn.');
 return data;
}

function clearSubmittedCart(group:Group,source:unknown){
 if(!source)return;
 if(group==='tickets'){
  const sent=source as CartLine[];
  writeCart('WEB',readCart('WEB').filter(line=>!sent.some(item=>JSON.stringify(item)===JSON.stringify(line))));
 }else if(group==='ride'){
  if(JSON.stringify(readRideCart())===JSON.stringify(source))writeRideCart(null);
 }else{
  const sent=source as ReturnType<typeof useGiftCart>;
  updateGiftCart(current=>{
   const next={...current};
   for(const [id,line] of Object.entries(sent)){
    if(next[id]?.name===line.name&&next[id]?.quantity===line.quantity)delete next[id];
   }
   return next;
  });
 }
}

export function CombinedCheckout({catalog}:{catalog:GiftConfig|null}){
 const locale=useLocale();
 const tickets=useTicketCart('WEB'),ride=useRideCart(),giftCart=useGiftCart();
 const [delivery,setDelivery]=useState(false),[address,setAddress]=useState(''),[busy,setBusy]=useState(false);
 const [journal,setJournal]=useState<Journal>({}),[errors,setErrors]=useState<Partial<Record<Group,string>>>({});
 const pending=useRef<Journal>({}),running=useRef(false);
 useEffect(()=>{
  try{
   const restored:Journal=JSON.parse(sessionStorage.getItem(journalKey)||'{}')||{};
   for(const group of Object.keys(labels) as Group[]){
    const attempt=restored[group];
    if(attempt?.result&&attempt.source){clearSubmittedCart(group,attempt.source);delete attempt.source;}
   }
   pending.current=restored;setJournal(restored);
   sessionStorage.setItem(journalKey,JSON.stringify(restored));
  }catch{}
 },[]);
 function record(group:Group,attempt?:Attempt){
  const next={...pending.current};
  if(attempt)next[group]=attempt;else delete next[group];
  pending.current=next;
  try{sessionStorage.setItem(journalKey,JSON.stringify(next));}catch{}
  setJournal(next);
 }
 const giftIds=Object.keys(giftCart);
 const gifts=(catalog?.items||[]).filter(item=>giftCart[item.id]).map(item=>({...item,quantity:giftCart[item.id].quantity}));
 const giftReady=!!catalog?.enabled&&gifts.length===giftIds.length&&gifts.every(item=>item.stock>=item.quantity);
 const subtotal=gifts.reduce((sum,item)=>sum+item.quantity*item.price,0),shipping=delivery?(catalog?.shippingFee||0):0;
 const unresolved=(group:Group)=>!!journal[group]&&!journal[group]?.result;
 const hasWork=(Object.keys(labels) as Group[]).some(unresolved)||!!tickets.length||!!ride||!!giftIds.length;

 async function place(group:Group,body?:Attempt['body'],source?:unknown){
  const previous=pending.current[group];
  if((!previous||previous.result)&&!body)return;
  const attempt=previous&&!previous.result?previous:{body:body!,source};
  record(group,attempt);
  try{
   const result=await submitGroup(group,attempt.body);
   record(group,{body:{},result,source:attempt.source});
   clearSubmittedCart(group,attempt.source);
   record(group,{body:{},result});
  }catch(error){
   const failure=error as Error&{status?:number};
   const definitive=!!failure.status&&failure.status>=400&&failure.status<500&&(!previous||!!previous.result||failure.status===409||failure.status===400);
   if(definitive)record(group);
   setErrors(old=>({...old,[group]:definitive?failure.message:'Chưa nhận được kết quả. Bấm gửi lại để kiểm tra cùng mã yêu cầu.'}));
  }
 }

 return <main className="section combined-checkout" id="main">
  <h1>Thanh toán</h1>
  <p>Mỗi nhóm có mã đơn và cách thanh toán riêng. Giá và số chỗ được kiểm tra khi xác nhận.</p>
  {(Object.keys(labels) as Group[]).map(group=>{
   const result=journal[group]?.result;
   return <div key={group}>
    {result&&<p role="status"><strong>{labels[group]} · {result.code}</strong> · {group==='tickets'?<Link href={localizedPath('/gio-hang',locale)+'#'+result.code+':'+result.accessKey}>Thanh toán vé</Link>:group==='ride'?'Đã gửi yêu cầu đặt xe':'Trả tiền khi nhận hàng'}</p>}
    {errors[group]&&<p role="alert">{labels[group]} · {errors[group]}</p>}
    {unresolved(group)&&<p>{labels[group]} đang chờ kết quả. Gửi lại sẽ dùng thông tin và mã yêu cầu đã gửi.</p>}
   </div>;
  })}
  {!hasWork?<p>Giỏ hàng hiện trống.</p>:<form className="cart-contact-form" onSubmit={async event=>{
   event.preventDefault();
   if(running.current)return;
   running.current=true;setBusy(true);setErrors({});
   const form=new FormData(event.currentTarget);
   const field=(name:string)=>String(form.get(name)||'').trim();
   const contact={name:field('name'),phone:field('phone'),email:field('email')};
   try{
    await place('tickets',tickets.length?{
     ...cartKeys(),accepted:true,...(locale==='en'?{locale}:{}),contact:{...contact,note:''},
     items:tickets.map(line=>({productId:line.productId,variantId:line.variantId,date:line.date,slotId:line.slotId,quantities:line.quantities,expectedTotal:line.expectedTotal,voucherCode:line.voucherCode,...readTrip(form,line)}))
    }:undefined,tickets);
    await place('ride',ride?{...ride.selection,contact,requestKey:crypto.randomUUID(),payment:'PAY_LATER',pickup:field('pickup'),dropoff:field('dropoff'),note:field('rideNote')}:undefined,ride);
    if(giftIds.length&&!giftReady&&!unresolved('gifts'))setErrors(old=>({...old,gifts:'Có món chưa đủ hàng hoặc quà đang đóng bán. Kiểm tra lại giỏ quà.'}));
    else await place('gifts',gifts.length&&giftReady?{requestId:crypto.randomUUID(),name:contact.name,phone:contact.phone,address:delivery?address:'',fulfillment:delivery?'DELIVERY':'PICKUP',expectedTotal:subtotal+shipping,lines:gifts.map(item=>({id:item.id,quantity:item.quantity}))}:undefined,giftCart);
   }finally{running.current=false;setBusy(false);}
  }}>
   <fieldset disabled={busy} className="combined-grid">
    <div className="combined-details">
    {(tickets.length&&!unresolved('tickets')||ride&&!unresolved('ride')||giftIds.length&&giftReady&&!unresolved('gifts'))&&<section className="order-card"><h2>Thông tin liên hệ</h2><div className="checkout-contact-grid">
     <label>Họ tên<input name="name" required minLength={2} maxLength={100} autoComplete="name"/></label>
     <label>Số điện thoại<input name="phone" type="tel" required minLength={8} maxLength={25} autoComplete="tel"/></label>
     {(!!tickets.length||!!ride)&&<label>Email<input name="email" type="email" required maxLength={200} autoComplete="email"/></label>}
    </div></section>}
    {!!tickets.length&&!unresolved('tickets')&&<section className="order-card"><h2>Vé</h2>
     <ul>{tickets.map(line=><li key={line.id}>{line.productName} · {line.variantName} · {line.date}{line.slotLabel?' · '+line.slotLabel:''} · {giftMoney(line.expectedTotal)}</li>)}</ul>
     <TransportFields items={tickets}/>
     <button type="button" className="outline-button" onClick={async()=>{
      if(running.current)return;
      running.current=true;setBusy(true);setErrors(old=>({...old,tickets:undefined}));
      try{
       const updated=await Promise.all(tickets.map(async line=>{
        const quote=await cartApi('quotes?lang='+locale,{productId:line.productId,variantId:line.variantId,date:line.date,slotId:line.slotId,quantities:line.quantities,voucherCode:line.voucherCode});
        if(quote.demo)throw new Error('Vé minh họa chưa mở bán.');
        return {...line,expectedTotal:quote.total};
       }));
       if(JSON.stringify(readCart('WEB'))!==JSON.stringify(tickets))throw new Error('Giỏ vé vừa thay đổi. Bấm kiểm tra lại.');
       writeCart('WEB',updated);
      }catch(error){setErrors(old=>({...old,tickets:(error as Error).message}));}
      finally{running.current=false;setBusy(false);}
     }}>Kiểm tra giá vé</button> <Link href={localizedPath('/gio-hang',locale)}>Sửa giỏ vé</Link>
    </section>}
    {ride&&!unresolved('ride')&&<section className="order-card"><h2>Xe</h2>
     <p>{ride.fromName} → {ride.toName} · {ride.selection.date} {ride.selection.time} · {ride.vehicleName} · {ride.selection.passengers} khách</p>
     <p>{giftMoney(ride.selection.expectedTotal)} · Đặt trước, thanh toán sau</p>
     <div className="checkout-contact-grid">
      <label>Địa chỉ đón<input name="pickup" required minLength={3} maxLength={300}/></label>
      <label>Địa chỉ trả<input name="dropoff" required minLength={3} maxLength={300}/></label>
      <label>Ghi chú cho chuyến xe<textarea name="rideNote" maxLength={1000}/></label>
     </div>
    </section>}
    {!!giftIds.length&&!unresolved('gifts')&&<section className="order-card gift-contact"><h2>Quà lưu niệm</h2>
     <ul>{Object.entries(giftCart).map(([id,line])=><li key={id}>{line.name} × {line.quantity}</li>)}</ul>
     {giftReady?<><label>Hình thức nhận<select value={delivery?'delivery':'pickup'} onChange={e=>{setDelivery(e.target.value==='delivery');setAddress('');}}><option value="pickup">Nhận tại quầy</option><option value="delivery">Giao trong Việt Nam</option></select></label>
      {delivery&&<GiftAddress onChange={setAddress}/>}
      <p>Phí giao {giftMoney(shipping)} · Tổng {giftMoney(subtotal+shipping)} · Trả khi nhận</p></>:<p>Kiểm tra lại số lượng hoặc trạng thái mở bán của quà.</p>}
     <Link href="/qua-luu-niem?gio=1">Xem giỏ quà</Link>
    </section>}
    </div>
    <aside className="order-card combined-summary" aria-label="Tổng đơn">
     <h2>Tóm tắt đơn hàng</h2>
     {!!tickets.length&&<p>Vé · {giftMoney(tickets.reduce((sum,line)=>sum+line.expectedTotal,0))}</p>}
     {!!giftIds.length&&giftReady&&delivery&&<p>Phí giao · {giftMoney(shipping)}</p>}
     {ride&&<p>Xe thu sau · {giftMoney(ride.selection.expectedTotal)}</p>}
     {!!giftIds.length&&giftReady&&<p>Quà trả khi nhận · {giftMoney(subtotal+shipping)}</p>}

     <div className="cart-totals"><span>Tổng đơn</span><strong>{giftIds.length&&!giftReady?'Cần kiểm tra giỏ quà':giftMoney(tickets.reduce((sum,line)=>sum+line.expectedTotal,0)+(ride?.selection.expectedTotal||0)+subtotal+shipping)}</strong></div>
    <label className="combined-consent"><input type="checkbox" required/> Tôi đồng ý tạo đơn và thanh toán riêng cho từng nhóm.</label>
    <button className="button" disabled={busy||delivery&&giftReady&&!address&&!unresolved('gifts')}>{busy?'Đang xác nhận…':'Xác nhận đặt hàng'}</button>
    </aside>
   </fieldset>
  </form>}
 </main>;
}
