import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../lib/utils';
import { services } from '../data';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();

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
    { name: 'Blog', path: '/blog' },
    { name: 'Portal', path: '/dashboard' },
    { name: 'About', path: '/#about' },
    { name: 'Contact', path: '/#contact' },
  ];

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 bg-amber-500 text-white text-xs font-semibold py-2 px-4 text-center z-[100] flex items-center justify-center gap-1.5 shadow-sm">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <span>Working in offline mode. Firestore sync will resume when connection is restored.</span>
        </div>
      )}
      <nav className={cn(
        "fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 transition-all",
        !isOnline ? "top-8" : "top-0"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                    <div key={item.name} className="relative group">
                      <a href={item.path} className={cn(linkClasses, "flex items-center gap-1.5 py-4", active && "text-secondary")}>
                        {item.name}
                        <ChevronDown className="h-3 w-3 group-hover:rotate-180 transition-transform duration-300" style={{ color: active ? 'var(--color-secondary)' : 'inherit' }} />
                      </a>
                      
                      <div className="absolute top-12 left-0 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-left scale-95 group-hover:scale-100 pt-2">
                        <div className="bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100/60 overflow-hidden py-2 relative before:content-[''] before:absolute before:-top-4 before:left-0 before:w-full before:h-4">
                          {services.map((service) => (
                            <Link 
                              key={service.id} 
                              to={`/services/${service.id}`} 
                              className="block px-5 py-3 text-sm font-semibold text-black hover:bg-slate-50 hover:text-primary transition-colors"
                            >
                              {service.title}
                            </Link>
                          ))}
                        </div>
                      </div>
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
              <Link
                to="/#contact"
                className="bg-primary text-white px-5 lg:px-8 py-3 text-xs font-medium uppercase tracking-widest hover:bg-secondary transition-all rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap shrink-0"
              >
                Get Started
              </Link>
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
                  <Link
                    to="/#contact"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center bg-primary text-white px-6 py-3 rounded-full shadow-sm text-base font-medium"
                  >
                    Book a Consultation
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
