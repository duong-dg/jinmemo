import {test} from 'node:test';import assert from 'node:assert/strict';import {supplyPaste} from './supply-paste';
test('Excel columns paste prices and quantities without accepting fractions or overrunning groups',()=>{
 assert.deepEqual(supplyPaste('390.000\t3\r\n200,000\t2\r\n',0,0,3,2),[{row:0,col:0,value:'390000'},{row:0,col:1,value:'3'},{row:1,col:0,value:'200000'},{row:1,col:1,value:'2'}]);assert.equal(supplyPaste('0\n200000',0,0,2,1)[0].value,'0');assert.throws(()=>supplyPaste('1.5',0,0,1,1));assert.throws(()=>supplyPaste('1\t2',0,0,1,1));assert.throws(()=>supplyPaste('1\n2',1,0,2,1));assert.throws(()=>supplyPaste('-1',0,0,1,1));
});
