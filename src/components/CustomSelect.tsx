import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Search } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';

interface SelectOption { value: string; label: string; }
export interface SelectGroup { label: string; options: (string | SelectOption)[]; }
export type SelectOptionType = string | SelectOption | SelectGroup;

interface CustomSelectProps { 
  options: SelectOptionType[]; 
  value: string; 
  onChange: (val: string) => void; 
  className?: string; 
  placeholder?: string; 
  disabled?: boolean; 
  searchable?: boolean;
}

export default function CustomSelect({ options, value, onChange, className = '', placeholder, disabled = false, searchable = true }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useClickOutside(dropdownRef, () => {
    setIsOpen(false);
    setSearchTerm('');
  }, isOpen);

  const getLabel = (opt: string | SelectOption) => typeof opt === 'string' ? opt : opt.label;
  const getValue = (opt: string | SelectOption) => typeof opt === 'string' ? opt : opt.value;

  const flatOptions = options.flatMap(opt => typeof opt === 'object' && 'options' in opt ? opt.options : [opt]);
  const currentLabel = flatOptions.find(opt => getValue(opt) === value);
  const displayLabel = currentLabel ? getLabel(currentLabel) : placeholder;

  const filteredOptions = useMemo(() => {
    if (!searchTerm || !searchable) return options;
    const lowerSearch = searchTerm.toLowerCase();
    
    return options.map(option => {
      if (typeof option === 'object' && 'options' in option) {
        const filteredSub = option.options.filter(sub => getLabel(sub).toLowerCase().includes(lowerSearch));
        return filteredSub.length > 0 ? { ...option, options: filteredSub } : null;
      }
      return getLabel(option).toLowerCase().includes(lowerSearch) ? option : null;
    }).filter(Boolean) as SelectOptionType[];
  }, [options, searchTerm, searchable]);

  const selectableOptions = useMemo(() => {
    return filteredOptions.flatMap(opt => 
      typeof opt === 'object' && 'options' in opt ? opt.options : [opt]
    );
  }, [filteredOptions]);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 220 && rect.top > spaceBelow) {
        setOpenUp(true);
      } else {
        setOpenUp(false);
      }
      if (searchable && inputRef.current) {
        inputRef.current.focus();
      }

      const initialIdx = selectableOptions.findIndex(opt => getValue(opt) === value);
      setHighlightedIndex(initialIdx >= 0 ? initialIdx : 0);
    } else {
      setSearchTerm('');
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(selectableOptions.length > 0 ? 0 : -1);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (selectableOptions.length > 0) {
        setHighlightedIndex(prev => (prev < selectableOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (selectableOptions.length > 0) {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : selectableOptions.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen) {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < selectableOptions.length) {
          const selectedOpt = selectableOptions[highlightedIndex];
          onChange(getValue(selectedOpt));
          setIsOpen(false);
        }
      } else {
        e.preventDefault();
        setIsOpen(true);
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    } else if (e.key === 'Tab') {
      if (isOpen) {
        setIsOpen(false);
      }
    }
  };

  let selectableCounter = 0;

  return (
    <div 
      className={`relative ${className}`} 
      ref={dropdownRef} 
      style={{ zIndex: isOpen ? 100 : undefined }}
      onKeyDown={handleKeyDown}
    >
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className="w-full h-full flex items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-inherit relative"
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        {isOpen && searchable ? (
          <input
            ref={inputRef}
            type="text"
            className="w-full h-full bg-transparent outline-none truncate pr-6 text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={displayLabel || placeholder || 'Search...'}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="block truncate select-none">{displayLabel || value}</span>
        )}
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-300 ml-2 ${isOpen ? 'rotate-180 text-primary' : 'text-slate-400'}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
             initial={{ opacity: 0, y: openUp ? 6 : -6, scale: 0.96 }} 
             animate={{ opacity: 1, y: 0, scale: 1 }} 
             exit={{ opacity: 0, y: openUp ? 4 : -4, scale: 0.96 }} 
             transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }} 
             className={`absolute z-50 w-full min-w-full bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)] border border-slate-100/80 overflow-hidden max-h-60 overflow-y-auto left-0 p-1.5 ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
          >
            <div className="space-y-0.5">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-center text-slate-500">No results found</div>
              ) : (
                filteredOptions.map((option, index) => {
                  if (typeof option === 'object' && 'options' in option) {
                    return (
                      <div key={'group-' + index} className="mb-1">
                        <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{option.label}</div>
                        {option.options.map((subOpt, subIndex) => {
                          const optIdx = selectableCounter++;
                          const optValue = getValue(subOpt);
                          const optLabel = getLabel(subOpt);
                          const isSelected = value === optValue;
                          const isHighlighted = highlightedIndex === optIdx;

                          return (
                            <button 
                              key={`${optValue}-${subIndex}`} 
                              ref={(el) => { optionRefs.current[optIdx] = el; }}
                              type="button" 
                              onMouseEnter={() => setHighlightedIndex(optIdx)}
                              onClick={(e) => { e.stopPropagation(); onChange(optValue); setIsOpen(false); }} 
                              className={`w-full px-3 py-2 text-sm text-left truncate transition-colors rounded-lg block ${
                                isSelected 
                                  ? 'text-secondary font-bold bg-slate-50' 
                                  : isHighlighted 
                                  ? 'text-secondary font-medium bg-slate-50' 
                                  : 'text-slate-700 font-medium hover:text-secondary hover:bg-slate-50'
                              }`}
                            >
                              {optLabel}
                            </button>
                          );
                        })}
                      </div>
                    );
                  }
                  
                  const optIdx = selectableCounter++;
                  const optValue = getValue(option as string | SelectOption);
                  const optLabel = getLabel(option as string | SelectOption);
                  const isSelected = value === optValue;
                  const isHighlighted = highlightedIndex === optIdx;

                  return (
                    <button 
                      key={`${optValue}-${index}`} 
                      ref={(el) => { optionRefs.current[optIdx] = el; }}
                      type="button" 
                      onMouseEnter={() => setHighlightedIndex(optIdx)}
                      onClick={(e) => { e.stopPropagation(); onChange(optValue); setIsOpen(false); }} 
                      className={`w-full px-3 py-2 text-sm text-left truncate transition-colors rounded-lg block ${
                        isSelected 
                          ? 'text-secondary font-bold bg-slate-50' 
                          : isHighlighted 
                          ? 'text-secondary font-medium bg-slate-50' 
                          : 'text-slate-700 font-medium hover:text-secondary hover:bg-slate-50'
                      }`}
                    >
                      {optLabel}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
