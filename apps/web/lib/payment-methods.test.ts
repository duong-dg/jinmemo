import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webPaymentMethods,isManualPayment,isOnlinePayment,paymentLabel} from './payment-methods';
test('manual checkout stays available without online gateways; labels and gateway methods remain separate',()=>{
 assert.deepEqual(webPaymentMethods(),['CASH','PAY_LATER']);
 assert.deepEqual(webPaymentMethods(['VNPAY','SEPAY','CASH','unknown','VNPAY_QR']),['CASH','PAY_LATER','VNPAY_QR','SEPAY']);
 for(const method of ['CASH','PAY_LATER']){assert.equal(isManualPayment(method),true);assert.equal(isOnlinePayment(method),false);}
 assert.equal(isManualPayment('CREDIT'),false);assert.equal(isManualPayment('SEPAY'),false);assert.equal(isOnlinePayment('SEPAY'),true);
 assert.equal(paymentLabel('CASH'),'Thanh toán tiền mặt');assert.equal(paymentLabel('PAY_LATER',true),'Book now, pay later');
});
