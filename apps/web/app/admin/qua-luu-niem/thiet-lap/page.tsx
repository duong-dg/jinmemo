import {AdminFrame} from '../../shared/admin-frame';
import {GiftEditor} from '../gift-editor';
import '../../admin.css';
import '../../shared/content-admin.css';

export const metadata={title:'Thiết lập giao hàng',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame active="gift-settings" title="Thiết lập giao hàng"><GiftEditor view="settings"/></AdminFrame>;}
