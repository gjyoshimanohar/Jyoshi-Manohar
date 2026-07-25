import React, { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../lib/utils';
import { services } from '../data';
import { useClickOutside } from '../hooks/useClickOutside';
import CalendarSyncModal from './CalendarSyncModal';
import DailyStandupModal from './DailyStandupModal';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);
  const [isDailyStandupOpen, setIsDailyStandupOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const servicesDropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useClickOutside(servicesDropdownRef, () => setServicesOpen(false), servicesOpen);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isItemActive = (item: { name: string; path: string }) => {
    if (item.path.includes('#')) {
      const hash = item.path.substring(item.path.indexOf('#'));
      return location.pathname === '/' && location.hash === hash;
    }
    if (item.path === '/') {
      return location.pathname === '/' && !location.hash;
    }
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/#services' },
    { name: 'Insights', path: '/blog' },
    { name: 'Resources', path: '/resources' },
    { name: 'Portal', path: '/dashboard' },
    { name: 'About', path: '/#about' },
  ];

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 bg-amber-500 text-white text-xs font-semibold py-2 px-4 text-center z-[110] flex items-center justify-center gap-1.5 shadow-sm">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <span>Working in offline mode. Firestore sync will resume when connection is restored.</span>
        </div>
      )}
      <nav className={cn(
        "fixed w-full z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 transition-all",
        !isOnline ? "top-8" : "top-0"
      )}>
        <div className="w-[98%] mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center transition-transform group-hover:rotate-90">
                  <span className="text-white font-medium text-xl tracking-tighter">JM</span>
                </div>
                <span className="font-medium text-lg tracking-tight uppercase text-primary">
                  Jyoshi Manohar
                </span>
              </Link>
            </div>

            <div className="hidden md:flex items-center space-x-4 lg:space-x-8 xl:space-x-10">
              {navItems.map((item) => {
                const isHash = item.path.includes('#');
                const isExternal = item.path.startsWith('http');
                const linkClasses = "text-xs font-medium uppercase tracking-[0.2em] transition-colors text-black hover:text-secondary focus:outline-none";
                const active = isItemActive(item);
                const itemClasses = cn(
                  linkClasses,
                  active && "text-secondary"
                );

                if (item.name === 'Services') {
                  return (
                    <div
                      key={item.name}
                      ref={servicesDropdownRef}
                      className="relative"
                      onMouseEnter={() => setServicesOpen(true)}
                      onMouseLeave={() => setServicesOpen(false)}
                    >
                      <a
                        href={item.path}
                        onClick={(e) => {
                          e.preventDefault();
                          setServicesOpen(!servicesOpen);
                        }}
                        className={cn(linkClasses, "flex items-center gap-1.5 py-4 cursor-pointer", active && "text-secondary")}
                      >
                        {item.name}
                        <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${servicesOpen ? 'rotate-180' : ''}`} style={{ color: active ? 'var(--color-secondary)' : 'inherit' }} />
                      </a>
                      
                      <AnimatePresence>
                        {servicesOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.96 }}
                            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute top-12 left-0 w-64 pt-2 z-50 origin-top-left"
                          >
                            <div className="bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)] border border-slate-100/80 p-1.5 flex flex-col gap-0.5">
                              {services.map((service) => (
                                <Link 
                                  key={service.id} 
                                  to={`/services/${service.id}`} 
                                  onClick={() => setServicesOpen(false)}
                                  className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors rounded-lg"
                                >
                                  {service.title}
                                </Link>
                              ))}
                              <div className="border-t border-slate-100 my-1" />
                              <Link 
                                to="/toolkit" 
                                onClick={() => setServicesOpen(false)}
                                className="px-3 py-2 text-sm font-semibold text-secondary hover:bg-secondary/5 hover:text-primary transition-colors rounded-lg flex items-center justify-between"
                              >
                                <span>Interactive Toolkit</span>
                                <span className="text-[9px] bg-secondary/10 text-secondary px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Smart Tools</span>
                              </Link>

                              <button 
                                onClick={() => {
                                  setServicesOpen(false);
                                  setIsCalendarSyncOpen(true);
                                }}
                                className="w-full text-left px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors rounded-lg flex items-center justify-between"
                              >
                                <span className="flex items-center gap-2">
                                  <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
                                  Compliance Calendar Sync
                                </span>
                                <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Google / Outlook</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                if (isExternal) {
                  return (
                    <a key={item.name} href={item.path} target="_blank" rel="noopener noreferrer" className={itemClasses}>
                      {item.name}
                    </a>
                  );
                }

                if (isHash) {
                  return (
                    <a key={item.name} href={item.path} className={itemClasses}>
                      {item.name}
                    </a>
                  );
                }
                
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={itemClasses}
                  >
                    {item.name}
                  </Link>
                );
              })}

              <a
                href="/#contact"
                className="bg-primary text-white px-5 lg:px-8 py-3 text-xs font-medium uppercase tracking-widest hover:bg-secondary transition-all rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap shrink-0"
              >
                Get Started
              </a>
            </div>

            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-black hover:text-primary transition-colors focus:outline-none"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-slate-100 overflow-hidden"
            >
              <div className="px-4 pt-2 pb-6 space-y-1">
                {navItems.map((item) => {
                  const isHash = item.path.includes('#');
                  const isExternal = item.path.startsWith('http');
                  const active = isItemActive(item);
                  const linkClasses = cn(
                    "flex items-center justify-between w-full px-3 py-4 text-base font-normal rounded-lg transition-colors",
                    active ? "text-primary bg-slate-50 font-semibold" : "text-black hover:text-primary hover:bg-slate-50"
                  );
                  
                  if (item.name === 'Services') {
                    return (
                      <div key={item.name} className="flex flex-col">
                        <button 
                          onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                          className={linkClasses}
                        >
                          <span>{item.name}</span>
                          <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${mobileServicesOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {mobileServicesOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="bg-slate-50/50 rounded-lg ml-4 mr-2 overflow-hidden mt-1"
                            >
                              <div className="py-2 space-y-1">
                                {services.map((service) => (
                                  <Link 
                                    key={service.id} 
                                    to={`/services/${service.id}`} 
                                    onClick={() => setIsOpen(false)}
                                    className="block w-full px-4 py-3 text-sm font-normal text-black hover:text-primary transition-colors"
                                  >
                                    {service.title}
                                  </Link>
                                ))}
                                <div className="border-t border-slate-150 my-1 mx-4" />
                                <Link 
                                  to="/toolkit" 
                                  onClick={() => setIsOpen(false)}
                                  className="block w-full px-4 py-3 text-sm font-semibold text-secondary hover:text-primary transition-colors flex items-center justify-between"
                                >
                                  <span>Interactive Toolkit</span>
                                  <span className="text-[9px] bg-secondary/10 text-secondary px-1.5 py-0.5 rounded uppercase tracking-wider font-bold mr-2">Smart Tools</span>
                                </Link>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  if (isExternal) {
                    return (
                      <a
                        key={item.name}
                        href={item.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsOpen(false)}
                        className={linkClasses}
                      >
                        {item.name}
                      </a>
                    );
                  }

                  if (isHash) {
                    return (
                      <a
                        key={item.name}
                        href={item.path}
                        onClick={() => setIsOpen(false)}
                        className={linkClasses}
                      >
                        {item.name}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={linkClasses}
                    >
                      {item.name}
                    </Link>
                  );
                })}
                <div className="pt-4 px-3">
                  <a
                    href="/#contact"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center bg-primary text-white px-6 py-3 rounded-full shadow-sm text-base font-medium"
                  >
                    Book a Consultation
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <CalendarSyncModal
        isOpen={isCalendarSyncOpen}
        onClose={() => setIsCalendarSyncOpen(false)}
      />

      <DailyStandupModal
        isOpen={isDailyStandupOpen}
        onClose={() => setIsDailyStandupOpen(false)}
      />
    </>
  );
}
