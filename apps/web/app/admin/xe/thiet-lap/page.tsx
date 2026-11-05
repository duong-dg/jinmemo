import {AdminFrame} from '../../shared/admin-frame';
import {RideSettings} from '../../khung-xe/ride-settings';
import '../../admin.css';
import '../../shared/content-admin.css';
import '../../khung-xe/planner.css';
export const metadata={title:'Thiết lập dịch vụ xe',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame title="Thiết lập dịch vụ xe" active="ride-settings"><RideSettings/></AdminFrame>;}
