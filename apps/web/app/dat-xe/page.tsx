import {contentApi,type Product} from '../../lib/content-api';
import {TransferCatalog} from '../components/transfer-catalog';
import '../components/transport.css';
export const metadata={title:'Đặt xe riêng & xe ghép',description:'Đặt xe đưa đón theo tuyến, xe riêng theo chuyến hoặc xe ghép theo chỗ.'};
export default async function Page(){const products=await contentApi<Product[]>('products');return <TransferCatalog products={products.filter(p=>p.transport)}/>;}
