export function paymentLabel(provider:string,en=false){return ({CASH:en?'Pay in cash':'Thanh toán tiền mặt',PAY_LATER:en?'Book now, pay later':'Đặt trước, trả sau',PAYPAL:'PayPal · USD',VNPAY_QR:en?'QR payment · VNPay':'Quét mã QR · VNPay',VNPAY:'VNPay',SEPAY:en?'Pay by QR code':'Thanh toán bằng mã QR',VNPAY_CARD:en?'International card · VNPay':'Thẻ quốc tế · VNPay',SEPAY_CARD:en?'International card · SePay':'Thẻ quốc tế · SePay'} as Record<string,string>)[provider]||provider;}
export const isOnlinePayment=(method:string)=>['VNPAY','SEPAY','VNPAY_CARD','SEPAY_CARD','VNPAY_QR','PAYPAL'].includes(method);

export const manualPaymentMethods=['CASH','PAY_LATER'] as const;
export const isManualPayment=(method:string|undefined):method is 'CASH'|'PAY_LATER'=>method==='CASH'||method==='PAY_LATER';
export function webPaymentMethods(providers:string[]=[]){return [...manualPaymentMethods,...new Set(providers.filter(isOnlinePayment).map(p=>p==='VNPAY'?'VNPAY_QR':p))];}
