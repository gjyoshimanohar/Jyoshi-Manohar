import { motion } from 'motion/react';
import { ArrowRight, ChevronRight } from 'lucide-react';

export default function Hero() {
 return (
 <section className="relative pt-14 pb-8 lg:pt-20 lg:pb-12 overflow-hidden bg-white border-b border-border">
 <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-primary/[0.03] -z-0"></div>
 
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
 <div className="max-w-xl lg:max-w-none">
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.6 }}
 >
 <p className="inline-flex items-center space-x-2 bg-primary/5 border border-primary/10 text-primary font-medium tracking-widest uppercase text-[10px] sm:text-xs md:text-sm whitespace-nowrap px-4 py-2 rounded-full mb-4 shadow-sm">
 <span className="w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0"></span>
 <span className="text-secondary">Startup Consultant, Semi-Qualified Chartered Accountant</span>
 </p>
 <h1 className="text-6xl lg:text-[112px] text-primary leading-[0.9] tracking-tighter mb-4 uppercase">
 Financial<br />
 Clarity<br />
 <span className="text-[#d0d7e1]">
 For<br />
 Modern<br />
 Business.
 </span>
 </h1>
 <p className="text-base lg:text-base text-black font-medium leading-relaxed text-justify mb-5 max-w-lg">
 Supporting every business and individual with trusted advisory, tax planning, and audit assurance services — no matter where you are in your journey.
 </p>
 
 <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 outline-none">
 <a
 href="#contact"
 className="inline-flex items-center justify-center bg-primary text-white px-10 py-5 text-sm font-medium uppercase tracking-widest hover:bg-secondary transition-all rounded-full shadow-sm hover:shadow-lg hover:-translate-y-0.5"
 >
 Book Consultation
 </a>
 <a
 href="#services"
 className="inline-flex items-center justify-center bg-transparent text-primary border border-slate-200 px-10 py-5 text-sm font-medium uppercase tracking-widest hover:bg-white transition-all rounded-full shadow-sm hover:shadow-lg hover:-translate-y-0.5"
 >
 Explore Services
 </a>
 </div>
 </motion.div>

 <motion.div
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ duration: 0.8, delay: 0.4 }}
 className="mt-10 flex space-x-16"
 >
 <div>
 <div className="text-3xl text-primary mb-1">7+</div>
 <div className="text-xs text-black font-medium uppercase tracking-widest">Years Practice</div>
 </div>
 <div>
 <div className="text-3xl text-primary mb-1">50+</div>
 <div className="text-xs text-black font-medium uppercase tracking-widest">Corporate Clients</div>
 </div>
 </motion.div>
 </div>

 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ duration: 0.8, delay: 0.2 }}
 className="mt-12 lg:mt-0 w-full max-w-sm sm:max-w-md lg:max-w-none mx-auto lg:mx-0 relative group cursor-pointer"
 >
 {/* Using an Unsplash placeholder photo as image generation quota is exceeded, but keeping the professional suit aesthetic */}
 <img 
 src="/logo.svg" 
 alt="CA Jyoshi Manohar" 
 className="w-full h-auto object-cover rounded-3xl shadow-2xl aspect-[4/5] bg-slate-100 transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-[1.01]"
 />
 {/* Decorative element */}
 <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 to-transparent rounded-3xl -z-10 transform translate-x-4 translate-y-4 transition-all duration-500 group-hover:translate-x-6 group-hover:translate-y-6 blur-md"></div>
 </motion.div>
 </div>
 </div>
 </section>
 );
}
