import {AdminFrame} from '../../shared/admin-frame';import {StayOrders} from '../stay-orders';
import '../../admin.css';import '../../shared/content-admin.css';import '../stays-admin.css';
export const metadata={title:'Đơn đặt phòng',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame active="stay-orders" title="Đơn đặt phòng"><StayOrders/></AdminFrame>;}
