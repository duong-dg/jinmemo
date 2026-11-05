import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { DatabaseService } from '../database/database.module';
import { MailService } from '../mail/mail.module';
import { ShiftsService } from '../shifts/shifts.module';
const targetInput=z.object({eventId:z.string().regex(/^SEPAY:LIVE:[0-9]{1,30}$/),targetCode:z.string().trim().toUpperCase().regex(/^(?:J[MC][A-F0-9]{10}|JM-X[A-F0-9]{12})$/)}).strict();
const resolveInput=targetInput.extend({expectedAmount:z.number().int().positive().max(15000000000),note:z.string().trim().min(5).max(500),verified:z.literal(true)}).strict();
@Injectable()
export class PaymentReconciliation {
 constructor(private readonly db:DatabaseService,private readonly mail:MailService,private readonly shifts:ShiftsService){}
 private async inspect(db:Pool|PoolClient,eventId:string,targetCode:string,lock=false){
  const event=(await db.query('SELECT * FROM jinmemo_gateway_events WHERE id=$1'+(lock?' FOR UPDATE':''),[eventId])).rows[0];
  if(!event)throw new NotFoundException('Không tìm thấy giao dịch.');
  if(event.provider!=='SEPAY'||event.mode!=='LIVE'||event.status!=='REVIEW'||Number(event.amount)<=0)throw new ConflictException('Chỉ gắn giao dịch SePay chuyển khoản LIVE đang cần đối soát.');
  if(targetCode.startsWith('JM-X')){
   if(lock)await db.query("SELECT id FROM jinmemo_migrations WHERE id='037_cart_requests' FOR UPDATE");
   const ride=(await db.query('SELECT * FROM jinmemo_ride_bookings WHERE code=$1'+(lock?' FOR UPDATE':''),[targetCode])).rows[0];if(!ride)throw new NotFoundException('Không tìm thấy đơn xe.');
   if(['PENDING','WAITING_MATCH','CANCELLED'].includes(ride.status)||ride.data.paymentStatus==='PAID')throw new ConflictException('Đơn xe chưa xác nhận/chốt nhóm, đã hủy hoặc đã thu.');
   if(ride.data.total!==Number(event.amount))throw new BadRequestException('Số tiền không bằng tổng tiền đơn xe.');
   if((await db.query('SELECT reference FROM jinmemo_payment_references WHERE reference=$1',[event.id])).rowCount)throw new ConflictException('Giao dịch đã được ghi thu.');
   return{event,ride,cart:null,orders:[] as any[],total:ride.data.total as number};
  }
  let cart:any=null,ids:string[]=[];
  if(targetCode.startsWith('JC')){cart=(await db.query('SELECT * FROM jinmemo_carts WHERE code=$1'+(lock?' FOR UPDATE':''),[targetCode])).rows[0];if(!cart)throw new NotFoundException('Không tìm thấy đơn JC.');ids=(await db.query('SELECT order_id FROM jinmemo_cart_orders WHERE cart_id=$1 ORDER BY position',[cart.id])).rows.map(r=>r.order_id);}
  else{const order=(await db.query('SELECT id FROM jinmemo_orders WHERE code=$1',[targetCode])).rows[0];if(!order)throw new NotFoundException('Không tìm thấy đơn JM.');if((await db.query('SELECT cart_id FROM jinmemo_cart_orders WHERE order_id=$1',[order.id])).rowCount)throw new BadRequestException('Gói này thuộc đơn nhiều gói. Nhập mã JC để thu đúng tổng đơn.');ids=[order.id];}
  if(!ids.length)throw new BadRequestException('Đơn không có gói vé.');
  const orders=(await db.query('SELECT * FROM jinmemo_orders WHERE id IN ('+ids.map((_,i)=>'$'+(i+1)).join(',')+') ORDER BY id'+(lock?' FOR UPDATE':''),ids)).rows;
  for(const row of orders){if(row.booking_status!=='CONFIRMED'||row.payment_status!=='UNPAID'||(await db.query('SELECT order_id FROM jinmemo_order_archives WHERE order_id=$1',[row.id])).rowCount)throw new ConflictException('Đơn có gói đã thu tiền, ghi công nợ, hủy, lưu trữ hoặc chưa xác nhận. Không thể gắn thêm khoản thu.');}
  const total=orders.reduce((n,row)=>n+Number(row.snapshot.total),0);
  if(orders.length!==ids.length||total!==Number(event.amount))throw new BadRequestException('Số tiền giao dịch không bằng tổng tiền chưa thu của đơn. Không tự chia hoặc bù tiền.');
  if((await db.query('SELECT reference FROM jinmemo_payment_references WHERE reference=$1',[event.id])).rowCount)throw new ConflictException('Giao dịch này đã được ghi thu.');
  return {event,ride:null as any,cart,orders,total};
 }
 async preview(body:unknown){const input=targetInput.safeParse(body);if(!input.success)throw new BadRequestException('Nhập mã giao dịch và mã đơn JM/JC hợp lệ.');const result=await this.inspect(this.db.pool,input.data.eventId,input.data.targetCode);return{eventId:result.event.id,targetCode:input.data.targetCode,amount:result.total,customerName:result.ride?result.ride.data.contact.name:result.orders[0].contact.name,items:result.ride?[{code:result.ride.code,productName:result.ride.data.fromName+' → '+result.ride.data.toName,variantName:result.ride.data.vehicleName,date:result.ride.visit_date,total:result.total}]:result.orders.map(row=>({code:row.code,productName:row.snapshot.productName,variantName:row.snapshot.variantName,date:row.snapshot.date,total:row.snapshot.total}))};}
 async resolve(body:unknown,actor:string){const input=resolveInput.safeParse(body);if(!input.success)throw new BadRequestException('Kiểm tra mã đơn, số tiền, ghi chú và xác nhận đã đối chiếu ngân hàng.');const value=input.data,db=await this.db.pool.connect();
  try{await db.query('BEGIN');
   // Serialize resolutions before acquiring any cart/order locks.
   await db.query('SELECT id FROM jinmemo_gateway_events WHERE id=$1 FOR UPDATE',[value.eventId]);
   const prior=(await db.query('SELECT target_code FROM jinmemo_gateway_resolutions WHERE event_id=$1',[value.eventId])).rows[0];
   if(prior){if(prior.target_code!==value.targetCode)throw new ConflictException('Giao dịch đã được gắn vào đơn khác.');await db.query('COMMIT');return{ok:true,alreadyResolved:true,targetCode:prior.target_code};}
   const {event,ride,cart,orders,total}=await this.inspect(db,value.eventId,value.targetCode,true);
   if(total!==value.expectedAmount)throw new ConflictException('Số tiền đã thay đổi. Kiểm tra lại đơn trước khi xác nhận.');
   if(ride){
    await db.query('INSERT INTO jinmemo_payment_references(reference,kind,entity_id,amount)VALUES($1,$2,$3,$4)',[event.id,'RIDE_PAYMENT',ride.id,total]);
    await db.query('UPDATE jinmemo_ride_bookings SET data=$1,version=version+1 WHERE id=$2',[JSON.stringify({...ride.data,paymentStatus:'PAID',paidAmount:total,paidAt:new Date().toISOString(),paymentReference:event.id}),ride.id]);
    await db.query('INSERT INTO jinmemo_ride_payment_events(event_id,ride_id)VALUES($1,$2) ON CONFLICT(event_id) DO UPDATE SET ride_id=$2',[event.id,ride.id]);
    await db.query('INSERT INTO jinmemo_gateway_resolutions(event_id,target_code,admin_id,note,original_reason,original_order_id)VALUES($1,$2,$3,$4,$5,$6)',[event.id,value.targetCode,actor,value.note,event.reason,event.order_id]);
    await db.query("UPDATE jinmemo_gateway_events SET order_id=NULL,status='PAID',reason=$1 WHERE id=$2",['Đã đối soát đơn xe '+ride.code+': '+value.note,event.id]);
    await db.query('INSERT INTO jinmemo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),actor,'ride.reconcile',ride.id]);await db.query('COMMIT');return{ok:true,targetCode:value.targetCode};
   }
   await db.query('DELETE FROM jinmemo_ride_payment_events WHERE event_id=$1',[event.id]);
   for(const row of orders)await this.shifts.lockCounterForOrder(db,row.id);
   await db.query('INSERT INTO jinmemo_payment_references(reference,kind,entity_id,amount)VALUES($1,$2,$3,$4)',[event.id,cart?'CART_PAYMENT':'ORDER_PAYMENT',cart?.id||orders[0].id,total]);
   for(const row of orders){const id=randomUUID(),reference=cart?event.id+'#'+row.code:event.id;
    await db.query('INSERT INTO jinmemo_order_payments(id,order_id,amount,reference,admin_id)VALUES($1,$2,$3,$4,$5)',[id,row.id,row.snapshot.total,reference,actor]);
    await db.query("INSERT INTO jinmemo_payment_methods(payment_id,method)VALUES($1,'BANK')",[id]);await this.shifts.attachPayment(db,row.id,id);
    await db.query("UPDATE jinmemo_orders SET payment_status='PAID',version=version+1 WHERE id=$1",[row.id]);
    await db.query('INSERT INTO jinmemo_order_actions(id,order_id,request_hash,admin_id,action,note)VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),row.id,createHash('sha256').update(event.id+':'+value.targetCode).digest('hex'),actor,'PAY','Đối soát '+event.id+': '+value.note]);
    await db.query('INSERT INTO jinmemo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),actor,'order.pay',row.id]);
    if(!cart)await this.mail.enqueue(db,row.id,'PAY',row.version+1);
   }
   if(cart){await db.query('UPDATE jinmemo_carts SET version=version+1 WHERE id=$1',[cart.id]);await this.mail.enqueue(db,orders[0].id,'CART_PAY',orders[0].version+1);}
   await db.query('INSERT INTO jinmemo_gateway_resolutions(event_id,target_code,admin_id,note,original_reason,original_order_id)VALUES($1,$2,$3,$4,$5,$6)',[event.id,value.targetCode,actor,value.note,event.reason,event.order_id]);
   await db.query('UPDATE jinmemo_gateway_events SET order_id=$1,status=$2,reason=$3 WHERE id=$4',[orders[0].id,'PAID','Đã đối soát thủ công: '+value.note,event.id]);
   await db.query('INSERT INTO jinmemo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),actor,'payments.reconcile',event.id]);
   await db.query('COMMIT');return{ok:true,targetCode:value.targetCode};
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
 }
}
