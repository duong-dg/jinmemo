import{test}from'node:test';import assert from'node:assert/strict';import{localizedPath,unlocalizedPath}from'./i18n';import{languageAlternates}from'./content-api';
test('localized blog/destination sections, English filters and per-entity language alternates use the right slug',()=>{
 assert.equal(localizedPath('/cam-nang','en'),'/en/blog');assert.equal(localizedPath('/cam-nang/hoi-an-guide','en'),'/en/blog/hoi-an-guide');assert.equal(localizedPath('/diem-den/old-town','en'),'/en/destinations/old-town');assert.equal(localizedPath('/cam-nang?chuyen_muc=Travel','en'),'/en/blog?category=Travel');assert.equal(unlocalizedPath('/en/blog/hoi-an-guide'),'/cam-nang/hoi-an-guide');assert.equal(unlocalizedPath('/en/destinations/old-town'),'/diem-den/old-town');assert.equal(localizedPath('/ve/ticket','en'),'/en/ve/ticket');
 const previous=process.env.PUBLIC_BASE_URL;process.env.PUBLIC_BASE_URL='https://jinmemo.example.test';try{const links=languageAlternates('/cam-nang/kinh-nghiem',['vi','en'],{vi:'/cam-nang/kinh-nghiem',en:'/en/blog/travel-guide'});assert.equal(links.vi,'https://jinmemo.example.test/cam-nang/kinh-nghiem');assert.equal(links.en,'https://jinmemo.example.test/en/blog/travel-guide');assert.equal(links['x-default'],links.vi);}finally{if(previous===undefined)delete process.env.PUBLIC_BASE_URL;else process.env.PUBLIC_BASE_URL=previous;}
});

// Content pages use translated URL sections, while per-page slugs come from localePaths.
test("custom page and contact URL sections",()=>{assert.equal(localizedPath("/lien-he","en"),"/en/contact");assert.equal(localizedPath("/trang/chinh-sach","en"),"/en/pages/chinh-sach");assert.equal(unlocalizedPath("/en/pages/privacy"),"/trang/privacy");assert.equal(unlocalizedPath("/en/contact"),"/lien-he");});

test('transfer listings preserve both language directions',()=>{assert.equal(localizedPath('/dat-xe','en'),'/en/transfers');assert.equal(unlocalizedPath('/en/transfers'),'/dat-xe');assert.equal(localizedPath('/en/transfers','vi'),'/dat-xe');});

test('souvenir and mixed checkout navigation preserves locale and query',()=>{
 assert.equal(localizedPath('/qua-luu-niem?gio=1','en'),'/en/souvenirs?gio=1');
 assert.equal(unlocalizedPath('/en/souvenirs'),'/qua-luu-niem');
 assert.equal(localizedPath('/chot-don','en'),'/en/checkout');
 assert.equal(localizedPath('/en/checkout','vi'),'/chot-don');
});

test('stays keep localized listing, room and private receipt URLs',()=>{assert.equal(localizedPath('/dat-phong','en'),'/en/stays');assert.equal(localizedPath('/dat-phong/hotel','en'),'/en/stays/hotel');assert.equal(localizedPath('/dat-phong/tra-cuu','en'),'/en/stays/booking');assert.equal(unlocalizedPath('/en/stays/booking'),'/dat-phong/tra-cuu');});
