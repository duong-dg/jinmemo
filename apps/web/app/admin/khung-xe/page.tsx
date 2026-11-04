import {AdminFrame} from '../shared/admin-frame';
import {TransportPlanner} from './planner';
import '../admin.css';
import '../shared/content-admin.css';
import './planner.css';
export const metadata={title:'Cấu hình xe & giá tuyến',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame title="Cấu hình xe & giá tuyến" active="transport-plan"><TransportPlanner/></AdminFrame>;}
