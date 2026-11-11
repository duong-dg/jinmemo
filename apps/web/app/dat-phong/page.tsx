import {notFound} from 'next/navigation';
import {contentApi,indexing,siteBase,languageAlternates} from '../../lib/content-api';
import {requestLocale} from '../../lib/request-locale';
import {localizedPath} from '../../lib/i18n';
import type {StayCatalog} from '../../lib/stays';
import {StayListing} from './stay-listing';
import './stays.css';
export async function generateMetadata(){const locale=await requestLocale();return {title:locale==='en'?'Stays & room bookings':'Đặt phòng lưu trú',description:locale==='en'?'Choose a place to stay, check nightly rates and book with JinMemo.':'Chọn nơi lưu trú, xem giá từng đêm và đặt phòng cùng JinMemo.',robots:{index:indexing(),follow:true},alternates:{canonical:new URL(localizedPath('/dat-phong',locale),siteBase()).toString(),languages:languageAlternates('/dat-phong',['vi','en'])}};}
export default async function Page(){const locale=await requestLocale(),catalog=await contentApi<StayCatalog>('stays',locale);if(!catalog.enabled)notFound();return <StayListing items={catalog.items}/>;}
