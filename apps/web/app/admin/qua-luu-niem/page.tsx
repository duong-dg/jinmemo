import {AdminFrame} from '../shared/admin-frame';
import {GiftEditor} from './gift-editor';
import '../admin.css';
import '../shared/content-admin.css';

export const metadata={title:'Quà lưu niệm',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame active="gifts" title="Quà lưu niệm"><GiftEditor/></AdminFrame>;}
