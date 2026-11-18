import{test}from'node:test';import assert from'node:assert/strict';import{contactChannels}from'./contact-channels';
test('contact channels handle legacy empty data, international WhatsApp and both languages',()=>{
 assert.deepEqual(contactChannels({}),[]);const value={whatsapp:'+84 (901) 234-567',zaloUrl:'https://zalo.me/0901234567',messengerUrl:'https://m.me/jinmemo'};
 const vi=contactChannels(value);assert.equal(vi.length,3);assert.equal(vi[0].href,'https://wa.me/84901234567');assert.equal(vi[1].label,'Nhắn qua Zalo');assert.equal(contactChannels(value,true)[2].label,'Chat on Messenger');assert.deepEqual(contactChannels({whatsapp:'0901234567'}),[]);
});
test('chat links reject scripts, credentials and lookalike domains',()=>{
 for(const url of ['javascript:alert(1)','http://m.me/test','https://m.me.evil.example/test','https://m.me@evil.example/test','https://user:pass@m.me/test','https://m.me:444/test','https://facebook.com/fanpage'])assert.deepEqual(contactChannels({messengerUrl:url}),[],url);
 assert.deepEqual(contactChannels({zaloUrl:'https://evil.example/test'}),[]);assert.equal(contactChannels({messengerUrl:'https://www.facebook.com/messages/t/jinmemo'})[0].name,'Messenger');
});
