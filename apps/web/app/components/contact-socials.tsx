import {contactChannels} from '../../lib/contact-channels';
import type {SitePage} from '../../lib/site-pages';
export function ContactSocials({contact,en=false}:{contact:NonNullable<SitePage['contact']>;en?:boolean}){
 const channels=contactChannels(contact,en);if(!channels.length)return null;
 return <section className="contact-socials" aria-label={en?'Connect with JinMemo':'Kết nối với JinMemo'}><p>{en?'Connect with JinMemo':'Kết nối với JinMemo'}</p><div className="contact-social-icons">{channels.map(channel=><a className={'contact-social-icon contact-social-icon-'+channel.kind} key={channel.kind} href={channel.href} target="_blank" rel="noopener noreferrer" title={channel.label} aria-label={channel.label+(en?' (opens a new tab)':' (mở tab mới)')}><img src={'/icons/contact/'+channel.kind+'.svg'} width={28} height={28} alt="" aria-hidden="true"/></a>)}</div></section>;
}
