'use client';

import {emptyServiceDetails, type ServiceDetails} from '../../../lib/service-details';

export function ServiceDetailsEditor({value, onChange, variant=false}: {
  value?: ServiceDetails;
  onChange: (value: ServiceDetails) => void;
  variant?: boolean;
}) {
  const details = {...emptyServiceDetails, ...value};
  const fields = [
    ['included', 'Bao gồm · Tiếng Việt'],
    ['excluded', 'Chưa bao gồm · Tiếng Việt'],
    ['includedEn', 'Included · English'],
    ['excludedEn', 'Not included · English']
  ] as const;

  return <section className="config-card">
    <h3>{variant ? 'Dịch vụ của gói' : 'Dịch vụ bao gồm / chưa bao gồm'}</h3>
    {variant && <label className="checkbox-label">
      <input type="checkbox" checked={!!details.custom} onChange={e=>onChange({...details, custom:e.target.checked})}/>
      Dùng nội dung riêng cho gói này
    </label>}
    <p className="admin-hint">{variant
      ? 'Bỏ tích để dùng nội dung chung. Gói có nội dung riêng sẽ có nút ⓘ mở chi tiết trên trang bán.'
      : 'Thông tin chung hiện trong nội dung vé/tour. Mỗi dịch vụ một dòng, bản Việt và Anh được nhập riêng.'}</p>
    {(!variant || details.custom) && <div className="field-grid">
      {fields.map(([key,label])=><label key={key}>{label}
        <textarea rows={4} maxLength={6000} value={details[key]} onChange={e=>onChange({...details,[key]:e.target.value})}/>
      </label>)}
    </div>}
  </section>;
}
