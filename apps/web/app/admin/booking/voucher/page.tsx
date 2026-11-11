import {AdminFrame} from '../../shared/admin-frame';import {StayVouchers} from '../stay-vouchers';
import '../../admin.css';import '../../shared/content-admin.css';import '../stays-admin.css';
export const metadata={title:'Voucher phòng',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame active="stay-vouchers" title="Voucher phòng"><StayVouchers/></AdminFrame>;}
