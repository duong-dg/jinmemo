import {AdminFrame} from '../../shared/admin-frame';
import {GiftEditor} from '../gift-editor';
import '../../admin.css';
import '../../shared/content-admin.css';

export const metadata={title:'Đơn bán quà lưu niệm',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame active="gift-orders" title="Đơn bán quà lưu niệm"><GiftEditor view="orders"/></AdminFrame>;}
