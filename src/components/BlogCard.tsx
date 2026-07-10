import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { BlogPost } from '../types';

interface BlogCardProps {
 post: BlogPost;
 index: number;
 key?: string | number;
}



export default function BlogCard({ post, index }: BlogCardProps) {
 return (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true }}
 transition={{ delay: index * 0.1, duration: 0.5 }}
 className="group relative overflow-hidden flex flex-col bg-white p-8 lg:p-10 rounded-3xl h-full shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-200 transition-all duration-500 hover:shadow-[0_12px_40px_rgba(49,80,160,0.25)] hover:-translate-y-2 hover:scale-[1.02]"
 >
 <Link to={`/blog/${post.slug}`} className="block flex-grow transition-colors">
 <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
 
 <div className="absolute top-8 right-8 lg:top-10 lg:right-10 opacity-0 transform translate-x-4 -translate-y-4 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-500 z-10 pointer-events-none">
 <ArrowRight className="h-6 w-6 text-secondary -rotate-45" strokeWidth={2.5} />
 </div>

 <div className="relative z-10 flex flex-col h-full justify-between gap-6">
 <div className="max-w-2xl">
 <div className="flex items-center space-x-3 mb-6">
 <span className="text-xs text-secondary group-hover:text-secondary transition-colors duration-500 uppercase tracking-[0.2em]">{post.category}</span>
 <span className="text-black/30 transition-colors duration-500">•</span>
 <span className="text-xs font-medium text-black transition-colors duration-500 uppercase tracking-widest">{post.date}</span>
 </div>
 <h3 className="relative z-10 text-xl lg:text-2xl font-bold text-primary mb-3 transition-colors duration-500 group-hover:text-secondary">
 {post.title}
 </h3>
 <p className="relative z-10 text-base text-black/70 font-medium leading-relaxed text-justify line-clamp-3 transition-colors duration-500 group-hover:text-black/90">
 {post.excerpt || (post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 160) + '...' : '')}
 </p>
 </div>
 
 <div className="flex items-center text-xs uppercase tracking-widest text-black group-hover:text-secondary transition-colors duration-500 mt-4">
 Read Post
 <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform text-black group-hover:text-secondary" />
 </div>
 </div>
 </Link>
 </motion.div>
 );
}
