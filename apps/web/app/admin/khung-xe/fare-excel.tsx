'use client';
import {useRef,useState} from 'react';
import type {Plan,Fare} from './plan-model';
import {areaPath,fareColumns,fareRows,mergeFareRows} from '../../../lib/fare-excel';

export function FareExcel({plan,disabled,onChange}:{plan:Plan;disabled:boolean;onChange:(fares:Fare[])=>void}){
 const input=useRef<HTMLInputElement>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [preview,setPreview]=useState<{source:Plan;fares:Fare[];added:number;updated:number}>();
 async function download(){setBusy(true);setError('');try{
  const {Workbook}=(await import('exceljs')).default;const book=new Workbook(),sheet=book.addWorksheet('Gia tuyen');
  const columns=fareColumns(plan);sheet.addRow(columns.map(c=>c.label));sheet.addRow(columns.map(c=>c.key));sheet.getRow(2).hidden=true;
  fareRows(plan).forEach(row=>sheet.addRow(row));
  sheet.views=[{state:'frozen',ySplit:2,xSplit:2}];sheet.autoFilter={from:{row:1,column:1},to:{row:Math.max(sheet.rowCount,3),column:columns.length}};
  sheet.columns.forEach((column,i)=>{column.width=i<2?36:i<4?22:24;});
  sheet.getRow(1).height=36;sheet.getRow(1).eachCell(cell=>{cell.font={bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF245243'}};cell.alignment={vertical:'middle',wrapText:true};});
  for(let n=3;n<=sheet.rowCount;n++)sheet.getRow(n).eachCell((cell,i)=>{if(i>4&&(i-5)%4<2)cell.numFmt='#,##0';});
  const areas=book.addWorksheet('Khu vuc');areas.addRow(['Khu vực dùng cho Nơi đi / Nơi đến']);plan.areas.forEach(a=>areas.addRow([areaPath(plan,a.id)]));areas.getColumn(1).width=65;areas.views=[{state:'frozen',ySplit:1}];
  const help=book.addWorksheet('Huong dan');[
   'Sửa sheet Gia tuyen rồi nhập lại vào JinMemo. Giữ nguyên hàng tiêu đề và hàng mã ẩn số 2.',
   'Mỗi tuyến một dòng, mỗi loại xe có 4 cột: giá, giá khứ hồi, chỉ khứ hồi và thời gian (phút).',
   'Nơi đi / Nơi đến: sao chép tên đầy đủ từ sheet Khu vuc. Các ô chọn nhập 1 (có) hoặc 0 (không).',
   'Cho phép xe ghép = 1: tuyến nhận ghép online. Để 0 nếu chỉ chạy xe riêng.',
   'Giá chiều ngược = cùng giá cho A đến B và B đến A; không có nghĩa là khứ hồi.',
   'Chỉ khứ hồi = 1: cột giá chính là giá trọn 2 chiều trong ngày. Nếu = 0, giá chính là một chiều; giá khứ hồi nhập riêng nếu có.',
   'Giá tính bằng VND, nhập số nguyên. Ô giá chính trống giữ giá cũ, 0 ngừng bán. Tuyến không có trong file vẫn được giữ.',
   'Khi điền giá chính, các cột thiết lập cùng xe sẽ được cập nhật: ô giá khứ hồi/thời gian trống bỏ thiết lập đó.',
   'File nhập chỉ cập nhật bản đang sửa. Xem trước, Áp dụng rồi bấm Lưu giá tuyến để lưu lên hệ thống.'
  ].forEach(text=>help.addRow([text]));help.getColumn(1).width=110;help.eachRow(row=>{row.height=36;row.alignment={wrapText:true,vertical:'middle'};});
  const buffer=await book.xlsx.writeBuffer();const url=URL.createObjectURL(new Blob([buffer as unknown as ArrayBuffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=document.createElement('a');a.href=url;a.download='JinMemo-gia-tuyen.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function upload(file:File){setBusy(true);setError('');setNotice('');setPreview(undefined);try{
  if(!file.name.toLowerCase().endsWith('.xlsx')||file.size>3*1024*1024)throw new Error('Chọn file .xlsx tối đa 3 MB.');
  const {Workbook}=(await import('exceljs')).default;const book=new Workbook();await book.xlsx.load(await file.arrayBuffer());const sheet=book.getWorksheet('Gia tuyen');if(!sheet)throw new Error('Không thấy sheet Gia tuyen. Hãy xuất file từ JinMemo để làm mẫu.');
  if(sheet.rowCount>302||sheet.columnCount>84)throw new Error('File vượt giới hạn 300 tuyến hoặc 20 loại xe.');
  function value(row:number,col:number):string|number|boolean|null{const cell=sheet!.getCell(row,col);if(cell.type===6||cell.formula)throw new Error(`Dòng ${row}: không dùng công thức trong file nhập; dán giá trị thay thế.`);const v=cell.value;if(v===null||typeof v==='string'||typeof v==='number'||typeof v==='boolean')return v;if(typeof v==='object'&&'richText'in v)return v.richText.map(t=>t.text).join('');throw new Error(`Dòng ${row}: ô dữ liệu không hợp lệ.`);}
  const count=sheet.getRow(2).cellCount;const keys=Array.from({length:count},(_,i)=>String(value(2,i+1)??''));
  const rows=Array.from({length:Math.max(0,sheet.rowCount-2)},(_,i)=>keys.map((_,col)=>value(i+3,col+1)));
  const result=mergeFareRows(plan,keys,rows,()=>crypto.randomUUID());if(!result.added&&!result.updated)throw new Error('File chưa có giá để nhập.');setPreview({source:plan,...result});
 }catch(e){setError((e as Error).message);}finally{setBusy(false);if(input.current)input.current.value='';}}
 return <div className="config-card"><div className="planner-toolbar"><button type="button" className="outline-button" disabled={disabled||busy} onClick={()=>void download()}>Xuất Excel / tải mẫu</button><button type="button" className="outline-button" disabled={disabled||busy} onClick={()=>input.current?.click()}>{busy?'Đang xử lý…':'Nhập Excel'}</button><input ref={input} type="file" hidden accept=".xlsx" onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);}}/></div><p className="admin-hint">Xuất bảng giá, sửa trong Excel rồi nhập lại. Tuyến không có trong file vẫn được giữ. Nhập chỉ cập nhật bản đang sửa; bấm Lưu giá tuyến sau khi kiểm tra.</p>
 {preview&&<div><p><strong>{preview.added} giá xe mới · {preview.updated} giá xe cập nhật</strong> · Tổng {preview.fares.length} giá xe sau khi nhập.</p>{preview.source!==plan?<p className="admin-error">Bảng đã thay đổi. Nhập lại file để kiểm tra dữ liệu mới nhất.</p>:<><div className="planner-sheet"><table><thead><tr><th>Nơi đi → đến</th><th>Loại xe</th><th>Giá (VND)</th><th>Khứ hồi</th></tr></thead><tbody>{preview.fares.filter(f=>!plan.fares.some(old=>JSON.stringify(old)===JSON.stringify(f))).slice(0,20).map(f=><tr key={f.id}><td>{areaPath(plan,f.from)} → {areaPath(plan,f.to)}</td><td>{plan.vehicles.find(v=>v.id===f.vehicleId)?.name}</td><td>{f.privatePrice.toLocaleString('vi-VN')}</td><td>{f.roundTripOnly?'Chỉ khứ hồi':f.roundTripPrice?.toLocaleString('vi-VN')||'—'}</td></tr>)}</tbody></table></div><p className="admin-hint">Xem trước tối đa 20 dòng thay đổi.</p><button type="button" className="button" disabled={disabled||busy} onClick={()=>{onChange(preview.fares);setPreview(undefined);setNotice('Đã áp dụng vào bảng. Kiểm tra rồi bấm Lưu giá tuyến.');}}>Áp dụng vào bảng</button></>}<button type="button" className="quiet" onClick={()=>setPreview(undefined)}>Bỏ file nhập</button></div>}
 {error&&<p className="admin-error" role="alert">{error}</p>}{notice&&<p className="admin-success" role="status">{notice}</p>}
 </div>;
}
