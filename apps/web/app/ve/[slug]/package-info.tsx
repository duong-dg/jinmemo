'use client';

import {useEffect, useId, useRef, useState} from 'react';
import type {ServiceDetails as Details} from '../../../lib/service-details';
import {serviceDetailLines} from '../../../lib/service-details';
import {ServiceDetails} from '../../components/service-details';

export function PackageInfo({name, details, en}: {name: string; details?: Details; en: boolean}) {
  const [open,setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const title = useId();
  const {included,excluded} = serviceDetailLines(details,en);

  useEffect(()=>{
    if (!open || !dialog.current) return;
    const panel = dialog.current;
    const overflow = document.body.style.overflow;
    panel.showModal();
    document.body.style.overflow = 'hidden';
    return ()=>{
      panel.close();
      document.body.style.overflow = overflow;
      trigger.current?.focus();
    };
  },[open]);

  if (!included.length && !excluded.length) return null;
  return <>
    <button ref={trigger} type="button" className="package-info-trigger"
      aria-label={(en?'View package details: ':'Xem chi tiết gói: ')+name}
      aria-haspopup="dialog" onClick={()=>setOpen(true)}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>
      </svg>
    </button>
    {open && <dialog ref={dialog} className="package-info-dialog" aria-labelledby={title} onCancel={()=>setOpen(false)}>
      <header>
        <div><p>{en?'PACKAGE DETAILS':'THÔNG TIN GÓI DỊCH VỤ'}</p><h2 id={title}>{name}</h2></div>
        <button type="button" aria-label={en?'Close':'Đóng'} onClick={()=>setOpen(false)}>×</button>
      </header>
      <ServiceDetails details={details} en={en}/>
      <footer><button type="button" className="button" onClick={()=>setOpen(false)}>{en?'Back to selection':'Tiếp tục chọn vé'}</button></footer>
    </dialog>}
  </>;
}
