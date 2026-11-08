import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fareColumns,fareRows,mergeFareRows} from './fare-excel';
import type {Plan} from '../app/admin/khung-xe/plan-model';
const fixture=():Plan=>({vehicles:[{id:'v',name:'4 chỗ',seats:4,luggageNote:''}],areas:[{id:'a',name:'Hội An',surcharges:{}},{id:'b',name:'Đà Nẵng',surcharges:{}},{id:'w',name:'Sân bay',parentId:'b',surcharges:{}}],fares:[{id:'f',from:'a',to:'b',vehicleId:'v',twoWay:true,sharedEnabled:true,privatePrice:300000,roundTripPrice:500000,seatPrice:0,durationMinutes:60}],trips:[],requests:[]});
test('Excel edits preserve fare identities and missing routes, and explicitly configure shared and return fares',()=>{
 const p=fixture(),keys=fareColumns(p).map(c=>c.key),rows=fareRows(p);rows[0][4]=350000;rows[0][5]=1;rows[0][3]=0;
 const result=mergeFareRows(p,keys,rows,()=> 'new');assert.equal(result.updated,1);assert.equal(result.fares[0].id,'f');assert.equal(result.fares[0].privatePrice,350000);assert.equal(result.fares[0].roundTripOnly,true);assert.equal(result.fares[0].sharedEnabled,false);assert.equal(p.fares[0].privatePrice,300000);
 const added=mergeFareRows(p,keys,[['Hội An','Đà Nẵng / Sân bay',0,1,400000,0,65]],()=> 'new');assert.equal(added.added,1);assert.equal(added.fares.length,2);assert.equal(added.fares[1].to,'w');assert.equal(added.fares[0].privatePrice,300000);
 const blank=fareRows(p);blank[0][4]='';assert.equal(mergeFareRows(p,keys,blank,()=> 'new').fares[0].privatePrice,300000);
 rows[0][4]=0;assert.equal(mergeFareRows(p,keys,rows,()=> 'new').fares[0].privatePrice,0);
});
test('Excel import rejects ambiguous areas, duplicate routes, invalid numbers and reverse conflicts atomically',()=>{
 const p=fixture(),keys=fareColumns(p).map(c=>c.key),rows=fareRows(p);
 assert.throws(()=>mergeFareRows(p,keys,[...rows,...rows],()=> 'new'),/trùng/);
 assert.throws(()=>mergeFareRows(p,keys,[['Missing','Đà Nẵng',0,0,100,0,60]],()=> 'new'),/khu vực/);
 assert.throws(()=>mergeFareRows(p,keys,[['Hội An','Đà Nẵng',0,0,'300,000',0,60]],()=> 'new'),/số tiền/);
 assert.throws(()=>mergeFareRows(p,keys,[['Đà Nẵng','Hội An',1,0,100,0,60]],()=> 'new'),/chiều ngược/);
 assert.equal(p.fares.length,1);assert.equal(p.fares[0].privatePrice,300000);
});

test('xlsx buffer reopens with hidden stable keys and Vietnamese route names',async()=>{
 const {Workbook}=(await import('exceljs')).default;const p=fixture(),book=new Workbook(),sheet=book.addWorksheet('Gia tuyen');
 sheet.addRow(fareColumns(p).map(c=>c.label));sheet.addRow(fareColumns(p).map(c=>c.key));sheet.getRow(2).hidden=true;fareRows(p).forEach(row=>sheet.addRow(row));
 const buffer=await book.xlsx.writeBuffer(),copy=new Workbook();await copy.xlsx.load(buffer);const loaded=copy.getWorksheet('Gia tuyen')!;
 assert.equal(loaded.getRow(2).hidden,true);assert.equal(loaded.getCell(3,1).value,'Hội An');
 const keys=fareColumns(p).map((_,i)=>String(loaded.getCell(2,i+1).value));const row=keys.map((_,i)=>loaded.getCell(3,i+1).value as string|number|null);
 const merged=mergeFareRows(p,keys,[row],()=> 'new');assert.equal(merged.fares[0].privatePrice,300000);assert.equal(merged.fares[0].roundTripPrice,500000);assert.equal(merged.fares[0].sharedEnabled,true);
});
