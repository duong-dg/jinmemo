'use client';
import {useRef,useState} from 'react';

export type GiftItem={id:string;name:string;description:string;imageId?:string;price:number;stock:number;active:boolean};
export type GiftConfig={enabled:boolean;shippingFee:number;items:GiftItem[]};
export const giftMoney=(n:number)=>n.toLocaleString('vi-VN')+' đ';

export function GiftShop({catalog}:{catalog:GiftConfig}){
 const [counts,setCounts]=useState<Record<string,number>>({}),[delivery,setDelivery]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[code,setCode]=useState('');
 const request=useRef<{key:string;id:string}|null>(null);
 const lines=catalog.items.filter(item=>counts[item.id]>0);
 const subtotal=lines.reduce((sum,item)=>sum+item.price*counts[item.id],0),fee=delivery?catalog.shippingFee:0;
 return <main className="section" id="main">
  <h1>Quà lưu niệm</h1><p>Quà handmade · Nhận tại quầy hoặc giao trong Việt Nam</p>
  {code?<p role="status">Đã đặt quà. Mã đơn <strong>{code}</strong>. JinMemo sẽ liên hệ để xác nhận.</p>:<form onSubmit={async event=>{
   event.preventDefault();if(!lines.length||busy)return;
   const form=new FormData(event.currentTarget);
   const order={fulfillment:delivery?'DELIVERY':'PICKUP',name:String(form.get('name')),phone:String(form.get('phone')),address:delivery?String(form.get('address')):'',expectedTotal:subtotal+fee,lines:lines.map(item=>({id:item.id,quantity:counts[item.id]}))};
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
   <fieldset disabled={busy} style={{border:0,padding:0}}>
    <div className="cards">{catalog.items.map(item=><article className="card" key={item.id}>
     {item.imageId&&<img src={'/api/v1/media/'+item.imageId} alt={item.name} width={300} height={200} loading="lazy"/>}
     <h2>{item.name}</h2><p>{item.description}</p><strong>{giftMoney(item.price)}</strong>
     <p>{item.stock?'Còn '+item.stock:'Hết hàng'}</p>
     <label>Số lượng <input type="number" min={0} max={Math.min(item.stock,50)} value={counts[item.id]||0} disabled={!item.stock} onChange={e=>setCounts({...counts,[item.id]:Number(e.target.value)})}/></label>
    </article>)}</div>
    {!catalog.items.length&&<p>Quà lưu niệm đang được cập nhật.</p>}
    {!!lines.length&&<section>
     <h2>Thông tin nhận quà</h2>
     <label>Hình thức <select value={delivery?'delivery':'pickup'} onChange={e=>setDelivery(e.target.value==='delivery')}><option value="pickup">Nhận tại quầy</option><option value="delivery">Giao trong Việt Nam</option></select></label>
     <label>Họ tên <input name="name" required minLength={2} maxLength={120}/></label>
     <label>Số điện thoại <input name="phone" type="tel" required maxLength={25}/></label>
     {delivery&&<label>Địa chỉ nhận tại Việt Nam <textarea name="address" required minLength={8} maxLength={500}/></label>}
     <p>Tiền quà {giftMoney(subtotal)} · Phí giao {giftMoney(fee)}</p>
     <p><strong>Tổng cộng {giftMoney(subtotal+fee)}</strong> · Thanh toán khi nhận</p>
     <button className="button" disabled={busy}>{busy?'Đang đặt…':'Đặt quà'}</button>
    </section>}
   </fieldset>
   {error&&<p role="alert">{error}</p>}
  </form>}
 </main>;
}
