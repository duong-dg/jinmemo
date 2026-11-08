import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseRideDuration,rideDurationInput,formatRideDuration} from './ride-duration';
test('ride duration accepts minutes and hours while rejecting invalid or ambiguous input',()=>{
 for(const [text,result] of [["30",30],["30'",30],['1h30',90],['1h',60],['1 giờ 30 phút',90],['48h',2880],['90',90]] as const)assert.equal(parseRideDuration(text),result);
 for(const text of ['1h60','0','-30','1.5','49h','abc'])assert.equal(parseRideDuration(text),null);
 assert.equal(parseRideDuration(''),undefined);assert.equal(rideDurationInput(90),'1h30');assert.equal(rideDurationInput(30),"30'");
 assert.equal(formatRideDuration(90),'1 giờ 30 phút');assert.equal(formatRideDuration(60),'1 giờ');assert.equal(formatRideDuration(30),'30 phút');assert.equal(formatRideDuration(90,true),'1 h 30 min');
});
