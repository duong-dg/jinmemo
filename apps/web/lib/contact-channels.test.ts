import{test}from'node:test';import assert from'node:assert/strict';import{contactChannels}from'./contact-channels';
test('contact channels handle legacy empty data, international WhatsApp and both languages',()=>{
 assert.deepEqual(contactChannels({}),[]);const value={whatsapp:'+84 (901) 234-567',zaloUrl:'https://zalo.me/0901234567',messengerUrl:'https://m.me/jinmemo'};
 const vi=contactChannels(value);assert.equal(vi.length,3);assert.equal(vi[0].href,'https://wa.me/84901234567');assert.equal(vi[1].label,'Nhắn qua Zalo');assert.equal(contactChannels(value,true)[2].label,'Chat on Messenger');assert.deepEqual(contactChannels({whatsapp:'0901234567'}),[]);
});
test('chat links reject scripts, credentials and lookalike domains',()=>{
 for(const url of ['javascript:alert(1)','http://m.me/test','https://m.me.evil.example/test','https://m.me@evil.example/test','https://user:pass@m.me/test','https://m.me:444/test','https://facebook.com/fanpage'])assert.deepEqual(contactChannels({messengerUrl:url}),[],url);
 assert.deepEqual(contactChannels({zaloUrl:'https://evil.example/test'}),[]);assert.equal(contactChannels({messengerUrl:'https://www.facebook.com/messages/t/jinmemo'})[0].name,'Messenger');
});

test('Facebook opens a page independently from Messenger and validates its domain',()=>{
 const c=contactChannels({facebookUrl:'https://www.facebook.com/jinmemo',messengerUrl:'https://m.me/jinmemo'});assert.equal(c.length,2);assert.equal(c[1].kind,'facebook');assert.equal(c[1].label,'Xem fanpage');assert.equal(c[0].name,'Messenger');assert.equal(contactChannels({facebookUrl:'https://facebook.com/profile.php?id=123'},true)[0].label,'Visit our Facebook page');
 for(const url of ['javascript:alert(1)','https://facebook.com.evil.example/page','https://facebook.com@evil.example/page','https://user:pass@facebook.com/page','https://m.me/page','http://facebook.com/page'])assert.deepEqual(contactChannels({facebookUrl:url}),[],url);
});
