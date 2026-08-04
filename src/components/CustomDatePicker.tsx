import React, { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid } from 'date-fns';
import { Calendar as CalendarIcon, X, Check } from 'lucide-react';

interface CustomDatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  required?: boolean;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value = '',
  onChange,
  placeholder = 'Select date',
  className = '',
  id,
  name,
  disabled = false,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse string YYYY-MM-DD to Date object
  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    const parsed = parse(value, 'yyyy-MM-dd', new Date());
    return isValid(parsed) ? parsed : undefined;
  }, [value]);

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleDaySelect = (date: Date | undefined) => {
    if (date) {
      const formatted = format(date, 'yyyy-MM-dd');
      onChange(formatted);
      setIsOpen(false);
    } else {
      onChange('');
    }
  };

  const handleTodayClick = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    onChange(todayStr);
    setIsOpen(false);
  };

  const handleClearClick = () => {
    onChange('');
    setIsOpen(false);
  };

  const displayString = selectedDate ? format(selectedDate, 'dd MMM yyyy') : '';

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <div
        className={`relative flex items-center cursor-pointer select-none rounded-xl border bg-white px-3 py-2 text-sm transition-all duration-200 hover:border-amber-500 hover:ring-2 hover:ring-amber-500/20 ${
          isOpen ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-md' : 'border-slate-200 shadow-xs'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''} ${className}`}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        id={id}
      >
        <CalendarIcon className="w-4 h-4 text-amber-600 mr-2 shrink-0 transition-transform group-hover:scale-110" />
        <input
          type="text"
          name={name}
          readOnly
          required={required}
          value={displayString}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none cursor-pointer text-xs sm:text-sm"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClearClick();
            }}
            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors mr-0.5"
            title="Clear date"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-[9999] w-[245px] sm:w-[250px] bg-white rounded-xl shadow-xl border border-amber-200/80 p-2.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 px-0.5">
            <span className="text-[11px] font-bold text-amber-900 tracking-wide uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
              Select Date
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleTodayClick}
                className="px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-500 hover:text-white rounded-md transition-all cursor-pointer"
              >
                Today
              </button>
              {value && (
                <button
                  type="button"
                  onClick={handleClearClick}
                  className="px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-100 rounded-md transition-all cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="rdp-amber-theme flex justify-center">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleDaySelect}
              month={selectedDate || new Date()}
              className="m-0 border-0"
            />
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[10px] text-center text-amber-700 font-semibold flex items-center justify-center gap-1">
            <span>✨ Golden date text highlight</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
