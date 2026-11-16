import {test} from 'node:test';import assert from 'node:assert/strict';import {setAreaExtra,setAreaParent} from './ride-area-rules';
import type {Area} from '../app/admin/khung-xe/plan-model';
const areas:Area[]=[{id:'dn',name:'Đà Nẵng',surcharges:{}},{id:'hk',name:'Hòa Khánh',parentId:'dn',surcharges:{v4:20000}},{id:'hv',name:'Hòa Vang',parentId:'dn',surcharges:{}},{id:'airport',name:'Sân bay',parentId:'dn',central:true,surcharges:{}}];
test('batch area fee assigns once, adds only explicitly and leaves centre/unselected areas untouched',()=>{const first=setAreaExtra(areas,['hk','hv'],['v4','v7'],50000);assert.equal(first.applied,2);assert.deepEqual(first.areas[1].surcharges,{v4:50000,v7:50000});assert.deepEqual(first.areas[3],areas[3]);assert.deepEqual(setAreaExtra(first.areas,['hk','hv'],['v4','v7'],50000).areas,first.areas);assert.equal(setAreaExtra(first.areas,['hk'],['v4'],50000,true).areas[1].surcharges.v4,100000);assert.deepEqual(areas[1].surcharges,{v4:20000});});
test('batch never charges parent and child together and rejects parent cycles before changing data',()=>{const result=setAreaExtra(areas,['dn','hk','hv'],['v4'],50000);assert.equal(result.applied,2);assert.equal(result.skipped,1);assert.deepEqual(result.areas[0].surcharges,{});assert.throws(()=>setAreaParent(areas,['dn'],'hk'));assert.throws(()=>setAreaParent(areas,['hk'],'hk'));assert.equal(setAreaParent(areas,['airport'],'hk')[3].parentId,'hk');});

import {suggestAreaEnglish,fillAreaEnglish,areaDisplayName} from './area-english';
test('English area suggestions translate administrative prefixes and preserve proper names',()=>{
 for(const [vi,en] of [['Phường Hội An','Hoi An Ward'],['Xã Duy Xuyên','Duy Xuyen Commune'],['Thành phố Đà Nẵng','Da Nang City'],['Tỉnh Quảng Nam','Quang Nam Province'],['Sân bay quốc tế Đà Nẵng','Da Nang International Airport'],['Hội An','Hoi An'],['Phường 1','1 Ward'],['  TP. Đà Nẵng  ','Da Nang City']])assert.equal(suggestAreaEnglish(vi),en);
 const input=[{name:'Đà Nẵng',englishName:'Danang'},{name:'Xã Duy Xuyên',englishName:'  '}];
 assert.deepEqual(fillAreaEnglish(input),[{name:'Đà Nẵng',englishName:'Danang'},{name:'Xã Duy Xuyên',englishName:'Duy Xuyen Commune'}]);assert.equal(input[1].englishName,'  ');
});

test('public route labels use English names with safe automatic fallback',()=>{
 assert.equal(areaDisplayName({name:'Hội An'},true)+' → '+areaDisplayName({name:'Đà Nẵng',englishName:'Da Nang'},true),'Hoi An → Da Nang');
 assert.equal(areaDisplayName({name:'Hội An',englishName:'Hoi An Old Town'},true),'Hoi An Old Town');
 assert.equal(areaDisplayName({name:'Đà Nẵng',englishName:'Da Nang'}),'Đà Nẵng');
});

test('moving an area to a new price parent revokes old inherited fees until reviewed again',()=>{const input=[...areas,{id:'hue',name:'Huế',surcharges:{}}],moved=setAreaParent(input,['hk'],'hue');assert.equal(moved[1].parentId,'hue');assert.deepEqual(moved[1].surcharges,{});assert.deepEqual(input[1].surcharges,{v4:20000});assert.deepEqual(setAreaParent(input,['hk'],'dn')[1].surcharges,{v4:20000});const approved=setAreaExtra(moved,['hk'],['v4'],0);assert.ok(Object.prototype.hasOwnProperty.call(approved.areas[1].surcharges,'v4'));assert.equal(approved.areas[1].surcharges.v4,0);});

import {clearAreaExtra} from './ride-area-rules';
test('bulk revoking parent-price approval removes even explicit zero fees without touching another vehicle or area',()=>{const input:Area[]=[{id:'a',name:'Remote',parentId:'dn',surcharges:{v4:0,v7:50000}},{id:'b',name:'Keep',parentId:'dn',surcharges:{v4:0}}],result=clearAreaExtra(input,['a'],['v4']);assert.deepEqual(result.areas[0].surcharges,{v7:50000});assert.deepEqual(result.areas[1],input[1]);assert.equal(result.applied,1);assert.deepEqual(input[0].surcharges,{v4:0,v7:50000});});

import {setAreaCentral} from './ride-area-rules';
test('explicit centre toggles clear stale fees and unmarking cannot reactivate old zero approvals',()=>{const area:Area={id:'centre',name:'Centre',parentId:'dn',surcharges:{v4:50000}},centre=setAreaCentral(area,true);assert.equal(centre.central,true);assert.equal(setAreaExtra([{...area,central:true}],['centre'],['v4'],70000,true).areas[0].surcharges.v4,70000);assert.deepEqual(centre.surcharges,{});assert.deepEqual(setAreaCentral(centre,false).surcharges,{});assert.equal(setAreaExtra([centre],['centre'],['v4'],70000).areas[0].central,false);assert.equal(clearAreaExtra([centre],['centre'],['v4']).areas[0].central,false);assert.equal(setAreaParent([centre,{id:'hue',name:'Hue',surcharges:{}}],['centre'],'hue')[0].central,false);});
