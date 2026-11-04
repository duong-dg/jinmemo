import {BadRequestException,Body,ConflictException,Controller,Get,Module,NotFoundException,Param,Post,Query,Req,Res,UseGuards} from '@nestjs/common';
import type {Request,Response} from 'express';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {DatabaseService} from '../database/database.module';
import {AdminGuard,AuthModule} from '../admin/auth.module';
const update=z.object({version:z.number().int().positive(),status:z.enum(['PENDING','ASSIGNED','RUNNING','COMPLETED']),driver:z.string().trim().max(120),phone:z.string().trim().max(25),plate:z.string().trim().max(30),operator:z.string().trim().max(150),note:z.string().trim().max(1000)}).strict();
@Controller('admin/transport') @UseGuards(AdminGuard)
export class TransportController {
 constructor(private readonly db:DatabaseService){}
 @Get() async list(@Query('date')date:string|undefined,@Query('page')page:string|undefined,@Res({passthrough:true})res:Response){
  res.setHeader('Cache-Control','private, no-store');
  if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new BadRequestException('Ngày không hợp lệ.');
  const current=Math.max(1,Math.min(100000,Number(page)||1));if(!Number.isInteger(current))throw new BadRequestException('Trang không hợp lệ.');
  const where=date?' WHERE j.visit_date=$1':'',params=date?[date]:[];
  const count=await this.db.pool.query('SELECT count(*) AS total FROM jinmemo_transport_jobs j'+where,params);
  const result=await this.db.pool.query('SELECT j.*,o.code,o.snapshot,o.contact,o.booking_status,o.payment_status FROM jinmemo_transport_jobs j JOIN jinmemo_orders o ON o.id=j.order_id'+where+' ORDER BY j.visit_date DESC,j.order_id LIMIT 30 OFFSET '+((current-1)*30),params);
  return {data:result.rows,total:Number(count.rows[0].total),page:current};
 }
 @Post(':id') async save(@Param('id')id:string,@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){
  const parsed=update.safeParse(body);if(!parsed.success)throw new BadRequestException('Thông tin điều xe không hợp lệ.');const input=parsed.data;
  if(input.status!=='PENDING'&&(!input.driver||!/^\+?[0-9 ()-]{8,25}$/.test(input.phone)||!input.plate))throw new BadRequestException('Điền tài xế, điện thoại và biển số trước khi điều xe.');
  const client=await this.db.pool.connect();try{await client.query('BEGIN');
   const order=(await client.query('SELECT booking_status FROM jinmemo_orders WHERE id=$1 FOR UPDATE',[id])).rows[0];
   const job=(await client.query('SELECT * FROM jinmemo_transport_jobs WHERE order_id=$1 FOR UPDATE',[id])).rows[0];
   if(!job||!order)throw new NotFoundException('Không tìm thấy chuyến xe.');
   if(order.booking_status!=='CONFIRMED')throw new ConflictException('Đơn đã hủy; không thể điều xe.');
   if(job.version!==input.version)throw new ConflictException('Chuyến vừa được cập nhật. Tải lại trước khi lưu.');
   const transitions:Record<string,string[]>={PENDING:['PENDING','ASSIGNED'],ASSIGNED:['PENDING','ASSIGNED','RUNNING'],RUNNING:['RUNNING','COMPLETED'],COMPLETED:[]};
   if(!transitions[job.status]?.includes(input.status))throw new ConflictException('Không thể chuyển trạng thái này.');
   const {version,status,...data}=input;
   await client.query('UPDATE jinmemo_transport_jobs SET status=$1,data=$2,version=version+1 WHERE order_id=$3',[status,JSON.stringify(data),id]);
   await client.query('INSERT INTO jinmemo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),req.admin.id,'transport.'+status.toLowerCase(),id]);
   await client.query('COMMIT');return {ok:true};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
}
@Module({imports:[AuthModule],controllers:[TransportController]}) export class TransportModule{}
