'use client';
import {useEffect,useRef,useState} from 'react';
import './shop.css';
import {useGiftCart,updateGiftCart} from '../../lib/gift-cart';
import {CartIcon} from '../components/cart-icon';
import {PickupCounter,type PickupLocation} from './pickup-counter';
import {GiftAddress} from './gift-address';

export type GiftItem={id:string;name:string;description:string;imageId?:string;price:number;stock:number;active:boolean};
export type GiftConfig={enabled:boolean;shippingFee:number;items:GiftItem[];pickupCounters?:PickupLocation[]};
export const giftMoney=(n:number)=>n.toLocaleString('vi-VN')+' đ';

export function GiftShop({catalog,initialCheckout=false}:{catalog:GiftConfig;initialCheckout?:boolean}){
 const gifts=useGiftCart();
 const counts=Object.fromEntries(catalog.items.map(item=>[item.id,Math.min(item.stock,gifts[item.id]?.quantity||0)]));
 const [delivery,setDelivery]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[code,setCode]=useState('');
 const [address,setAddress]=useState(''),[checkout,setCheckout]=useState(initialCheckout),[receiving,setReceiving]=useState(initialCheckout);
 const heading=useRef<HTMLHeadingElement>(null);
 const receiveHeading=useRef<HTMLHeadingElement>(null);
 function showCheckout(open:boolean){setCheckout(open);setReceiving(false);heading.current?.scrollIntoView({block:'start'});}
 useEffect(()=>{
  if(receiving){receiveHeading.current?.focus({preventScroll:true});receiveHeading.current?.scrollIntoView({block:'start'});}
 },[receiving]);
 useEffect(()=>{
  const open=()=>{setCheckout(true);setReceiving(true);};
  window.addEventListener('jinmemo-checkout-gifts',open);
  return()=>window.removeEventListener('jinmemo-checkout-gifts',open);
 },[]);
 const [pickup,setPickup]=useState('');
 const locations=catalog.pickupCounters||[];
 const pickupCounterId=locations.find(location=>location.id===pickup)?.id||locations[0]?.id;
 const request=useRef<{key:string;id:string}|null>(null);
 const lines=catalog.items.filter(item=>counts[item.id]>0);
 const subtotal=lines.reduce((sum,item)=>sum+item.price*counts[item.id],0),fee=delivery?catalog.shippingFee:0;
 return <main className="section gift-shop" id="main">
  <h1 ref={heading}>Quà lưu niệm</h1><p>Quà handmade · Nhận tại quầy hoặc giao trong Việt Nam</p>
  {!code&&checkout&&<div className="gift-view-actions"><button type="button" className="outline-button" disabled={busy} onClick={()=>showCheckout(false)}>← Xem sản phẩm</button></div>}
  {code?<p role="status">Đã đặt hàng. Mã đơn <strong>{code}</strong>. JinMemo sẽ liên hệ để xác nhận.</p>:<form onSubmit={async event=>{
   event.preventDefault();if(!checkout||!receiving||!lines.length||busy||delivery&&!address)return;
   const form=new FormData(event.currentTarget);
   const order={fulfillment:delivery?'DELIVERY':'PICKUP',name:String(form.get('name')),phone:String(form.get('phone')),address:delivery?address:'',...(!delivery&&pickupCounterId?{pickupCounterId}:{}),expectedTotal:subtotal+fee,lines:lines.map(item=>({id:item.id,quantity:counts[item.id]}))};
   const key=JSON.stringify(order);
   if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};
   setBusy(true);setError('');
   try{
    const res=await fetch('/api/v1/gifts',{method:'POST',headers:{'Content-Type':'application/json','X-JinMemo-Gifts':'1'},body:JSON.stringify({...order,requestId:request.current.id})});
    const result=await res.json();
    if(!res.ok)throw new Error(result.message||'Chưa đặt được quà.');
    updateGiftCart(current=>{
     const next={...current};
     for(const line of order.lines){
      const remaining=(next[line.id]?.quantity||0)-line.quantity;
      if(remaining>0)next[line.id]={...next[line.id],quantity:remaining};
      else delete next[line.id];
     }
     return next;
    });
    setCode(result.code);
   }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }}>
   <fieldset disabled={busy} className={checkout?'gift-layout':'gift-browse'}>
    <section className="gift-products" aria-label="Sản phẩm">
     {(checkout?lines:catalog.items).map(item=>{
      const quantity=counts[item.id]||0;
      const adjust=(amount:number)=>updateGiftCart(current=>{
       if(!current[item.id]&&Object.keys(current).length>=20)return current;
       const next={...current};
       const quantity=Math.max(0,Math.min(item.stock,50,Math.min(item.stock,current[item.id]?.quantity||0)+amount));
       if(quantity)next[item.id]={name:item.name,quantity};
       else delete next[item.id];
       return next;
      });
      return <article className="gift-product" key={item.id}>
       {item.imageId?<img src={'/api/v1/media/'+item.imageId} alt={item.name} width={240} height={180} loading="lazy"/>:<div className="gift-placeholder" aria-hidden="true">✦</div>}
       <div className="gift-product-copy">
        <h2>{item.name}</h2>{item.description&&<p>{item.description}</p>}
        <strong>{giftMoney(item.price)}</strong>
        <small>{item.stock?'Còn '+item.stock+' sản phẩm':'Hết hàng'}</small>
        {checkout?<div className="package-stepper gift-stepper">
         <button type="button" aria-label={'Giảm '+item.name} disabled={!quantity} onClick={()=>adjust(-1)}>−</button>
         <output aria-label={'Số lượng '+item.name}>{quantity}</output>
         <button type="button" aria-label={'Thêm '+item.name} disabled={quantity>=Math.min(item.stock,50)||(!gifts[item.id]&&Object.keys(gifts).length>=20)} onClick={()=>adjust(1)}>+</button>
        </div>:<div className="gift-select"><button type="button" className="button" disabled={!item.stock||(!gifts[item.id]&&Object.keys(gifts).length>=20)} onClick={()=>{
         if(!quantity)adjust(1);
         showCheckout(true);
        }}>{item.stock?'Chọn':'Hết hàng'}</button>
         <button type="button" className="gift-add-to-cart" title="Thêm vào giỏ" aria-label={'Thêm '+item.name+' vào giỏ'} disabled={quantity>=Math.min(item.stock,50)||(!gifts[item.id]&&Object.keys(gifts).length>=20)} onClick={()=>adjust(1)}>
          <CartIcon/> Thêm vào giỏ
         </button>
        </div>}
       </div>
      </article>;
     })}
     {!catalog.items.length&&<p>Quà lưu niệm đang được cập nhật.</p>}
    </section>
    {checkout&&<aside className="gift-checkout" aria-label="Đơn hàng của bạn">
     <h2>Đơn hàng của bạn</h2>
     {!lines.length?<p>Chọn sản phẩm để bắt đầu đặt hàng.</p>:<>
      <ul className="gift-order-lines">{lines.map(item=><li key={item.id}><span>{item.name} × {counts[item.id]}</span><strong>{giftMoney(item.price*counts[item.id])}</strong></li>)}</ul>
      {!receiving?<><p>Tiền hàng <strong>{giftMoney(subtotal)}</strong></p>
       <button type="button" className="button" onClick={()=>setReceiving(true)}>Thanh toán</button></>:<section>
       <h3 ref={receiveHeading} tabIndex={-1} className="gift-receive-heading">Thông tin nhận hàng</h3>
      <fieldset className="gift-fulfillment"><legend>Hình thức nhận hàng</legend>
       <label><input type="radio" name="fulfillment" checked={!delivery} onChange={()=>{setDelivery(false);setAddress('');}}/> Nhận tại quầy</label>
       <label><input type="radio" name="fulfillment" checked={delivery} onChange={()=>setDelivery(true)}/> Giao trong Việt Nam</label>
      </fieldset>
      <div className="gift-contact">
       <label>Họ tên <input name="name" required minLength={2} maxLength={120} autoComplete="name"/></label>
       <label>Số điện thoại <input name="phone" type="tel" required maxLength={25} autoComplete="tel"/></label>
       {delivery?<GiftAddress onChange={setAddress}/>:<PickupCounter locations={locations} id={pickup} onChange={setPickup}/>}
      </div>
      <dl className="gift-totals"><div><dt>Tiền hàng</dt><dd>{giftMoney(subtotal)}</dd></div><div><dt>Phí giao</dt><dd>{giftMoney(fee)}</dd></div><div><dt>Tổng cộng</dt><dd>{giftMoney(subtotal+fee)}</dd></div></dl>
      <p>Thanh toán khi nhận hàng</p>
      {error&&<p role="alert">{error}</p>}
      <button className="button" disabled={busy||delivery&&!address}>{busy?'Đang đặt…':'Đặt hàng'}</button>
      </section>}
     </>}
    </aside>}
   </fieldset>
  </form>}
 </main>;
}
