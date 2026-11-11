import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newDb} from 'pg-mem';
import {Test} from '@nestjs/testing';
import {AppModule} from '../app.module';
import {seedPolicyPages} from './policy-defaults';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';

test('published bilingual policies, private operator draft, editable routes and idempotent seeding',async()=>{
 process.env.NODE_ENV='test';process.env.SEED_DEMO_DATA='false';process.env.PUBLIC_BASE_URL='https://policies.example.test';process.env.ADMIN_EMAIL='policy@example.test';process.env.ADMIN_PASSWORD='policy-fixture-password';
 const pool=new(newDb({noAstCoverageCheck:true}).adapters.createPg().Pool)();
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider('DB_POOL').useValue(pool).compile();
 const app=module.createNestApplication();app.setGlobalPrefix('api/v1');
 try{
  await app.listen(0,'127.0.0.1');const base=await app.getUrl()+'/api/v1';let cookie='';
  const call=(path:string,body?:unknown,admin=false)=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:process.env.PUBLIC_BASE_URL!,'X-JinMemo-Admin':'1',...(admin?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const vi=(await(await call('/site/policies')).json()).data,en=(await(await call('/site/policies?lang=en')).json()).data;
  assert.deepEqual(Object.keys(vi).sort(),['DELIVERY','PAYMENT','PRIVACY','REFUNDS','SUPPORT','TERMS']);assert.equal(Object.keys(en).length,6);
  const navigation=(await(await call('/site/navigation')).json()).data;
  for(const [role,link] of Object.entries(vi) as [string,{href:string}][]){
   assert.ok(navigation.some((page:any)=>page.href===link.href&&page.footer&&!page.menu));
   const slug=link.href.split('/').at(-1)!,english=en[role].href.split('/').at(-1);
   const page=(await(await call('/site/pages/'+slug)).json()).data,translated=(await(await call('/site/pages/'+english+'?lang=en')).json()).data;
   assert.ok(page.contentHtml.length>500);assert.ok(translated.contentHtml.length>500);assert.doesNotMatch(page.contentHtml,/\[Điền|<script/);assert.doesNotMatch(translated.contentHtml,/\[Complete\]/);
  }
  assert.equal((await call('/site/pages/thong-tin-don-vi-van-hanh')).status,404);assert.equal((await call('/site/pages/operator-information?lang=en')).status,404);
  assert.equal((await call('/admin/pages')).status,401);
  cookie=(await call('/admin/login',{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD})).headers.get('set-cookie')!.split(';')[0];
  const initial=(await(await call('/admin/pages',undefined,true)).json()).data;
  const terms=initial.find((page:any)=>page.slug==='dieu-khoan-su-dung'),profile=initial.find((page:any)=>page.slug==='thong-tin-don-vi-van-hanh');assert.equal(profile.status,'DRAFT');assert.equal(profile.english.published,false);
  const {updatedAt,...payload}=terms;
  let response=await call('/admin/pages',{...payload,slug:'dieu-khoan-jinmemo',contentHtml:'<p>Nội dung do chủ website chỉnh.</p>',english:{...payload.english,slug:'jinmemo-terms'}},true);assert.equal(response.status,201,await response.clone().text());const saved=(await response.json()).data;
  await seedPolicyPages(pool);
  const latest=(await(await call('/admin/pages',undefined,true)).json()).data.find((page:any)=>page.id===saved.id);assert.equal(latest.contentHtml,saved.contentHtml);assert.equal(latest.english.contentHtml,terms.english.contentHtml);assert.equal(latest.version,saved.version);
  assert.equal((await(await call('/site/policies')).json()).data.TERMS.href,'/trang/dieu-khoan-jinmemo');assert.equal((await(await call('/site/policies?lang=en')).json()).data.TERMS.href,'/en/pages/jinmemo-terms');
  const {updatedAt:ignored,...next}=latest;response=await call('/admin/pages',{...next,status:'TRASH'},true);assert.equal(response.status,201);
  await seedPolicyPages(pool);assert.equal((await(await call('/site/policies')).json()).data.TERMS,undefined,'deploy cannot resurrect an unpublished policy');
  assert.equal((await pool.query('SELECT policy_key FROM jinmemo_policy_pages')).rowCount,7);
 }finally{await app.close();}
});

test('initial content adopts existing policy pages and does not take another English URL',async()=>{
 const pool=new(newDb({noAstCoverageCheck:true}).adapters.createPg().Pool)();
 try{
  await pool.query(readFileSync(join(__dirname,'../database/schema.sql'),'utf8'));
  await pool.query("INSERT INTO jinmemo_migrations(id)VALUES('pages_lock')");
  const privacyId=randomUUID(),otherId=randomUUID(),privacy={title:'Owner privacy',status:'DRAFT',contentHtml:'<p>Owner text</p>',english:{slug:'owner-privacy',published:false,contentHtml:'<p>Owner English</p>'}};
  await pool.query('INSERT INTO jinmemo_pages(id,slug,data)VALUES($1,$2,$3)',[privacyId,'chinh-sach-bao-mat',JSON.stringify(privacy)]);
  await pool.query('INSERT INTO jinmemo_pages(id,slug,data)VALUES($1,$2,$3)',[otherId,'other-page',JSON.stringify({title:'Other page',english:{slug:'terms-of-use'}})]);
  await seedPolicyPages(pool);await seedPolicyPages(pool);
  const saved=(await pool.query('SELECT data,version FROM jinmemo_pages WHERE id=$1',[privacyId])).rows[0];assert.deepEqual(saved.data,privacy);assert.equal(saved.version,1);
  assert.equal((await pool.query('SELECT page_id FROM jinmemo_policy_pages WHERE policy_key=$1',['PRIVACY'])).rows[0].page_id,privacyId);
  const termsId=(await pool.query('SELECT page_id FROM jinmemo_policy_pages WHERE policy_key=$1',['TERMS'])).rows[0].page_id;
  assert.equal((await pool.query('SELECT data FROM jinmemo_pages WHERE id=$1',[termsId])).rows[0].data.english.slug,'terms-of-use-2');
  assert.equal((await pool.query('SELECT id FROM jinmemo_pages')).rowCount,8);
 }finally{await pool.end();}
});
