import {serviceDetailLines, type ServiceDetails as Details} from '../../lib/service-details';
import './service-details.css';

export function ServiceDetails({details, en=false}: {details?: Details; en?: boolean}) {
  const {included, excluded} = serviceDetailLines(details, en);
  if (!included.length && !excluded.length) return null;
  return <div className="service-details">
    {included.length > 0 && <section>
      <h3>{en ? 'Included' : 'Bao gồm'}</h3>
      <ul>{included.map((line,index)=><li key={index}><span className="service-included" aria-hidden="true">✓</span><span>{line}</span></li>)}</ul>
    </section>}
    {excluded.length > 0 && <section>
      <h3>{en ? 'Not included' : 'Chưa bao gồm'}</h3>
      <ul>{excluded.map((line,index)=><li key={index}><span className="service-excluded" aria-hidden="true">−</span><span>{line}</span></li>)}</ul>
    </section>}
  </div>;
}
