import {BadRequestException,Body,ConflictException,Controller,Get,Global,Injectable,Module,Post,Req,Res,UseGuards} from '@nestjs/common';
import type {Request,Response} from 'express';
import type {PoolClient} from 'pg';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {DatabaseService} from '../database/database.module';
import {AdminGuard,AuthModule} from '../admin/auth.module';

const schema=z.object({version:z.number().int().nonnegative(),giftsEnabled:z.boolean(),staysEnabled:z.boolean()}).strict();
@Injectable()
export class FeaturesService{
 constructor(private readonly db:DatabaseService){}
 async read(client:Pick<PoolClient,'query'>=this.db.pool){
  const row=(await client.query("SELECT data,version FROM jinmemo_settings WHERE id='features'")).rows[0];
  if(row)return {version:row.version,giftsEnabled:!!row.data.giftsEnabled,staysEnabled:!!row.data.staysEnabled};
  const gifts=(await client.query("SELECT data FROM jinmemo_settings WHERE id='gifts'")).rows[0];
  return {version:0,giftsEnabled:!!gifts?.data.enabled,staysEnabled:false};
 }
 async save(body:unknown,actor:string){
  const parsed=schema.safeParse(body);if(!parsed.success)throw new BadRequestException('Kiểm tra lựa chọn phân hệ.');const {version,...data}=parsed.data,client=await this.db.pool.connect();
  try{await client.query('BEGIN');await client.query("SELECT id FROM jinmemo_migrations WHERE id='037_cart_requests' FOR UPDATE");await client.query("SELECT id FROM jinmemo_migrations WHERE id='gift_shop_lock' FOR UPDATE");const old=await this.read(client);if(old.version!==version)throw new ConflictException('Thiết lập vừa thay đổi. Tải lại trước khi lưu.');
   if(version)await client.query("UPDATE jinmemo_settings SET data=$1,version=version+1 WHERE id='features'",[JSON.stringify(data)]);else await client.query("INSERT INTO jinmemo_settings(id,data)VALUES('features',$1)",[JSON.stringify(data)]);
   const gift=(await client.query("SELECT data FROM jinmemo_settings WHERE id='gifts'")).rows[0];
   if(gift)await client.query("UPDATE jinmemo_settings SET data=$1,version=version+1 WHERE id='gifts'",[JSON.stringify({...gift.data,enabled:data.giftsEnabled})]);
   else if(data.giftsEnabled)await client.query("INSERT INTO jinmemo_settings(id,data)VALUES('gifts',$1)",[JSON.stringify({enabled:true,shippingFee:50000,items:[]})]);
   await client.query('INSERT INTO jinmemo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),actor,'features.save','features']);await client.query('COMMIT');return await this.read(client);
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
}
@Controller('site/features')class PublicFeaturesController{constructor(private readonly features:FeaturesService){}@Get()async read(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');const {version,...flags}=await this.features.read();return {data:flags};}}
@Controller('admin/features')@UseGuards(AdminGuard)class AdminFeaturesController{constructor(private readonly features:FeaturesService){}@Get()read(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');return this.features.read();}@Post()save(@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){return this.features.save(body,req.admin.id);}}
@Global()@Module({imports:[AuthModule],providers:[FeaturesService],exports:[FeaturesService],controllers:[PublicFeaturesController,AdminFeaturesController]})export class FeaturesModule{}
