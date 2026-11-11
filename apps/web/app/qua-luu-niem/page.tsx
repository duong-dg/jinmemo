import {notFound} from 'next/navigation';
import {requestLocale} from '../../lib/request-locale';
import {contentApi} from '../../lib/content-api';
import {GiftShop,type GiftConfig} from './shop';

export const metadata={title:'Quà lưu niệm'};
export default async function Page({searchParams}:{searchParams:Promise<{gio?:string}>}){
 const catalog=await contentApi<GiftConfig>('gifts',await requestLocale());
 if(!catalog.enabled)notFound();
 return <GiftShop catalog={catalog} initialCheckout={(await searchParams).gio==='1'}/>;
}
