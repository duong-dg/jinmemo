import {AdminFrame} from '../shared/admin-frame';
import {StayEditor} from './stay-editor';
import '../admin.css';import '../shared/content-admin.css';import './stays-admin.css';
export const metadata={title:'Cơ sở lưu trú & phòng',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame active="stays" title="Cơ sở lưu trú & phòng"><StayEditor/></AdminFrame>;}
