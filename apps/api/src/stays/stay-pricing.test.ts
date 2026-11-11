import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {stayProperty,calculateStay,stayNight,stayNights,staySelection} from './stay-pricing';
test('nightly pricing combines weekday/season/holiday overrides, excludes checkout and preserves room capacity',()=>{
 const roomId=randomUUID(),hotel=stayProperty.parse({id:randomUUID(),version:0,slug:'stay-test',name:'Stay',destination:'Hoi An',address:'12 Hoi An',status:'PUBLISHED',rooms:[{id:roomId,name:'Double',maxGuests:3,maxAdults:2,maxChildren:1,price:500000,stock:3,active:true,rates:[{id:randomUUID(),from:'2099-06-01',to:'2099-06-30',price:600000,stock:2,priority:10},{id:randomUUID(),from:'2099-06-01',to:'2099-06-30',weekdays:[new Date('2099-06-01T00:00:00Z').getUTCDay()],price:700000,priority:20},{id:randomUUID(),from:'2099-06-02',to:'2099-06-02',price:900000,priority:50},{id:randomUUID(),from:'2099-06-03',to:'2099-06-03',closed:true,priority:100}]}]});
 const input=staySelection.parse({hotelId:hotel.id,roomId,checkIn:'2099-06-01',checkOut:'2099-06-03',rooms:2,adults:4,children:2});
 const quote=calculateStay(hotel,input);assert.equal(quote.total,3200000);assert.deepEqual(quote.nights.map(n=>n.date),['2099-06-01','2099-06-02']);assert.equal(quote.nights[1].stock,2,'holiday price does not reset the seasonal stock');
 assert.throws(()=>calculateStay(hotel,{...input,checkOut:'2099-06-04'}),/khóa bán/);
 assert.throws(()=>calculateStay(hotel,{...input,adults:5}),/sức chứa/);
 assert.throws(()=>calculateStay(hotel,{...input,rooms:3}),/không đủ phòng/);
 assert.throws(()=>stayNights('2099-02-30','2099-03-03'),/không hợp lệ/);
 assert.throws(()=>stayNights('2099-06-03','2099-06-03'),/1 đến 30/);
 const room=hotel.rooms[0];room.saleTo='2099-06-02';assert.equal(calculateStay(hotel,input).nights.length,2);assert.throws(()=>stayNight(room,'2099-06-03'),/chưa có giá/);
 room.saleTo=undefined;room.rates=[];room.discount={type:'PERCENT',value:15};assert.equal(stayNight(room,'2100-01-01').unitPrice,425000);
 room.discount={type:'FIXED',value:999999};assert.equal(stayNight(room,'2100-01-01').unitPrice,0);
 assert.equal(stayProperty.safeParse({...hotel,slugEn:'booking'}).success,false);
});
