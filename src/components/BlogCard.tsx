import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { BlogPost } from '../types';

interface BlogCardProps {
  post: BlogPost;
  index: number;
}

export default function BlogCard({ post, index }: BlogCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.01, y: -2 }}
      className="group border-b border-border last:border-0 hover:bg-white hover:shadow-xl transition-all relative z-0 hover:z-10"
    >
      <a href={`https://blogs.jyoshimanohar.com/${post.slug}`} target="_blank" rel="noopener noreferrer" className="block py-10 px-6 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">{post.category}</span>
              <span className="text-slate-200">•</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{post.date}</span>
            </div>
            <h3 className="text-2xl font-bold text-primary group-hover:text-secondary transition-colors mb-4">
              {post.title}
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed font-medium line-clamp-2">
              {post.excerpt}
            </p>
          </div>
          
          <div className="flex items-center text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-secondary transition-colors">
            Read Post
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </a>
    </motion.div>
  );
}
