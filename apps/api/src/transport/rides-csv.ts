import {csvCell} from '../orders/orders-csv';
type RideRow={code:string;visit_date:string;status:string;data:{time?:string;mode?:string;vehicleName?:string;passengers?:number;fromName?:string;toName?:string;pickup?:string;dropoff?:string;total?:number;agencyCost?:number|null;paymentStatus?:string;paidAmount?:number;roundTrip?:boolean;returnTime?:string;contact?:{name?:string;phone?:string;email?:string};driver?:string;driverPhone?:string;plate?:string;note?:string;operatorNote?:string}};
const states:Record<string,string>={PENDING:'Chờ xác nhận',WAITING_MATCH:'Chờ ghép',MATCHED:'Đã chốt xe',WAITING_PICKUP:'Chờ đón',PICKED_UP:'Đã đón',RUNNING:'Đang đi',COMPLETED:'Hoàn tất',CANCELLED:'Đã hủy'};
const phone=(value?:string)=>value?"'"+value:'';
export function ridesCsv(rows:RideRow[]){
 const headers=['Mã booking','Ngày đi','Giờ đón','Trạng thái','Hình thức xe','Loại xe','Số khách','Nơi đi','Nơi đến','Địa chỉ đón','Địa chỉ trả','Khách hàng','Điện thoại','Email','Giá trị đơn (VND)','Giá vốn đại lý (VND)','Thanh toán','Tiền đã ghi thu (chưa trừ hoàn) (VND)','Khứ hồi','Giờ về','Tài xế','Điện thoại tài xế','Biển số','Ghi chú khách','Ghi chú nội bộ'];
 const values=rows.map(r=>{const d=r.data;return[r.code,r.visit_date.slice(0,10),d.time,states[r.status]||r.status,d.mode==='SHARED'?'Xe ghép':'Xe riêng',d.vehicleName,d.passengers,d.fromName,d.toName,d.pickup,d.dropoff,d.contact?.name,phone(d.contact?.phone),d.contact?.email,d.total,d.agencyCost??'',d.paymentStatus==='PAID'?'Đã thu tiền':'Chưa thu tiền',d.paidAmount??'',d.roundTrip?'Có':'Không',d.returnTime,d.driver,phone(d.driverPhone),d.plate,d.note,d.operatorNote];});
 return '\uFEFF'+[headers,...values].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
