import React from 'react';
import { motion } from 'motion/react';
import { Construction, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UnderConstruction() {
  return (
    <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center bg-[#FAFAFA] px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl mx-auto"
      >
        <div className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-8">
          <Construction className="h-12 w-12 text-primary" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-black text-primary mb-6 tracking-tight">
          Under Construction
        </h1>
        
        <p className="text-lg text-slate-500 mb-10 leading-relaxed">
          We are currently working on this page. Our service details will be available soon. Please check back later or contact us directly for more information.
        </p>
        
        <Link 
          to="/"
          className="inline-flex items-center space-x-2 bg-primary text-white px-8 py-4 font-bold uppercase text-xs tracking-widest hover:bg-secondary transition-all rounded-md"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return Home</span>
        </Link>
      </motion.div>
    </div>
  );
}
