import {AdminFrame} from '../../shared/admin-frame';
import {TransportPlanner} from '../../khung-xe/planner';
import '../../admin.css';
import '../../shared/content-admin.css';
import '../../khung-xe/planner.css';
export const metadata={title:'Lịch chuyến ghép',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame title="Lịch chuyến ghép" active="ride-trips"><TransportPlanner key="chuyen-ghep" section="trips"/></AdminFrame>;}
