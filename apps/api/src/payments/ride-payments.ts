import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {randomBytes,randomUUID} from 'node:crypto';
import {DatabaseService} from '../database/database.module';
import {PaymentSettings} from './settings';
import {sepayWebhookCredential} from './protocol';
@Injectable()
export class RidePayments{
 constructor(private readonly db:DatabaseService,private readonly settings:PaymentSettings){}
 async available(){const c=await this.settings.config();const plan=(await this.db.pool.query("SELECT data FROM jinmemo_settings WHERE id='transport-plan'")).rows[0]?.data;return !!(plan?.qrEnabled&&c.mode==='LIVE'&&c.sepayEnabled&&c.bankCode&&c.accountNumber&&sepayWebhookCredential(c));}
 async assertAvailable(){if(!await this.available())throw new BadRequestException('Thanh toán QR cho xe chưa bật. Chọn thanh toán sau.');}
 async checkout(code:string,requestKey?:string,actor?:string){
  await this.assertAvailable();const c=await this.settings.config(),client=await this.db.pool.connect();try{await client.query('BEGIN');await client.query("SELECT id FROM jinmemo_migrations WHERE id='037_cart_requests' FOR UPDATE");
  const row=(await client.query('SELECT * FROM jinmemo_ride_bookings WHERE code=$1 FOR UPDATE',[code])).rows[0];if(!row||!actor&&(row.request_key!==requestKey||row.data.channel==='POS'))throw new NotFoundException('Không tìm thấy đơn xe.');
  if((await client.query('SELECT bundle_id FROM jinmemo_checkout_members WHERE kind=$1 AND entity_id=$2',['rideId',row.id])).rowCount)throw new ConflictException('Đơn xe thuộc thanh toán chung. Mở đơn JB để thanh toán tổng.');
  if(row.status==='CANCELLED'||row.data.paymentStatus==='PAID'||row.data.total<=0)throw new ConflictException('Đơn đã hủy hoặc đã thanh toán.');
  if(actor&&['PENDING','WAITING_MATCH'].includes(row.status))throw new ConflictException('Xác nhận xe / chốt nhóm trước khi tạo QR thu tiền.');
  let attempt=(await client.query("SELECT * FROM jinmemo_ride_payment_attempts WHERE ride_id=$1 AND status='PENDING' AND expires_at>$2 AND amount=$3 AND config_version=$4 ORDER BY created_at DESC LIMIT 1",[row.id,new Date(),row.data.total,c.version])).rows[0];
  if(!attempt){attempt={id:'JMR'+randomBytes(12).toString('hex').toUpperCase(),amount:row.data.total,expires_at:new Date(Date.now()+15*60000),config:{bankCode:c.bankCode,accountNumber:c.accountNumber,accountName:c.accountName}};await client.query('INSERT INTO jinmemo_ride_payment_attempts(id,ride_id,amount,config_version,config,expires_at)VALUES($1,$2,$3,$4,$5,$6)',[attempt.id,row.id,attempt.amount,c.version,JSON.stringify(attempt.config),attempt.expires_at]);if(actor)await client.query('INSERT INTO jinmemo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),actor,'ride.qr.create',row.id]);}
  await client.query('COMMIT');return{code:row.code,memo:attempt.id,amount:Number(attempt.amount),expiresAt:attempt.expires_at,...attempt.config,qrUrl:'https://vietqr.app/img?'+new URLSearchParams({acc:attempt.config.accountNumber,bank:attempt.config.bankCode,amount:String(attempt.amount),des:attempt.id})};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
 // Called only after the common SePay endpoint verifies OAuth/API key/HMAC and bank details.
 async settle(token:string|undefined,external:string,amount:number,fingerprint:string,reason:string,credential:string){
 const client=await this.db.pool.connect(),id='SEPAY:LIVE:'+external;try{await client.query('BEGIN');
 const prior=(await client.query('SELECT fingerprint FROM jinmemo_gateway_events WHERE id=$1',[id])).rows[0];if(prior){if(prior.fingerprint!==fingerprint)throw new ConflictException('Giao dịch trùng có nội dung khác.');await client.query('COMMIT');return;}
 const claim=await client.query("INSERT INTO jinmemo_gateway_events(id,provider,mode,amount,status,reason,fingerprint)VALUES($1,'SEPAY','LIVE',$2,'REVIEW','Đang xử lý',$3) ON CONFLICT(id) DO NOTHING RETURNING id",[id,amount,fingerprint]);
 if(!claim.rowCount){const old=(await client.query('SELECT fingerprint FROM jinmemo_gateway_events WHERE id=$1',[id])).rows[0];if(old?.fingerprint!==fingerprint)throw new ConflictException('Giao dịch trùng có nội dung khác.');await client.query('COMMIT');return;}
 await client.query("SELECT id FROM jinmemo_migrations WHERE id='037_cart_requests' FOR UPDATE");
 const attempt=token?(await client.query('SELECT * FROM jinmemo_ride_payment_attempts WHERE id=$1',[token])).rows[0]:null;
 const row=attempt?(await client.query('SELECT * FROM jinmemo_ride_bookings WHERE id=$1 FOR UPDATE',[attempt.ride_id])).rows[0]:null;
 const c=(await client.query("SELECT data FROM jinmemo_settings WHERE id='payments' FOR SHARE")).rows[0]?.data||{};if(!reason&&(c.mode!=='LIVE'||!c.sepayEnabled||credential!==sepayWebhookCredential(c)))reason='Cổng hoặc khóa SePay đã thay đổi';
 if(!reason&&(!row||!attempt))reason='Không tìm thấy yêu cầu thanh toán xe';
 if(!reason&&(attempt.config.bankCode!==c.bankCode||attempt.config.accountNumber!==c.accountNumber))reason='Tài khoản nhận đã thay đổi';
 if(!reason&&(attempt.status!=='PENDING'||new Date(attempt.expires_at).getTime()<=Date.now()))reason='QR đã hết hạn hoặc đã sử dụng';
 if(!reason&&(row.status==='CANCELLED'||row.data.paymentStatus==='PAID'))reason='Đơn xe đã hủy hoặc đã thu tiền';
 if(!reason&&(Number(attempt.amount)!==amount||row.data.total!==amount))reason='Số tiền không khớp đơn xe';
 if(!reason&&(await client.query('SELECT reference FROM jinmemo_payment_references WHERE reference=$1',[id])).rowCount)reason='Giao dịch đã ghi thu';
 if(!reason){await client.query('INSERT INTO jinmemo_payment_references(reference,kind,entity_id,amount)VALUES($1,$2,$3,$4)',[id,'RIDE_PAYMENT',row.id,amount]);await client.query('UPDATE jinmemo_ride_bookings SET data=$1,version=version+1 WHERE id=$2',[JSON.stringify({...row.data,paymentStatus:'PAID',paidAmount:amount,paidAt:new Date().toISOString(),paymentReference:id}),row.id]);await client.query("UPDATE jinmemo_ride_payment_attempts SET status='PAID' WHERE id=$1",[attempt.id]);await client.query('INSERT INTO jinmemo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),'gateway:SEPAY','ride.pay',row.id]);}
 if(row)await client.query('INSERT INTO jinmemo_ride_payment_events(event_id,ride_id)VALUES($1,$2)',[id,row.id]);
 await client.query('UPDATE jinmemo_gateway_events SET status=$1,reason=$2 WHERE id=$3',[reason?'REVIEW':'PAID',reason||'Đã thu tiền đơn xe '+row.code,id]);await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
}
