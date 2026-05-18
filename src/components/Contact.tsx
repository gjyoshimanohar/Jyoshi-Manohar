import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, MapPin, Send, ChevronDown, Check } from 'lucide-react';

export default function Contact() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState('Tax Planning');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const interests = [
    'Tax Planning',
    'Internal Audit',
    'Corporate Advisory',
    'Compliance Services'
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <section id="contact" className="bg-white border-t border-border">
      <div className="max-w-7xl mx-auto border-x border-border">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="p-12 lg:p-20 border-r border-border bg-accent flex flex-col justify-center">
            <p className="text-secondary font-bold tracking-widest uppercase text-xs mb-4">Strategic Partnership</p>
            <h2 className="text-4xl lg:text-5xl font-black text-primary mb-8 leading-tight">
              Ready to <br />Secure Your Capital?
            </h2>
            <p className="text-lg text-slate-500 mb-12 font-medium leading-relaxed max-w-sm">
              Schedule a private session to discuss taxation, audit, or corporate strategy.
            </p>

            <div className="space-y-8">
              {[
                { icon: Mail, label: 'Correspondence', values: ['contact@jyoshimanohar.com'] },
                { icon: Phone, label: 'Direct Line', value: '+91 9492377780' },
                { icon: MapPin, label: 'Presence', value: 'Hyderabad, TG' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center space-x-6">
                  <div className="h-14 w-14 bg-white border border-slate-200 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{item.label}</div>
                    <div className="flex flex-col">
                      {'values' in item ? (
                        item.values.map((v, i) => (
                          <div key={i} className="text-lg font-bold text-primary leading-tight">{v}</div>
                        ))
                      ) : (
                        <div className="text-lg font-bold text-primary">{item.value}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="p-12 lg:p-20"
          >
            <form className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</label>
                  <input
                    type="text"
                    className="w-full px-0 py-4 border-b border-slate-200 text-lg font-bold text-primary focus:outline-none focus:border-secondary transition-all bg-transparent"
                    placeholder="Enter Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
                  <input
                    type="email"
                    className="w-full px-0 py-4 border-b border-slate-200 text-lg font-bold text-primary focus:outline-none focus:border-secondary transition-all bg-transparent"
                    placeholder="Enter Email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Area of Interest</label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full px-0 py-4 border-b border-slate-200 text-lg font-bold text-primary focus:outline-none focus:border-secondary transition-all bg-transparent flex items-center justify-between group"
                  >
                    <span>{selectedInterest}</span>
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
                      >
                        <div className="py-2">
                          {interests.map((interest) => (
                            <button
                              key={interest}
                              type="button"
                              onClick={() => {
                                setSelectedInterest(interest);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors ${
                                selectedInterest === interest ? 'text-primary bg-slate-50/50' : 'text-slate-600'
                              }`}
                            >
                              <span className="text-base font-semibold">{interest}</span>
                              {selectedInterest === interest && (
                                <Check className="h-5 w-5 text-secondary" />
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requirement Brief</label>
                <textarea
                  rows={3}
                  className="w-full px-0 py-4 border-b border-slate-200 text-lg font-bold text-primary focus:outline-none focus:border-secondary transition-all bg-transparent resize-none"
                  placeholder="Describe your context"
                ></textarea>
              </div>
              <button
                type="button"
                className="w-full bg-primary text-white py-6 text-sm font-black uppercase tracking-widest hover:bg-secondary transition-all flex items-center justify-center space-x-3 group rounded-md"
              >
                <span>Initiate Consultation</span>
                <Send className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
