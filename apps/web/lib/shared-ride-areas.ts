export type SharedScope={from:string;to:string;vehicleId:string;twoWay?:boolean;shared:boolean};
type Area={id:string;parentId?:string};
export function sharedRideAreas<T extends Area>(areas:T[],scopes:SharedScope[],from?:string):T[]{
 const parents=new Map(areas.map(a=>[a.id,a.parentId])),cache=new Map<string,string[]>();
 const ancestors=(id:string)=>{if(cache.has(id))return cache.get(id)!;const result:string[]=[];let current=id;while(current&&!result.includes(current)){result.push(current);current=parents.get(current)||'';}cache.set(id,result);return result;};
 if(!from)return areas.filter(a=>scopes.some(s=>s.shared&&(ancestors(a.id).includes(s.from)||s.twoWay&&ancestors(a.id).includes(s.to))));
 const starts=ancestors(from);
 return areas.filter(a=>{if(a.id===from)return false;const ends=ancestors(a.id),best=new Map<string,{score:number;shared:boolean;tie:boolean}>();
  for(const scope of scopes){const forward=starts.includes(scope.from)&&ends.includes(scope.to),reverse=scope.twoWay&&starts.includes(scope.to)&&ends.includes(scope.from);if(!forward&&!reverse)continue;const score=starts.indexOf(forward?scope.from:scope.to)+ends.indexOf(forward?scope.to:scope.from),previous=best.get(scope.vehicleId);if(!previous||score<previous.score)best.set(scope.vehicleId,{score,shared:scope.shared,tie:false});else if(score===previous.score)previous.tie=true;}
  return [...best.values()].some(v=>v.shared&&!v.tie);
 });
}
