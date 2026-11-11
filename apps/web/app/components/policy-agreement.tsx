'use client';
import {useEffect,useState} from 'react';
import {useLocale} from './locale-context';
import './policy-agreement.css';

type PolicyLink={href:string;label:string};
export function PolicyAgreement({disabled=false}:{disabled?:boolean}){
 const locale=useLocale(),en=locale==='en';
 const [links,setLinks]=useState<Record<string,PolicyLink>>({});
 useEffect(()=>{const controller=new AbortController();setLinks({});fetch('/api/v1/site/policies?lang='+locale,{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error();return response.json();}).then(result=>{if(!controller.signal.aborted)setLinks(result.data||{});}).catch(()=>{});return()=>controller.abort();},[locale]);
 const link=(key:string,label:string)=>links[key]?<a href={links[key].href} target="_blank" rel="noopener noreferrer">{label}</a>:label;
 return <label className="policy-agreement"><input type="checkbox" required disabled={disabled}/><span>{en?'I have checked my order and service conditions, agree to the ':'Tôi đã kiểm tra đơn và điều kiện dịch vụ, đồng ý với '}{link('TERMS',en?'Terms of use':'Điều khoản sử dụng')}{en?' and have read the ':' và đã đọc '}{link('PRIVACY',en?'Privacy policy':'Chính sách bảo mật')}.<small>{en?'Changes, cancellations and refunds follow the selected package conditions and the ':'Đổi, hủy và hoàn tiền theo điều kiện gói đã chọn và '}{link('REFUNDS',en?'refund policy':'chính sách hoàn tiền')}. {en?'This does not subscribe you to marketing.':'Không đăng ký nhận quảng cáo.'}</small></span></label>;
}
