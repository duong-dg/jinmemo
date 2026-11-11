import {BadRequestException,Body,ConflictException,Controller,ForbiddenException,Get,Injectable,Module,NotFoundException,Param,Post,Query,Req,Res,UseGuards} from '@nestjs/common';
import {randomUUID,createHash} from 'node:crypto';
import type {Request,Response} from 'express';
import {z} from 'zod';
import {AdminGuard,AuthModule} from '../admin/auth.module';
import {DatabaseService} from '../database/database.module';
import {RequestLimit} from '../http/request-limit';

const item=z.object({id:z.uuid(),name:z.string().trim().min(1).max(150),description:z.string().max(2000),nameEn:z.string().trim().max(150).optional(),descriptionEn:z.string().max(2000).optional(),imageId:z.uuid().optional(),price:z.number().int().positive().max(100000000),stock:z.number().int().min(0),active:z.boolean()}).strict();
const settings=z.object({version:z.number().int().nonnegative(),enabled:z.boolean(),shippingFee:z.number().int().min(0).max(10000000),items:z.array(item).max(200)}).strict();
const order=z.object({
 requestId:z.uuid(), fulfillment:z.enum(['PICKUP','DELIVERY']),expectedTotal:z.number().int().positive(),
 name:z.string().trim().min(2).max(120),phone:z.string().trim().regex(/^\+?[0-9 ()-]{8,25}$/),
 pickupCounterId:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/).optional(),
 address:z.string().trim().max(500).default(''),lines:z.array(z.object({id:z.uuid(),quantity:z.number().int().min(1).max(50)}).strict()).min(1).max(20),
}).strict();
const initial={version:0,enabled:false,shippingFee:50000,items:[] as z.infer<typeof item>[]};
function parse<T>(schema:z.ZodType<T>,body:unknown):T{
 const result=schema.safeParse(body);
 if(!result.success)throw new BadRequestException('Kiểm tra thông tin quà lưu niệm và số tiền.');
 return result.data;
}

@Injectable()
class GiftsService{
 constructor(private readonly db:DatabaseService){}
 async config(client:Pick<DatabaseService['pool'],'query'>=this.db.pool){
  const row=(await client.query("SELECT data,version FROM jinmemo_settings WHERE id='gifts'")).rows[0];
  return row?settings.parse({...row.data,version:row.version}):initial;
 }
 private async pickupCounters(client:Pick<DatabaseService['pool'],'query'>=this.db.pool){
  const {rows}=await client.query('SELECT id,data FROM jinmemo_counters ORDER BY id');
  return rows.filter(row=>row.data.status==='ACTIVE'&&typeof row.data.address==='string'&&row.data.address.trim()).map(row=>({id:row.id,name:row.data.name,address:row.data.address,nameEn:row.data.nameEn,addressEn:row.data.addressEn}));
 }
 async catalog(lang?:string){
  const config=await this.config();
  return {enabled:config.enabled,pickupCounters:config.enabled?await this.pickupCounters():[],shippingFee:config.shippingFee,items:config.enabled?config.items.filter(x=>x.active).map(x=>lang==='en'?{...x,name:x.nameEn||x.name,description:x.descriptionEn||x.description}:x):[]};
 }
 async save(body:unknown){
  const {version,...data}=parse(settings,body);
  if(new Set(data.items.map(x=>x.id)).size!==data.items.length)throw new BadRequestException('Mã sản phẩm bị trùng.');
  const client=await this.db.pool.connect();
  try{
   await client.query('BEGIN');
   await client.query("SELECT id FROM jinmemo_migrations WHERE id='gift_shop_lock' FOR UPDATE");
   const previous=await this.config(client);
   if(previous.version!==version)throw new ConflictException('Kho vừa thay đổi. Tải lại trước khi lưu.');
   const remaining=new Set(data.items.map(item=>item.id));
   const removed=new Set(previous.items.filter(item=>!remaining.has(item.id)).map(item=>item.id));
   if(removed.size){
    const openOrders=(await client.query("SELECT data FROM jinmemo_gift_orders WHERE status IN ('PENDING','SHIPPING')")).rows;
    if(openOrders.some(row=>row.data.lines.some((line:{id:string})=>removed.has(line.id)))){
     throw new ConflictException('Sản phẩm còn trong đơn đang xử lý. Hãy ẩn sản phẩm hoặc xử lý xong đơn trước khi xóa.');
    }
   }
   if(!version)await client.query("INSERT INTO jinmemo_settings(id,data)VALUES('gifts',$1)",[JSON.stringify(data)]);
   else await client.query("UPDATE jinmemo_settings SET data=$1,version=version+1 WHERE id='gifts'",[JSON.stringify(data)]);
   await client.query('COMMIT');
   return {...data,version:version+1};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 async create(body:unknown){
  const input=parse(order,body);
  if(input.fulfillment==='DELIVERY'&&input.address.length<8)throw new BadRequestException('Nhập địa chỉ giao hàng đầy đủ tại Việt Nam.');
  if(new Set(input.lines.map(line=>line.id)).size!==input.lines.length)throw new BadRequestException('Giỏ quà có sản phẩm trùng.');
  const fingerprint=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const client=await this.db.pool.connect();
  try{
   await client.query('BEGIN');
   await client.query("SELECT id FROM jinmemo_migrations WHERE id='gift_shop_lock' FOR UPDATE");
   const previous=(await client.query('SELECT code,data FROM jinmemo_gift_orders WHERE id=$1',[input.requestId])).rows[0];
   if(previous){
    if(previous.data.fingerprint!==fingerprint)throw new ConflictException('Mã đặt hàng đã được dùng.');
    await client.query('COMMIT');
    return {code:previous.code,total:previous.data.total};
   }
   const {version,...config}=await this.config(client);
   if(!config.enabled)throw new ConflictException('Quà lưu niệm chưa mở bán.');
   const lines=input.lines.map(line=>{
    const product=config.items.find(x=>x.id===line.id&&x.active);
    if(!product||product.stock<line.quantity)throw new ConflictException('Một món trong giỏ đã hết hàng hoặc không đủ số lượng.');
    return {...line,name:product.name,price:product.price};
   });
   const counters=input.fulfillment==='PICKUP'?await this.pickupCounters(client):[];
   const pickup=counters.find(counter=>counter.id===input.pickupCounterId);
   if(input.fulfillment==='PICKUP'&&(input.pickupCounterId||counters.length)&&!pickup)throw new ConflictException('Chọn lại quầy nhận hàng.');
   const shippingFee=input.fulfillment==='DELIVERY'?config.shippingFee:0;
   const total=lines.reduce((sum,line)=>sum+line.quantity*line.price,shippingFee);
   if(total!==input.expectedTotal)throw new ConflictException('Giá đã thay đổi. Tải lại trang để xem giá mới.');
   const code='JM-G'+randomUUID().replace(/-/g,'').slice(0,12).toUpperCase();
   const items=config.items.map(x=>({...x,stock:x.stock-(lines.find(line=>line.id===x.id)?.quantity??0)}));
   await client.query("UPDATE jinmemo_settings SET data=$1,version=version+1 WHERE id='gifts'",[JSON.stringify({...config,items})]);
   await client.query('INSERT INTO jinmemo_gift_orders(id,code,data)VALUES($1,$2,$3)',[input.requestId,code,JSON.stringify({...input,address:input.fulfillment==='DELIVERY'?input.address:pickup?.address||'',pickupCounterName:pickup?.name,lines,shippingFee,total,fingerprint})]);
   await client.query('COMMIT');
   return {code,total};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 async list(){
  return {data:(await this.db.pool.query('SELECT id,code,status,data,created_at FROM jinmemo_gift_orders ORDER BY created_at DESC LIMIT 100')).rows};
 }
 async update(id:string,body:unknown){
  const {status}=parse(z.object({status:z.enum(['SHIPPING','COMPLETED','CANCELLED'])}).strict(),body);
  const client=await this.db.pool.connect();
  try{
   await client.query('BEGIN');
   await client.query("SELECT id FROM jinmemo_migrations WHERE id='gift_shop_lock' FOR UPDATE");
   const row=(await client.query('SELECT status,data FROM jinmemo_gift_orders WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(!row)throw new NotFoundException();
   if(row.status!==status){
    if(['COMPLETED','CANCELLED'].includes(row.status)||status==='SHIPPING'&&row.data.fulfillment!=='DELIVERY')throw new ConflictException('Không thể đổi sang trạng thái này.');
    if(status==='CANCELLED'){
     const {version,...config}=await this.config(client);
     const items=config.items.map(x=>({...x,stock:x.stock+(row.data.lines.find((line:{id:string})=>line.id===x.id)?.quantity??0)}));
     await client.query("UPDATE jinmemo_settings SET data=$1,version=version+1 WHERE id='gifts'",[JSON.stringify({...config,items})]);
    }
    await client.query('UPDATE jinmemo_gift_orders SET status=$1 WHERE id=$2',[status,id]);
   }
   await client.query('COMMIT');
   return {ok:true};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
}

@Controller('gifts')
class GiftsController{
 private readonly limit=new RequestLimit();
 constructor(private readonly gifts:GiftsService){}
 @Get()async catalog(@Query('lang')lang:string|undefined,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return {data:await this.gifts.catalog(lang)};}
 @Post()create(@Body()body:unknown,@Req()req:Request,@Res({passthrough:true})res:Response){
  this.limit.check(req,res,'gift-order',10);
  if(req.headers['x-jinmemo-gifts']!=='1'||req.headers.origin!==new URL(process.env.PUBLIC_BASE_URL||'http://localhost:3000').origin)throw new ForbiddenException('Nguồn yêu cầu không hợp lệ.');
  return this.gifts.create(body);
 }
}
@Controller('admin/gifts')
@UseGuards(AdminGuard)
class AdminGiftsController{
 constructor(private readonly gifts:GiftsService){}
 @Get()async read(){return {config:await this.gifts.config(),...(await this.gifts.list())};}
 @Post()save(@Body()body:unknown){return this.gifts.save(body);}
 @Post('orders/:id')update(@Param('id')id:string,@Body()body:unknown){return this.gifts.update(id,body);}
}
@Module({imports:[AuthModule],providers:[GiftsService],controllers:[GiftsController,AdminGiftsController]})
export class GiftsModule{}
