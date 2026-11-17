import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sharedRideAreas,type SharedScope} from './shared-ride-areas';
test('shared search excludes private-only areas and narrows destinations by departure and direction',()=>{
 const areas=[{id:'ha'},{id:'dn'},{id:'airport',parentId:'dn'},{id:'hue'}];
 const scopes:SharedScope[]=[{from:'ha',to:'dn',vehicleId:'v',twoWay:true,shared:true},{from:'ha',to:'hue',vehicleId:'v',shared:false}];
 assert.deepEqual(sharedRideAreas(areas,scopes).map(a=>a.id),['ha','dn']);
 assert.deepEqual(sharedRideAreas(areas,scopes,'ha').map(a=>a.id),['dn']);
 assert.deepEqual(sharedRideAreas(areas,scopes,'dn').map(a=>a.id),['ha']);
 scopes.push({from:'ha',to:'airport',vehicleId:'v',shared:false});
 assert.deepEqual(sharedRideAreas(areas,scopes,'ha').map(a=>a.id),['dn']);
 scopes.push({from:'ha',to:'airport',vehicleId:'other',twoWay:true,shared:true});assert.deepEqual(sharedRideAreas(areas,scopes,'ha').map(a=>a.id),['dn','airport']);assert.deepEqual(sharedRideAreas(areas,scopes,'airport').map(a=>a.id),['ha']);
 scopes[0].twoWay=false;assert.deepEqual(sharedRideAreas(areas,scopes,'dn'),[]);
 assert.deepEqual(sharedRideAreas(areas,[]),[]);
});

test('central points inherit shared routes but explicit private-only routes override them',()=>{
 const areas=[{id:'ha'},{id:'dn'},{id:'district',parentId:'dn'},{id:'center',parentId:'district',central:true},{id:'remote',parentId:'dn'}];
 const scopes:SharedScope[]=[{from:'ha',to:'dn',vehicleId:'v',twoWay:true,shared:true}];
 assert.deepEqual(sharedRideAreas(areas,scopes,'ha').map(a=>a.id),['dn','center']);
 assert.deepEqual(sharedRideAreas(areas,scopes,'center').map(a=>a.id),['ha']);
 scopes.push({from:'ha',to:'center',vehicleId:'v',twoWay:true,shared:false});
 assert.deepEqual(sharedRideAreas(areas,scopes,'ha').map(a=>a.id),['dn']);
 assert.deepEqual(sharedRideAreas(areas,scopes,'center'),[]);
});

test('shared area choices follow group capacity and never fall back past a nearer disabled route',()=>{
 const areas=[{id:'ha'},{id:'dn'},{id:'center',parentId:'dn',central:true},{id:'hue'}];
 const scopes:SharedScope[]=[{from:'ha',to:'dn',vehicleId:'car',twoWay:true,shared:true,sharedSizes:[2]},{from:'ha',to:'hue',vehicleId:'van',shared:true,sharedSizes:[3,4]}];
 assert.deepEqual(sharedRideAreas(areas,scopes,undefined,3).map(a=>a.id),['ha']);
 assert.deepEqual(sharedRideAreas(areas,scopes,'ha',3).map(a=>a.id),['hue']);
 assert.deepEqual(sharedRideAreas(areas,scopes,'ha',2).map(a=>a.id),['dn','center','hue']);
 assert.deepEqual(sharedRideAreas(areas,scopes,'center',3),[]);
 assert.deepEqual(sharedRideAreas(areas,scopes,undefined,5),[]);
 assert.deepEqual(sharedRideAreas(areas,scopes,undefined,0),[]);
 scopes.push({from:'ha',to:'center',vehicleId:'car',twoWay:true,shared:false,sharedSizes:[2]});
 assert.deepEqual(sharedRideAreas(areas,scopes,'ha',2).map(a=>a.id),['dn','hue']);
});

test('API ancestry preserves central matching when unpriced grouping nodes are omitted',()=>{
 const areas=[{id:'ha',sharedAncestors:['ha']},{id:'dn',sharedAncestors:['dn']},{id:'center',parentId:'hidden-district',central:true,sharedAncestors:['center','hidden-district','dn']}];
 const scopes:SharedScope[]=[{from:'ha',to:'dn',vehicleId:'v',twoWay:true,shared:true,sharedSizes:[2]}];
 assert.deepEqual(sharedRideAreas(areas,scopes,'ha',1).map(a=>a.id),['dn','center']);
 assert.deepEqual(sharedRideAreas(areas,scopes,'center',1).map(a=>a.id),['ha']);
 assert.deepEqual(sharedRideAreas(areas,scopes,undefined,1).map(a=>a.id),['ha','dn','center']);
 assert.deepEqual(sharedRideAreas(areas,scopes,undefined,3),[]);
 scopes.push({from:'ha',to:'center',vehicleId:'v',twoWay:true,shared:false,sharedSizes:[2]});
 assert.deepEqual(sharedRideAreas(areas,scopes,'ha').map(a=>a.id),['dn']);
});
