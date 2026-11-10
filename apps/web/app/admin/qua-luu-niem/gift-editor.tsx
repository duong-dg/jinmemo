'use client';
import {useEffect,useState} from 'react';
import {adminApi} from '../shared/admin-api';
import {ImageField} from '../shared/media-picker';
import {giftMoney,type GiftConfig,type GiftItem} from '../../qua-luu-niem/shop';

type Config=GiftConfig&{version:number};
type GiftOrder={id:string;code:string;status:string;data:{name:string;phone:string;address:string;fulfillment:string;total:number;shippingFee:number;lines:{id:string;name:string;quantity:number}[]}};
const labels:Record<string,string>={PENDING:'Chờ xử lý',SHIPPING:'Đang giao',COMPLETED:'Đã giao / nhận',CANCELLED:'Đã hủy'};
export function GiftEditor({view='products'}:{view?:'products'|'orders'}){
 const [config,setConfig]=useState<Config>(),[orders,setOrders]=useState<GiftOrder[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function run(action:()=>Promise<void>){
  setBusy(true);setError('');setNotice('');
  try{await action();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function load(){const data=await adminApi('gifts');setConfig(data.config);setOrders(data.data);}
 useEffect(()=>{void run(load);},[]);
 function patch(id:string,values:Partial<GiftItem>){setConfig(old=>old&&({...old,items:old.items.map(item=>item.id===id?{...item,...values}:item)}));}
 return <section>
  {error&&<p className="admin-error" role="alert">{error}</p>}
  {notice&&<p className="admin-success" role="status">{notice}</p>}
  {view==='products'&&config&&<form onSubmit={e=>{e.preventDefault();void run(async()=>{setConfig(await adminApi('gifts',config));setNotice('Đã lưu quà lưu niệm.');});}}>
   <fieldset className="config-card" disabled={busy}>
    <label className="checkbox-label"><input type="checkbox" checked={config.enabled} onChange={e=>setConfig({...config,enabled:e.target.checked})}/> Mở bán quà lưu niệm</label>
    <label>Phí giao chung mỗi đơn trong Việt Nam (VND)<input type="number" min={0} max={10000000} required value={config.shippingFee} onChange={e=>setConfig({...config,shippingFee:Number(e.target.value)})}/></label>
    <p className="admin-hint">Nhận tại quầy miễn phí. Số lượng còn bán tự giảm khi có đơn.</p>
    {config.items.map(item=><details className="config-card" key={item.id}>
     <summary>{item.name} · {giftMoney(item.price)} · Còn {item.stock}</summary>
     <div className="field-grid">
      <label>Tên món quà<input required maxLength={150} value={item.name} onChange={e=>patch(item.id,{name:e.target.value})}/></label>
      <label>Giá bán (VND)<input type="number" min={1} max={100000000} required value={item.price} onChange={e=>patch(item.id,{price:Number(e.target.value)})}/></label>
      <label>Số lượng còn bán<input type="number" min={0} required value={item.stock} onChange={e=>patch(item.id,{stock:Number(e.target.value)})}/></label>
      <label>Mô tả<textarea maxLength={2000} value={item.description} onChange={e=>patch(item.id,{description:e.target.value})}/></label>
     </div>
     <ImageField label="Ảnh món quà" value={item.imageId?{id:item.imageId,alt:item.name}:null} onChange={image=>patch(item.id,{imageId:image?.id})}/>
     <label className="checkbox-label"><input type="checkbox" checked={item.active} onChange={e=>patch(item.id,{active:e.target.checked})}/> Hiện sản phẩm</label>
    </details>)}
    <button type="button" className="outline-button" disabled={config.items.length>=200} onClick={()=>setConfig({...config,items:[{id:crypto.randomUUID(),name:'Món quà mới',description:'',price:50000,stock:0,active:false},...config.items]})}>Thêm sản phẩm</button>
    <button className="button" type="submit">Lưu sản phẩm và thiết lập</button>
    <button type="button" className="outline-button" onClick={()=>{if(window.confirm('Tải lại bảng và bỏ các thay đổi chưa lưu?'))void run(load);}}>Tải lại</button>
   </fieldset>
  </form>}
  {view==='orders'&&<><h2>Đơn bán quà lưu niệm</h2>
  {!orders.length&&<p>Chưa có đơn.</p>}
  {orders.map(order=><details key={order.id} className="config-card">
   <summary>{order.code} · {order.data.name} · {giftMoney(order.data.total)} · {labels[order.status]}</summary>
   <p>{order.data.phone} · {order.data.fulfillment==='DELIVERY'?'Giao hàng trong Việt Nam':'Nhận tại quầy'}</p>
   {order.data.address&&<p>{order.data.address}</p>}
   <ul>{order.data.lines.map(line=><li key={line.id}>{line.name} × {line.quantity}</li>)}</ul>
   <p>Phí giao {giftMoney(order.data.shippingFee)}</p>
   {!['COMPLETED','CANCELLED'].includes(order.status)&&<div className="transport-toolbar">
    {(order.data.fulfillment==='DELIVERY'&&order.status==='PENDING'?['SHIPPING','COMPLETED','CANCELLED']:['COMPLETED','CANCELLED']).map(status=><button key={status} type="button" className="outline-button" disabled={busy} onClick={()=>{
     if(!window.confirm('Chuyển đơn '+order.code+' sang '+labels[status]+'?'))return;
     void run(async()=>{await adminApi('gifts/orders/'+order.id,{status});const data=await adminApi('gifts');setOrders(data.data);if(status==='CANCELLED')setNotice('Đã hủy và trả hàng về kho. Tải lại trước khi sửa tồn kho.');});
    }}>{labels[status]}</button>)}
   </div>}
  </details>)}</>}
 </section>;
}
