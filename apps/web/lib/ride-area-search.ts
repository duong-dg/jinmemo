export type AreaSearchOption={id:string;label:string;search?:string;names?:string[]};
export const areaSearchText=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLocaleLowerCase().trim().replace(/\s+/g,' ');
const names=(o:AreaSearchOption)=>[o.label.split('/').pop()||o.label,...(o.names||[])].map(areaSearchText).filter(Boolean);
export function exactAreaOptions(options:AreaSearchOption[],text:string){const q=areaSearchText(text);return q?options.filter(o=>areaSearchText(o.label)===q||names(o).includes(q)):[];}
export function searchAreaOptions(options:AreaSearchOption[],text:string){
 const q=areaSearchText(text);if(!q)return options.slice(0,12);
 const exact=exactAreaOptions(options,text);if(exact.length)return exact.slice(0,12);
 return options.map(o=>({o,rank:names(o).some(n=>n.startsWith(q))?0:names(o).some(n=>n.includes(q))?1:areaSearchText(o.label+' '+(o.search||'')).includes(q)?2:3})).filter(row=>row.rank<3).sort((a,b)=>a.rank-b.rank||a.o.label.split('/').length-b.o.label.split('/').length).slice(0,12).map(row=>row.o);
}
