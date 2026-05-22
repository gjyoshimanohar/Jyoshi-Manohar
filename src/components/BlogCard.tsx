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
      className={`group relative flex-col overflow-hidden p-8 lg:p-10 rounded-3xl ${bgClass} shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-200/60 backdrop-blur-sm transition-all duration-500 hover:shadow-[0_12px_40px_rgba(49,80,160,0.25)] hover:-translate-y-2 hover:scale-[1.02] flex`}
    >
      <Link to={`/blog/${post.slug}`} className="block flex-grow transition-colors">
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        
        <div className="absolute top-8 right-8 lg:top-10 lg:right-10 opacity-0 transform translate-x-4 -translate-y-4 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-500 z-10 pointer-events-none">
          <ArrowRight className="h-6 w-6 text-secondary -rotate-45" strokeWidth={2.5} />
        </div>

        <div className="relative z-10 flex flex-col h-full justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-xs font-black text-[#FF6B4A] group-hover:text-secondary transition-colors duration-500 uppercase tracking-[0.2em]">{post.category}</span>
              <span className="text-black/30 transition-colors duration-500">•</span>
              <span className="text-xs font-bold text-black transition-colors duration-500 uppercase tracking-widest">{post.date}</span>
            </div>
            <h3 className="text-2xl font-bold text-black group-hover:text-secondary transition-colors duration-500 mb-4">
              {post.title}
            </h3>
            <p className="text-black/70 text-sm leading-relaxed text-justify font-normal line-clamp-3 group-hover:text-black/90 transition-colors duration-500">
              {post.excerpt}
            </p>
          </div>
          
          <div className="flex items-center text-xs font-black uppercase tracking-widest text-black group-hover:text-secondary transition-colors duration-500 mt-4">
            Read Post
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform text-black group-hover:text-secondary" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
