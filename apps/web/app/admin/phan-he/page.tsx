import {AdminFrame} from '../shared/admin-frame';
import {FeatureSettings} from './settings';
import '../admin.css';
import '../shared/content-admin.css';
export const metadata={title:'Bật / tắt phân hệ',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame active="features" title="Bật / tắt phân hệ"><FeatureSettings/></AdminFrame>;}
