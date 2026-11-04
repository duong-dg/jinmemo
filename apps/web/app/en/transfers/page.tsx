import {contentApi} from '../../../lib/content-api';
import {RideBooking,type RideCatalog} from '../../components/ride-booking';
import '../../components/transport.css';
export const metadata={title:'Private & shared transfers'};
export default async function Page(){const catalog=await contentApi<RideCatalog>('rides');return <RideBooking catalog={catalog} en/>;}
