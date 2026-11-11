import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {newDb} from 'pg-mem';
import {Test} from '@nestjs/testing';
import {AppModule} from '../app.module';
import {BundlePayments} from './bundle-payments';
import {vnpSign} from './protocol';

test('one mixed payment covers every combination, preserves component totals, authenticates ownership and settles once',async()=>{
 process.env.NODE_ENV='test';process.env.SEED_DEMO_DATA='false';process.env.PUBLIC_BASE_URL='https://bundle.example.test';
 process.env.ADMIN_EMAIL='bundle@example.test';process.env.ADMIN_PASSWORD='bundle-fixture-password';
 const pool=new(newDb({noAstCoverageCheck:true}).adapters.createPg().Pool)();
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider('DB_POOL').useValue(pool).compile();
 const app=module.createNestApplication();app.setGlobalPrefix('api/v1');
 try{
  await app.listen(0,'127.0.0.1');const base=await app.getUrl()+'/api/v1';
  let cookie='';
  const call=(path:string,body?:unknown,admin=false,patch:Record<string,string>={})=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:process.env.PUBLIC_BASE_URL!,'X-JinMemo-Request':'1','X-JinMemo-Admin':'1','X-JinMemo-Gifts':'1',...(admin?{Cookie:cookie}:{}),...patch},...(body===undefined?{}:{body:JSON.stringify(body)})});
  cookie=(await call('/admin/login',{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD})).headers.get('set-cookie')!.split(';')[0];
  const secret='bundle-webhook-fixture-1234567890',vnSecret='bundle-vnpay-fixture-1234567890';
  let settings=await(await call('/admin/payments',undefined,true)).json();
  let response=await call('/admin/payments',{version:settings.version,mode:'LIVE',vnpayEnabled:true,tmnCode:'BUNDLE01',vnpaySecret:vnSecret,sepayEnabled:true,bankCode:'MBBank',accountNumber:'0123456789',accountName:'BUNDLE TEST',sepayKey:secret},true);
  assert.equal(response.status,201,await response.clone().text());
  const product={id:'bundle-ticket',slug:'bundle-ticket',name:'Ticket',destination:'Hoi An',type:'TICKET',description:'Fixture',status:'PUBLISHED',demo:false,version:0,variants:[{id:'eco',name:'Eco',prices:{ADULT:300000}}],rules:[],closures:[],seoTitle:'',seoDescription:''};
  assert.equal((await call('/admin/products',product,true)).status,201);
  const giftId=randomUUID();
  assert.equal((await call('/admin/gifts',{version:0,enabled:true,shippingFee:50000,items:[{id:giftId,name:'Quà',nameEn:'Gift',description:'Thủ công',descriptionEn:'Handmade',price:150000,stock:100,active:true}]},true)).status,201);
  const english=await(await call('/gifts?lang=en')).json();assert.equal(english.data.items[0].name,'Gift');assert.equal(english.data.items[0].description,'Handmade');
  const service=module.get(BundlePayments);
  const make=async(mask:number)=>{
   const contact={name:'Mixed guest',phone:'0901234567',email:'mixed@example.test',note:''};
   const input:any={requestId:randomUUID(),accessKey:randomBytes(32).toString('hex'),expectedTotal:0,method:'SEPAY'};
   let rideId='',orderId='',giftOrderId='';
   if(mask&1){const key=randomBytes(32).toString('hex'),r=await call('/carts',{requestId:randomUUID(),accessKey:key,accepted:true,contact,items:[{productId:product.id,variantId:'eco',date:'2099-06-01',quantities:{ADULT:1},expectedTotal:300000}]});assert.equal(r.status,201,await r.clone().text());const ticket=await r.json();input.tickets={code:ticket.code,accessKey:key};input.expectedTotal+=300000;orderId=(await pool.query('SELECT order_id FROM jinmemo_cart_orders m JOIN jinmemo_carts c ON c.id=m.cart_id WHERE c.code=$1',[ticket.code])).rows[0].order_id;}
   if(mask&2){rideId=randomUUID();const requestKey=randomUUID(),code='JM-X'+randomBytes(6).toString('hex').toUpperCase();await pool.query('INSERT INTO jinmemo_ride_bookings(id,code,request_key,visit_date,status,data)VALUES($1,$2,$3,$4,$5,$6)',[rideId,code,requestKey,'2099-06-01','PENDING',JSON.stringify({contact,total:200000,paymentStatus:'UNPAID'})]);input.ride={code,requestKey};input.expectedTotal+=200000;}
   if(mask&4){giftOrderId=randomUUID();const r=await call('/gifts',{requestId:giftOrderId,fulfillment:'DELIVERY',expectedTotal:200000,name:contact.name,phone:contact.phone,address:'123 Hoi An, Da Nang, Viet Nam',lines:[{id:giftId,quantity:1}]});assert.equal(r.status,201,await r.clone().text());input.gifts={code:(await r.json()).code,requestId:giftOrderId};input.expectedTotal+=200000;}
   return {input,rideId,orderId,giftOrderId};
  };
  const hook=(intent:any,id:number,amount=intent.amount)=>call('/payments/sepay/webhook',{id,gateway:'MBBank',accountNumber:'0123456789',content:intent.id,transferType:'in',transferAmount:amount},false,{Authorization:'Apikey '+secret});
  for(let mask=1;mask<=7;mask++){
   const fixture=await make(mask),{input,rideId,orderId,giftOrderId}=fixture;
   const bundle=await service.create(input);assert.equal(bundle.total,input.expectedTotal);
   assert.deepEqual(await service.create(input),bundle,'same request is idempotent');
   assert.equal((await call('/payments/bundles/lookup',{code:bundle.code,accessKey:'0'.repeat(64)})).status,404);
   if(input.tickets){const ticketLookup=await(await call('/carts/lookup',input.tickets)).json();assert.equal(ticketLookup.onlinePaymentEligible,false);assert.equal(ticketLookup.combinedPayment.code,bundle.code);assert.equal(ticketLookup.combinedPayment.accessKey,input.accessKey);}
   const checkout={code:bundle.code,accessKey:input.accessKey,provider:mask===7?'VNPAY':'SEPAY'};
   response=await call('/payments/checkout',checkout);assert.equal(response.status,201,await response.clone().text());const intent=await response.json();assert.equal(intent.amount,input.expectedTotal);
   if(mask===7){const q={vnp_TxnRef:intent.id,vnp_TmnCode:'BUNDLE01',vnp_Amount:String(intent.amount*100),vnp_ResponseCode:'00',vnp_TransactionStatus:'00',vnp_TransactionNo:'888777'};const url='/payments/vnpay/ipn?'+new URLSearchParams({...q,vnp_SecureHash:vnpSign(q,vnSecret)});assert.equal((await(await call(url)).json()).RspCode,'00');assert.equal((await(await call(url)).json()).RspCode,'02');}
   else{assert.equal((await hook(intent,90000+mask)).status,200);assert.equal((await hook(intent,90000+mask)).status,200);}
   const status=await service.lookup({code:bundle.code,accessKey:input.accessKey});assert.equal(status.paymentStatus,'PAID');
   if(orderId){assert.equal((await pool.query('SELECT payment_status FROM jinmemo_orders WHERE id=$1',[orderId])).rows[0].payment_status,'PAID');assert.equal((await pool.query('SELECT amount FROM jinmemo_order_payments WHERE order_id=$1',[orderId])).rows[0].amount,300000);}
   if(rideId)assert.equal((await pool.query('SELECT data FROM jinmemo_ride_bookings WHERE id=$1',[rideId])).rows[0].data.paidAmount,200000);
   if(giftOrderId)assert.equal((await pool.query('SELECT data FROM jinmemo_gift_orders WHERE id=$1',[giftOrderId])).rows[0].data.paidAmount,200000,'delivery fee included once');
   assert.equal((await pool.query("SELECT reference FROM jinmemo_payment_references WHERE kind='BUNDLE_PAYMENT' AND entity_id=$1",[input.requestId])).rowCount,1);
   assert.equal((await call('/payments/checkout',checkout)).status,409,'paid aggregate cannot be charged again');
  }
  const review=await make(7),reviewBundle=await service.create(review.input);
  response=await call('/payments/checkout',{code:reviewBundle.code,accessKey:review.input.accessKey,provider:'SEPAY'});const intent=await response.json();
  await hook(intent,99900,intent.amount-1);assert.equal((await service.lookup({code:reviewBundle.code,accessKey:review.input.accessKey})).paymentStatus,'UNPAID');
  assert.equal((await pool.query('SELECT payment_status FROM jinmemo_orders WHERE id=$1',[review.orderId])).rows[0].payment_status,'UNPAID');
  assert.equal((await pool.query('SELECT data FROM jinmemo_ride_bookings WHERE id=$1',[review.rideId])).rows[0].data.paymentStatus,'UNPAID');
  await pool.query("UPDATE jinmemo_gift_orders SET status='CANCELLED' WHERE id=$1",[review.giftOrderId]);
  await hook(intent,99901);assert.equal((await service.lookup({code:reviewBundle.code,accessKey:review.input.accessKey})).paymentStatus,'UNPAID');
  assert.equal((await pool.query('SELECT status FROM jinmemo_gateway_events WHERE id=$1',['SEPAY:LIVE:99901'])).rows[0].status,'REVIEW');
  const manual=await make(6);manual.input.method='PAY_LATER';const manualBundle=await service.create(manual.input);
  assert.equal((await call('/admin/payments/bundles/collect',{code:manualBundle.code,expectedTotal:manualBundle.total,verified:true})).status,401);
  assert.equal((await call('/admin/payments/bundles/collect',{code:manualBundle.code,expectedTotal:manualBundle.total-1,verified:true},true)).status,409);
  const receipt={code:manualBundle.code,expectedTotal:manualBundle.total,verified:true};assert.equal((await call('/admin/payments/bundles/collect',receipt,true)).status,201);assert.equal((await call('/admin/payments/bundles/collect',receipt,true)).status,201);
  assert.equal((await service.lookup({code:manualBundle.code,accessKey:manual.input.accessKey})).paymentStatus,'PAID');
  const list=await(await call('/admin/payments/bundles',undefined,true)).json();assert.equal(list.data.length,9);assert.doesNotMatch(JSON.stringify(list),/access_hash|fingerprint|requestKey/);
  // Missing memo can be reconciled only against the exact aggregate, not one child.
  const reconcile=await make(6),reconcileBundle=await service.create(reconcile.input);
  await call('/payments/sepay/webhook',{id:99902,gateway:'MBBank',accountNumber:'0123456789',content:'MISSING MEMO',transferType:'in',transferAmount:reconcileBundle.total},false,{Authorization:'Apikey '+secret});
  const target={eventId:'SEPAY:LIVE:99902',targetCode:reconcileBundle.code};
  response=await call('/admin/payments/reconciliation/preview',target,true);assert.equal(response.status,201,await response.clone().text());assert.equal((await response.json()).amount,reconcileBundle.total);
  const resolution={...target,expectedAmount:reconcileBundle.total,verified:true,note:'Verified full mixed payment'};
  assert.equal((await call('/admin/payments/reconciliation/resolve',resolution,true)).status,201);assert.equal((await call('/admin/payments/reconciliation/resolve',resolution,true)).status,201);
  assert.equal((await service.lookup({code:reconcileBundle.code,accessKey:reconcile.input.accessKey})).paymentStatus,'PAID');
  const changed=await make(6),changedBundle=await service.create(changed.input);
  await pool.query('UPDATE jinmemo_ride_bookings SET data=$1 WHERE id=$2',[JSON.stringify({total:210000,paymentStatus:'UNPAID'}),changed.rideId]);
  await pool.query('UPDATE jinmemo_gift_orders SET data=$1 WHERE id=$2',[JSON.stringify({total:190000,paymentStatus:'UNPAID'}),changed.giftOrderId]);
  assert.equal((await call('/payments/checkout',{code:changedBundle.code,accessKey:changed.input.accessKey,provider:'SEPAY'})).status,409,'component changes cannot cancel out inside the total');
  const owned=await make(6);await assert.rejects(()=>service.create({...owned.input,ride:{...owned.input.ride,requestKey:randomUUID()}}),/Không tìm thấy đơn xe/);
  await assert.rejects(()=>service.create({...owned.input,expectedTotal:1}),/Tổng tiền/);
  assert.equal((await call('/payments/bundles',owned.input,false,{Origin:'https://evil.example'})).status,403);
  const journal=await call('/admin/payments/events',undefined,true);assert.equal(journal.status,200,await journal.clone().text());assert.ok((await journal.json()).data.some((row:any)=>row.order_code===reviewBundle.code));
 }finally{await app.close();}
});
