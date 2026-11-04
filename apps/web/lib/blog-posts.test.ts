import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sortBlogPosts} from './blog-posts';
test('blog newest follows publication dates, most-read follows real totals and featured is curated without mutating the source',()=>{
 const posts=[{id:'old',publishedAt:'2024-01-01',updatedAt:'2028-01-01',views:100,featured:false},{id:'new',publishedAt:'2027-01-01',updatedAt:'2027-01-01',views:2,featured:true},{id:'middle',publishedAt:'2026-01-01',updatedAt:'2026-01-01',views:100,featured:true}];
 assert.deepEqual(sortBlogPosts(posts).map(p=>p.id),['new','middle','old']);
 assert.deepEqual(sortBlogPosts(posts,'popular').map(p=>p.id),['middle','old','new']);
 assert.deepEqual(sortBlogPosts(posts,'featured').map(p=>p.id),['new','middle']);
 assert.equal(posts[0].id,'old');assert.equal(sortBlogPosts([], 'featured').length,0);
});
