import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import type {PoolClient} from 'pg';
import {createHash,randomUUID} from 'node:crypto';
import {DatabaseService} from '../database/database.module';
import {PaymentSettings} from './settings';
export type HotelPaymentState={row:any;total:number;reason:string};
export async function enqueueStayMail(client:Pick<PoolClient,'query'>,id:string,event:string,version:number){await client.query('INSERT INTO jinmemo_stay_mail(id,booking_id,event)VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',[id+':'+version+':'+event,id,event]);}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
@Injectable()
export class HotelPayments{
 constructor(private readonly db:DatabaseService,private readonly settings:PaymentSettings){}
 async assertProvider(method:string){const c=await this.settings.config();if(c.mode!=='LIVE'||(method==='PAYPAL'?!c.paypalEnabled:method==='VNPAY_CARD'?(!c.vnpayEnabled||!c.vnpayCardEnabled):['VNPAY','VNPAY_QR'].includes(method)?!c.vnpayEnabled:method==='SEPAY_CARD'?!c.sepayCardEnabled:method==='SEPAY'?!c.sepayEnabled:true))throw new BadRequestException('Phương thức thanh toán phòng chưa bật. Vui lòng chọn lại.');}
 async locked(client:PoolClient,id:string):Promise<HotelPaymentState>{
  await client.query("SELECT id FROM jinmemo_migrations WHERE id='037_cart_requests' FOR UPDATE");
  const row=(await client.query('SELECT * FROM jinmemo_stay_bookings WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!row)throw new NotFoundException('Không tìm thấy đơn đặt phòng.');
  let reason='';if(['CANCELLED','EXPIRED','COMPLETED'].includes(row.status))reason='Đơn phòng đã hủy, hết hạn hoặc hoàn tất.';
  if(row.data.paymentStatus==='PAID')reason='Đơn phòng đã thu tiền.';
  if(row.expires_at&&new Date(row.expires_at).getTime()<=Date.now()&&row.data.paymentStatus!=='PAID')reason='Thời gian giữ phòng đã hết; cần đối soát nếu đã trả tiền.';
  return {row,total:Number(row.data.total),reason};
 }
 async authorize(client:PoolClient,code:string,accessKey?:string,email?:string){const row=(await client.query('SELECT id,access_hash,data FROM jinmemo_stay_bookings WHERE code=$1',[code])).rows[0];if(!row||!(accessKey?row.access_hash===hash(accessKey):email&&row.data.contact.email.toLowerCase()===email.trim().toLowerCase()))throw new NotFoundException('Không tìm thấy đơn đặt phòng.');return this.locked(client,row.id);}
 async admin(client:PoolClient,code:string){const row=(await client.query('SELECT id FROM jinmemo_stay_bookings WHERE code=$1',[code])).rows[0];if(!row)throw new NotFoundException('Không tìm thấy đơn phòng.');return this.locked(client,row.id);}
 async assertPayable(id:string){const client=await this.db.pool.connect();try{await client.query('BEGIN');const s=await this.locked(client,id);if(s.reason)throw new ConflictException(s.reason);await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
 async credit(client:PoolClient,state:HotelPaymentState,reference:string,actor:string,method='BANK'){
  const {row,total}=state;
  await client.query('INSERT INTO jinmemo_payment_references(reference,kind,entity_id,amount)VALUES($1,$2,$3,$4)',[reference,'HOTEL_PAYMENT',row.id,total]);
  await client.query('UPDATE jinmemo_stay_bookings SET data=$1,expires_at=NULL,version=version+1 WHERE id=$2',[JSON.stringify({...row.data,paymentStatus:'PAID',paidAmount:total,paidAt:new Date().toISOString(),paymentReference:reference,paidMethod:method}),row.id]);
  await client.query('INSERT INTO jinmemo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),actor,'stay.pay',row.id]);
  await enqueueStayMail(client,row.id,'PAID',row.version+1);
 }
}
