import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Linkedin, Twitter, Scale } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-primary text-slate-400 py-20 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-24">
          <div className="col-span-1 md:col-span-2 space-y-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white flex items-center justify-center">
                <span className="text-primary font-black text-sm tracking-tighter">JM</span>
              </div>
              <span className="font-bold text-lg tracking-tight uppercase text-white">
                Jyoshi Manohar
              </span>
            </div>
            <p className="text-slate-500 max-w-sm text-sm font-medium leading-relaxed">
              Precision financial guidance for the modern era. Specializing in 
              tax optimization and corporate value preservation.
            </p>
            <div className="flex space-x-6">
              <a href="https://www.linkedin.com/in/jyoshimanoharg" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors"><Linkedin className="h-4 w-4" /></a>
              <a href="#" className="hover:text-secondary transition-colors"><Twitter className="h-4 w-4" /></a>
              <a href="mailto:jyoshimanohar@icai.org" className="hover:text-secondary transition-colors"><Mail className="h-4 w-4" /></a>
            </div>
          </div>

          <div>
            <h4 className="text-white text-[10px] font-black uppercase tracking-[0.25em] mb-8">Navigation</h4>
            <ul className="space-y-4 text-[11px] font-bold uppercase tracking-widest">
              <li><Link to="/" className="hover:text-secondary transition-colors">Overview</Link></li>
              <li><Link to="/#services" className="hover:text-secondary transition-colors">Expertise</Link></li>
              <li><Link to="/blog" className="hover:text-secondary transition-colors">Analysis</Link></li>
              <li><Link to="/#about" className="hover:text-secondary transition-colors">About</Link></li>
              <li><Link to="/admin" className="hover:text-secondary transition-colors">Management</Link></li>
              <li><a href="https://makeeazy.in/" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">makeeazy</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-[10px] font-black uppercase tracking-[0.25em] mb-8">Headquarters</h4>
            <ul className="space-y-4 text-xs font-medium">
              <li className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-secondary flex-shrink-0" />
                <span>Hyderabad, TG</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-secondary flex-shrink-0" />
                <span>+91 9492377780</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-20 pt-8 border-t border-slate-800 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
            © {new Date().getFullYear()} Jyoshi Manohar. Semi-Qualified Chartered Accountant.
          </p>
        </div>
      </div>
    </footer>
  );
}
