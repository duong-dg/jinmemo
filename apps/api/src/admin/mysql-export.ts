import {ConflictException,Injectable,PayloadTooLargeException} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import {mkdtemp,open,rm} from 'node:fs/promises';
import {join} from 'node:path';import {tmpdir} from 'node:os';import {pipeline} from 'node:stream/promises';
import type {Response} from 'express';import type {PoolClient} from 'pg';import {DatabaseService} from '../database/database.module';
export const transferTables=`product_types destinations suppliers media products pages post_categories posts post_revisions post_metrics slug_aliases policy_pages orders carts cart_orders cart_actions order_archives order_payments order_actions order_tickets ticket_files ticket_stock stock_imports vouchers voucher_uses inventory_configs inventory_buckets inventory_allocations supply_lots supply_purchases supply_allocations supply_actions supplier_payments counters pos_orders pos_shifts pos_open_shifts pos_shift_receipts pos_cash_movements payment_methods price_groups partners partner_orders partner_ledger payment_references gateway_events gateway_resolutions transport_jobs ride_bookings ride_pools ride_payment_events gift_orders checkout_bundles checkout_members refunds stays stay_aliases stay_bookings stay_vouchers stay_payment_events contact_requests`.split(' ').map(t=>'jinmemo_'+t);
export type TransferColumn={column_name:string;data_type:string};
export function mysqlIdentifier(value:string){if(!/^[a-z_][a-z0-9_]{0,63}$/.test(value))throw new Error('Invalid transfer identifier');return '`'+value+'`';}
export function transferName(table:string){if(!transferTables.includes(table))throw new Error('Table not allowed');return 'jm_transfer_'+table.slice(8);}
export function mysqlType(type:string){switch(type){case 'json':case 'jsonb':case 'ARRAY':return 'JSON';case 'uuid':return 'CHAR(36)';case 'boolean':return 'TINYINT(1)';case 'smallint':case 'integer':case 'bigint':return 'BIGINT';case 'numeric':case 'decimal':return 'DECIMAL(65,20)';case 'real':case 'double precision':return 'DOUBLE';case 'date':return 'DATE';case 'timestamp with time zone':case 'timestamp without time zone':return 'DATETIME(6)';case 'text':case 'character varying':case 'character':return 'LONGTEXT';default:throw new Error('Unsupported transfer type: '+type);}}
export function mysqlValue(value:string|null,column:TransferColumn){if(value===null)return 'NULL';const t=column.data_type;if(t==='boolean'){if(!['true','false','t','f'].includes(value))throw new Error('Invalid boolean');return value==='true'||value==='t'?'1':'0';}if(['smallint','integer','bigint','numeric','decimal','real','double precision'].includes(t)){if(!/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value))throw new Error('Invalid numeric transfer');return value;}return "CONVERT(X'"+Buffer.from(value,'utf8').toString('hex')+"' USING utf8mb4)";}
export function mysqlCreate(table:string,columns:TransferColumn[]){return 'CREATE TABLE '+mysqlIdentifier(transferName(table))+' (\n'+columns.map(c=>'  '+mysqlIdentifier(c.column_name)+' '+mysqlType(c.data_type)+' NULL').join(',\n')+'\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n';}
export function mysqlInsert(table:string,columns:TransferColumn[],rows:Record<string,string|null>[]){return rows.map(row=>'INSERT INTO '+mysqlIdentifier(transferName(table))+' ('+columns.map(c=>mysqlIdentifier(c.column_name)).join(',')+') VALUES ('+columns.map(c=>mysqlValue(row[c.column_name],c)).join(',')+');\n').join('');}
@Injectable()export class MysqlExportService{
 private running=false;
 constructor(private readonly db:DatabaseService){}
 async download(actor:string,res:Response){
  if(this.running)throw new ConflictException('Đang tạo file chuyển dữ liệu. Chờ tải xong rồi thử lại.');this.running=true;
  let directory:string|undefined,client:PoolClient|undefined;let begun=false;
  try{client=await this.db.pool.connect();
   directory=await mkdtemp(join(tmpdir(),'jinmemo-mysql-'));const path=join(directory,'transfer.sql'),file=await open(path,'wx',0o600);let size=0;
   const write=async(s:string)=>{size+=Buffer.byteLength(s);if(size>512*1024*1024)throw new PayloadTooLargeException('Bản xuất vượt 512 MB. Dùng bản sao lưu đầy đủ hoặc xuất bằng công cụ máy chủ.');await file.writeFile(s);};
   try{
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');begun=true;await client.query("SET LOCAL TIME ZONE 'UTC'");await client.query("SET LOCAL statement_timeout='30s'");
    const tables=(await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")).rows.map(r=>r.table_name);
    const metadata:Record<string,{rows:number;columns:TransferColumn[]}>= {};
    await write('-- JinMemo MySQL transfer v1; generated '+new Date().toISOString()+'\n-- DATA TRANSFER ONLY: jm_transfer_* staging tables, not a runnable PHP application schema.\n-- Import into a separate database. No DROP, overwrite, auth sessions or gateway secrets.\n-- Upload files are not included; copy media and original ticket files separately.\nSET NAMES utf8mb4;\nSET time_zone=\'+00:00\';\n');
    for(const table of transferTables.filter(t=>tables.includes(t))){
     const columns=(await client.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",[table])).rows.filter(c=>!['password_hash','secret'].includes(c.column_name)) as TransferColumn[];
     if(!columns.length)continue;await write(mysqlCreate(table,columns));let count=0;
     const select=columns.map(c=>{const name='"'+c.column_name+'"';mysqlIdentifier(c.column_name);if(c.data_type.startsWith('timestamp'))return "to_char("+name+",'YYYY-MM-DD HH24:MI:SS.US') AS "+name;if(c.data_type==='ARRAY')return 'to_json('+name+')::text AS '+name;return name+'::text AS '+name;}).join(',');
     await client.query('DECLARE transfer_rows NO SCROLL CURSOR FOR SELECT '+select+' FROM "public"."'+table+'"');
     try{while(true){if(res.destroyed)throw new Error('Download cancelled');const batch=(await client.query('FETCH FORWARD 100 FROM transfer_rows')).rows;if(!batch.length)break;await write(mysqlInsert(table,columns,batch));count+=batch.length;}}finally{await client.query('CLOSE transfer_rows');}
     metadata[table]={rows:count,columns};await write('-- '+transferName(table)+': '+count+' rows\n');
    }
    await write('-- TRANSFER COMPLETE '+JSON.stringify(Object.fromEntries(Object.entries(metadata).map(([t,m])=>[t,m.rows])))+'\n');await client.query('COMMIT');begun=false;
   }finally{await file.close();}
   await this.db.pool.query('INSERT INTO jinmemo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),actor,'data.mysql.export','mysql-transfer-v1']);
   const input=await open(path,'r');try{res.setHeader('Content-Type','application/sql; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="jinmemo-mysql-transfer-'+new Date().toISOString().slice(0,10)+'.sql"');res.setHeader('Content-Length',size);res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');await pipeline(input.createReadStream({autoClose:false}),res);}finally{await input.close();}
  }catch(error){if(begun&&client)await client.query('ROLLBACK');throw error;}finally{client?.release();this.running=false;if(directory)await rm(directory,{recursive:true,force:true});}
 }
}
