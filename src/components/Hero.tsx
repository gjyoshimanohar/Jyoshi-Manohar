import { motion } from 'motion/react';
import { ArrowRight, ChevronRight } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white border-b border-border">
      <div className="absolute inset-0 bg-accent -z-0"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-xl lg:max-w-none">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-secondary font-bold tracking-[0.25em] uppercase text-xs mb-6">Startup Consultant, Semi-Qualified Chartered Accountant & Strategic Advisor</p>
              <h1 className="text-6xl lg:text-8xl font-black text-primary leading-[0.9] tracking-tight mb-8">
                Financial Clarity <br />
                <span className="text-slate-300">for Modern Business.</span>
              </h1>
              <p className="text-lg lg:text-xl text-slate-500 mb-10 leading-relaxed max-w-lg">
                Providing comprehensive business advisory, tax planning, and audit assurance 
                services for high-growth enterprises and individuals.
              </p>
              
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-1 outline-none">
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center bg-primary text-white px-10 py-5 text-sm font-bold uppercase tracking-widest hover:bg-secondary transition-all"
                >
                  Book Consultation
                </a>
                <a
                  href="#services"
                  className="inline-flex items-center justify-center bg-transparent text-primary border border-slate-200 px-10 py-5 text-sm font-bold uppercase tracking-widest hover:bg-white transition-all"
                >
                  Explore Services
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-20 flex space-x-16"
            >
              <div>
                <div className="text-3xl font-black text-primary mb-1">7+</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Years Practice</div>
              </div>
              <div>
                <div className="text-3xl font-black text-primary mb-1">50+</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Corporate Clients</div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block relative"
          >
            {/* Using an Unsplash placeholder photo as image generation quota is exceeded, but keeping the professional suit aesthetic */}
            <img 
              src="/profile.png" 
              alt="CA Jyoshi Manohar" 
              className="w-full h-auto object-cover rounded-2xl shadow-2xl aspect-[4/5] bg-slate-100"
            />
            {/* Decorative element */}
            <div className="absolute -inset-4 border-2 border-slate-100 rounded-2xl -z-10 transform translate-x-4 translate-y-4"></div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
