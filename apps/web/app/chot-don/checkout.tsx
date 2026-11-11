'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import './checkout.css';
import {useTicketCart,readCart,writeCart,cartKeys,type CartLine} from '../../lib/ticket-cart';
import {useGiftCart,updateGiftCart} from '../../lib/gift-cart';
import {useRideCart,readRideCart,writeRideCart} from '../../lib/ride-cart';
import {useLocale} from '../components/locale-context';
import {localizedPath,translator,errorText} from '../../lib/i18n';
import {OnlinePayment} from '../tra-cuu/online-payment';
import {webPaymentMethods,isOnlinePayment,paymentLabel,manualOptionLabel,manualOptionInstructions,type ManualOption} from '../../lib/payment-methods';
import {TransportFields,readTrip} from '../components/transport-fields';
import {PickupCounter} from '../qua-luu-niem/pickup-counter';
import {GiftAddress} from '../qua-luu-niem/gift-address';
import {giftMoney,type GiftConfig} from '../qua-luu-niem/shop';

type Group='tickets'|'ride'|'gifts';
type Result={code:string;accessKey?:string};
type Attempt={body:Record<string,unknown>;result?:Result;source?:unknown};
type Journal=Partial<Record<Group,Attempt>>;
const journalKey='jinmemo-combined-checkout-v2';
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

type BundleDraft={body:Record<string,unknown>;accessKey:string;method:string;receipt?:{code:string;total:number;method:string;codes?:Record<string,string>;ticketAccessKey?:string};paid?:boolean};
export function CombinedCheckout({catalog}:{catalog:GiftConfig|null}){
 const locale=useLocale(),en=locale==='en',t=translator(locale);
 const storedTickets=useTicketCart('WEB'),storedRide=useRideCart(),storedGifts=useGiftCart();
 const [delivery,setDelivery]=useState(false),[address,setAddress]=useState(''),[pickup,setPickup]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[ready,setReady]=useState(false);
 const [journal,setJournal]=useState<Journal>({}),pending=useRef<Journal>({}),running=useRef(false);
 const [bundle,setBundle]=useState<BundleDraft|null>(null),bundleRef=useRef<BundleDraft|null>(null);
 const [methods,setMethods]=useState<string[]>([]),[manual,setManual]=useState<ManualOption[]>([]),[method,setMethod]=useState(''),[methodsReady,setMethodsReady]=useState(false);
 const tickets=journal.tickets?[]:storedTickets,ride=journal.ride?null:storedRide,giftCart=journal.gifts?{}:storedGifts;
 const locations=catalog?.pickupCounters||[],pickupCounterId=locations.find(row=>row.id===pickup)?.id||locations[0]?.id;
 const giftIds=Object.keys(giftCart),gifts=(catalog?.items||[]).filter(row=>giftCart[row.id]).map(row=>({...row,quantity:giftCart[row.id].quantity}));
 const giftReady=!!catalog?.enabled&&gifts.length===giftIds.length&&gifts.every(row=>row.stock>=row.quantity);
 const giftSubtotal=gifts.reduce((sum,row)=>sum+row.price*row.quantity,0),shipping=delivery?(catalog?.shippingFee||0):0;
 const ticketTotal=tickets.reduce((sum,line)=>sum+line.expectedTotal,0),rideTotal=ride?.selection.expectedTotal||0;
 const savedTotal=(group:Group)=>{const body=journal[group]?.body;if(!body)return 0;return group==='tickets'?(body.items as {expectedTotal:number}[]||[]).reduce((sum,row)=>sum+row.expectedTotal,0):Number(body.expectedTotal)||0;};
 const total=(tickets.length?ticketTotal:savedTotal('tickets'))+(ride?rideTotal:savedTotal('ride'))+(giftIds.length?giftSubtotal+shipping:savedTotal('gifts'));
 const hasItems=!!tickets.length||!!ride||!!giftIds.length||Object.keys(journal).length>0;
 function saveBundle(value:BundleDraft|null){bundleRef.current=value;setBundle(value);try{if(value)sessionStorage.setItem(journalKey+':bundle',JSON.stringify(value));else sessionStorage.removeItem(journalKey+':bundle');}catch{}}
 function record(group:Group,value:Attempt){const next={...pending.current,[group]:value};pending.current=next;setJournal(next);sessionStorage.setItem(journalKey,JSON.stringify(next));}
 useEffect(()=>{try{const restored=JSON.parse(sessionStorage.getItem(journalKey)||'{}') as Journal;pending.current=restored;setJournal(restored);for(const group of Object.keys(restored) as Group[])if(restored[group]?.result)clearSubmittedCart(group,restored[group]?.source);const saved=JSON.parse(sessionStorage.getItem(journalKey+':bundle')||'null');bundleRef.current=saved;setBundle(saved);}catch{}setReady(true);},[]);
 useEffect(()=>{let active=true;fetch('/api/v1/payments/options',{cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error();return response.json();}).then(data=>{if(active){setManual(data.manualOptions||[]);setMethods(webPaymentMethods(data.providers||[],data.manualMethods||[]));}}).catch(()=>{if(active)setError(en?'Unable to load payment methods. Please refresh.':'Chưa tải được phương thức thanh toán. Vui lòng tải lại.');}).finally(()=>{if(active)setMethodsReady(true);});return()=>{active=false;};},[en]);
 useEffect(()=>{const fragment=window.location.hash.slice(1).split(':');if(fragment.length!==2||!/^JB[A-F0-9]{10}$/.test(fragment[0])||!/^([a-f0-9]{64})$/.test(fragment[1]))return;let active=true;fetch('/api/v1/payments/bundles/lookup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:fragment[0],accessKey:fragment[1]}),cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error();return response.json();}).then(result=>{if(active)saveBundle({body:{},accessKey:fragment[1],method:result.method,paid:result.paymentStatus==='PAID',receipt:{code:result.code,total:result.total,method:result.method,codes:result.codes,ticketAccessKey:result.ticketAccessKey}});}).catch(()=>{if(active)setError(en?'Order could not be loaded.':'Chưa tải được đơn.');});return()=>{active=false;};},[]);
 async function checkPaid(){const current=bundleRef.current;if(!current?.receipt)return;try{const response=await fetch('/api/v1/payments/bundles/lookup',{method:'POST',headers:{'Content-Type':'application/json','X-JinMemo-Request':'1'},body:JSON.stringify({code:current.receipt.code,accessKey:current.accessKey}),cache:'no-store'});if(!response.ok)throw new Error();const result=await response.json();if(result.paymentStatus==='PAID')saveBundle({...current,paid:true});}catch{setError(en?'Unable to refresh payment status. Please retry.':'Chưa kiểm tra được trạng thái thanh toán. Vui lòng thử lại.');}}
 useEffect(()=>{if(!bundle?.receipt||bundle.paid)return;void checkPaid();const timer=setInterval(()=>{if(!document.hidden)void checkPaid();},10000);return()=>clearInterval(timer);},[bundle?.receipt?.code,bundle?.paid]);
 async function place(group:Group,body:Attempt['body']|undefined,source:unknown){
  let attempt=pending.current[group];
  if(attempt?.result)return;
  if(!attempt){if(!body)return;attempt={body,source};record(group,attempt);}
  let result:Result;try{result=await submitGroup(group,attempt.body);}catch(error){const failure=error as Error&{status?:number};if(failure.status&&failure.status>=400&&failure.status<500&&failure.status!==429){const next={...pending.current};delete next[group];pending.current=next;setJournal(next);sessionStorage.setItem(journalKey,JSON.stringify(next));}throw error;}record(group,{...attempt,result});clearSubmittedCart(group,attempt.source);
 }
 async function finish(draft:BundleDraft){
  saveBundle(draft);
  const response=await fetch('/api/v1/payments/bundles',{method:'POST',headers:{'Content-Type':'application/json','X-JinMemo-Request':'1'},body:JSON.stringify(draft.body)});
  const result=await response.json();if(!response.ok){if(response.status>=400&&response.status<500&&response.status!==429)saveBundle(null);throw new Error(result.message||'Chưa tạo được đơn.');}
  saveBundle({...draft,receipt:result});pending.current={};setJournal({});sessionStorage.removeItem(journalKey);
 }
 const methodName=(id:string)=>manualOptionLabel(manual.find(row=>row.id===id),en)||paymentLabel(id,en);
 if(!ready)return <main className="section" id="main"><p>{en?'Loading cart…':'Đang tải giỏ hàng…'}</p></main>;
 if(bundle)return <main className="section combined-checkout" id="main"><h1>{bundle.paid?(en?'Payment confirmed':'Đã thanh toán'):(en?'Your order':'Đơn hàng của bạn')}</h1>
  {bundle.receipt?<section className="order-card"><h2>{bundle.receipt.code}</h2><p>{en?'Total for tickets, transfers, souvenirs and delivery':'Tổng tiền vé, xe, quà và phí giao'} <strong>{giftMoney(bundle.receipt.total)}</strong></p>
   <ul>{Object.entries(bundle.receipt.codes||{}).filter(([,code])=>code).map(([kind,code])=><li key={kind}>{kind==='tickets'?t('Vé'):kind==='ride'?t('Xe'):t('Quà')}: {kind==='tickets'&&bundle.receipt?.ticketAccessKey?<Link href={localizedPath('/gio-hang',locale)+'#'+code+':'+bundle.receipt.ticketAccessKey}>{code}</Link>:code}</li>)}</ul><p><button type="button" className="outline-button" onClick={()=>void navigator.clipboard.writeText(window.location.origin+localizedPath('/chot-don',locale)+'#'+bundle.receipt!.code+':'+bundle.accessKey).catch(()=>setError(en?'Unable to copy link.':'Không sao chép được đường dẫn.'))}>{en?'Copy private order link':'Sao chép link đơn hàng'}</button></p><p>{en?'One payment covers all items in this order.':'Một lần thanh toán cho toàn bộ đơn hàng này.'}</p>
   {bundle.paid?<p role="status">{en?'Payment received for all items. JinMemo will process your order.':'Đã ghi nhận đủ tiền cho tất cả các phần. JinMemo sẽ xử lý đơn hàng của bạn.'}</p>:isOnlinePayment(bundle.method)?<OnlinePayment code={bundle.receipt.code} accessKey={bundle.accessKey} autoProvider={bundle.method} focusSelected onPaid={()=>void checkPaid()}/>:<><p>{methodName(bundle.method)}</p><p>{manualOptionInstructions(manual.find(row=>row.id===bundle.method),en)}</p><p>{en?'Awaiting payment for the full order.':'Chờ thu tiền cho toàn bộ đơn hàng.'}</p><button type="button" className="outline-button" onClick={()=>void checkPaid()}>{en?'Check payment status':'Kiểm tra trạng thái thanh toán'}</button></>}
  </section>:<section className="order-card"><p>{en?'Your items have been booked. Retry to finish the same checkout; no duplicate orders will be created.':'Các phần đã được đặt. Bấm tiếp tục để hoàn tất cùng đơn, không tạo đơn trùng.'}</p><button className="button" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await finish(bundle);}catch(e){setError(errorText((e as Error).message,locale));}finally{setBusy(false);}}}>{en?'Continue checkout':'Tiếp tục thanh toán'}</button></section>}
  {error&&<p role="alert">{error}</p>}{bundle.receipt&&<button className="outline-button" onClick={()=>{saveBundle(null);setError('');}}>{en?'Start another order':'Đặt thêm đơn mới'}</button>}
 </main>;
 return <main className="section combined-checkout" id="main"><h1>{t('Thanh toán')}</h1><p>{en?'Review your items and select one payment method for the full order.':'Kiểm tra giỏ hàng và chọn một phương thức thanh toán cho toàn bộ đơn.'}</p>
 {!hasItems?<p>{t('Giỏ hàng hiện trống.')}</p>:<form className="cart-contact-form" onSubmit={async event=>{
  event.preventDefault();if(running.current||!method)return;running.current=true;setBusy(true);setError('');const form=new FormData(event.currentTarget),field=(name:string)=>String(form.get(name)||'').trim(),contact={name:field('name'),phone:field('phone'),email:field('email')};
  try{
   if(giftIds.length&&!giftReady)throw new Error('Có món chưa đủ hàng hoặc quà đang đóng bán. Kiểm tra lại giỏ quà.');
   await place('tickets',tickets.length?{...cartKeys(),accepted:true,locale,contact:{...contact,note:'',...(!isOnlinePayment(method)?{paymentPreference:method}:{})},items:tickets.map(line=>({productId:line.productId,variantId:line.variantId,date:line.date,slotId:line.slotId,quantities:line.quantities,expectedTotal:line.expectedTotal,voucherCode:line.voucherCode,...readTrip(form,line)}))}:undefined,tickets);
   await place('ride',ride?{...ride.selection,contact,requestKey:crypto.randomUUID(),payment:'PAY_LATER',pickup:field('pickup'),dropoff:field('dropoff'),note:field('rideNote')}:undefined,ride);
   await place('gifts',gifts.length?{requestId:crypto.randomUUID(),name:contact.name,phone:contact.phone,address:delivery?address:'',...(!delivery&&pickupCounterId?{pickupCounterId}:{}),fulfillment:delivery?'DELIVERY':'PICKUP',expectedTotal:giftSubtotal+shipping,lines:gifts.map(row=>({id:row.id,quantity:row.quantity}))}:undefined,giftCart);
   const attempts=pending.current,ticket=attempts.tickets,car=attempts.ride,gift=attempts.gifts;
   const expectedTotal=(ticket?(ticket.body.items as {expectedTotal:number}[]).reduce((sum,row)=>sum+row.expectedTotal,0):0)+Number(car?.body.expectedTotal||0)+Number(gift?.body.expectedTotal||0);
   const accessKey=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');
   await finish({accessKey,method,body:{requestId:crypto.randomUUID(),accessKey,expectedTotal,locale,method,...(ticket?{tickets:{code:ticket.result!.code,accessKey:ticket.body.accessKey}}:{}),...(car?{ride:{code:car.result!.code,requestKey:car.body.requestKey}}:{}),...(gift?{gifts:{code:gift.result!.code,requestId:gift.body.requestId}}:{})}});
  }catch(e){setError(errorText((e as Error).message,locale));}finally{running.current=false;setBusy(false);}
 }}><fieldset disabled={busy} className="combined-grid"><div className="combined-details">
 {(!!tickets.length||!!ride||!!giftIds.length)&&<section className="order-card"><h2>{t('Thông tin liên hệ')}</h2><div className="checkout-contact-grid"><label className="combined-wide">{t('Họ tên')}<input name="name" required minLength={2} maxLength={100} autoComplete="name"/></label><label>{t('Số điện thoại')}<input name="phone" type="tel" required minLength={8} maxLength={25} autoComplete="tel"/></label><label>Email<input name="email" type="email" required maxLength={200} autoComplete="email"/></label></div></section>}
 {!!tickets.length&&<section className="order-card"><h2><span className="combined-badge tickets">{t('Vé')}</span></h2><ul>{tickets.map(line=><li key={line.id}>{line.productName} · {line.variantName} · {line.date} · {giftMoney(line.expectedTotal)}</li>)}</ul><TransportFields items={tickets} en={en}/></section>}
 {ride&&<section className="order-card"><h2><span className="combined-badge ride">{t('Xe')}</span></h2><p>{ride.fromName} → {ride.toName} · {ride.selection.date} {ride.selection.time} · {ride.vehicleName} · {ride.selection.passengers} {t('khách')}</p><div className="checkout-contact-grid"><label>{t('Địa chỉ đón')}<input name="pickup" required minLength={3} maxLength={300}/></label><label>{t('Địa chỉ trả')}<input name="dropoff" required minLength={3} maxLength={300}/></label><label className="combined-wide">{t('Ghi chú cho chuyến xe')}<textarea name="rideNote" maxLength={1000}/></label></div></section>}
 {!!giftIds.length&&<section className="order-card gift-contact"><h2><span className="combined-badge gifts">{t('Quà lưu niệm')}</span></h2><ul>{Object.entries(giftCart).map(([id,line])=><li key={id}>{catalog?.items.find(item=>item.id===id)?.name||line.name} × {line.quantity}</li>)}</ul>{giftReady?<><label className="combined-fulfillment"><span>{t('Hình thức nhận quà')}</span><select value={delivery?'delivery':'pickup'} onChange={e=>{setDelivery(e.target.value==='delivery');setAddress('');}}><option value="pickup">{t('Nhận tại quầy')}</option><option value="delivery">{t('Giao trong Việt Nam')}</option></select></label>{delivery?<GiftAddress onChange={setAddress}/>:<PickupCounter locations={locations} id={pickup} onChange={setPickup}/>}</>:<p>{t('Kiểm tra lại số lượng hoặc trạng thái mở bán của quà.')}</p>}</section>}
 {Object.entries(journal).map(([group,attempt])=>attempt&&<p key={group}>{en?'Booked':'Đã đặt'}: {attempt.result?.code||(en?'Awaiting confirmation':'Chờ xác nhận')} · {en?'Included in the total below':'Đã tính vào tổng tiền bên dưới'}</p>)}
 <section className="order-card"><h2>{en?'Payment method':'Phương thức thanh toán'}</h2><div className="combined-payment-methods">{methods.map(id=><label key={id} className={method===id?'selected':''}><input type="radio" name="payment-method" required checked={method===id} onChange={()=>setMethod(id)}/><span>{methodName(id)}</span></label>)}</div>{!methodsReady&&<p>{en?'Loading payment methods…':'Đang tải phương thức thanh toán…'}</p>}{methodsReady&&!methods.length&&<p>{en?'No payment methods are currently available.':'Chưa có phương thức thanh toán được bật.'}</p>}</section>
 </div><aside className="order-card combined-summary"><h2>{t('Tóm tắt đơn hàng')}</h2>{(tickets.length||journal.tickets)&&<p className="combined-line tickets">{t('Vé')} · {giftMoney(tickets.length?ticketTotal:savedTotal('tickets'))}</p>}{(ride||journal.ride)&&<p className="combined-line ride">{t('Xe')} · {giftMoney(ride?rideTotal:savedTotal('ride'))}</p>}{(giftIds.length||journal.gifts)&&<p className="combined-line gifts">{t('Quà')} · {giftMoney(giftIds.length?giftSubtotal:savedTotal('gifts'))}</p>}{giftIds.length&&delivery?<p>{t('Phí giao')} · {giftMoney(shipping)}</p>:null}<div className="cart-totals"><span>{t('Tổng đơn')}</span><strong>{giftMoney(total)}</strong></div><label className="combined-consent"><input type="checkbox" required/>{en?'I have reviewed my order and agree to the terms.':'Tôi đã kiểm tra đơn hàng và đồng ý với điều khoản đặt hàng.'}</label>{error&&<p role="alert" className="order-error">{error}</p>}<button className="button" disabled={busy||!method||!methodsReady||delivery&&giftReady&&!address}>{busy?(en?'Confirming…':'Đang xác nhận…'):isOnlinePayment(method)?(en?'Pay now':'Thanh toán'):(en?'Confirm order':'Xác nhận đặt hàng')}</button></aside></fieldset></form>}
 </main>;
}
