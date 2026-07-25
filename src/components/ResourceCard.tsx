import React from 'react';
import { motion } from 'motion/react';
import { Download, FileText, PieChart, BookOpen } from 'lucide-react';

interface ResourceCardProps {
  resource: {
    id: string;
    title: string;
    type: string;
    description: string;
    fileSize: string;
    fileFormat: string;
    downloadUrl: string;
  };
  index: number;
}

export default function ResourceCard({ resource, index }: ResourceCardProps) {
  const getIcon = () => {
    switch (resource.type) {
      case 'report':
        return <PieChart className="w-5 h-5 text-blue-600" />;
      case 'guide':
        return <BookOpen className="w-5 h-5 text-emerald-600" />;
      case 'whitepaper':
      default:
        return <FileText className="w-5 h-5 text-indigo-600" />;
    }
  };

  const getBadgeColor = () => {
    switch (resource.type) {
      case 'report':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'guide':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'whitepaper':
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all hover:border-primary/30"
    >
      <div className="p-6 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getBadgeColor()}`}>
            {getIcon()}
            <span>{resource.type}</span>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {resource.fileFormat} • {resource.fileSize}
          </span>
        </div>
        
        <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-primary transition-colors leading-tight">
          {resource.title}
        </h3>
        
        <p className="text-sm text-slate-600 mb-6 flex-grow leading-relaxed">
          {resource.description}
        </p>
        
        <a 
          href={resource.downloadUrl}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-full space-x-2 bg-slate-50 hover:bg-primary hover:text-white text-slate-700 font-bold text-sm px-4 py-3 rounded-xl transition-all border border-slate-200 hover:border-primary group/btn"
        >
          <Download className="w-4 h-4 transition-transform group-hover/btn:-translate-y-0.5" />
          <span>Download Asset</span>
        </a>
      </div>
    </motion.div>
  );
}
