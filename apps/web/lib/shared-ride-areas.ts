export type SharedScope={from:string;to:string;vehicleId:string;twoWay?:boolean;shared:boolean};
type Area={id:string;parentId?:string};
export function sharedRideAreas<T extends Area>(areas:T[],scopes:SharedScope[],from?:string):T[]{
 if(!from)return areas.filter(a=>scopes.some(s=>s.shared&&(a.id===s.from||s.twoWay&&a.id===s.to)));
 return areas.filter(a=>a.id!==from&&scopes.some(s=>s.shared&&(s.from===from&&s.to===a.id||s.twoWay&&s.to===from&&s.from===a.id)));
}
