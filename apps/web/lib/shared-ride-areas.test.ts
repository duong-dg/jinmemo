import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sharedRideAreas,type SharedScope} from './shared-ride-areas';
test('shared search excludes private-only areas and narrows destinations by departure and direction',()=>{
 const areas=[{id:'ha'},{id:'dn'},{id:'airport',parentId:'dn'},{id:'hue'}];
 const scopes:SharedScope[]=[{from:'ha',to:'dn',vehicleId:'v',twoWay:true,shared:true},{from:'ha',to:'hue',vehicleId:'v',shared:false}];
 assert.deepEqual(sharedRideAreas(areas,scopes).map(a=>a.id),['ha','dn','airport']);
 assert.deepEqual(sharedRideAreas(areas,scopes,'ha').map(a=>a.id),['dn','airport']);
 assert.deepEqual(sharedRideAreas(areas,scopes,'dn').map(a=>a.id),['ha']);
 scopes.push({from:'ha',to:'airport',vehicleId:'v',shared:false});
 assert.deepEqual(sharedRideAreas(areas,scopes,'ha').map(a=>a.id),['dn']);
 scopes[0].twoWay=false;assert.deepEqual(sharedRideAreas(areas,scopes,'dn'),[]);
 assert.deepEqual(sharedRideAreas(areas,[]),[]);
});
