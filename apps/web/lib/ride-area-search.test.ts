import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exactAreaOptions,searchAreaOptions} from './ride-area-search';
const options=[{id:'park',label:'Đà Nẵng / Vườn Quốc Gia Bạch Mã',names:['Vườn Quốc Gia Bạch Mã']},{id:'airport',label:'Đà Nẵng / Sân bay Đà Nẵng',names:['Sân bay Đà Nẵng','Da Nang Airport']},{id:'dn',label:'Đà Nẵng',names:['Đà Nẵng','Da Nang']},{id:'ha',label:'Hội An',names:['Hội An','Hoi An']}];
test('exact area names beat descendants regardless of insertion order, accents or language',()=>{
 for(const q of ['Đà Nẵng','da nang','  DA   NANG '])assert.deepEqual(searchAreaOptions(options,q).map(o=>o.id),['dn']);
 assert.deepEqual(exactAreaOptions(options,'da nang').map(o=>o.id),['dn']);
 assert.equal(searchAreaOptions(options,'san bay')[0].id,'airport');
 assert.equal(searchAreaOptions(options,'bach ma')[0].id,'park');
 assert.equal(searchAreaOptions(options,'da n')[0].id,'dn');
 assert.equal(searchAreaOptions(options,'Đà Nẵng / Vườn Quốc Gia Bạch Mã')[0].id,'park');
});
test('duplicate local names stay ambiguous instead of selecting the first unrelated area',()=>{
 const same=[{id:'a',label:'A / Trung tâm'},{id:'b',label:'B / Trung tâm'}];
 assert.equal(exactAreaOptions(same,'trung tam').length,2);
 assert.deepEqual(exactAreaOptions(same,'A / Trung tâm').map(o=>o.id),['a']);
});
