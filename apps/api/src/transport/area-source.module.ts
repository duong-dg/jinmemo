import type {Request,Response} from 'express';
import {RequestLimit} from '../http/request-limit';
import {BadRequestException,Controller,Get,Module,Query,Req,Res,ServiceUnavailableException,UseGuards} from '@nestjs/common';
import {AdminGuard,AuthModule} from '../admin/auth.module';
import {z} from 'zod';
const unit=z.object({code:z.number().int().positive(),name:z.string().min(1).max(150)});
export function importedAreas(version:'v1'|'v2',province:unknown,district?:unknown){const p=unit.parse(province),root='vn-'+version+'-p-'+p.code,old=version==='v1'?' (cũ)':'';const areas:{id:string;name:string;parentId?:string;surcharges:Record<string,number>}[]=[{id:root,name:p.name+old,surcharges:{}}];let parent=root;let source:any=province;if(version==='v1'){const d=unit.parse(district);parent='vn-v1-d-'+d.code;source=district;areas.push({id:parent,name:d.name+old,parentId:root,surcharges:{}});}const wards=z.array(unit).max(500).parse(source.wards);for(const w of wards)areas.push({id:'vn-'+version+'-w-'+w.code,name:w.name+old,parentId:parent,surcharges:{}});return areas;}
const cache=new Map<string,{until:number;data:unknown}>();
async function get(path:string){const cached=cache.get(path);if(cached&&cached.until>Date.now())return cached.data;try{const response=await fetch('https://provinces.open-api.vn/api/'+path,{signal:AbortSignal.timeout(12000),redirect:'error'});if(!response.ok)throw new Error();const raw=await response.text();if(raw.length>1000000)throw new Error();const data=JSON.parse(raw);if(cache.size>=128)cache.delete(cache.keys().next().value!);cache.set(path,{until:Date.now()+86400000,data});return data;}catch{throw new ServiceUnavailableException('Chưa tải được danh mục tỉnh/thành. Thử lại sau; khu vực đã lưu vẫn dùng bình thường.');}}
@Controller('admin/ride-areas')@UseGuards(AdminGuard)
export class AreaSourceController{
 @Get()async load(@Query('version')version='v2',@Query('province')province='',@Query('district')district=''){
 if(!['v1','v2'].includes(version)||province&&!/^\d{1,3}$/.test(province)||district&&!/^\d{1,4}$/.test(district)||district&&!province)throw new BadRequestException('Tham số khu vực không hợp lệ.');
 try{if(!province)return{data:z.array(unit).parse(await get(version+'/'))};
 if(version==='v2')return{data:importedAreas('v2',await get('v2/p/'+province+'?depth=2'))};
 const p=z.object({code:z.number().int(),name:z.string(),districts:z.array(unit)}).parse(await get('v1/p/'+province+'?depth=2'));
 if(!district)return{data:p.districts};if(!p.districts.some(d=>String(d.code)===district))throw new BadRequestException('Quận/huyện không thuộc tỉnh đã chọn.');return{data:importedAreas('v1',p,await get('v1/d/'+district+'?depth=2'))};
 }catch(e){if(e instanceof z.ZodError)throw new ServiceUnavailableException('Dữ liệu nguồn chưa đúng định dạng. Vui lòng thử lại sau.');throw e;}}
}
@Controller('gifts/addresses')
class GiftAddressesController{
 private readonly limit=new RequestLimit();
 @Get()async load(@Query('province')province='',@Req()req:Request,@Res({passthrough:true})res:Response){
  this.limit.check(req,res,'gift-addresses',60);
  if(province&&!/^\d{1,3}$/.test(province))throw new BadRequestException('Tỉnh/thành không hợp lệ.');
  try{
   const data=province?z.object({wards:z.array(unit).max(500)}).parse(await get('v2/p/'+province+'?depth=2')).wards:z.array(unit).parse(await get('v2/'));
   return {data};
  }catch(error){if(error instanceof z.ZodError)throw new ServiceUnavailableException('Danh mục địa chỉ chưa tải được.');throw error;}
 }
}
@Module({imports:[AuthModule],controllers:[AreaSourceController,GiftAddressesController]})export class AreaSourceModule{}
