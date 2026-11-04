import {contentApi} from '../../lib/content-api';
import {RideBooking,type RideCatalog} from '../components/ride-booking';
import '../components/transport.css';
export const metadata={title:'Đặt xe riêng & xe ghép'};
export default async function Page(){const catalog=await contentApi<RideCatalog>('rides');return <RideBooking catalog={catalog}/>;}
