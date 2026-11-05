import {test} from 'node:test';import assert from 'node:assert/strict';import {calculateQuote} from './pricing';import {productSchema} from '../admin/product.schema';import {effectiveTourInfo} from './tour-info';
const base={id:'tour',slug:'tour',name:'Tour',destination:'Hội An',description:'',type:'TOUR',demo:false,variants:[{id:'v',name:'Morning',prices:{ADULT:100,CHILD:50,SENIOR:70,LOCAL_ADULT:80}}]};
test('tour limits count all guest groups, inherit defaults, allow exact boundaries and reject bypasses',()=>{
 const product={...base,tourInfo:{minGuests:2,maxGuests:4,duration:'Khoảng 4 giờ',durationEn:'About 4 hours'}};
 assert.throws(()=>calculateQuote(product,'v','2099-01-01',{ADULT:1}),/ít nhất 2/);assert.equal(calculateQuote(product,'v','2099-01-01',{ADULT:1,CHILD:1}).total,150);assert.equal(calculateQuote(product,'v','2099-01-01',{ADULT:1,CHILD:1,SENIOR:1,LOCAL_ADULT:1}).total,300);assert.throws(()=>calculateQuote(product,'v','2099-01-01',{ADULT:3,CHILD:2}),/tối đa 4/);
 const custom={...product,variants:[{...product.variants[0],tourInfo:{minGuests:3,maxGuests:6,duration:'5 giờ'}}]};assert.equal(effectiveTourInfo(custom,custom.variants[0]).duration,'5 giờ');assert.equal(effectiveTourInfo(custom,custom.variants[0]).durationEn,'About 4 hours');assert.throws(()=>calculateQuote(custom,'v','2099-01-01',{ADULT:2}),/ít nhất 3/);assert.equal(calculateQuote(custom,'v','2099-01-01',{ADULT:6}).total,600);
 // Only the internal unit-price display bypasses guest counts; cart/order quotes use the default strict path.
 assert.equal(calculateQuote(product,'v','2099-01-01',{ADULT:1},[],[],undefined,Date.now(),false).total,100);assert.equal(calculateQuote(base,'v','2099-01-01',{ADULT:1}).total,100);
});
test('admin rejects contradictory inherited limits and preserves optional legacy products',()=>{
 const managed={...base,status:'DRAFT',version:0};assert.ok(productSchema.safeParse(managed).success);assert.equal(productSchema.safeParse({...managed,tourInfo:{minGuests:5,maxGuests:2}}).success,false);assert.equal(productSchema.safeParse({...managed,tourInfo:{minGuests:5,maxGuests:10},variants:[{...base.variants[0],tourInfo:{maxGuests:3}}]}).success,false);assert.equal(productSchema.safeParse({...managed,tourInfo:{minGuests:0}}).success,false);
});
