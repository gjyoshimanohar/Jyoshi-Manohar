import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { BlogPost } from '../types';

interface BlogCardProps {
  post: BlogPost;
  index: number;
  key?: string | number;
}

const cardStyles = [
  'bg-blue-50/80 hover:bg-blue-100/80', // Light Blue
  'bg-amber-50/80 hover:bg-amber-100/80', // Light Yellow
  'bg-green-50/80 hover:bg-green-100/80', // Light Green
  'bg-rose-50/80 hover:bg-rose-100/80', // Light Pink
  'bg-purple-50/80 hover:bg-purple-100/80', // Light Purple
];

export default function BlogCard({ post, index }: BlogCardProps) {
  const bgClass = cardStyles[index % cardStyles.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className={`group relative flex-col overflow-hidden p-8 lg:p-10 rounded-3xl ${bgClass} shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-200/60 transition-all duration-500 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-2 hover:scale-[1.02] flex`}
    >
      <a href={`https://blogs.jyoshimanohar.com/${post.slug}`} target="_blank" rel="noopener noreferrer" className="block flex-grow transition-colors">
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col h-full justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-xs font-black text-[#FF6B4A] uppercase tracking-[0.2em]">{post.category}</span>
              <span className="text-black/30">•</span>
              <span className="text-xs font-bold text-black uppercase tracking-widest">{post.date}</span>
            </div>
            <h3 className="text-2xl font-bold text-black group-hover:text-primary transition-colors duration-500 mb-4">
              {post.title}
            </h3>
            <p className="text-black/70 text-sm leading-relaxed font-normal line-clamp-3 group-hover:text-black/90 transition-colors duration-500">
              {post.excerpt}
            </p>
          </div>
          
          <div className="flex items-center text-xs font-black uppercase tracking-widest text-black group-hover:text-[#FF6B4A] transition-colors duration-500 mt-4">
            Read Post
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform text-black group-hover:text-[#FF6B4A]" />
          </div>
        </div>
      </a>
    </motion.div>
  );
}
