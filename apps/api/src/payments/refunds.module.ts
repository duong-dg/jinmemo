import {BadRequestException,Body,ConflictException,Controller,Get,Injectable,Module,NotFoundException,Post,Query,Req,Res,UseGuards} from '@nestjs/common';
import type {Request,Response} from 'express';
import type {PoolClient} from 'pg';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {DatabaseService} from '../database/database.module';
import {AdminGuard,AuthModule} from '../admin/auth.module';

const code=z.string().trim().toUpperCase().regex(/^(?:J[MCBH][A-F0-9]{10}|JM-[XG][A-F0-9]{12})$/);
const lookup=z.object({code}).strict();
const record=lookup.extend({requestId:z.uuid(),amount:z.number().int().positive().max(15000000000),recipient:z.string().trim().min(2).max(150),method:z.enum(['BANK','CASH','GATEWAY']),reference:z.string().trim().max(150).default(''),refundedOn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),note:z.string().trim().min(5).max(1000),verified:z.literal(true)}).strict().refine(value=>value.method==='CASH'||value.reference.length>=3,'Thêm mã giao dịch hoàn tiền.');
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function parse<T>(schema:z.ZodType<T>,body:unknown):T{const p=schema.safeParse(body);if(!p.success)throw new BadRequestException('Kiểm tra mã đơn, khoản hoàn, người nhận, ngày, tham chiếu và xác nhận đã chuyển tiền.');return p.data;}
type Target={kind:string;id:string;code:string;paid:number;payer:string;phone:string;payeeType:'CUSTOMER'|'PARTNER';refunded:number;remaining:number};

@Injectable()
export class RefundsService{
 constructor(private readonly db:DatabaseService){}
 private async target(client:PoolClient,value:string):Promise<Target>{
  await client.query("SELECT id FROM jinmemo_migrations WHERE id='037_cart_requests' FOR UPDATE");
  let kind='',id='',paid=0,payer='',phone='',payeeType:'CUSTOMER'|'PARTNER'='CUSTOMER';
  if(value.startsWith('JH')){
   const row=(await client.query('SELECT * FROM jinmemo_stay_bookings WHERE code=$1 FOR UPDATE',[value])).rows[0];if(!row)throw new NotFoundException('Không tìm thấy đơn phòng.');kind='HOTEL';id=row.id;payer=row.data.contact.name;phone=row.data.contact.phone;paid=Number((await client.query("SELECT COALESCE(SUM(amount),0) AS amount FROM jinmemo_payment_references WHERE entity_id=$1 AND kind='HOTEL_PAYMENT'",[id])).rows[0].amount);
  }else if(value.startsWith('JB')){
   const row=(await client.query('SELECT * FROM jinmemo_checkout_bundles WHERE code=$1 FOR UPDATE',[value])).rows[0];if(!row)throw new NotFoundException('Không tìm thấy đơn thanh toán chung.');
   kind='BUNDLE';id=row.id;payer=row.data.contact?.name||'';phone=row.data.contact?.phone||'';
   paid=row.status==='PAID'?Number((await client.query("SELECT COALESCE(SUM(amount),0) AS amount FROM jinmemo_payment_references WHERE entity_id=$1 AND kind='BUNDLE_PAYMENT'",[id])).rows[0].amount):0;
  }else if(value.startsWith('JC')){
   const row=(await client.query('SELECT * FROM jinmemo_carts WHERE code=$1 FOR UPDATE',[value])).rows[0];if(!row)throw new NotFoundException('Không tìm thấy đơn vé.');
   await this.requireRoot(client,'cartId',row.id);
   const orders=(await client.query('SELECT o.* FROM jinmemo_cart_orders m JOIN jinmemo_orders o ON o.id=m.order_id WHERE m.cart_id=$1 ORDER BY o.id FOR UPDATE',[row.id])).rows;
   kind='CART';id=row.id;payer=orders[0]?.contact.name||'';phone=orders[0]?.contact.phone||'';
   for(const order of orders)paid+=Number((await client.query('SELECT COALESCE(SUM(amount),0) AS amount FROM jinmemo_order_payments WHERE order_id=$1',[order.id])).rows[0].amount);
   if(row.partner_id){const partner=(await client.query('SELECT data FROM jinmemo_partners WHERE id=$1',[row.partner_id])).rows[0];if(!partner)throw new ConflictException('Cần đối chiếu thông tin CTV đã thanh toán trước khi ghi hoàn.');payer=partner.data.name;phone=partner.data.phone||'';payeeType='PARTNER';}
  }else if(value.startsWith('JM-X')||value.startsWith('JM-G')){
   const ride=value.startsWith('JM-X'),table=ride?'jinmemo_ride_bookings':'jinmemo_gift_orders';
   const row=(await client.query('SELECT * FROM '+table+' WHERE code=$1 FOR UPDATE',[value])).rows[0];if(!row)throw new NotFoundException('Không tìm thấy đơn.');
   await this.requireRoot(client,ride?'rideId':'giftId',row.id);
   kind=ride?'RIDE':'GIFT';id=row.id;payer=ride?row.data.contact?.name||'':row.data.name;phone=ride?row.data.contact?.phone||'':row.data.phone;
   paid=row.data.paymentStatus==='PAID'?Number(row.data.paidAmount||0):0;
  }else{
   const row=(await client.query('SELECT * FROM jinmemo_orders WHERE code=$1 FOR UPDATE',[value])).rows[0];if(!row)throw new NotFoundException('Không tìm thấy đơn vé.');
   const cart=(await client.query('SELECT c.code FROM jinmemo_cart_orders m JOIN jinmemo_carts c ON c.id=m.cart_id WHERE m.order_id=$1',[row.id])).rows[0];if(cart)throw new ConflictException('Gói này thuộc đơn '+cart.code+'. Nhập mã đơn tổng để tránh ghi hoàn trùng.');
   kind='ORDER';id=row.id;payer=row.contact.name;phone=row.contact.phone;
   paid=Number((await client.query('SELECT COALESCE(SUM(amount),0) AS amount FROM jinmemo_order_payments WHERE order_id=$1',[id])).rows[0].amount);
   const partner=(await client.query('SELECT p.data FROM jinmemo_partner_orders o JOIN jinmemo_partners p ON p.id=o.partner_id WHERE o.order_id=$1',[id])).rows[0];if(partner){payer=partner.data.name;phone=partner.data.phone||'';payeeType='PARTNER';}
  }
  if(!Number.isSafeInteger(paid)||paid<=0)throw new ConflictException('Đơn chưa có khoản thực thu để ghi hoàn. Công nợ chưa thu không phải tiền đã nhận.');
  const refunded=Number((await client.query('SELECT COALESCE(SUM(amount),0) AS amount FROM jinmemo_refunds WHERE root_kind=$1 AND root_id=$2',[kind,id])).rows[0].amount);
  return {kind,id,code:value,paid,payer,phone,payeeType,refunded,remaining:Math.max(0,paid-refunded)};
 }
 private async requireRoot(client:PoolClient,kind:string,id:string){const row=(await client.query('SELECT b.code FROM jinmemo_checkout_members m JOIN jinmemo_checkout_bundles b ON b.id=m.bundle_id WHERE m.kind=$1 AND m.entity_id=$2',[kind,id])).rows[0];if(row)throw new ConflictException('Đơn thuộc thanh toán chung '+row.code+'. Ghi hoàn trên mã JB để tránh hoàn trùng.');}
 async preview(body:unknown){const input=parse(lookup,body),client=await this.db.pool.connect();try{await client.query('BEGIN');const target=await this.target(client,input.code);await client.query('COMMIT');return target;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}
 async create(body:unknown,actor:string){
  const input=parse(record,body),date=new Date(input.refundedOn+'T12:00:00+07:00');
  if(!Number.isFinite(date.getTime())||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)!==input.refundedOn||input.refundedOn>today())throw new BadRequestException('Ngày hoàn tiền không hợp lệ hoặc nằm trong tương lai.');
  const fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex'),reference=input.method==='CASH'?'CASH:'+input.requestId:input.reference.toUpperCase(),referenceKey=input.method+':'+reference,client=await this.db.pool.connect();
  try{
   await client.query('BEGIN');await client.query("SELECT id FROM jinmemo_migrations WHERE id='037_cart_requests' FOR UPDATE");
   const prior=(await client.query('SELECT id,data FROM jinmemo_refunds WHERE id=$1',[input.requestId])).rows[0];
   if(prior){if(prior.data.fingerprint!==fingerprint)throw new ConflictException('Mã yêu cầu đã dùng với nội dung khác.');await client.query('COMMIT');return {id:prior.id,recorded:true};}
   const target=await this.target(client,input.code);
   if(input.amount>target.remaining)throw new ConflictException('Khoản hoàn vượt số tiền còn có thể hoàn: '+target.remaining.toLocaleString('vi-VN')+'đ.');
   if((await client.query('SELECT id FROM jinmemo_refunds WHERE reference_key=$1',[referenceKey])).rowCount)throw new ConflictException('Mã giao dịch hoàn tiền đã được ghi nhận.');
   const data={recipient:input.recipient,method:input.method,reference,note:input.note,payer:target.payer,payeeType:target.payeeType,actor,fingerprint};
   await client.query('INSERT INTO jinmemo_refunds(id,root_kind,root_id,root_code,amount,refunded_on,reference_key,data)VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[input.requestId,target.kind,target.id,target.code,input.amount,input.refundedOn,referenceKey,JSON.stringify(data)]);
   await client.query('INSERT INTO jinmemo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),actor,'payment.refund.record',input.requestId]);
   await client.query('COMMIT');return {id:input.requestId,recorded:true};
  }catch(error){await client.query('ROLLBACK');if((error as {code?:string}).code==='23505')throw new ConflictException('Giao dịch hoàn tiền đã được ghi nhận.');throw error;}finally{client.release();}
 }
 async list(query:unknown){
  const input=parse(z.object({q:z.string().trim().max(120).default(''),page:z.coerce.number().int().min(1).max(100000).default(1)}).strict(),query);
  const values:unknown[]=[],where=input.q?" WHERE (root_code ILIKE $1 OR data->>'recipient' ILIKE $1 OR data->>'reference' ILIKE $1)":'';if(input.q)values.push('%'+input.q.replace(/[\\%_]/g,'')+'%');
  const total=Number((await this.db.pool.query('SELECT COUNT(*) AS total FROM jinmemo_refunds'+where,values)).rows[0].total),page=Math.min(input.page,Math.max(1,Math.ceil(total/25)));
  const rows=(await this.db.pool.query('SELECT id,root_code,root_kind,amount,refunded_on,data,created_at FROM jinmemo_refunds'+where+' ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET $'+(values.length+1),[...values,(page-1)*25])).rows;
  const actorIds=[...new Set(rows.map(row=>row.data.actor as string))],actors=actorIds.length?(await this.db.pool.query('SELECT id,email FROM jinmemo_admins WHERE id IN ('+actorIds.map((_,index)=>'$'+(index+1)).join(',')+')',actorIds)).rows:[];
  return {data:rows.map(row=>({...row,amount:Number(row.amount),data:{recipient:row.data.recipient,payer:row.data.payer,payeeType:row.data.payeeType,method:row.data.method,reference:row.data.reference,note:row.data.note,actor:row.data.actor,actorName:actors.find(actor=>actor.id===row.data.actor)?.email||row.data.actor}})),total,page,pageSize:25};
 }
}
@Controller('admin/refunds')@UseGuards(AdminGuard)
class RefundsController{
 constructor(private readonly refunds:RefundsService){}
 @Get()list(@Query()query:unknown,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');return this.refunds.list(query);}
 @Post('preview')preview(@Body()body:unknown,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');return this.refunds.preview(body);}
 @Post()create(@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){return this.refunds.create(body,req.admin.id);}
}
@Module({imports:[AuthModule],providers:[RefundsService],controllers:[RefundsController]})export class RefundsModule{}
