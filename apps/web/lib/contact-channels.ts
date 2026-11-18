type Contact={facebookUrl?:string;whatsapp?:string;zaloUrl?:string;messengerUrl?:string};
function safeChatUrl(value:string|undefined,hosts:string[],messengerOnly=true){try{const u=new URL(value||'');return u.protocol==='https:'&&hosts.includes(u.hostname)&&!u.username&&!u.password&&!u.port&&u.pathname.length>1&&(messengerOnly&&(u.hostname==='facebook.com'||u.hostname==='www.facebook.com')?u.pathname.startsWith('/messages/t/'):true)?u.toString():undefined;}catch{return undefined;}}
export function contactChannels(contact:Contact,en=false){
 const phone=contact.whatsapp?.replace(/[ ()-]/g,''),whatsapp=phone&&/^\+?[1-9]\d{7,14}$/.test(phone)?'https://wa.me/'+phone.replace(/^\+/,''):undefined;
 const channels=[{name:'WhatsApp',href:whatsapp,icon:'W',kind:'whatsapp'},{name:'Zalo',href:safeChatUrl(contact.zaloUrl,['zalo.me','www.zalo.me']),icon:'Z',kind:'zalo'},{name:'Messenger',href:safeChatUrl(contact.messengerUrl,['m.me','messenger.com','www.messenger.com','facebook.com','www.facebook.com']),icon:'M',kind:'messenger'},{name:'Facebook',href:safeChatUrl(contact.facebookUrl,['facebook.com','www.facebook.com','m.facebook.com'],false),icon:'f',kind:'facebook'}];
 return channels.flatMap(c=>c.href?[{...c,href:c.href,label:c.kind==='facebook'?(en?'Visit our Facebook page':'Xem fanpage'):(en?'Chat on ':'Nhắn qua ')+c.name}]:[]);
}
