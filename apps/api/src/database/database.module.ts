import {Global,Inject,Injectable,Module,OnModuleDestroy,OnModuleInit} from '@nestjs/common';
import {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import {englishSlug} from '../content/localized-slugs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {products} from '../catalog/catalog.data';

@Injectable()
export class DatabaseService implements OnModuleInit,OnModuleDestroy {
 constructor(@Inject('DB_POOL') public readonly pool:Pool){}
 async onModuleInit(){
  const legacy=await this.pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='jingo_orders'");
  if(legacy.rowCount)throw new Error('Select a NEW JinMemo database. Existing JinGo tables were detected; no migration or deletion was performed.');
  await this.pool.query(readFileSync(join(__dirname,'../../src/database/schema.sql'),'utf8'));
    for (const type of [
      {id:'TICKET',name:'Vé tham quan / show',slug:'ve-tham-quan',bookingKind:'TICKET',status:'ACTIVE'},
      {id:'TOUR',name:'Tour địa phương',slug:'tour-dia-phuong',bookingKind:'TOUR',status:'ACTIVE'}
    ]) await this.pool.query('INSERT INTO jinmemo_product_types(id,slug,data) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING',[type.id,type.slug,JSON.stringify(type)]);

  // These are runtime locking rows, not historical data migrations.
  for(const id of ['035_ticket_stock_lock','016_supplier_catalog_lock','pages_lock','009_destination_lock','041_english_urls_lock','011_inventory_lock','037_cart_requests'])
   await this.pool.query('INSERT INTO jinmemo_migrations(id)VALUES($1) ON CONFLICT(id) DO NOTHING',[id]);
    await this.pool.query('INSERT INTO jinmemo_pages(id,slug,data)VALUES($1,$2,$3)ON CONFLICT(id)DO NOTHING',['00000000-0000-4000-8000-000000000001','lien-he',JSON.stringify({id:'00000000-0000-4000-8000-000000000001',slug:'lien-he',kind:'CONTACT',title:'Liên hệ JinMemo',description:'Bạn cần hỗ trợ đặt vé hoặc chuẩn bị cho chuyến đi? JinMemo luôn sẵn sàng đồng hành.',contentHtml:'<h2>Chúng tôi có thể giúp gì cho bạn?</h2><p>Liên hệ JinMemo để được hỗ trợ chọn vé, kiểm tra thông tin đặt chỗ và nhận hướng dẫn sử dụng vé.</p><p>Khi cần hỗ trợ một đơn đã đặt, hãy chuẩn bị mã đặt chỗ và email đặt vé để chúng tôi kiểm tra nhanh hơn.</p>',seoTitle:'Liên hệ & hỗ trợ khách hàng JinMemo',seoDescription:'Liên hệ JinMemo để được hỗ trợ đặt vé tham quan, show diễn, tour địa phương và kiểm tra thông tin đơn hàng.',menuLabel:'Liên hệ',status:'PUBLISHED',showInMenu:true,showInFooter:true,sortOrder:100,cover:null,contact:{phone:'',email:'',address:'',hours:'',mapUrl:''},english:{slug:'contact',title:'Contact JinMemo',description:'Need help booking tickets or planning your visit? We are here to help.',contentHtml:'<h2>How can we help?</h2><p>Contact JinMemo for help choosing tickets, checking booking details and using your tickets.</p><p>For an existing booking, have your booking reference and booking email ready so we can help you faster.</p>',seoTitle:'Contact & customer support | JinMemo',seoDescription:'Contact JinMemo for help with attraction tickets, shows, local tours and booking information.',menuLabel:'Contact',published:true}})]);

  const demo=process.env.SEED_DEMO_DATA==='true'||(process.env.SEED_DEMO_DATA===undefined&&process.env.NODE_ENV==='test');
  if(demo&&!(await this.pool.query("SELECT id FROM jinmemo_migrations WHERE id='001_catalog_seed'")).rowCount){
   const client=await this.pool.connect();try{await client.query('BEGIN');
    const destinations=new Map<string,string>();
    for(const product of products){let destinationId=destinations.get(product.destination);if(!destinationId){destinationId=randomUUID();destinations.set(product.destination,destinationId);const slug=englishSlug(product.destination);await client.query('INSERT INTO jinmemo_destinations(id,slug,data)VALUES($1,$2,$3)',[destinationId,slug,JSON.stringify({id:destinationId,slug,englishSlug:slug,name:product.destination,parentId:null,status:'ACTIVE',sortOrder:0,description:'',englishName:''})]);}
     await client.query('INSERT INTO jinmemo_products(id,slug,data)VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',[product.id,product.slug,JSON.stringify({...product,destinationId,status:'PUBLISHED',demo:true,rules:[],closures:[],seoTitle:'',seoDescription:''})]);
    }
    await client.query("INSERT INTO jinmemo_migrations(id)VALUES('001_catalog_seed') ON CONFLICT(id) DO NOTHING");await client.query('COMMIT');
   }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
  await this.pool.query('INSERT INTO jinmemo_counters(id,data)VALUES($1,$2) ON CONFLICT(id) DO NOTHING',['main',JSON.stringify({id:'main',name:'Quầy chính',status:'ACTIVE',version:1})]);
 }
 async onModuleDestroy(){await this.pool.end();}
}
@Global()
@Module({providers:[{provide:'DB_POOL',useFactory:()=>{
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required. Configure the new JinMemo PostgreSQL database.');
 return new Pool({connectionString:process.env.DATABASE_URL,max:10,connectionTimeoutMillis:5000});
}},DatabaseService],exports:[DatabaseService]})
export class DatabaseModule{}
