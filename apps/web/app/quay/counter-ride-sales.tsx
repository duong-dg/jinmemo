'use client';
import {useEffect,useState} from 'react';
import {posApi} from '../../lib/pos-api';
import {RideBooking,type RideCatalog} from '../components/ride-booking';

export function CounterRideSales() {
 const [catalog,setCatalog]=useState<RideCatalog>();
 const [error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  posApi('rides').then(result=>{if(active)setCatalog(result.data);})
   .catch(err=>{if(active)setError(err.message);});
  return()=>{active=false;};
 },[]);
 if(error)return <p className="admin-error" role="alert">{error}</p>;
 if(!catalog)return <p>Đang tải bảng giá xe…</p>;
 return <RideBooking atCounter catalog={{...catalog,qrEnabled:false}}/>;
}
