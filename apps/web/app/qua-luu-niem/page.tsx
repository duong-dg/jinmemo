import {notFound} from 'next/navigation';
import {contentApi} from '../../lib/content-api';
import {GiftShop,type GiftConfig} from './shop';

export const metadata={title:'Quà lưu niệm'};
export default async function Page(){
 const catalog=await contentApi<GiftConfig>('gifts');
 if(!catalog.enabled)notFound();
 return <GiftShop catalog={catalog}/>;
}
