export type SharedScope={from:string;to:string;vehicleId:string;twoWay?:boolean;shared:boolean;sharedSizes?:number[]};
type Area={id:string;parentId?:string;central?:boolean};
function path(areas:Area[],id:string){const ids:string[]=[],seen=new Set<string>();let central=false;while(id&&!seen.has(id)){seen.add(id);ids.push(id);const a=areas.find(a=>a.id===id);central=central||a?.central===true;if(!central)break;id=a?.parentId||'';}return ids;}
export function sharedRideAreas<T extends Area>(areas:T[],scopes:SharedScope[],from?:string,passengers=1):T[]{
 if(!Number.isInteger(passengers)||passengers<1)return [];
 const paths=new Map(areas.map(a=>[a.id,path(areas,a.id)]));
 const connects=(a:string,b:string)=>{if(a===b)return false;const starts=paths.get(a)||[],ends=paths.get(b)||[];return [...new Set(scopes.map(s=>s.vehicleId))].some(vehicle=>{const matches=scopes.filter(s=>s.vehicleId===vehicle).flatMap(s=>{const forward=starts.includes(s.from)&&ends.includes(s.to),reverse=s.twoWay&&starts.includes(s.to)&&ends.includes(s.from);return forward||reverse?[{s,score:starts.indexOf(forward?s.from:s.to)+ends.indexOf(forward?s.to:s.from)}]:[];}).sort((a,b)=>a.score-b.score);const selected=matches[0];return !!selected?.s.shared&&selected.score!==matches[1]?.score&&(selected.s.sharedSizes===undefined||selected.s.sharedSizes.some(size=>size>=passengers));});};
 return areas.filter(a=>from?connects(from,a.id):areas.some(b=>connects(a.id,b.id)));
}
