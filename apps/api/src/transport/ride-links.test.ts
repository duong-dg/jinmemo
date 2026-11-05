import {test} from 'node:test';import assert from 'node:assert/strict';import {planSchema} from './planning.schema';import {rideLinks} from './ride-links';import {postSchema} from '../content/content.schema';
test('blog ride cards use live route prices, stable selection IDs, locale names and explicit share units',()=>{
 const plan=planSchema.parse({enabled:true,vehicles:[{id:'v',name:'Xe 4 chỗ',englishName:'4-seat car',seats:3,sharedSizes:[2]}],areas:[{id:'ha',name:'Hội An',englishName:'Hoi An'},{id:'dn',name:'Đà Nẵng',englishName:'Da Nang'}],fares:[{id:'f',from:'ha',to:'dn',vehicleId:'v',privatePrice:300001,seatPrice:0,twoWay:true,durationMinutes:60}],trips:[],requests:[]});
 const cards=rideLinks(plan,true);assert.equal(cards.length,2);assert.equal(cards[0].fromName+' → '+cards[0].toName,'Hoi An → Da Nang');assert.equal(cards[0].vehicleName,'4-seat car');assert.equal(cards[0].price,300001);assert.equal(cards[1].price,150000);assert.equal(cards[1].shareSize,2);assert.equal(cards[0].twoWay,true);
 plan.fares[0].privatePrice=400000;const updated=rideLinks(plan);assert.equal(updated[0].id,cards[0].id);assert.equal(updated[0].price,400000);assert.equal(updated[1].price,200000);
 plan.enabled=false;assert.deepEqual(rideLinks(plan),[]);assert.equal(rideLinks(plan,false,true).length,2);plan.fares[0].privatePrice=0;assert.deepEqual(rideLinks(plan,false,true),[]);
});
test('post ride selections are bounded and optional for existing posts',()=>{
 const post={id:'11111111-1111-4111-8111-111111111111',slug:'ride-guide',title:'Guide',excerpt:'',contentHtml:'<p>Guide</p>',cover:null,category:'Cẩm nang',author:'JinMemo',status:'DRAFT',publishedAt:null,seoTitle:'',seoDescription:'',relatedProductIds:[],version:0};
 assert.deepEqual(postSchema.parse(post).relatedRideIds,[]);assert.deepEqual(postSchema.parse({...post,relatedRideIds:['f/PRIVATE','f/SHARED/2']}).relatedRideIds,['f/PRIVATE','f/SHARED/2']);assert.equal(postSchema.safeParse({...post,relatedRideIds:Array(25).fill('f/PRIVATE')}).success,false);
});
