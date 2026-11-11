import {notFound,permanentRedirect} from 'next/navigation';
import {contentApi,indexing,languageAlternates,siteBase} from '../../../lib/content-api';
import {requestLocale} from '../../../lib/request-locale';
import {pageShareMetadata} from '../../../lib/share-metadata';
import type {PublicStay} from '../../../lib/stays';
import {StayDetail} from '../stay-detail';
import '../stays.css';import '../../ve/[slug]/ticket.css';
async function get(slug:string){try{return await contentApi<PublicStay>('stays/'+encodeURIComponent(slug),await requestLocale());}catch{return null;}}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params,p=await get(slug),locale=await requestLocale();if(!p)return {title:'JinMemo',robots:{index:false,follow:false}};return {title:p.name,description:p.description.slice(0,200),robots:{index:indexing(),follow:true},alternates:{canonical:new URL(p.localePaths[locale]!,siteBase()).toString(),languages:languageAlternates(p.localePaths.vi!,p.languages,p.localePaths)},...await pageShareMetadata({title:p.name,description:p.description.slice(0,200),path:p.localePaths[locale]!,locale,image:p.coverId?{id:p.coverId,alt:p.name}:null})};}
export default async function Page({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){const {slug}=await params,p=await get(slug),locale=await requestLocale();if(!p)notFound();if(slug!==p.slug)permanentRedirect(p.localePaths[locale]!);const query=await searchParams;return <StayDetail property={p} initial={{roomId:typeof query.roomId==='string'?query.roomId:undefined,checkIn:typeof query.checkIn==='string'?query.checkIn:undefined,checkOut:typeof query.checkOut==='string'?query.checkOut:undefined,rooms:Number(query.rooms)||1,adults:Number(query.adults)||2,children:Number(query.children)||0}}/>;}
