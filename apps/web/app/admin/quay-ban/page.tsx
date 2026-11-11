import {AdminFrame} from '../shared/admin-frame';
import {CounterEditor} from './counter-editor';
import '../admin.css';
import '../shared/content-admin.css';
export const metadata={title:'Quản lý quầy bán',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame active="counters" title="Quản lý quầy bán"><CounterEditor/></AdminFrame>;}
