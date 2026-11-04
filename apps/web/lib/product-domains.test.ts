import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogForDomain} from './product-domains';
test('ticket/tour and vehicle catalogs are disjoint and retain existing transfers without migrating records',()=>{
 const rows=[{id:'ticket',transport:undefined},{id:'tour',transport:undefined},{id:'private',transport:{mode:'PRIVATE'}},{id:'shared',transport:{mode:'SHARED'}}];
 assert.deepEqual(catalogForDomain(rows,'EXPERIENCE').map(p=>p.id),['ticket','tour']);
 assert.deepEqual(catalogForDomain(rows,'VEHICLE').map(p=>p.id),['private','shared']);
 assert.equal(rows.length,4);assert.equal(catalogForDomain(rows,'VEHICLE')[0],rows[2]);
});
