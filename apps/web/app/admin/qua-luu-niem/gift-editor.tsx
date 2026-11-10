'use client';
import {useEffect,useRef,useState} from 'react';
import {adminApi} from '../shared/admin-api';
import {ImageField} from '../shared/media-picker';
import {areaSearchText} from '../../../lib/ride-area-search';
import './gift-admin.css';
import {giftMoney,type GiftConfig} from '../../qua-luu-niem/shop';

type Config=GiftConfig&{version:number};
type GiftOrder={id:string;code:string;status:string;data:{name:string;phone:string;address:string;fulfillment:string;total:number;shippingFee:number;lines:{id:string;name:string;quantity:number}[]}};
const labels:Record<string,string>={PENDING:'Chờ xử lý',SHIPPING:'Đang giao',COMPLETED:'Đã giao / nhận',CANCELLED:'Đã hủy'};
export function GiftEditor({view='products'}:{view?:'products'|'orders'|'settings'}){
 const [config,setConfig]=useState<Config>(),[orders,setOrders]=useState<GiftOrder[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const dialog=useRef<HTMLDialogElement>(null);
 const [query,setQuery]=useState(''),[editing,setEditing]=useState(false);
 const search=areaSearchText(query);
 const visibleItems=config?.items.filter(row=>areaSearchText(row.name+' '+row.description).includes(search))||[];
 function openEditor(){setError('');setNotice('');setEditing(true);dialog.current?.showModal();}
 const [draft,setDraft]=useState({id:'',name:'',description:'',price:'',stock:'',imageId:undefined as string|undefined,active:false});
 const [shippingFee,setShippingFee]=useState(''),[enabled,setEnabled]=useState(false);
 const product= draft.id ? config?.items.find(item=>item.id===draft.id) : undefined;
 const valid=!!draft.name.trim()&&draft.price!==''&&draft.stock!==''&&Number.isInteger(Number(draft.price))&&Number(draft.price)>0&&Number(draft.price)<=100000000&&Number.isSafeInteger(Number(draft.stock))&&Number(draft.stock)>=0;
 const item={...draft,name:draft.name.trim(),price:Number(draft.price),stock:Number(draft.stock)};
 const dirty=!product||(['name','description','price','stock','active','imageId'] as const).some(key=>product[key]!==item[key]);
 function reset(){setDraft({id:'',name:'',description:'',price:'',stock:'',imageId:undefined,active:false});}
 async function run(action:()=>Promise<void>){
  setBusy(true);setError('');setNotice('');
  try{await action();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function load(){const data=await adminApi('gifts');setConfig(data.config);setOrders(data.data);setShippingFee(String(data.config.shippingFee));setEnabled(data.config.enabled);}
 useEffect(()=>{void run(load);},[]);
 return <section>
  {error&&!editing&&<p className="admin-error" role="alert">{error}</p>}
  {notice&&<p className="admin-success" role="status">{notice}</p>}
  {view==='products'&&config&&<>
   <div className="gift-admin-toolbar">
    <label>Tìm sản phẩm<input type="search" placeholder="Tên hoặc mô tả sản phẩm…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <button type="button" className="button" disabled={busy||config.items.length>=200} onClick={()=>{reset();openEditor();}}>Thêm sản phẩm</button>
   </div>
   <div className="gift-admin-table">
    <table>
     <thead><tr><th scope="col">Sản phẩm</th><th scope="col">Giá bán</th><th scope="col">Còn bán</th><th scope="col">Hiển thị</th><th scope="col">Thao tác</th></tr></thead>
     <tbody>{visibleItems.map(row=><tr key={row.id}>
      <td><strong>{row.name}</strong></td><td>{giftMoney(row.price)}</td><td>{row.stock}</td><td>{row.active?'Đang hiện':'Đang ẩn'}</td>
      <td><button className="outline-button" type="button" aria-label={'Sửa '+row.name} disabled={busy} onClick={()=>{
       setDraft({...row,price:String(row.price),stock:String(row.stock),imageId:row.imageId});
       openEditor();
      }}>Sửa</button></td>
     </tr>)}</tbody>
    </table>
    {!visibleItems.length&&<p>{search?'Không tìm thấy sản phẩm phù hợp.':'Chưa có sản phẩm.'}</p>}
   </div>
   <dialog ref={dialog} className="gift-admin-dialog" aria-labelledby="gift-editor-title" onCancel={e=>{if(busy)e.preventDefault();}} onClose={()=>{setEditing(false);setError('');reset();}}>
   <form onSubmit={e=>{
    e.preventDefault();if(!valid||!dirty||busy||(!draft.id&&config.items.length>=200))return;
    void run(async()=>{
     const saved={...item,id:draft.id||crypto.randomUUID()};
     const items=draft.id?config.items.map(row=>row.id===saved.id?saved:row):[saved,...config.items];
     setConfig(await adminApi('gifts',{...config,items}));dialog.current?.close();setNotice('Đã lưu sản phẩm.');
    });
   }}>
    <fieldset className="config-card" disabled={busy}>
     <h2 id="gift-editor-title">{draft.id?'Sửa sản phẩm':'Thêm sản phẩm'}</h2>
     <div className="field-grid">
      <label>Tên sản phẩm<input required maxLength={150} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
      <label>Giá bán (VND)<input type="number" min={1} max={100000000} required value={draft.price} onChange={e=>setDraft({...draft,price:e.target.value})}/></label>
      <label>Số lượng còn bán<input type="number" min={0} required value={draft.stock} onChange={e=>setDraft({...draft,stock:e.target.value})}/></label>
      <label>Mô tả<textarea maxLength={2000} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
     </div>
     <ImageField label="Ảnh sản phẩm" value={draft.imageId?{id:draft.imageId,alt:draft.name}:null} onChange={image=>setDraft({...draft,imageId:image?.id})}/>
     <label className="checkbox-label"><input type="checkbox" checked={draft.active} onChange={e=>setDraft({...draft,active:e.target.checked})}/> Hiện sản phẩm</label>
     {error&&<p className="admin-error" role="alert">{error}</p>}
     <div className="gift-admin-actions"><button className="button" disabled={!valid||!dirty||(!draft.id&&config.items.length>=200)}>{draft.id?'Lưu thay đổi':'Thêm sản phẩm'}</button>
     <button className="outline-button" type="button" onClick={()=>dialog.current?.close()}>Hủy</button></div>
    </fieldset>
   </form>
   </dialog>
  </>}
  {view==='settings'&&config&&<form onSubmit={e=>{
   e.preventDefault();if(!e.currentTarget.reportValidity()||busy||(!shippingFee.trim()||enabled===config.enabled&&Number(shippingFee)===config.shippingFee))return;
   void run(async()=>{setConfig(await adminApi('gifts',{...config,enabled,shippingFee:Number(shippingFee)}));setNotice('Đã lưu thiết lập giao hàng.');});
  }}>
   <fieldset className="config-card" disabled={busy}>
    <h2>Thiết lập giao hàng</h2>
    <label className="checkbox-label"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Mở bán quà lưu niệm</label>
    <label>Phí giao mỗi đơn trong Việt Nam (VND)<input type="number" min={0} max={10000000} step={1} required value={shippingFee} onChange={e=>setShippingFee(e.target.value)}/></label>
    <p className="admin-hint">Nhận tại quầy miễn phí.</p>
    <button className="button" disabled={!shippingFee.trim()||!Number.isInteger(Number(shippingFee))||Number(shippingFee)<0||Number(shippingFee)>10000000||enabled===config.enabled&&Number(shippingFee)===config.shippingFee}>Lưu thiết lập</button>
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
     void run(async()=>{await adminApi('gifts/orders/'+order.id,{status});const data=await adminApi('gifts');setOrders(data.data);if(status==='CANCELLED')setNotice('Đã hủy và trả hàng về kho.');});
    }}>{labels[status]}</button>)}
   </div>}
  </details>)}</>}
 </section>;
}
