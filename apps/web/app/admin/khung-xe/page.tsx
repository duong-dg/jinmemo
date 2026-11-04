import {AdminFrame} from '../shared/admin-frame';
import {TransportPlanner} from './planner';
import '../admin.css';
import '../shared/content-admin.css';
import './planner.css';
export const metadata={title:'Khung vận hành xe',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame title="Khung vận hành xe" active="transport-plan"><TransportPlanner/></AdminFrame>;}
