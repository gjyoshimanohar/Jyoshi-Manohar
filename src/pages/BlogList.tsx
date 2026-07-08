import React from 'react';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import BlogCard from '../components/BlogCard';
import { blogPosts as staticPosts } from '../data';
import { blogService } from '../services/blogService';
import { BlogPost } from '../types';
import { Search, Loader2 } from 'lucide-react';

export default function BlogList() {
 const [posts, setPosts] = React.useState<BlogPost[]>(staticPosts);
 const [loading, setLoading] = React.useState(true);
 const [selectedCategory, setSelectedCategory] = React.useState('All');

 React.useEffect(() => {
 async function fetchPosts() {
 try {
 const fetchedPosts = await blogService.getAllPosts();
 setPosts(fetchedPosts); // ALWAYS set to reflect DB accurately
 } catch (error) {
 console.error("Failed to fetch posts", error);
 } finally {
 setLoading(false);
 }
 }
 fetchPosts();
 }, []);

 const categories = ['All', ...Array.from(new Set(posts.map(p => p.category)))];

 const filteredPosts = selectedCategory === 'All' 
 ? posts 
 : posts.filter(p => p.category === selectedCategory);

 return (
 <main className="pt-32 pb-24 bg-white min-h-screen">
 <Helmet>
   <title>Financial Insights & Ledger</title>
   <meta name="description" content="Read expert articles and insights on Indian taxation, corporate compliance, financial auditing, wealth stewardship, and business planning." />
   <meta property="og:title" content="Financial Insights & Ledger | CA Jyoshi Manohar" />
   <meta property="og:description" content="Read expert articles and insights on Indian taxation, corporate compliance, financial auditing, wealth stewardship, and business planning." />
 </Helmet>
 <div className="max-w-7xl mx-auto px-6">
 <header className="mb-8">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 >
 <div className="inline-flex items-center space-x-2 bg-primary/5 border border-primary/10 text-primary font-medium tracking-widest uppercase text-xs px-4 py-2 rounded-full mb-4 shadow-sm flex w-fit">
 <span>Financial Intelligence</span>
 </div>
 <h1 className="text-5xl md:text-[100px] leading-[0.95] text-primary uppercase font-bold tracking-tighter mb-4"><span className="text-3xl md:text-6xl align-baseline mr-1 md:mr-2">THE</span>LEDGER</h1>
 <p className="space-y-6 text-base lg:text-base text-black font-medium leading-relaxed text-left max-w-2xl">
 In-depth analysis on the evolving world of finance, tax, and corporate policy.
 </p>
 </motion.div>
 </header>

 <div className="flex flex-wrap items-center gap-3 mb-8 border-b border-slate-100 pb-4">
 {categories.map((cat) => (
 <button
 key={cat}
 onClick={() => setSelectedCategory(cat)}
 className={`px-5 py-2.5 text-xs font-medium uppercase tracking-[0.1em] transition-all rounded-xl border ${
 selectedCategory === cat
 ? 'bg-primary text-white border-primary shadow-[0_4px_14px_0_rgba(49,80,160,0.39)]'
 : 'bg-white text-black border-slate-200 hover:border-primary/50 hover:bg-slate-50 hover:-translate-y-0.5 shadow-sm'
 }`}
 >
 {cat}
 </button>
 ))}
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
 {loading && posts === staticPosts ? (
 <div className="py-20 flex justify-center col-span-full">
 <Loader2 className="h-8 w-8 text-primary animate-spin" />
 </div>
 ) : (
 filteredPosts.map((post, index) => (
 <BlogCard key={post.id} post={post} index={index} />
 ))
 )}
 </div>

 {filteredPosts.length === 0 && (
 <div className="text-center py-24">
 <h3 className="text-2xl font-serif text-black">No insights found in this category.</h3>
 </div>
 )}
 </div>
 </main>
 );
}
