import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Test} from '@nestjs/testing';
import {newDb,DataType} from 'pg-mem';
import {AppModule} from '../app.module';
import {MailService} from '../mail/mail.module';
test('cash and pay-later web bookings work without gateways, preserve unpaid status and require authorized collection',async()=>{
 const media=await mkdtemp(join(tmpdir(),'jinmemo-manual-payment-'));process.env.MEDIA_DIR=media;process.env.NODE_ENV='test';process.env.SEED_DEMO_DATA='false';process.env.PUBLIC_BASE_URL='https://manual.example.test';process.env.ADMIN_EMAIL='manual@example.test';process.env.ADMIN_PASSWORD='manual-payment-fixture';
 const memory=newDb({noAstCoverageCheck:true});memory.public.registerFunction({name:'strpos',args:[DataType.text,DataType.text],returns:DataType.integer,implementation:(s:string,q:string)=>s.indexOf(q)+1});const pool=new(memory.adapters.createPg().Pool)();const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider('DB_POOL').useValue(pool).compile(),app=module.createNestApplication();app.setGlobalPrefix('api/v1');
 try{await app.listen(0,'127.0.0.1');const base=await app.getUrl()+'/api/v1';
 const call=(path:string,body?:unknown,cookie='')=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:process.env.PUBLIC_BASE_URL!,'X-JinMemo-Request':'1','X-JinMemo-Admin':'1',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const login=await call('/admin/login',{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});assert.equal(login.status,201);const admin=login.headers.get('set-cookie')!.split(';')[0];
 const options=await(await call('/payments/options')).json();assert.deepEqual(options.manualMethods,['CASH','PAY_LATER']);assert.deepEqual(options.providers,[]);
 const product={id:'manual-ticket',slug:'manual-ticket',name:'Manual ticket',destination:'Hoi An',type:'TICKET',description:'Fixture',status:'PUBLISHED',version:0,variants:[{id:'eco',name:'Eco',prices:{ADULT:300000}}]};assert.equal((await call('/admin/products',product,admin)).status,201);
 await pool.query("INSERT INTO jinmemo_settings(id,data)VALUES('smtp',$1)",[JSON.stringify({enabled:true})]);
 const make=(paymentPreference:string)=>({requestId:randomUUID(),accessKey:randomBytes(32).toString('hex'),accepted:true,contact:{paymentPreference,name:'Manual guest',phone:'0901234567',email:'manual-guest@example.test',note:''},items:[{productId:product.id,variantId:'eco',date:'2099-06-01',quantities:{ADULT:1},expectedTotal:300000}]});
 let cashCode='',cashSecret='';for(const method of ['CASH','PAY_LATER']){const input=make(method),res=await call('/carts',input);assert.equal(res.status,201,await res.clone().text());const result=await res.json();if(method==='CASH'){cashCode=result.code;cashSecret=result.accessKey;}
 assert.equal((await(await call('/carts',input)).json()).code,result.code,'retry creates no duplicate');
 const detail=await(await call('/carts/lookup',{code:result.code,accessKey:result.accessKey})).json();assert.equal(detail.paymentPreference,method);assert.equal(detail.settled,false);assert.equal(detail.payable,300000);assert.equal(detail.items[0].paymentStatus,'UNPAID');assert.equal(detail.items[0].bookingStatus,'CONFIRMED');}
 assert.equal((await pool.query('SELECT id FROM jinmemo_order_payments')).rowCount,0);assert.equal((await pool.query('SELECT id FROM jinmemo_gateway_attempts')).rowCount,0);assert.equal((await pool.query('SELECT id FROM jinmemo_partner_ledger')).rowCount,0);
 assert.equal((await call('/carts',make('CREDIT'))).status,400,'pay later never grants partner credit');
 const collect={requestId:randomUUID(),action:'PAY',method:'CASH',expectedTotal:300000};assert.equal((await call('/admin/carts/'+cashCode+'/actions',collect)).status,401);
 const mail=module.get(MailService),sent:any[]=[];(mail as any).transport=async()=>({sendMail:async(message:any)=>{sent.push(message);},close(){}});await mail.processOne();await mail.processOne();assert.ok(sent.some(message=>message.text.includes('Khách chọn thanh toán: Tiền mặt')));assert.ok(sent.some(message=>message.text.includes('Khách chọn thanh toán: Trả sau')));
 let res=await call('/admin/carts/'+cashCode+'/actions',collect,admin);assert.equal(res.status,201,await res.clone().text());assert.equal((await res.json()).settled,true);
 assert.equal((await call('/admin/carts/'+cashCode+'/actions',collect,admin)).status,201);assert.equal((await pool.query('SELECT id FROM jinmemo_order_payments')).rowCount,1,'collection retry records cash once');
 const paid=await(await call('/carts/lookup',{code:cashCode,accessKey:cashSecret})).json();assert.equal(paid.items[0].paymentStatus,'PAID');assert.equal(paid.paymentPreference,'CASH');
 }finally{await app.close();await rm(media,{recursive:true,force:true});}
});
