export type CatalogDomain='EXPERIENCE'|'VEHICLE';
/** Existing transfer configuration determines membership; no data migration is needed. */
export function catalogForDomain<T extends {transport?:unknown}>(products:T[],domain:CatalogDomain):T[]{return products.filter(product=>domain==='VEHICLE'?!!product.transport:!product.transport);}
