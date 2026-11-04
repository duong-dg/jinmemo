import {contentApi,type Product} from '../../../lib/content-api';
import {TransferCatalog} from '../../components/transfer-catalog';
import '../../components/transport.css';
export const metadata={title:'Private & shared transfers'};
export default async function Page(){const products=await contentApi<Product[]>('products','en');return <TransferCatalog products={products.filter(p=>p.transport)} en/>;}
