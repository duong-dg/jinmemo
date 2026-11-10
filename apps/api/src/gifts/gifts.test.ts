import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {newDb} from 'pg-mem';
import {Test} from '@nestjs/testing';
import {AppModule} from '../app.module';

test('gift checkout charges shipping once, prevents repeat stock deductions and restores cancelled orders',async()=>{
 process.env.NODE_ENV='test';
 process.env.SEED_DEMO_DATA='false';
 process.env.PUBLIC_BASE_URL='https://gifts.example.test';
 process.env.ADMIN_EMAIL='gift@example.test';
 process.env.ADMIN_PASSWORD='gift-fixture-password';
 const pool=new(newDb({noAstCoverageCheck:true}).adapters.createPg().Pool)();
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider('DB_POOL').useValue(pool).compile();
 const app=module.createNestApplication();
 app.setGlobalPrefix('api/v1');
 try{
  await app.listen(0,'127.0.0.1');
  const base=await app.getUrl()+'/api/v1';
  const call=(path:string,body?:unknown,cookie='')=>fetch(base+path,{
   method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:process.env.PUBLIC_BASE_URL!,'X-JinMemo-Gifts':'1','X-JinMemo-Admin':'1',Cookie:cookie},
   ...(body===undefined?{}:{body:JSON.stringify(body)}),
  });
  assert.equal((await(await call('/gifts')).json()).data.enabled,false);
  const login=await call('/admin/login',{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});
  const cookie=login.headers.get('set-cookie')!.split(';')[0],id=randomUUID();
  const config={version:0,enabled:true,shippingFee:50000,items:[{id,name:'Móc khóa',description:'Handmade',price:30000,stock:3,active:true}]};
  assert.equal((await call('/admin/gifts',config)).status,401);
  const save=await call('/admin/gifts',config,cookie);assert.equal(save.status,201,await save.clone().text());
  const order={requestId:randomUUID(),fulfillment:'DELIVERY',expectedTotal:110000,name:'Khách Test',phone:'0901234567',address:'123 Hội An, Đà Nẵng',lines:[{id,quantity:2}]};
  assert.equal((await call('/gifts',{...order,expectedTotal:60000})).status,409);
  const booked=await call('/gifts',order);assert.equal(booked.status,201,await booked.clone().text());
  assert.equal((await booked.json()).total,110000);
  assert.equal((await call('/gifts',order)).status,201);
  assert.equal((await(await call('/gifts')).json()).data.items[0].stock,1);
  assert.equal((await call('/gifts',{...order,requestId:randomUUID()})).status,409);
  assert.equal((await call('/admin/gifts',{...config,version:1},cookie)).status,409);
  const cancelPath='/admin/gifts/orders/'+order.requestId;
  assert.equal((await call(cancelPath,{status:'CANCELLED'},cookie)).status,201);
  assert.equal((await call(cancelPath,{status:'CANCELLED'},cookie)).status,201);
  assert.equal((await(await call('/gifts')).json()).data.items[0].stock,3);
  const counterId=randomUUID(),address='12 Trần Phú, Hội An';
  assert.equal((await call('/admin/counters',{id:counterId,name:'Quầy Hội An',address,status:'ACTIVE',version:0},cookie)).status,201);
  assert.deepEqual((await(await call('/gifts')).json()).data.pickupCounters,[{id:counterId,name:'Quầy Hội An',address}]);
  const pickup={...order,requestId:randomUUID(),fulfillment:'PICKUP',expectedTotal:60000};
  assert.equal((await call('/gifts',pickup)).status,409);
  assert.equal((await call('/gifts',{...pickup,pickupCounterId:counterId})).status,201);
  const savedPickup=(await pool.query('SELECT data FROM jinmemo_gift_orders WHERE id=$1',[pickup.requestId])).rows[0].data;
  assert.equal(savedPickup.address,address);
  assert.equal(savedPickup.pickupCounterName,'Quầy Hội An');
  let current=(await(await call('/admin/gifts',undefined,cookie)).json()).config;
  assert.equal((await call('/admin/gifts',{...current,items:[]},cookie)).status,409);
  const openOrder=(await(await call('/admin/gifts',undefined,cookie)).json()).data.find((row:{status:string})=>row.status==='PENDING');
  assert.equal((await call('/admin/gifts/orders/'+openOrder.id,{status:'COMPLETED'},cookie)).status,201);
  current=(await(await call('/admin/gifts',undefined,cookie)).json()).config;
  assert.equal((await call('/admin/gifts',{...current,items:[]},cookie)).status,201);
 }finally{await app.close();}
});
