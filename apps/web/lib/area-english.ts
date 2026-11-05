/** Deterministic suggestions only: proper names retain their spelling without Vietnamese marks. */
export function suggestAreaEnglish(value:string):string{
 const name=value.normalize('NFC').trim().replace(/\s+/g,' ');
 const plain=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D');
 const rules:[RegExp,string][]=[[/^(?:thành phố|tp\.?)\s+(.+)$/i,'City'],[/^(?:thị xã|tx\.?)\s+(.+)$/i,'Town'],[/^thị trấn\s+(.+)$/i,'Township'],[/^(?:phường|p\.)\s+(.+)$/i,'Ward'],[/^xã\s+(.+)$/i,'Commune'],[/^tỉnh\s+(.+)$/i,'Province'],[/^quận\s+(.+)$/i,'District'],[/^huyện\s+(.+)$/i,'District'],[/^sân bay quốc tế\s+(.+)$/i,'International Airport'],[/^sân bay\s+(.+)$/i,'Airport']];
 for(const [pattern,suffix] of rules){const match=name.match(pattern);if(match)return plain(match[1])+' '+suffix;}
 return plain(name);
}
export function fillAreaEnglish<T extends {name:string;englishName?:string}>(areas:T[]):T[]{
 return areas.map(area=>area.englishName?.trim()?area:{...area,englishName:suggestAreaEnglish(area.name)});
}
