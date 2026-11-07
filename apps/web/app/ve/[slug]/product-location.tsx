import type {Product} from '../../../lib/content-api';

export function ProductLocation({product,en}:{product:Product;en:boolean}){
  const location=product.location;
  const address=en?(location?.addressEn||location?.address):location?.address;
  if(!address)return null;
  const content=<><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></svg><span>{address}</span></>;
  return <div className="product-location">{location?.mapUrl?<a href={location.mapUrl} target="_blank" rel="noopener noreferrer" aria-label={address+(en?' · Open Google Maps in a new tab':' · Mở Google Maps trong tab mới')}>{content}<span aria-hidden="true">↗</span></a>:<span>{content}</span>}</div>;
}
