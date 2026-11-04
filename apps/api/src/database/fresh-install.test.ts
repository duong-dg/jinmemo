import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newDb} from 'pg-mem';
import {DatabaseService} from './database.module';

test('fresh installation starts with empty business data and only setup defaults; restart preserves entered content',async()=>{
 const previous=process.env.SEED_DEMO_DATA;process.env.SEED_DEMO_DATA='false';process.env.NODE_ENV='test';
 const pg=newDb({noAstCoverageCheck:true}).adapters.createPg(),pool=new pg.Pool(),db=new DatabaseService(pool);
 try{
  await db.onModuleInit();
  for(const table of ['jinmemo_products','jinmemo_posts','jinmemo_orders','jinmemo_carts','jinmemo_media','jinmemo_settings','jinmemo_order_tickets','jinmemo_order_payments','jinmemo_partners','jinmemo_admins','jinmemo_gateway_events'])assert.equal((await pool.query('SELECT * FROM '+table)).rows.length,0,table+' must be empty');
  assert.equal((await pool.query('SELECT * FROM jinmemo_product_types')).rows.length,2);assert.equal((await pool.query('SELECT * FROM jinmemo_counters')).rows.length,1);
  assert.equal((await pool.query('SELECT data FROM jinmemo_pages')).rows[0].data.contact.email,'');
  await pool.query('INSERT INTO jinmemo_products(id,slug,data)VALUES($1,$2,$3)',['new-product','new-product',JSON.stringify({id:'new-product',name:'New product',price:600000})]);
  await db.onModuleInit();assert.deepEqual((await pool.query('SELECT data FROM jinmemo_products')).rows.map((r:any)=>r.data),[{id:'new-product',name:'New product',price:600000}]);
 }finally{await db.onModuleDestroy();if(previous===undefined)delete process.env.SEED_DEMO_DATA;else process.env.SEED_DEMO_DATA=previous;}
});
test('fresh JinMemo refuses a database containing legacy JinGo orders before creating new tables',async()=>{
 const pg=newDb({noAstCoverageCheck:true}).adapters.createPg(),pool=new pg.Pool(),db=new DatabaseService(pool);
 try{await pool.query('CREATE TABLE jingo_orders(id text PRIMARY KEY)');await pool.query("INSERT INTO jingo_orders(id)VALUES('keep-old-order')");await assert.rejects(db.onModuleInit(),/NEW JinMemo database/);assert.deepEqual((await pool.query('SELECT * FROM jingo_orders')).rows,[{id:'keep-old-order'}]);assert.equal((await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name='jinmemo_products'")).rows.length,0);}finally{await db.onModuleDestroy();}
});
