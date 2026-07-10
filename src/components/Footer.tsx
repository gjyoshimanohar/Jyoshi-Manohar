import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Linkedin, Twitter, Scale } from 'lucide-react';

export default function Footer() {
 return (
 <footer className="relative bg-primary text-white pt-16 pb-8 overflow-hidden mt-20">
 {/* Background Decorative Rings/Circles in top right */}
 <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none hidden md:block">
 <svg className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 opacity-10" width="800" height="800" viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
 {/* Outer Ring */}
 <circle cx="400" cy="400" r="400" fill="currentColor" />
 
 {/* Middle Circle */}
 <circle cx="400" cy="400" r="300" fill="#020617" />
 
 {/* Inner Circle */}
 <circle cx="400" cy="400" r="200" fill="currentColor" />
 </svg>
 </div>

 <div className="relative z-10 w-[98%] mx-auto px-2 sm:px-4 lg:px-6">
 
 {/* Highlight CTA Box */}
 <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-10 md:p-12 mb-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 shadow-xl">
 <div className="max-w-3xl">
 <h2 className="text-3xl md:text-4xl font-display font-medium text-white tracking-tight leading-tight mb-4">
 Ready to take your business to the next level?
 </h2>
 <p className="font-medium text-white/80 text-base leading-relaxed max-w-2xl">
 Let us handle your financial compliances so you can focus entirely on your vision and scaling up.
 </p>
 </div>
 <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full lg:w-auto">
 <Link 
 to="/#contact"
 className="w-full sm:w-auto text-center inline-flex items-center justify-center px-8 py-4 bg-white hover:bg-gray-100 text-secondary text-sm font-medium rounded-full transition-all shadow-md"
 >
 Book your Appointment now
 </Link>
 <Link 
 to="/#contact"
 className="w-full sm:w-auto text-center inline-flex items-center justify-center px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-full transition-all"
 >
 Contact us
 </Link>
 </div>
 </div>

 {/* Divider */}
 <div className="w-full h-px bg-white/10 mb-12"></div>

 <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8">
 {/* Brand Col */}
 <div className="col-span-1 md:col-span-4 space-y-6">
 <div className="flex items-center space-x-3">
 <div className="w-10 h-10 bg-white flex items-center justify-center rounded-sm shadow-sm">
 <span className="text-primary text-lg tracking-tighter">JM</span>
 </div>
 <span className="font-medium text-xl tracking-tight text-white font-display uppercase">
 Jyoshi Manohar
 </span>
 </div>
 <p className="text-white/70 text-base font-medium leading-loose pt-2">
 Precision financial guidance for the modern era. Specializing in tax optimization and corporate value preservation.
 </p>
 </div>

 {/* Links 1 - Quick Links */}
 <div className="col-span-1 md:col-span-2 md:col-start-5">
 <h4 className="text-white font-medium text-sm uppercase mb-6 tracking-wide">Quick Links</h4>
 <ul className="space-y-4 text-sm font-medium text-white/70">
 <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
 <li><Link to="/#services" className="hover:text-white transition-colors">Services</Link></li>
 <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
 <li><Link to="/#about" className="hover:text-white transition-colors">About</Link></li>
 <li><Link to="/#contact" className="hover:text-white transition-colors">Contact</Link></li>
 </ul>
 </div>

 {/* Links 2 - Internal */}
 <div className="col-span-1 md:col-span-2">
 <h4 className="text-white font-medium text-sm uppercase mb-6 tracking-wide">Internal</h4>
 <ul className="space-y-4 text-sm font-medium text-white/70">
 <li><Link to="/admin" className="hover:text-white transition-colors">Admin</Link></li>
 <li><Link to="/tasks" className="hover:text-white transition-colors">Workspace</Link></li>
 </ul>
 </div>
 </div>
 </div>
 
 {/* Scroll to Top Arrow (Optional) */}
 <button 
 onClick={(e) => {
 e.preventDefault();
 window.scrollTo({ top: 0, behavior: 'smooth' });
 document.getElementById('root')?.scrollIntoView({ behavior: 'smooth' });
 }}
 className="absolute bottom-8 right-8 z-50 w-12 h-12 bg-[#AD8D3E] hover:bg-[#8A7131] rounded-full flex items-center justify-center text-white transition-all shadow-lg cursor-pointer"
 aria-label="Scroll to top"
 >
 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
 </svg>
 </button>
 </footer>
 );
}
