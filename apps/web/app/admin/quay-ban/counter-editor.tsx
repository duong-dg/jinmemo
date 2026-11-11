'use client';
import {useEffect,useState} from 'react';
import {adminApi} from '../shared/admin-api';
type Counter={id:string;name:string;nameEn?:string;address?:string;addressEn?:string;status:'ACTIVE'|'ARCHIVED';version:number};
const empty=():Counter=>({id:'',name:'',nameEn:'',address:'',addressEn:'',status:'ACTIVE',version:0});
export function CounterEditor(){
 const [rows,setRows]=useState<Counter[]>([]),[draft,setDraft]=useState<Counter|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{adminApi('counters').then(result=>setRows(result.data)).catch(e=>setError(e.message));},[]);
 return <section className="config-card"><button className="button" disabled={busy} onClick={()=>{setDraft(empty());setNotice('');}}>Thêm quầy bán</button>
 <div style={{overflowX:'auto',marginTop:20}}><table style={{width:'100%',textAlign:'left'}}><thead><tr><th>Quầy bán</th><th>Địa chỉ · Việt / English</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{row.name}<small style={{display:'block'}}>{row.nameEn}</small></td><td>{row.address||'Chưa nhập'}<small style={{display:'block'}}>{row.addressEn}</small></td><td>{row.status==='ACTIVE'?'Đang hoạt động':'Đã lưu trữ'}</td><td><button className="outline-button" disabled={busy} onClick={()=>{setDraft({...row});setNotice('');}}>Sửa</button></td></tr>)}</tbody></table></div>
 {draft&&<form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');setNotice('');try{await adminApi('counters',{...draft,id:draft.id||crypto.randomUUID()});setRows((await adminApi('counters')).data);setDraft(null);setNotice('Đã lưu quầy bán.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><fieldset disabled={busy} className="config-card"><h2>{draft.id?'Sửa quầy bán':'Tạo quầy bán'}</h2><div className="field-grid">
 <label>Tên quầy · Tiếng Việt<input required maxLength={100} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
 <label>Tên quầy · English<input maxLength={100} value={draft.nameEn||''} onChange={e=>setDraft({...draft,nameEn:e.target.value})}/></label>
 <label>Địa chỉ · Tiếng Việt<textarea maxLength={500} value={draft.address||''} onChange={e=>setDraft({...draft,address:e.target.value})}/></label>
 <label>Địa chỉ · English<textarea maxLength={500} value={draft.addressEn||''} onChange={e=>setDraft({...draft,addressEn:e.target.value})}/></label>
 <label>Trạng thái<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as Counter['status']})}><option value="ACTIVE">Đang hoạt động</option><option value="ARCHIVED">Lưu trữ</option></select></label></div>
 <p className="admin-hint">Địa chỉ dùng cho khách nhận quà tại quầy. Bản Anh chưa điền sẽ dùng bản Việt. Chốt ca đang mở trước khi lưu trữ quầy.</p>
 <button className="button">Lưu quầy bán</button> <button type="button" className="outline-button" onClick={()=>setDraft(null)}>Đóng</button></fieldset></form>}
 {error&&<p role="alert" className="admin-error">{error}</p>}{notice&&<p role="status" className="admin-success">{notice}</p>}</section>;
}
