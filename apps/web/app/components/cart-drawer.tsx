'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {useRideCart,writeRideCart} from '../../lib/ride-cart';
import {useGiftCart,updateGiftCart} from '../../lib/gift-cart';
import { useLocale } from './locale-context';
import { localizedPath } from '../../lib/i18n';
import { WebCartEditor, cartMoney, useWebCart } from './web-cart-editor';

function DrawerContents({ close }: { close: () => void }) {
  const { items, savings,total, busy, error, ready, retry } = useWebCart(), locale = useLocale(), en = locale === 'en';
  const ride=useRideCart();
  const gifts=Object.entries(useGiftCart());
  const hasGifts=gifts.length>0;
  const combined=!!ride||!!items.length&&hasGifts;
  const [giftPrices,setGiftPrices]=useState<Record<string,number>|null>(null);
  useEffect(()=>{
   if(!hasGifts)return;
   const controller=new AbortController();
   setGiftPrices(null);
   fetch('/api/v1/gifts',{cache:'no-store',signal:controller.signal})
    .then(async response=>{
     if(!response.ok)throw new Error();
     const {data}=await response.json();
     if(!controller.signal.aborted)setGiftPrices(Object.fromEntries((data.items as {id:string;price:number}[]).map(item=>[item.id,item.price])));
    }).catch(()=>{if(!controller.signal.aborted)setGiftPrices({});});
   return()=>controller.abort();
  },[hasGifts]);
  const giftTotal=gifts.every(([id])=>giftPrices?.[id]!==undefined)
   ?gifts.reduce((sum,[id,line])=>sum+(giftPrices?.[id]||0)*line.quantity,0):null;
  const rideTotal=ride?.selection.expectedTotal||0;
  const estimatedTotal=giftTotal===null?null:total+rideTotal+giftTotal;
  return <><header className="cart-drawer-header"><div><p>{en ? 'YOUR EXPERIENCES' : 'TRẢI NGHIỆM ĐÃ CHỌN'}</p><h2 id="cart-drawer-title">{en ? 'Shopping cart' : 'Giỏ hàng'} <span>{items.length+gifts.length+Number(!!ride)}</span></h2></div><button type="button" onClick={close} aria-label={en ? 'Close cart' : 'Đóng giỏ hàng'}>×</button></header><div className="cart-drawer-body">{items.length ? <WebCartEditor savings={savings} items={items} compact/> : !gifts.length&&!ride&&<div className="web-cart-empty"><span>＋</span><h3>{en ? 'A new experience awaits' : 'Thêm một trải nghiệm mới'}</h3><p>{en ? 'Choose a package to start your journey.' : 'Chọn gói vé yêu thích để bắt đầu hành trình.'}</p><button type="button" className="cart-continue-button" onClick={close}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m6-6-6 6 6 6"/></svg>{en ? 'Continue exploring' : 'Tiếp tục chọn vé'}</button></div> }{!!gifts.length&&<section className="gift-drawer-section"><h3>{en?'Souvenirs':'Quà lưu niệm'}</h3><ul>{gifts.map(([id,line])=><li key={id}><span>{line.name} × {line.quantity}</span><button type="button" className="gift-remove-icon" title={en?'Remove item':'Xóa món'} aria-label={(en?'Remove ':'Xóa ')+line.name} onClick={()=>updateGiftCart(current=>Object.fromEntries(Object.entries(current).filter(([key])=>key!==id)))}><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg></button></li>)}</ul>{!combined&&<Link className="web-checkout-button gift-drawer-pay" href="/qua-luu-niem?gio=1" onClick={()=>{close();window.dispatchEvent(new Event('jinmemo-checkout-gifts'));}}>{en?'Checkout souvenirs':'Thanh toán quà'} <span aria-hidden="true">↗</span></Link>}</section>}{ride&&<section className="gift-drawer-section"><h3>{en?'Transfer':'Chuyến xe'}</h3><p>{ride.fromName} → {ride.toName} · {ride.selection.date} {ride.selection.time}</p><button type="button" className="outline-button" onClick={()=>writeRideCart(null)}>{en?'Remove ride':'Xóa chuyến xe'}</button></section>}
  {error && <div className="web-cart-error"  role="alert">{error}<button type="button" onClick={retry}>{en ? 'Retry' : 'Kiểm tra lại'}</button></div>}</div>{combined?<footer className="cart-drawer-footer"><div><span>{en?'Estimated total':'Tổng tạm tính'}</span><strong aria-live="polite">{estimatedTotal===null?(giftPrices===null?'…':(en?'Check souvenir prices':'Cần kiểm tra giá quà')):cartMoney(estimatedTotal)}</strong><small>{hasGifts?(en?'Shipping is added when delivery is selected.':'Phí giao tính khi chọn giao hàng.'):null}{ride?<><br/>{en?'Transfer payable later':'Tiền xe thu sau'} · {cartMoney(rideTotal)}</>:null}</small></div><Link className="web-checkout-button" href="/chot-don" onClick={close}>{en?'Checkout':'Thanh toán'} ↗</Link></footer>:hasGifts?<footer className="cart-drawer-footer"><div><span>{en?'Estimated total':'Tổng tạm tính'}</span><strong>{estimatedTotal===null?'…':cartMoney(estimatedTotal)}</strong><small>{en?'Excludes delivery fee':'Chưa gồm phí giao'}</small></div></footer>:!!items.length && <footer className="cart-drawer-footer"><div><span>{en ? 'Total' : 'Tổng tiền'}</span><strong aria-live="polite">{busy ? (en ? 'Updating…' : 'Đang cập nhật…') : cartMoney(total)}</strong><small>{en ? 'Prices and availability checked at checkout.' : 'Giá và số vé được kiểm tra khi đặt.'}</small></div>{ready ? <Link className="web-checkout-button" href={localizedPath('/gio-hang', locale)} onClick={close}>{en ? 'Checkout' : 'Thanh toán'} <span>↗</span></Link> : <button className="web-checkout-button" disabled>{busy ? (en ? 'Updating…' : 'Đang cập nhật…') : (en ? 'Check your cart' : 'Kiểm tra giỏ vé')}</button>}</footer>}</>;
}
export function CartDrawer() {
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLElement | null>(null), [open, setOpen] = useState(false);
  useEffect(() => { const show = () => { trigger.current = document.activeElement as HTMLElement; setOpen(true); }; window.addEventListener('jinmemo-open-cart', show); return () => window.removeEventListener('jinmemo-open-cart', show); }, []);
  useEffect(() => { if (!open) return; const element = dialog.current; element?.showModal(); const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { element?.close(); document.body.style.overflow = previous; trigger.current?.focus(); }; }, [open]);
  return <dialog ref={dialog} className="cart-drawer" aria-labelledby="cart-drawer-title" onClose={() => setOpen(false)} onClick={e => { if (e.target === e.currentTarget) { const box = e.currentTarget.getBoundingClientRect(); if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) setOpen(false); } }}>{open && <DrawerContents close={() => setOpen(false)}/>}</dialog>;
}
