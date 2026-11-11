import {BadRequestException,Body,Controller,Get,Module,Post,Req,Res,UseGuards} from '@nestjs/common';
import type {Request,Response} from 'express';
import {DatabaseService} from '../database/database.module';
import {AdminGuard,AuthModule} from './auth.module';
import {z} from 'zod';
const kinds=['TICKET','CAR','STAY','GIFT'] as const;
const columns=['last_ticket_id','last_car_id','last_stay_id','last_gift_id'] as const;
@Controller('admin/notifications')@UseGuards(AdminGuard)export class NotificationsController{
 constructor(private readonly db:DatabaseService){}
 @Get()async list(@Req()req:Request&{admin:{id:string}},@Res({passthrough:true})res:Response){
  res.setHeader('Cache-Control','private, no-store');const read=(await this.db.pool.query('SELECT * FROM jinmemo_admin_notification_reads WHERE admin_id=$1',[req.admin.id])).rows[0],cursors=columns.map(c=>Number(read?.[c]??read?.last_id??0));
  const latest=Number((await this.db.pool.query('SELECT max(id) AS id FROM jinmemo_admin_notifications')).rows[0].id||0),counts=(await this.db.pool.query("SELECT kind,count(*) AS total FROM jinmemo_admin_notifications WHERE (kind='TICKET' AND id>$1) OR (kind='CAR' AND id>$2) OR (kind='STAY' AND id>$3) OR (kind='GIFT' AND id>$4) GROUP BY kind",cursors)).rows;
  const rows=(await this.db.pool.query('SELECT * FROM jinmemo_admin_notifications ORDER BY id DESC LIMIT 20')).rows,values=kinds.map(kind=>Number(counts.find(r=>r.kind===kind)?.total||0));
  return {data:rows.map(row=>({...row,unread:Number(row.id)>(cursors[kinds.indexOf(row.kind)]||0)})),cursor:latest,ticket:values[0],car:values[1],stay:values[2],gift:values[3],total:values.reduce((n,v)=>n+v,0)};
 }
 @Post('read')async read(@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){
  const p=z.object({cursor:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),kind:z.enum(['ALL',...kinds]).default('ALL')}).strict().safeParse(body);if(!p.success)throw new BadRequestException();const client=await this.db.pool.connect();
  try{await client.query('BEGIN');await client.query('SELECT id FROM jinmemo_admins WHERE id=$1 FOR UPDATE',[req.admin.id]);const last=Number((await client.query('SELECT max(id) AS id FROM jinmemo_admin_notifications')).rows[0].id||0),old=(await client.query('SELECT * FROM jinmemo_admin_notification_reads WHERE admin_id=$1',[req.admin.id])).rows[0],cursor=Math.min(last,p.data.cursor),values=columns.map((c,i)=>Math.max(Number(old?.[c]??old?.last_id??0),p.data.kind==='ALL'||p.data.kind===kinds[i]?cursor:0)),legacy=p.data.kind==='ALL'?Math.max(Number(old?.last_id||0),cursor):Number(old?.last_id||0);
   if(old)await client.query('UPDATE jinmemo_admin_notification_reads SET last_id=$1,last_ticket_id=$2,last_car_id=$3,last_stay_id=$4,last_gift_id=$5 WHERE admin_id=$6',[legacy,...values,req.admin.id]);else await client.query('INSERT INTO jinmemo_admin_notification_reads(admin_id,last_id,last_ticket_id,last_car_id,last_stay_id,last_gift_id)VALUES($1,$2,$3,$4,$5,$6)',[req.admin.id,legacy,...values]);await client.query('COMMIT');return {ok:true};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
}
@Module({imports:[AuthModule],controllers:[NotificationsController]})export class NotificationsModule{}
