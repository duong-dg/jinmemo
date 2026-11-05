 'use client';
export type RideQR={code:string;memo:string;amount:number;expiresAt:string;qrUrl:string;bankCode:string;accountNumber:string;accountName:string};
export function RidePayment({qr,paid,en=false}:{qr?:RideQR;paid?:boolean;en?:boolean}){
 if(paid)return <div className="ride-payment-paid" role="status">✓ {en?'Payment received':'Đã thanh toán'}</div>;
 if(!qr)return null;
 return <section className="ride-payment-card"><h3>{en?'Scan QR to pay':'Quét mã QR thanh toán'}</h3><p>{qr.code} · <strong>{qr.amount.toLocaleString('vi-VN')}đ</strong></p><img src={qr.qrUrl} alt={en?'Bank payment QR':'Mã QR chuyển khoản'} width={240} height={240}/><p>{qr.bankCode} · {qr.accountNumber}<br/>{qr.accountName}</p><p>{en?'Transfer memo':'Nội dung chuyển khoản'}: <strong>{qr.memo}</strong></p><small>{en?'QR expires at':'QR có hiệu lực đến'} {new Date(qr.expiresAt).toLocaleTimeString(en?'en-GB':'vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'})}. {en?'Keep the exact amount and transfer memo. Payment updates automatically.':'Giữ nguyên số tiền và nội dung. Trạng thái tự cập nhật khi nhận được tiền.'}</small></section>;
}
