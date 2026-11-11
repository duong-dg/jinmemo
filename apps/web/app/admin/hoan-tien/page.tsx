import {AdminFrame} from '../shared/admin-frame';
import {RefundLedger} from './refund-ledger';
import '../admin.css';
import '../shared/content-admin.css';
export const metadata={title:'Ghi nhận hoàn tiền',robots:{index:false,follow:false}};
export default function Page(){return <AdminFrame active="refunds" title="Ghi nhận hoàn tiền"><RefundLedger/></AdminFrame>;}
