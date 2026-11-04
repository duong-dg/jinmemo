import {BadRequestException,Body,ConflictException,Controller,Get,Module,Post,Req,Res,UseGuards} from '@nestjs/common';
import type {Request,Response} from 'express';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {DatabaseService} from '../database/database.module';
import {AdminGuard,AuthModule} from '../admin/auth.module';
import {planSchema,quoteRoutes,remainingSeats,suggestTrips,tripOpen} from './planning.schema';
const input=z.object({version:z.number().int().min(0),plan:planSchema}).strict();
@Controller('admin/transport-plan')@UseGuards(AdminGuard)export class TransportPlanningController{
 constructor(private readonly db:DatabaseService){}
 @Get()async read(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');const row=(await this.db.pool.query("SELECT data,version FROM jinmemo_settings WHERE id='transport-plan'")).rows[0];return row?{plan:row.data,version:row.version}:{plan:{vehicles:[],areas:[],fares:[],trips:[],requests:[]},version:0};}
 @Post()async save(@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){const parsed=input.safeParse(body);if(!parsed.success)throw new BadRequestException(parsed.error.issues.map(i=>i.message).join('\n'));const {plan,version}=parsed.data,client=await this.db.pool.connect();try{await client.query('BEGIN');await client.query("SELECT id FROM jinmemo_migrations WHERE id='037_cart_requests' FOR UPDATE");const old=(await client.query("SELECT version FROM jinmemo_settings WHERE id='transport-plan'")).rows[0];if((old?.version||0)!==version)throw new ConflictException('Bản khung đã được sửa ở nơi khác. Tải lại trước khi lưu.');if(old)await client.query("UPDATE jinmemo_settings SET data=$1,version=version+1 WHERE id='transport-plan'",[JSON.stringify(plan)]);else await client.query("INSERT INTO jinmemo_settings(id,data)VALUES('transport-plan',$1)",[JSON.stringify(plan)]);await client.query('INSERT INTO jinmemo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),req.admin.id,'transport.plan.save','transport-plan']);await client.query('COMMIT');return{plan,version:version+1};}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
 @Post('preview')preview(@Body()body:unknown,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');const parsed=z.object({plan:planSchema,from:z.string(),to:z.string(),passengers:z.number().int().min(1).max(60)}).strict().safeParse(body);if(!parsed.success)throw new BadRequestException(parsed.error.issues.map(i=>i.message).join('\n'));const {plan,from,to,passengers}=parsed.data;return{quotes:quoteRoutes(plan,from,to,passengers),trips:plan.trips.map(t=>({id:t.id,remaining:remainingSeats(plan,t),open:tripOpen(t)&&remainingSeats(plan,t)>0})),suggestions:Object.fromEntries(plan.requests.filter(r=>r.status==='WAITING').map(r=>[r.id,suggestTrips(plan,r)]))};}
}
@Module({imports:[AuthModule],controllers:[TransportPlanningController]})export class TransportPlanningModule{}
