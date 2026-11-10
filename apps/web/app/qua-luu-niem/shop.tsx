'use client';
import {useRef,useState} from 'react';
import './shop.css';
import {GiftAddress} from './gift-address';

export type GiftItem={id:string;name:string;description:string;imageId?:string;price:number;stock:number;active:boolean};
export type GiftConfig={enabled:boolean;shippingFee:number;items:GiftItem[]};
export const giftMoney=(n:number)=>n.toLocaleString('vi-VN')+' đ';

export function GiftShop({catalog}:{catalog:GiftConfig}){
 const [counts,setCounts]=useState<Record<string,number>>({}),[delivery,setDelivery]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[code,setCode]=useState('');
 const [address,setAddress]=useState(''),[checkout,setCheckout]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null);
 function showCheckout(open:boolean){setCheckout(open);heading.current?.scrollIntoView({block:'start'});}
 const request=useRef<{key:string;id:string}|null>(null);
 const lines=catalog.items.filter(item=>counts[item.id]>0);
 const subtotal=lines.reduce((sum,item)=>sum+item.price*counts[item.id],0),fee=delivery?catalog.shippingFee:0;
 return <main className="section gift-shop" id="main">
  <h1 ref={heading}>Quà lưu niệm</h1><p>Quà handmade · Nhận tại quầy hoặc giao trong Việt Nam</p>
  {!code&&<div className="gift-view-actions">
   {checkout?<button type="button" className="outline-button" disabled={busy} onClick={()=>showCheckout(false)}>← Xem sản phẩm</button>:!!lines.length&&<button type="button" className="button" onClick={()=>showCheckout(true)}>Xem giỏ ({lines.reduce((sum,item)=>sum+counts[item.id],0)})</button>}
  </div>}
  {code?<p role="status">Đã đặt hàng. Mã đơn <strong>{code}</strong>. JinMemo sẽ liên hệ để xác nhận.</p>:<form onSubmit={async event=>{
   event.preventDefault();if(!checkout||!lines.length||busy||delivery&&!address)return;
   const form=new FormData(event.currentTarget);
   const order={fulfillment:delivery?'DELIVERY':'PICKUP',name:String(form.get('name')),phone:String(form.get('phone')),address:delivery?address:'',expectedTotal:subtotal+fee,lines:lines.map(item=>({id:item.id,quantity:counts[item.id]}))};
   const key=JSON.stringify(order);
   if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};
   setBusy(true);setError('');
   try{
    const res=await fetch('/api/v1/gifts',{method:'POST',headers:{'Content-Type':'application/json','X-JinMemo-Gifts':'1'},body:JSON.stringify({...order,requestId:request.current.id})});
    const result=await res.json();
    if(!res.ok)throw new Error(result.message||'Chưa đặt được quà.');
    setCode(result.code);
   }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }}>
   <fieldset disabled={busy} className={checkout?'gift-layout':'gift-browse'}>
    <section className="gift-products" aria-label="Sản phẩm">
     {(checkout?lines:catalog.items).map(item=>{
      const quantity=counts[item.id]||0;
      const adjust=(amount:number)=>setCounts(old=>({...old,[item.id]:Math.max(0,Math.min(Math.min(item.stock,50),(old[item.id]||0)+amount))}));
      return <article className="gift-product" key={item.id}>
       {item.imageId?<img src={'/api/v1/media/'+item.imageId} alt={item.name} width={240} height={180} loading="lazy"/>:<div className="gift-placeholder" aria-hidden="true">✦</div>}
       <div className="gift-product-copy">
        <h2>{item.name}</h2>{item.description&&<p>{item.description}</p>}
        <strong>{giftMoney(item.price)}</strong>
        <small>{item.stock?'Còn '+item.stock+' sản phẩm':'Hết hàng'}</small>
        {checkout?<div className="package-stepper gift-stepper">
         <button type="button" aria-label={'Giảm '+item.name} disabled={!quantity} onClick={()=>adjust(-1)}>−</button>
         <output aria-label={'Số lượng '+item.name}>{quantity}</output>
         <button type="button" aria-label={'Thêm '+item.name} disabled={quantity>=Math.min(item.stock,50)||(!quantity&&lines.length>=20)} onClick={()=>adjust(1)}>+</button>
        </div>:<button type="button" className="button gift-select" disabled={!item.stock||(!quantity&&lines.length>=20)} onClick={()=>{
         if(!quantity)adjust(1);
         showCheckout(true);
        }}>{quantity?'Đã chọn · Xem giỏ':item.stock?'Chọn sản phẩm':'Hết hàng'}</button>}
       </div>
      </article>;
     })}
     {!catalog.items.length&&<p>Quà lưu niệm đang được cập nhật.</p>}
    </section>
    {checkout&&<aside className="gift-checkout" aria-label="Đơn hàng của bạn">
     <h2>Đơn hàng của bạn</h2>
     {!lines.length?<p>Chọn sản phẩm để bắt đầu đặt hàng.</p>:<>
      <ul className="gift-order-lines">{lines.map(item=><li key={item.id}><span>{item.name} × {counts[item.id]}</span><strong>{giftMoney(item.price*counts[item.id])}</strong></li>)}</ul>
      <fieldset className="gift-fulfillment"><legend>Hình thức nhận hàng</legend>
       <label><input type="radio" name="fulfillment" checked={!delivery} onChange={()=>{setDelivery(false);setAddress('');}}/> Nhận tại quầy</label>
       <label><input type="radio" name="fulfillment" checked={delivery} onChange={()=>setDelivery(true)}/> Giao trong Việt Nam</label>
      </fieldset>
      <div className="gift-contact">
       <label>Họ tên <input name="name" required minLength={2} maxLength={120} autoComplete="name"/></label>
       <label>Số điện thoại <input name="phone" type="tel" required maxLength={25} autoComplete="tel"/></label>
       {delivery&&<GiftAddress onChange={setAddress}/>}
      </div>
      <dl className="gift-totals"><div><dt>Tiền hàng</dt><dd>{giftMoney(subtotal)}</dd></div><div><dt>Phí giao</dt><dd>{giftMoney(fee)}</dd></div><div><dt>Tổng cộng</dt><dd>{giftMoney(subtotal+fee)}</dd></div></dl>
      <p>Thanh toán khi nhận hàng</p>
      {error&&<p role="alert">{error}</p>}
      <button className="button" disabled={busy||delivery&&!address}>{busy?'Đang đặt…':'Đặt hàng'}</button>
     </>}
    </aside>}
   </fieldset>
  </form>}
 </main>;
}
