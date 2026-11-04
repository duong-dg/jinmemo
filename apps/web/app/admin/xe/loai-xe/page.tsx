import {AdminFrame} from '../../shared/admin-frame';
import {TransportPlanner} from '../../khung-xe/planner';
import '../../admin.css';
import '../../shared/content-admin.css';
import '../../khung-xe/planner.css';
export const metadata={title:'Loại xe',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame title="Loại xe" active="ride-vehicles"><TransportPlanner key="loai-xe" section="vehicles"/></AdminFrame>;}
