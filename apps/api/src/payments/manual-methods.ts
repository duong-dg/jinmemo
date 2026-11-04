import {BadRequestException,Body,ConflictException,Controller,Get,Global,Injectable,Module,Post,Req,Res,UseGuards} from '@nestjs/common';
import type {Request,Response} from 'express';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {DatabaseService} from '../database/database.module';
import {AdminGuard,AuthModule} from '../admin/auth.module';
import{manualMethodId}from'./manual-methods.schema';
const method=z.object({id:manualMethodId,name:z.string().trim().min(1).max(100),englishName:z.string().trim().max(100).default(''),instructions:z.string().trim().max(600).default(''),englishInstructions:z.string().trim().max(600).default(''),enabled:z.boolean()}).strict();
const schema=z.object({version:z.number().int().min(0),methods:z.array(method).max(20)}).strict().refine(v=>new Set(v.methods.map(m=>m.id)).size===v.methods.length,'Mã phương thức bị trùng.');
const initial={version:0,methods:[{id:'PAY_LATER',name:'Thanh toán sau',englishName:'Pay later',instructions:'Nhân viên sẽ liên hệ xác nhận và hướng dẫn thanh toán.',englishInstructions:'Our staff will contact you to confirm the booking and arrange payment.',enabled:true}]};
@Injectable()export class ManualMethods {
 constructor(private readonly db:DatabaseService){}
 async read(client:Pick<DatabaseService['pool'],'query'>=this.db.pool){const row=(await client.query("SELECT data,version FROM jinmemo_settings WHERE id='manual-payments'")).rows[0];return row?{version:row.version,methods:row.data.methods as z.infer<typeof method>[]} :structuredClone(initial);}
 async active(){return(await this.read()).methods.filter(m=>m.enabled);}
 async select(id:string,client:Pick<DatabaseService['pool'],'query'>=this.db.pool){const selected=(await this.read(client)).methods.find(m=>m.enabled&&m.id===id);if(!selected)throw new BadRequestException('Phương thức thanh toán đã tắt hoặc không tồn tại. Vui lòng chọn lại.');return {id:selected.id,name:selected.name,englishName:selected.englishName||selected.name,instructions:selected.instructions,englishInstructions:selected.englishInstructions||selected.instructions};}
 async save(body:unknown,actor:string){const parsed=schema.safeParse(body);if(!parsed.success)throw new BadRequestException('Kiểm tra tên, mã và hướng dẫn phương thức thanh toán (tối đa 20 mục).');const input=parsed.data,client=await this.db.pool.connect();try{await client.query('BEGIN');await client.query("SELECT id FROM jinmemo_migrations WHERE id='037_cart_requests' FOR UPDATE");const old=await this.read(client);if(old.version!==input.version)throw new ConflictException('Phương thức đã thay đổi. Tải lại trước khi lưu.');if(old.version)await client.query("UPDATE jinmemo_settings SET data=$1,version=version+1 WHERE id='manual-payments'",[JSON.stringify({methods:input.methods})]);else await client.query("INSERT INTO jinmemo_settings(id,data)VALUES('manual-payments',$1)",[JSON.stringify({methods:input.methods})]);await client.query('INSERT INTO jinmemo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),actor,'payment.manual-methods.save','manual-payments']);await client.query('COMMIT');return await this.read(client);}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
}
@Controller('admin/manual-payments')@UseGuards(AdminGuard)class ManualMethodsController{
 constructor(private readonly methods:ManualMethods){}
 @Get()async read(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return this.methods.read();}
 @Post()save(@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){return this.methods.save(body,req.admin.id);}
}
@Global()@Module({imports:[AuthModule],providers:[ManualMethods],exports:[ManualMethods],controllers:[ManualMethodsController]})export class ManualMethodsModule{}
