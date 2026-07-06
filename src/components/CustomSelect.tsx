import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: (string | SelectOption)[];
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function CustomSelect({ options, value, onChange, className = '', placeholder, disabled = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getLabel = (opt: string | SelectOption) => typeof opt === 'string' ? opt : opt.label;
  const getValue = (opt: string | SelectOption) => typeof opt === 'string' ? opt : opt.value;
  
  const currentLabel = options.find(opt => getValue(opt) === value);
  const displayLabel = currentLabel ? getLabel(currentLabel) : placeholder;

  return (
    <div 
      className={`relative ${className}`} 
      ref={dropdownRef}
      style={{ zIndex: isOpen ? 50 : undefined }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="w-full h-full flex items-center justify-between text-left focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ all: 'inherit', display: 'flex', cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <span className="block truncate">{displayLabel || value}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-300 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full min-w-max mt-1 bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border-none overflow-hidden max-h-60 overflow-y-auto"
          >
            <div className="py-2">
              {options.map((option) => {
                const optValue = getValue(option);
                const optLabel = getLabel(option);
                return (
                  <button
                    key={optValue}
                    type="button"
                    onClick={() => {
                      onChange(optValue);
                      setIsOpen(false);
                    }}
                    className={`w-full px-5 py-3 text-sm text-left font-semibold transition-colors block ${
                      value === optValue ? 'text-primary bg-slate-50' : 'text-black hover:bg-slate-50 hover:text-primary'
                    }`}
                  >
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
