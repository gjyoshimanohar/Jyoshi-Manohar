import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { services } from '../data';

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/#services' },
    { name: 'Blog', path: 'https://blogs.jyoshimanohar.com' },
    { name: 'About', path: '/#about' },
    { name: 'Contact', path: '/#contact' },
  ];

  return (
    <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center transition-transform group-hover:rotate-90">
                 <span className="text-white font-bold text-xl tracking-tighter">JM</span>
              </div>
              <span className="font-bold text-lg tracking-tight uppercase text-primary">
                Jyoshi Manohar
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-10">
            {navItems.map((item) => {
              // Determine if we should use an anchor tag or Link based on if it's a hash link
              const isHash = item.path.includes('#');
              const isExternal = item.path.startsWith('http');
              const linkClasses = "text-xs font-bold uppercase tracking-[0.2em] transition-colors text-black hover:text-secondary focus:outline-none";

              if (item.name === 'Services') {
                return (
                  <div key={item.name} className="relative group">
                    <a href={item.path} className={linkClasses + " flex items-center gap-1.5 py-4"}>
                      {item.name}
                      <ChevronDown className="h-3 w-3 group-hover:rotate-180 transition-transform duration-300" />
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
                  <a key={item.name} href={item.path} target="_blank" rel="noopener noreferrer" className={linkClasses}>
                    {item.name}
                  </a>
                );
              }

              if (isHash) {
                return (
                  <a key={item.name} href={item.path} className={linkClasses}>
                    {item.name}
                  </a>
                );
              }
              
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      linkClasses,
                      isActive && "text-secondary"
                    )
                  }
                  end={item.path === '/'}
                >
                  {item.name}
                </NavLink>
              );
            })}
            <Link
              to="/#contact"
              className="bg-primary text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-secondary transition-all rounded-full shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-black hover:text-primary transition-colors"
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
                const linkClasses = "flex items-center justify-between w-full px-3 py-4 text-base font-normal text-black hover:text-primary hover:bg-slate-50 rounded-lg transition-colors";
                
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
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) => cn(linkClasses, isActive && "text-primary bg-slate-50")}
                    end={item.path === '/'}
                  >
                    {item.name}
                  </NavLink>
                );
              })}
              <div className="pt-4 px-3">
                <Link
                  to="/#contact"
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center bg-primary text-white px-6 py-3 rounded-full shadow-sm text-base font-bold"
                >
                  Book a Consultation
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
