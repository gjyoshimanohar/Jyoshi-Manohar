import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/#services' },
    { name: 'Blog', path: '/blog' },
    { name: 'About', path: '/#about' },
    { name: 'Contact', path: '/#contact' },
  ];

  return (
    <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-primary flex items-center justify-center transition-transform group-hover:rotate-90">
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
              const linkClasses = "text-[11px] font-bold uppercase tracking-[0.2em] transition-colors text-slate-500 hover:text-secondary";

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
              className="bg-primary text-white px-8 py-3 text-[11px] font-bold uppercase tracking-widest hover:bg-secondary transition-all"
            >
              Get Started
            </Link>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-600 hover:text-primary transition-colors"
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
                const linkClasses = "block px-3 py-4 text-base font-medium text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg transition-colors";
                
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
                  className="block w-full text-center bg-primary text-white px-6 py-3 rounded-xl text-base font-medium"
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
