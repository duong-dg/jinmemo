import {BadRequestException} from '@nestjs/common';
import {z} from 'zod';
const accents='àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ';
const ascii=[...accents].map(c=>c==='đ'?'d':c.normalize('NFD').replace(/[\u0300-\u036f]/g,'')).join('');
export function giftOrderFilter(raw:unknown){
 const result=z.object({q:z.string().trim().max(100).default(''),status:z.enum(['','PENDING','SHIPPING','COMPLETED','CANCELLED']).default(''),payment:z.enum(['','PAID','UNPAID']).default(''),page:z.coerce.number().int().min(1).max(100000).default(1)}).strict().safeParse(raw);
 if(!result.success)throw new BadRequestException('Bộ lọc đơn quà không hợp lệ.');const input=result.data,params:string[]=[],parts:string[]=[];
 if(input.status){params.push(input.status);parts.push('g.status=$'+params.length);}
 if(input.payment==='PAID')parts.push("g.data->>'paymentStatus'='PAID'");else if(input.payment==='UNPAID')parts.push("COALESCE(g.data->>'paymentStatus','UNPAID')!='PAID'");
 if(input.q){params.push(input.q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d'));const n='$'+params.length,fields=["g.code","g.data->>'name'","g.data->>'phone'","b.code","(g.data->'lines')::text"];parts.push('('+fields.map(field=>"strpos(translate(lower(COALESCE("+field+",'')),'"+accents+"','"+ascii+"'),"+n+')>0').join(' OR ')+')');}
 return {input,params,where:parts.length?' WHERE '+parts.join(' AND '):''};
}
