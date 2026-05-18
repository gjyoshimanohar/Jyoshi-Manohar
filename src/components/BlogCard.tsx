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
  'bg-blue-100/55', // Light Blue
  'bg-amber-100/55', // Light Yellow
  'bg-green-100/55', // Light Green
  'bg-rose-100/55', // Light Pink
  'bg-purple-100/55', // Light Purple
];

export default function BlogCard({ post, index }: BlogCardProps) {
  const bgClass = cardStyles[index % cardStyles.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.01, y: -2 }}
      className={`group p-8 lg:p-10 rounded-[2rem] ${bgClass} transition-all duration-300 hover:shadow-xl relative flex flex-col`}
    >
      <a href={`https://blogs.jyoshimanohar.com/${post.slug}`} target="_blank" rel="noopener noreferrer" className="block flex-grow transition-colors">
        <div className="flex flex-col h-full justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-[10px] font-black text-[#FF6B4A] uppercase tracking-[0.2em]">{post.category}</span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{post.date}</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 transition-colors mb-4">
              {post.title}
            </h3>
            <p className="text-slate-600 text-[15px] leading-relaxed font-medium line-clamp-3">
              {post.excerpt}
            </p>
          </div>
          
          <div className="flex items-center text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-[#FF6B4A] transition-colors mt-4">
            Read Post
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform text-[#FF6B4A] group-hover:text-[#FF6B4A]" />
          </div>
        </div>
      </a>
    </motion.div>
  );
}
