import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

interface SelectOption { value: string; label: string; }
export interface SelectGroup { label: string; options: (string | SelectOption)[]; }
export type SelectOptionType = string | SelectOption | SelectGroup;

interface CustomSelectProps { options: SelectOptionType[]; value: string; onChange: (val: string) => void; className?: string; placeholder?: string; disabled?: boolean; }

export default function CustomSelect({ options, value, onChange, className = '', placeholder, disabled = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) { setIsOpen(false); }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getLabel = (opt: string | SelectOption) => typeof opt === 'string' ? opt : opt.label;
  const getValue = (opt: string | SelectOption) => typeof opt === 'string' ? opt : opt.value;
  const flatOptions = options.flatMap(opt => typeof opt === 'object' && 'options' in opt ? opt.options : [opt]);
  const currentLabel = flatOptions.find(opt => getValue(opt) === value);
  const displayLabel = currentLabel ? getLabel(currentLabel) : placeholder;

  return (
    <div className={`relative ${className}`} ref={dropdownRef} style={{ zIndex: isOpen ? 50 : undefined }}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setIsOpen(!isOpen); } }}
        className="w-full h-full flex items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-inherit"
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <span className="block truncate select-none">{displayLabel || value}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-300 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute z-50 w-full min-w-max mt-1 bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100/60 overflow-hidden max-h-60 overflow-y-auto left-0 p-1.5">
            <div className="space-y-0.5">
              {options.map((option, index) => {
                if (typeof option === 'object' && 'options' in option) {
                  return (
                    <div key={'group-' + index} className="mb-1">
                      <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{option.label}</div>
                      {option.options.map(subOpt => {
                        const optValue = getValue(subOpt);
                        const optLabel = getLabel(subOpt);
                        return (
                          <button key={optValue} type="button" onClick={(e) => { e.stopPropagation(); onChange(optValue); setIsOpen(false); }} className={`w-full px-3 py-2 text-sm text-left font-medium transition-colors rounded-lg block ${value === optValue ? 'text-primary bg-primary/5' : 'text-slate-700 hover:bg-slate-50 hover:text-primary'}`}>
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
                  <button key={optValue} type="button" onClick={(e) => { e.stopPropagation(); onChange(optValue); setIsOpen(false); }} className={`w-full px-3 py-2 text-sm text-left font-medium transition-colors rounded-lg block ${value === optValue ? 'text-primary bg-primary/5' : 'text-slate-700 hover:bg-slate-50 hover:text-primary'}`}>
                    {optLabel}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
