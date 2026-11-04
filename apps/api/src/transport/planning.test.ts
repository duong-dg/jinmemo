import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newDb} from 'pg-mem';
import {Test} from '@nestjs/testing';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AppModule} from '../app.module';
import {planSchema,quoteRoutes,remainingSeats,suggestTrips,tripOpen,type TransportPlan} from './planning.schema';
function sample():TransportPlan{return planSchema.parse({vehicles:[{id:'v4',name:'Xe 4',seats:3},{id:'v7',name:'Xe 7',seats:6},{id:'v16',name:'Xe 16',seats:15}],areas:[{id:'ha',name:'Hoi An'},{id:'dn',name:'Da Nang'},{id:'hk',name:'Hoa Khanh',parentId:'dn',surcharges:{v4:70000,v7:100000,v16:150000}}],fares:[{id:'f4',from:'ha',to:'dn',vehicleId:'v4',privatePrice:300000,seatPrice:100000},{id:'f7',from:'ha',to:'dn',vehicleId:'v7',privatePrice:400000,seatPrice:100000},{id:'f16',from:'ha',to:'dn',vehicleId:'v16',privatePrice:850000,seatPrice:100000}],trips:[{id:'t10',from:'ha',to:'dn',vehicleId:'v7',date:'2099-06-01',start:'09:30',end:'10:00',departure:'10:00',cutoffMinutes:30,seatPrice:100000,status:'OPEN'}],requests:[{id:'r7',label:'7h',from:'ha',to:'dn',date:'2099-06-01',time:'07:00',flexMinutes:0,passengers:1,status:'WAITING'},{id:'r9',label:'9h',from:'ha',to:'hk',date:'2099-06-01',time:'09:00',flexMinutes:60,passengers:2,status:'WAITING'},{id:'r10',label:'10h',from:'ha',to:'dn',date:'2099-06-01',time:'10:00',flexMinutes:30,passengers:3,status:'WAITING'},{id:'r11',label:'11h',from:'ha',to:'dn',date:'2099-06-01',time:'11:00',flexMinutes:60,passengers:1,status:'WAITING'}]});}
test('route quotes preserve larger-vehicle choice, add area surcharges and prefer exact routes without double charging',()=>{
 const p=sample(),quotes=quoteRoutes(p,'ha','hk',3);assert.equal(quotes.length,3);assert.equal(quotes[0].total,370000);assert.equal(quotes[1].total,500000);assert.equal(quoteRoutes(p,'ha','hk',4).length,2);assert.equal(quoteRoutes(p,'dn','ha',3).length,0);
 p.fares.push({id:'exact',from:'ha',to:'hk',vehicleId:'v4',privatePrice:350000,seatPrice:100000});const exact=quoteRoutes(p,'ha','hk',3)[0];assert.equal(exact.total,350000);assert.equal(exact.surcharge,0);assert.equal(exact.exact,true);
 const cycle=sample();cycle.areas[1].parentId='hk';assert.equal(planSchema.safeParse(cycle).success,false);
 const duplicate=sample();duplicate.fares.push({...duplicate.fares[0],id:'duplicate'});assert.equal(planSchema.safeParse(duplicate).success,false);
});
test('one route prices both directions and each vehicle, preserving exact-area priority and rejecting ambiguous reverse duplicates',()=>{const p=sample();for(const f of p.fares)f.twoWay=true;assert.deepEqual(quoteRoutes(p,'ha','hk',3).map(q=>q.total),[370000,500000,1000000]);assert.deepEqual(quoteRoutes(p,'hk','ha',3).map(q=>q.total),[370000,500000,1000000]);p.fares.push({id:'exact',from:'ha',to:'hk',vehicleId:'v4',privatePrice:350000,seatPrice:0,twoWay:true});assert.equal(quoteRoutes(p,'hk','ha',3)[0].total,350000);assert.ok(planSchema.safeParse(p).success);p.fares.push({id:'reverse-duplicate',from:'dn',to:'ha',vehicleId:'v7',privatePrice:450000,seatPrice:0});assert.equal(planSchema.safeParse(p).success,false);});
test('shared matching respects accepted departure time, live seat capacity, cancellation and cutoff; never changes customer time',()=>{
 const p=sample(),now=new Date('2099-06-01T08:00:00+07:00').getTime(),t=p.trips[0];assert.deepEqual(suggestTrips(p,p.requests[0],now),[]);assert.deepEqual(suggestTrips(p,p.requests[1],now),['t10']);assert.deepEqual(suggestTrips(p,p.requests[3],now),['t10']);
 for(const r of p.requests.slice(1)){r.status='HELD';r.tripId='t10';}assert.equal(remainingSeats(p,t),0);assert.ok(planSchema.safeParse(p).success);assert.deepEqual(suggestTrips(p,p.requests[0],now),[]);
 const overflow=structuredClone(p);overflow.requests.push({...p.requests[2],id:'extra',passengers:1});assert.equal(planSchema.safeParse(overflow).success,false);
 p.requests[1].status='CANCELLED';assert.equal(remainingSeats(p,t),2);assert.equal(p.requests[3].time,'11:00');assert.equal(p.requests[2].time,'10:00');
 assert.equal(tripOpen(t,new Date('2099-06-01T09:29:59+07:00').getTime()),true);assert.equal(tripOpen(t,new Date('2099-06-01T09:30:00+07:00').getTime()),false);
 const wrong=sample();wrong.requests[0].status='HELD';wrong.requests[0].tripId='t10';assert.equal(planSchema.safeParse(wrong).success,false);
 const badWindow=sample();badWindow.trips[0].end='11:00';assert.equal(planSchema.safeParse(badWindow).success,false);
 const transfer=sample();transfer.trips.push({...transfer.trips[0],id:'t1015',start:'10:00',end:'10:15',departure:'10:15'});transfer.requests[2].status='HELD';transfer.requests[2].tripId='t10';assert.equal(remainingSeats(transfer,transfer.trips[0]),3);transfer.requests[2].tripId='t1015';assert.equal(remainingSeats(transfer,transfer.trips[0]),6);assert.equal(remainingSeats(transfer,transfer.trips[1]),3);assert.equal(planSchema.safeParse(transfer).success,true);
});
test('planning draft saves are authenticated/versioned and never create commerce orders, payments or operational allocations',async()=>{
 const media=await mkdtemp(join(tmpdir(),'jinmemo-plan-'));process.env.MEDIA_DIR=media;process.env.NODE_ENV='test';process.env.SEED_DEMO_DATA='false';process.env.PUBLIC_BASE_URL='https://plan.example.test';process.env.ADMIN_EMAIL='plan@example.test';process.env.ADMIN_PASSWORD='plan-fixture-password';
 const pool=new(newDb({noAstCoverageCheck:true}).adapters.createPg().Pool)(),module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider('DB_POOL').useValue(pool).compile(),app=module.createNestApplication();app.setGlobalPrefix('api/v1');
 try{await app.listen(0,'127.0.0.1');const base=await app.getUrl()+'/api/v1',call=(path:string,body?:unknown,cookie='',verified=true)=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:process.env.PUBLIC_BASE_URL!,...(verified?{'X-JinMemo-Admin':'1'}:{}),...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 assert.equal((await call('/admin/transport-plan')).status,401);const login=await call('/admin/login',{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});assert.equal(login.status,201);const admin=login.headers.get('set-cookie')!.split(';')[0];const initial=await(await call('/admin/transport-plan',undefined,admin)).json();assert.equal(initial.version,0);assert.deepEqual(initial.plan.vehicles,[]);
 const plan=sample();assert.equal((await call('/admin/transport-plan',{version:0,plan},admin,false)).status,403);
 let res=await call('/admin/transport-plan',{version:0,plan},admin);assert.equal(res.status,201,await res.clone().text());assert.equal((await res.json()).version,1);
 assert.equal((await call('/admin/transport-plan',{version:0,plan},admin)).status,409);
 res=await call('/admin/transport-plan/preview',{plan,from:'ha',to:'hk',passengers:3},admin);assert.equal(res.status,201);const preview=await res.json();assert.equal(preview.quotes[0].total,370000);assert.deepEqual(preview.suggestions.r7,[]);assert.deepEqual(preview.suggestions.r9,['t10']);
 plan.requests[2].status='HELD';plan.requests[2].tripId='t10';res=await call('/admin/transport-plan',{version:1,plan},admin);assert.equal(res.status,201);assert.equal((await res.json()).version,2);
 for(const table of ['jinmemo_orders','jinmemo_order_payments','jinmemo_inventory_allocations','jinmemo_transport_jobs'])assert.equal((await pool.query('SELECT * FROM '+table)).rowCount,0,table+' unchanged');
 assert.equal((await pool.query("SELECT id FROM jinmemo_audit WHERE action='transport.plan.save'")).rowCount,2);
 }finally{await app.close();await rm(media,{recursive:true,force:true});}
});
