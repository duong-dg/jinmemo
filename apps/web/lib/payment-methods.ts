export function paymentLabel(provider:string,en=false){return ({CASH:en?'Pay in cash':'Thanh toán tiền mặt',PAY_LATER:en?'Pay later':'Thanh toán sau',PAYPAL:'PayPal · USD',VNPAY_QR:en?'QR payment · VNPay':'Quét mã QR · VNPay',VNPAY:'VNPay',SEPAY:en?'Pay by QR code':'Thanh toán bằng mã QR',VNPAY_CARD:en?'International card · VNPay':'Thẻ quốc tế · VNPay',SEPAY_CARD:en?'International card · SePay':'Thẻ quốc tế · SePay'} as Record<string,string>)[provider]||provider;}
export const isOnlinePayment=(method:string)=>['VNPAY','SEPAY','VNPAY_CARD','SEPAY_CARD','VNPAY_QR','PAYPAL'].includes(method);

export const manualPaymentMethods=['PAY_LATER'] as const;
export type ManualOption={id:string;name:string;englishName?:string;instructions?:string;englishInstructions?:string};
export function manualOptionLabel(option:ManualOption|undefined,en=false){return option?(en?option.englishName||option.name:option.name):'';}
export function manualOptionInstructions(option:ManualOption|undefined,en=false){return option?(en?option.englishInstructions||option.instructions:option.instructions)||'':'';}
export const isManualPayment=(method:string|undefined):method is 'CASH'|'PAY_LATER'|`MANUAL_${string}`=>method==='CASH'||method==='PAY_LATER'||!!method&&/^MANUAL_[a-zA-Z0-9_-]{1,60}$/.test(method);
export function webPaymentMethods(providers:string[]=[],manualIds:readonly string[]=manualPaymentMethods){return [...manualIds.filter(isManualPayment),...new Set(providers.filter(isOnlinePayment).map(p=>p==='VNPAY'?'VNPAY_QR':p))];}
