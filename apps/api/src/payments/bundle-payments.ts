import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {z} from 'zod';
import {DatabaseService} from '../database/database.module';
import {MailService} from '../mail/mail.module';
import {ManualMethods} from './manual-methods';

const key=z.string().regex(/^[a-f0-9]{64}$/);
const inputSchema=z.object({requestId:z.uuid(),accessKey:key,expectedTotal:z.number().int().positive().max(15000000000),locale:z.enum(['vi','en']).default('vi'),method:z.string().min(1).max(80),
 tickets:z.object({code:z.string().regex(/^JC[A-F0-9]{10}$/),accessKey:key}).strict().optional(),
 ride:z.object({code:z.string().regex(/^JM-X[A-F0-9]{12}$/),requestKey:z.uuid()}).strict().optional(),
 gifts:z.object({code:z.string().regex(/^JM-G[A-F0-9]{12}$/),requestId:z.uuid()}).strict().optional(),
}).strict().refine(v=>v.tickets||v.ride||v.gifts);
const lookupSchema=z.object({code:z.string().regex(/^JB[A-F0-9]{10}$/),accessKey:key}).strict();
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export type BundleState={bundle:any;cart:any;orders:any[];ride:any;gift:any;total:number;reason:string};

@Injectable()
export class BundlePayments{
 constructor(private readonly db:DatabaseService,private readonly mail:MailService,private readonly methods:ManualMethods){}
 private async serial(client:PoolClient){await client.query("SELECT id FROM jinmemo_migrations WHERE id='037_cart_requests' FOR UPDATE");}
 async locked(client:PoolClient,id:string):Promise<BundleState>{
  await this.serial(client);
  const bundle=(await client.query('SELECT * FROM jinmemo_checkout_bundles WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!bundle)throw new NotFoundException('Không tìm thấy đơn thanh toán chung.');
  const refs=bundle.data.refs;
  const cart=refs.cartId?(await client.query('SELECT * FROM jinmemo_carts WHERE id=$1 FOR UPDATE',[refs.cartId])).rows[0]:null;
  const orders=cart?(await client.query('SELECT o.* FROM jinmemo_cart_orders m JOIN jinmemo_orders o ON o.id=m.order_id WHERE m.cart_id=$1 ORDER BY o.id FOR UPDATE',[cart.id])).rows:[];
  const ride=refs.rideId?(await client.query('SELECT * FROM jinmemo_ride_bookings WHERE id=$1 FOR UPDATE',[refs.rideId])).rows[0]:null;
  const gift=refs.giftId?(await client.query('SELECT * FROM jinmemo_gift_orders WHERE id=$1 FOR UPDATE',[refs.giftId])).rows[0]:null;
  let reason='';
  if(bundle.status!=='PENDING')reason='Đơn thanh toán chung đã được thu tiền.';
  if(refs.cartId&&(!cart||cart.channel!=='WEB'||!orders.length)||refs.rideId&&!ride||refs.giftId&&!gift)reason='Có đơn thành phần không còn hợp lệ.';
  for(const row of orders){
   if(row.booking_status!=='CONFIRMED'||row.payment_status!=='UNPAID'||(await client.query('SELECT order_id FROM jinmemo_order_archives WHERE order_id=$1',[row.id])).rowCount)reason='Có vé đã hủy, lưu trữ hoặc được thu tiền.';
  }
  if(ride&&(ride.status==='CANCELLED'||ride.data.paymentStatus==='PAID'))reason='Đơn xe đã hủy hoặc được thu tiền.';
  if(gift&&(gift.status==='CANCELLED'||gift.data.paymentStatus==='PAID'))reason='Đơn quà đã hủy hoặc được thu tiền.';
  const total=orders.reduce((sum,row)=>sum+row.snapshot.total,0)+(ride?.data.total||0)+(gift?.data.total||0);
  if(total!==Number(bundle.total))reason='Tổng tiền đơn đã thay đổi. Liên hệ JinMemo để kiểm tra, không thanh toán thêm.';
  // Compare every component, not only the grand total (two changed prices may cancel out).
  const amounts=Object.fromEntries([...orders.map(row=>[row.id,row.snapshot.total]),...(ride?[[ride.id,ride.data.total]]:[]),...(gift?[[gift.id,gift.data.total]]:[])]);
  if(JSON.stringify(Object.entries(amounts).sort())!==JSON.stringify(Object.entries(bundle.data.amounts).sort()))reason='Giá một đơn thành phần đã thay đổi.';
  return {bundle,cart,orders,ride,gift,total,reason};
 }
 async create(body:unknown){
  const parsed=inputSchema.safeParse(body);if(!parsed.success)throw new BadRequestException('Kiểm tra các đơn và tổng tiền thanh toán.');
  const input=parsed.data,fingerprint=hash(JSON.stringify(input)),client=await this.db.pool.connect();
  try{
   await client.query('BEGIN');await this.serial(client);
   const prior=(await client.query('SELECT * FROM jinmemo_checkout_bundles WHERE id=$1',[input.requestId])).rows[0];
   if(prior){if(prior.data.fingerprint!==fingerprint)throw new ConflictException('Mã yêu cầu đã dùng với nội dung khác.');await client.query('COMMIT');return {code:prior.code,total:Number(prior.total),method:prior.data.method,codes:prior.data.codes,ticketAccessKey:input.tickets?.accessKey};}
   let cart:any=null,ride:any=null,gift:any=null,orders:any[]=[];
   if(input.tickets){
    cart=(await client.query('SELECT * FROM jinmemo_carts WHERE code=$1 FOR UPDATE',[input.tickets.code])).rows[0];
    if(!cart||cart.channel!=='WEB'||cart.access_hash!==hash(input.tickets.accessKey))throw new NotFoundException('Không tìm thấy đơn vé.');
    orders=(await client.query('SELECT o.* FROM jinmemo_cart_orders m JOIN jinmemo_orders o ON o.id=m.order_id WHERE m.cart_id=$1 ORDER BY o.id FOR UPDATE',[cart.id])).rows;
   }
   if(input.ride){ride=(await client.query('SELECT * FROM jinmemo_ride_bookings WHERE code=$1 FOR UPDATE',[input.ride.code])).rows[0];if(!ride||ride.request_key!==input.ride.requestKey||ride.data.channel==='POS')throw new NotFoundException('Không tìm thấy đơn xe.');}
   if(input.gifts){gift=(await client.query('SELECT * FROM jinmemo_gift_orders WHERE code=$1 FOR UPDATE',[input.gifts.code])).rows[0];if(!gift||gift.id!==input.gifts.requestId)throw new NotFoundException('Không tìm thấy đơn quà.');}
   const refs={cartId:cart?.id,rideId:ride?.id,giftId:gift?.id};
   const amounts=Object.fromEntries([...orders.map(row=>[row.id,row.snapshot.total]),...(ride?[[ride.id,ride.data.total]]:[]),...(gift?[[gift.id,gift.data.total]]:[])]);
   const total=Object.values(amounts).reduce<number>((sum,value)=>sum+Number(value),0);
   if(total!==input.expectedTotal)throw new ConflictException('Tổng tiền đã thay đổi. Kiểm tra lại trước khi thanh toán.');
   const online=['VNPAY','VNPAY_QR','SEPAY','VNPAY_CARD','SEPAY_CARD','PAYPAL'].includes(input.method);
   const manual=online?undefined:await this.methods.select(input.method,client);
   const code='JB'+randomBytes(5).toString('hex').toUpperCase();
   const data={secret:await this.mail.encrypt(input.accessKey),refs,amounts,locale:input.locale,method:input.method,manual,fingerprint,contact:orders[0]?.contact||ride?.data.contact||{name:gift?.data.name,phone:gift?.data.phone},codes:Object.fromEntries(Object.entries({tickets:cart?.code,ride:ride?.code,gifts:gift?.code}).filter(([,code])=>code))};
   await client.query('INSERT INTO jinmemo_checkout_bundles(id,code,access_hash,total,data)VALUES($1,$2,$3,$4,$5)',[input.requestId,code,hash(input.accessKey),total,JSON.stringify(data)]);
   const state=await this.locked(client,input.requestId);if(state.reason)throw new ConflictException(state.reason);
   for(const [kind,entity] of Object.entries(refs))if(entity)await client.query('INSERT INTO jinmemo_checkout_members(kind,entity_id,bundle_id)VALUES($1,$2,$3)',[kind,entity,input.requestId]);
   await client.query('COMMIT');return {code,total,method:input.method,codes:data.codes,ticketAccessKey:input.tickets?.accessKey};
  }catch(error){await client.query('ROLLBACK');if((error as {code?:string}).code==='23505')throw new ConflictException('Có đơn đã thuộc một lần thanh toán chung khác.');throw error;}finally{client.release();}
 }
 async authorize(client:PoolClient,code:string,accessKey?:string){
  const row=(await client.query('SELECT id,access_hash FROM jinmemo_checkout_bundles WHERE code=$1',[code])).rows[0];
  if(!row||!accessKey||row.access_hash!==hash(accessKey))throw new NotFoundException('Không tìm thấy đơn thanh toán chung.');
  return this.locked(client,row.id);
 }
 async lookup(body:unknown){
  const parsed=lookupSchema.safeParse(body);if(!parsed.success)throw new BadRequestException('Thông tin tra cứu không hợp lệ.');
  const row=(await this.db.pool.query('SELECT * FROM jinmemo_checkout_bundles WHERE code=$1 AND access_hash=$2',[parsed.data.code,hash(parsed.data.accessKey)])).rows[0];
  if(!row)throw new NotFoundException('Không tìm thấy đơn thanh toán chung.');
  const cart=row.data.refs.cartId?(await this.db.pool.query('SELECT secret FROM jinmemo_carts WHERE id=$1',[row.data.refs.cartId])).rows[0]:null;
  return {ticketAccessKey:cart?await this.mail.decrypt(cart.secret):undefined,code:row.code,total:Number(row.total),paymentStatus:row.status==='PAID'?'PAID':'UNPAID',method:row.data.method,codes:row.data.codes,manual:row.data.manual};
 }
 async assertPayable(id:string){const client=await this.db.pool.connect();try{await client.query('BEGIN');const state=await this.locked(client,id);if(state.reason)throw new ConflictException(state.reason);await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}
 async credit(client:PoolClient,state:BundleState,reference:string,actor:string,method='BANK'){
  const {bundle,orders,cart,ride,gift}=state;
  await client.query('INSERT INTO jinmemo_payment_references(reference,kind,entity_id,amount)VALUES($1,$2,$3,$4)',[reference,'BUNDLE_PAYMENT',bundle.id,state.total]);
  for(const row of orders){
   const paymentId=randomUUID();await client.query('INSERT INTO jinmemo_order_payments(id,order_id,amount,reference,admin_id)VALUES($1,$2,$3,$4,$5)',[paymentId,row.id,row.snapshot.total,reference+'#'+row.code,actor]);
   await client.query('INSERT INTO jinmemo_payment_methods(payment_id,method)VALUES($1,$2)',[paymentId,method]);
   await client.query("UPDATE jinmemo_orders SET payment_status='PAID',version=version+1 WHERE id=$1",[row.id]);
   await client.query('INSERT INTO jinmemo_order_actions(id,order_id,request_hash,admin_id,action,note)VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),row.id,hash(reference),actor,'PAY','Thanh toán chung '+bundle.code]);
   await client.query('INSERT INTO jinmemo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),actor,'order.pay',row.id]);
  }
  if(cart){await client.query('UPDATE jinmemo_carts SET version=version+1 WHERE id=$1',[cart.id]);await this.mail.enqueue(client,orders[0].id,'CART_PAY',orders[0].version+1);}
  const paidAt=new Date().toISOString();
  for(const [row,table] of [[ride,'jinmemo_ride_bookings'],[gift,'jinmemo_gift_orders']] as const)if(row){
   await client.query('UPDATE '+table+' SET data=$1'+(row===ride?',version=version+1':'')+' WHERE id=$2',[JSON.stringify({...row.data,paymentStatus:'PAID',paidAmount:row.data.total,paidAt,paymentReference:reference,bundleCode:bundle.code}),row.id]);
   await client.query('INSERT INTO jinmemo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),actor,row===ride?'ride.pay':'gift.pay',row.id]);
  }
  await client.query("UPDATE jinmemo_checkout_bundles SET status='PAID',data=$1 WHERE id=$2",[JSON.stringify({...bundle.data,paidAt,reference,paidMethod:method}),bundle.id]);
 }
 async list(){return {data:(await this.db.pool.query('SELECT code,total,status,data,created_at FROM jinmemo_checkout_bundles ORDER BY created_at DESC LIMIT 100')).rows.map(row=>({...row,total:Number(row.total),data:{contact:row.data.contact,codes:row.data.codes,method:row.data.method,reference:row.data.reference,paidMethod:row.data.paidMethod,manual:row.data.manual}}))};}
 async collect(body:unknown,actor:string){
  const p=z.object({code:z.string().regex(/^JB[A-F0-9]{10}$/),expectedTotal:z.number().int().positive(),verified:z.literal(true),collectionMethod:z.enum(['CASH','BANK']).default('CASH')}).strict().safeParse(body);if(!p.success)throw new BadRequestException('Xác nhận đã thu đủ tổng tiền.');
  const client=await this.db.pool.connect();try{await client.query('BEGIN');await this.serial(client);const row=(await client.query('SELECT id FROM jinmemo_checkout_bundles WHERE code=$1',[p.data.code])).rows[0];if(!row)throw new NotFoundException();const state=await this.locked(client,row.id);
   if(state.bundle.status==='PAID'){await client.query('COMMIT');return {ok:true};}
   if(state.reason||state.total!==p.data.expectedTotal)throw new ConflictException(state.reason||'Tổng tiền đã thay đổi.');
   await this.credit(client,state,'MANUAL:BUNDLE:'+state.bundle.id,actor,p.data.collectionMethod);await client.query('COMMIT');return {ok:true};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
}
