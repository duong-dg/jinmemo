export type SharedScope={from:string;to:string;vehicleId:string;twoWay?:boolean;shared:boolean};
type Area={id:string;parentId?:string;central?:boolean};
function path(areas:Area[],id:string){const ids:string[]=[],seen=new Set<string>();let central=false;while(id&&!seen.has(id)){seen.add(id);ids.push(id);const a=areas.find(a=>a.id===id);central=central||a?.central===true;if(!central)break;id=a?.parentId||'';}return ids;}
export function sharedRideAreas<T extends Area>(areas:T[],scopes:SharedScope[],from?:string):T[]{
 const connects=(a:string,b:string)=>{if(a===b)return false;const starts=path(areas,a),ends=path(areas,b);return [...new Set(scopes.map(s=>s.vehicleId))].some(vehicle=>{const matches=scopes.filter(s=>s.vehicleId===vehicle).flatMap(s=>{const forward=starts.includes(s.from)&&ends.includes(s.to),reverse=s.twoWay&&starts.includes(s.to)&&ends.includes(s.from);return forward||reverse?[{s,score:starts.indexOf(forward?s.from:s.to)+ends.indexOf(forward?s.to:s.from)}]:[];}).sort((a,b)=>a.score-b.score);return !!matches[0]?.s.shared&&matches[0].score!==matches[1]?.score;});};
 return areas.filter(a=>from?connects(from,a.id):areas.some(b=>connects(a.id,b.id)));
}
