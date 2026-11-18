export type ConditionOption={id:string;name:string;groups:string[];conditions?:Partial<Record<string,string>>};
export function applyGroupConditions(options:ConditionOption[],values:Record<string,string>,overwrite=false){
 let cells=0,packages=0;const conditions:Record<string,Record<string,string>>={};
 for(const option of options){const next:Record<string,string>=Object.fromEntries(Object.entries(option.conditions||{}).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));let changed=false;
  for(const group of option.groups){const value=values[group]?.trim();if(!value||(!overwrite&&next[group]?.trim())||next[group]===value)continue;next[group]=value;cells++;changed=true;}
  conditions[option.id]=next;if(changed)packages++;
 }
 return {conditions,cells,packages};
}
