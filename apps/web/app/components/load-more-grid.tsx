'use client';
import {Children,useState,type ReactNode} from 'react';
import './load-more-grid.css';
export function LoadMoreGrid({children,className,en=false}:{children:ReactNode;className:string;en?:boolean}){
 const [visible,setVisible]=useState(6),cards=Children.toArray(children),count=Math.min(visible,cards.length),next=Math.min(6,cards.length-count);
 return <><div className={className}>{cards.slice(0,count)}</div>{cards.length>6&&<div className="load-more-footer"><p role="status" aria-live="polite">{en?'Showing':'Đang hiển thị'} {count} / {cards.length}</p>{next>0&&<button type="button" className="outline-button" onClick={()=>setVisible(current=>current+6)}>{en?'Load more':'Tải thêm'} ({next}) <span aria-hidden="true">↓</span></button>}</div>}<noscript><div className={className}>{cards.slice(6)}</div></noscript></>;
}
