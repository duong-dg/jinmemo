'use client';
import {effectiveTourInfo} from '../../../lib/tour-info';
import{saleDayAvailable,nextSaleDay}from'../../../lib/sale-calendar';
import { useEffect, useId, useRef, useState } from 'react';
import { useLocale } from '../../components/locale-context';
import { DatePicker } from '../../components/date-picker';
import { InventoryNotice } from '../../components/inventory-notice';
import { cartMoney } from '../../components/web-cart-editor';
import { openTicketCart, readCart, writeCart, type CartLine } from '../../../lib/ticket-cart';
import { saleIdentity, setSaleQuantity, type SaleProduct, type SaleGroup } from '../../../lib/sales-cart';
import { guestLabel } from '../../../lib/guests';
import { localizedPath } from '../../../lib/i18n';
import type { InventoryAvailability } from '../../../lib/inventory';
import './package-selector.css';
type Product = SaleProduct & { slug: string; demo?: boolean };
type Rates = { lines: { customerType: string; unitPrice: number;originalUnitPrice?:number }[]; inventory?: InventoryAvailability };
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Ho_Chi_Minh', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
function PackageOption({ product, variant, date, preferred, accordionName, items, clock, change }: { product: Product; variant: Product['variants'][number]; date: string; preferred: boolean; accordionName: string; items: CartLine[]; clock: number; change: (line: CartLine, group: string, quantity: number, rates: Record<string,number>) => void }) {
  const en = useLocale() === 'en', [expanded, setExpanded] = useState(preferred), [slotId, setSlotId] = useState(''), [rates, setRates] = useState<Rates|null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false), slots = variant.timeSlots || [], groups = Object.keys(variant.prices || {}) as SaleGroup[];
  const slot = slots.length === 1 ? slots[0].id : slotId, identity = { productId:product.id, variantId:variant.id, date, ...(slot ? {slotId:slot} : {}) }, selected = items.find(i => saleIdentity(i) === saleIdentity(identity)), count = Object.values(selected?.quantities || {}).reduce((n,q)=>n+q,0), packageCount = items.filter(i=>i.productId===product.id&&i.variantId===variant.id&&i.date===date).reduce((n,i)=>n+Object.values(i.quantities).reduce((a,b)=>a+b,0),0), hasLocal = groups.some(g=>g.startsWith('LOCAL_'));
  useEffect(()=>{const saved=readCart('WEB').find(i=>i.productId===product.id&&i.variantId===variant.id&&i.date===date);setSlotId(current=>{const available=(id:string)=>slots.some(s=>s.id===id&&clock<new Date(date+'T'+s.start+':00+07:00').getTime());return available(current)?current:saved?.slotId&&available(saved.slotId)?saved.slotId:slots.find(s=>clock<new Date(date+'T'+s.start+':00+07:00').getTime())?.id||'';});},[date,variant.id,clock]);
  useEffect(()=>{
    const abort=new AbortController();setError('');setRates(null);
    if(!expanded){setLoading(false);return;}
    if(date<today()||slots.length&&!slot){setError(en?'Choose an available date and time.':'Chọn ngày / suất còn mở bán.');setLoading(false);return;}
    setLoading(true);const params=new URLSearchParams({date,variantId:variant.id,lang:en?'en':'vi',...(slot?{slotId:slot}:{})});
    fetch('/api/v1/products/'+encodeURIComponent(product.slug)+'/prices?'+params,{cache:'no-store',signal:abort.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.message||'Không lấy được giá.');return data;}).then(data=>{if(!abort.signal.aborted)setRates(data);}).catch(e=>{if(!abort.signal.aborted)setError(e.message);}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});return()=>abort.abort();
  },[date,slot,variant.id,product.slug,expanded,en,clock]);
  const info=effectiveTourInfo(product,variant);
  const prices=Object.fromEntries((rates?.lines||[]).map(l=>[l.customerType,l.unitPrice])), past=slots.length>0&&!!slot&&Date.now()>=new Date(date+'T'+(slots.find(s=>s.id===slot)?.start||'00:00')+':00+07:00').getTime();
  function setQuantity(group:string,quantity:number){const line:CartLine=selected||{id:crypto.randomUUID(),...identity,productName:product.name,variantName:variant.name,...(product.transport?{transport:{...product.transport,maxPassengers:variant.maxPassengers,roundTrip:variant.roundTrip}}:{}),quantities:Object.fromEntries(groups.map(g=>[g,0])),expectedTotal:0,...(product.cover?{coverId:product.cover.id}:{}),...(slot?{slotLabel:slots.find(s=>s.id===slot)?.start}:{})};change(line,group,quantity,prices);}
  const tour=product.bookingKind==='TOUR'||!!product.tourInfo||!!variant.tourInfo;
  const adults=(selected?.quantities.ADULT||0)+(selected?.quantities.LOCAL_ADULT||0);
  const children=(selected?.quantities.CHILD||0)+(selected?.quantities.LOCAL_CHILD||0);
  const defaultApplied=useRef(false);
  useEffect(()=>{
    const minimum=info.minGuests;
    if(defaultApplied.current||!preferred||!expanded||!rates||!minimum||minimum>50||product.demo||past||prices.ADULT===undefined)return;
    if(rates.inventory?.limited&&minimum>(rates.inventory.remaining||0))return;
    defaultApplied.current=true;
    if(!readCart('WEB').some(line=>line.productId===product.id))setQuantity('ADULT',minimum);
  },[preferred,expanded,rates,info.minGuests,product.id,past]);
  return <details className="package-option" name={accordionName} open={expanded} onToggle={e=>setExpanded(e.currentTarget.open)}><summary><span>{variant.name}</span><div>{packageCount>0&&<small>{packageCount} {en?'tickets':'vé'}</small>}<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></div></summary><div className="package-option-body">{
tour&&!adults&&groups.some(g=>g==='CHILD'||g==='LOCAL_CHILD')&&<p className="package-hint">{en?'Add an adult before adding children.':'Chọn ít nhất một người lớn trước khi thêm trẻ em.'}</p>}{count>0&&info.minGuests&&count<info.minGuests&&<p className="package-hint" role="status">{en?'Add ':'Cần thêm '}{info.minGuests-count} {en?'guests to meet the minimum.':'khách để đủ số lượng tối thiểu.'}</p>}{slots.length>1&&<div className="package-slots"><span>{en?'Visit time':'Suất sử dụng'}</span>{slots.map(s=><button type="button" key={s.id} aria-pressed={slot===s.id} disabled={clock>=new Date(date+'T'+s.start+':00+07:00').getTime()} onClick={()=>setSlotId(s.id)}>{s.start}{s.end?' – '+s.end:''}</button>)}</div>}{groups.map(group=>{const quantity=selected?.quantities[group]||0, local=group.startsWith('LOCAL_'), label=guestLabel(group,en), price=prices[group],originalPrice=rates?.lines.find(l=>l.customerType===group)?.originalUnitPrice;return <div className={'package-guest'+(local?' package-local-rate':'')} key={group}><div className="package-guest-label">{hasLocal&&<span>{local?(en?'Local resident':'Người địa phương'):(en?'Visitor':'Du khách')}</span>}<strong>{product.transport?(product.transport.mode==='PRIVATE'?(en?'Vehicle / trip':'Xe / chuyến'):(en?'Seat':'Chỗ ngồi')):guestLabel(group.replace('LOCAL_',''),en)}</strong>{variant.conditions?.[group]&&<small>{variant.conditions[group]}</small>}</div><div className="package-guest-controls"><strong>{originalPrice!==undefined&&originalPrice>(price??0)&&<del className="package-original-price">{cartMoney(originalPrice)}</del>}{loading?'…':price===undefined?'—':cartMoney(price)}</strong><div className="package-stepper"><button type="button" aria-label={(en?'Decrease ':'Giảm ')+variant.name+' '+label} disabled={!quantity||tour&&!!children&&adults===1&&(group==='ADULT'||group==='LOCAL_ADULT')} onClick={()=>setQuantity(group,quantity-1)}>−</button><output aria-label={variant.name+' '+label}>{quantity}</output><button type="button" aria-label={(en?'Increase ':'Tăng ')+variant.name+' '+label} disabled={tour&&!adults&&(group==='CHILD'||group==='LOCAL_CHILD')||!!info.maxGuests&&count>=info.maxGuests||loading||!rates||price===undefined||quantity>=(product.transport?.mode==='PRIVATE'?1:50)||product.demo||past||!!rates.inventory?.limited&&count>=(rates.inventory.remaining||0)} onClick={()=>setQuantity(group,quantity+1)}>+</button></div></div></div>})}{error&&<p className="ticket-error" role="alert">{error}</p>}<InventoryNotice inventory={rates?.inventory} quantity={count}/></div></details>;
}
export function BookingPanel({product}:{product:Product}){
  const accordionName=useId(),locale=useLocale(),en=locale==='en',[draft,setDraft]=useState<CartLine[]>([]),[date,setDate]=useState(today),[clock,setClock]=useState(Date.now),[error,setError]=useState(''),[visible,setVisible]=useState(false),root=useRef<HTMLElement>(null),preferred=product.variants.find(v=>/eco/i.test(v.name))?.id||product.variants[0]?.id;
  useEffect(()=>{const header=document.querySelector<HTMLElement>('.header');if(!header)return;const update=()=>root.current?.style.setProperty('--booking-sticky-top',Math.ceil(header.getBoundingClientRect().height+16)+'px');const observer=new ResizeObserver(update);observer.observe(header);update();return()=>observer.disconnect();},[]);
  useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),30000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{if(!saleDayAvailable(product,date,clock)){const next=nextSaleDay(product,date,clock);if(next&&next!==date)setDate(next);}},[product,date,clock]);
  useEffect(()=>{const update=()=>{const box=root.current?.getBoundingClientRect();if(box)root.current?.style.setProperty('--booking-panel-height',Math.ceil(box.height)+'px');setVisible(!!box&&box.top<window.innerHeight-60&&box.bottom>0);};const observer=new ResizeObserver(update);if(root.current)observer.observe(root.current);window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);update();return()=>{observer.disconnect();window.removeEventListener('scroll',update);window.removeEventListener('resize',update);};},[]);
  const selection=draft.filter(line=>line.date===date);
  const count=selection.reduce((sum,line)=>sum+Object.values(line.quantities).reduce((n,q)=>n+q,0),0);
  const total=selection.reduce((sum,line)=>sum+line.expectedTotal,0);
  function change(line:CartLine,group:string,quantity:number,rates:Record<string,number>){
    try {
      setDraft(setSaleQuantity(selection,line,group,quantity,rates));
      setError('');
    } catch(e) { setError((e as Error).message); }
  }
  function commitSelection(checkout=false){
    if(!selection.length||product.demo)return;
    try {
      let cart=readCart('WEB');
      for(const line of selection){
        const existing=cart.find(item=>saleIdentity(item)===saleIdentity(line));
        const variant=product.variants.find(item=>item.id===line.variantId)!;
        const {minGuests,maxGuests}=effectiveTourInfo(product,variant);
        const quantities={...existing?.quantities};
        for(const [group,quantity] of Object.entries(line.quantities))quantities[group]=(quantities[group]||0)+quantity;
        const guests=Object.values(quantities).reduce((n,q)=>n+q,0);
        if(minGuests&&guests<minGuests)throw new Error(en?`Select at least ${minGuests} guests.`:`Chọn ít nhất ${minGuests} khách.`);
        if(maxGuests&&guests>maxGuests)throw new Error(en?`Maximum ${maxGuests} guests including the cart.`:`Tối đa ${maxGuests} khách, tính cả vé trong giỏ.`);
        for(const [group,quantity] of Object.entries(quantities))cart=setSaleQuantity(cart,line,group,quantity);
        cart=cart.map(item=>saleIdentity(item)===saleIdentity(line)?{...item,expectedTotal:line.expectedTotal+(existing?.expectedTotal||0)}:item);
      }
      writeCart('WEB',cart);
      setDraft([]);
      setError('');
      if(checkout)window.location.assign(localizedPath('/gio-hang',locale));
      else openTicketCart();
    } catch(e) { setError((e as Error).message); }
  }
  return <section className={'booking booking-packages'+(visible?' booking-in-view':'')} ref={root} aria-label={en?'Ticket packages':'Tùy chọn gói dịch vụ'}><p className="eyebrow">{en?'CHOOSE YOUR EXPERIENCE':'CHỌN TRẢI NGHIỆM'}</p><h2>{product.transport?(en?'Choose your vehicle':'Chọn xe & chuyến đi'):(en?'Ticket packages':'Tùy chọn gói dịch vụ')}</h2>{product.transport&&<p className="package-hint">{product.transport.origin} → {product.transport.destination} · {product.transport.mode==='PRIVATE'?(en?'Price per vehicle / trip':'Giá theo xe / chuyến'):(en?'Price per seat':'Giá theo chỗ')}</p>}<DatePicker label={en?'Visit date':'Ngày sử dụng'} min={today()} value={date} isDateDisabled={d=>!saleDayAvailable(product,d,clock)} onChange={value=>{setDate(value);setDraft([]);setError('');}}/><p className="package-hint">{en?'Closed dates and dates with no remaining departures cannot be selected.':'Ngày khóa bán hoặc đã hết suất được làm mờ và không thể chọn.'}</p><div className="package-options">{product.variants.map(variant=><PackageOption key={variant.id} product={product} variant={variant} preferred={variant.id===preferred} accordionName={accordionName} date={date} items={selection} clock={clock} change={change}/>)}</div>{error&&<div className="package-error" role="alert">{error}<button onClick={openTicketCart}>{en?'Edit cart':'Sửa giỏ vé'} ↗</button></div>}<div className="package-inline-total"><span>{en?'Total':'Tổng cộng'} · {count} {en?'tickets':'vé'}</span><strong>{cartMoney(total)}</strong></div><div className="booking-purchase-actions"><button className="cart-add-button" disabled={!count||product.demo} onClick={()=>commitSelection()}>{en?'Add to cart':'Thêm vào giỏ'}</button><button className="ticket-apply" disabled={!count||product.demo} onClick={()=>commitSelection(true)}>{en?'Checkout':'Thanh toán'} ↗</button></div><p className="package-hint">{en?'Select your tickets, then add them to your cart or check out.':'Chọn số vé rồi bấm Thêm vào giỏ hoặc Thanh toán.'}</p>{visible&&<div className="package-mobile-bar"><button className="package-mobile-amount" onClick={openTicketCart}><span>{en?'Total':'Tổng cộng'}{count>0?' · '+count+' '+(en?'tickets':'vé'):''}</span><strong aria-live="polite">{cartMoney(total)}</strong></button><button className="package-book-now" disabled={!count||product.demo} onClick={()=>commitSelection(true)}>{en?'Book now':'Đặt ngay'} ↗</button></div>}</section>;
}
