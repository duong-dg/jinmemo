import {AdminFrame} from '../../shared/admin-frame';
import {TransportPlanner} from '../../khung-xe/planner';
import '../../admin.css';
import '../../shared/content-admin.css';
import '../../khung-xe/planner.css';
export const metadata={title:'Khu vực đón trả',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame title="Khu vực đón trả" active="ride-areas"><TransportPlanner key="khu-vuc" section="areas"/></AdminFrame>;}
