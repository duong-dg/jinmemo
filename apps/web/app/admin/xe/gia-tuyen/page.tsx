import {AdminFrame} from '../../shared/admin-frame';
import {TransportPlanner} from '../../khung-xe/planner';
import '../../admin.css';
import '../../shared/content-admin.css';
import '../../khung-xe/planner.css';
export const metadata={title:'Giá tuyến',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame title="Giá tuyến" active="ride-fares"><TransportPlanner key="gia-tuyen" section="fares"/></AdminFrame>;}
