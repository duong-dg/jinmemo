import {contentApi} from '../../lib/content-api';
import type {GiftConfig} from '../qua-luu-niem/shop';
import {CombinedCheckout} from './checkout';
import '../gio-hang/cart.css';
import '../qua-luu-niem/shop.css';

export const metadata={title:'Thanh toán',robots:{index:false,follow:false}};
export default async function Page(){
 const catalog=await contentApi<GiftConfig>('gifts').catch(()=>null);
 return <CombinedCheckout catalog={catalog}/>;
}
