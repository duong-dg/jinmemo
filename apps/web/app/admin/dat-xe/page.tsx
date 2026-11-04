import {AdminFrame} from '../shared/admin-frame';
import {RideDashboard} from './ride-dashboard';
import '../admin.css';
import '../shared/content-admin.css';
import '../../components/transport.css';
export const metadata={title:'Đặt xe & điều xe',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame active="transport" title="Đặt xe & điều xe"><RideDashboard/></AdminFrame>;}
