export type CatalogDomain='EXPERIENCE'|'VEHICLE';
/** Existing transfer configuration determines membership; no data migration is needed. */
export function catalogForDomain<T extends {transport?:unknown}>(products:T[],domain:CatalogDomain):T[]{return products.filter(product=>domain==='VEHICLE'?!!product.transport:!product.transport);}

/** Blog links may target active ticket/tour products, never archived or legacy vehicle products. */
export function blogProductChoices<T extends {transport?:unknown;status?:string}>(products:T[]):T[]{return catalogForDomain(products,'EXPERIENCE').filter(p=>p.status!=='ARCHIVED');}
