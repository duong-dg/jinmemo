import {AdminFrame} from '../shared/admin-frame';
import {BundleOrders} from './bundle-orders';
import '../admin.css';
import '../shared/content-admin.css';
export const metadata={title:'Đơn thanh toán chung',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame active="bundle-orders" title="Đơn thanh toán chung"><BundleOrders/></AdminFrame>;}
