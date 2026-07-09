const fs = require('fs');
let code = fs.readFileSync('src/components/CustomSelect.tsx', 'utf-8');

const t1 = `interface SelectOption { value: string; label: string; }
interface CustomSelectProps { options: (string | SelectOption)[]; value: string; onChange: (val: string) => void; className?: string; placeholder?: string; disabled?: boolean; }`;

const r1 = `interface SelectOption { value: string; label: string; }
export interface SelectGroup { label: string; options: (string | SelectOption)[]; }
export type SelectOptionType = string | SelectOption | SelectGroup;

interface CustomSelectProps { options: SelectOptionType[]; value: string; onChange: (val: string) => void; className?: string; placeholder?: string; disabled?: boolean; }`;

code = code.replace(t1, r1);

// Need to update the find logic:
const t2 = `  const currentLabel = options.find(opt => getValue(opt) === value);`;
const r2 = `  const flatOptions = options.flatMap(opt => typeof opt === 'object' && 'options' in opt ? opt.options : [opt]);
  const currentLabel = flatOptions.find(opt => getValue(opt) === value);`;
code = code.replace(t2, r2);

// Need to update the rendering:
const t3 = `              {options.map((option) => {
                const optValue = getValue(option);
                const optLabel = getLabel(option);
                return (
                  <button key={optValue} type="button" onClick={(e) => { e.stopPropagation(); onChange(optValue); setIsOpen(false); }} className={\`w-full px-5 py-3 text-sm text-left font-semibold transition-colors block \${value === optValue ? 'text-primary bg-slate-50' : 'text-black hover:bg-slate-50 hover:text-primary'}\`}>
                    {optLabel}
                  </button>
                );
              })}`;
const r3 = `              {options.map((option, index) => {
                if (typeof option === 'object' && 'options' in option) {
                  return (
                    <div key={'group-' + index} className="mb-2">
                      <div className="px-5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{option.label}</div>
                      {option.options.map(subOpt => {
                        const optValue = getValue(subOpt);
                        const optLabel = getLabel(subOpt);
                        return (
                          <button key={optValue} type="button" onClick={(e) => { e.stopPropagation(); onChange(optValue); setIsOpen(false); }} className={\`w-full px-5 py-2.5 text-sm text-left font-semibold transition-colors block \${value === optValue ? 'text-primary bg-slate-50' : 'text-slate-700 hover:bg-slate-50 hover:text-primary'}\`}>
                            {optLabel}
                          </button>
                        );
                      })}
                    </div>
                  );
                }

                const optValue = getValue(option as string | SelectOption);
                const optLabel = getLabel(option as string | SelectOption);
                return (
                  <button key={optValue} type="button" onClick={(e) => { e.stopPropagation(); onChange(optValue); setIsOpen(false); }} className={\`w-full px-5 py-2.5 text-sm text-left font-semibold transition-colors block \${value === optValue ? 'text-primary bg-slate-50' : 'text-slate-700 hover:bg-slate-50 hover:text-primary'}\`}>
                    {optLabel}
                  </button>
                );
              })}`;
code = code.replace(t3, r3);

fs.writeFileSync('src/components/CustomSelect.tsx', code);
