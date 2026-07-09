import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { blogPosts as staticPosts } from '../data';
import { blogService } from '../services/blogService';
import { BlogPost as IBlogPost } from '../types';
import { ArrowLeft, Clock, Calendar, Share2, Linkedin, Twitter, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import React from 'react';

import 'suneditor/dist/css/suneditor.min.css';

export default function BlogPost() {
 const { slug } = useParams();
 const navigate = useNavigate();
 const [post, setPost] = React.useState<IBlogPost | null>(staticPosts.find(p => p.slug === slug) || null);
 const [loading, setLoading] = React.useState(true);

 React.useEffect(() => {
 window.scrollTo(0, 0);
 
 async function fetchPost() {
 if (!slug) return;
 try {
 console.log(`Fetching post by slug: ${slug}`);
 const fetchedPost = await blogService.getPostBySlug(slug);
 console.log(`Fetched post:`, fetchedPost);
 setPost(fetchedPost);
 } catch (error) {
 console.error("Failed to fetch post", error);
 setPost(null);
 } finally {
 setLoading(false);
 }
 }
 fetchPost();
 }, [slug]);

 if (loading && !post) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-white">
 <Loader2 className="h-8 w-8 text-primary animate-spin" />
 </div>
 );
 }

 if (!post && !loading) {
 return (
 <div className="min-h-screen flex flex-col items-center justify-center bg-accent py-24 px-4">
 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="bg-white p-12 md:p-16 border border-border text-center max-w-lg w-full shadow-2xl"
 >
 <h2 className="text-4xl text-primary mb-6 tracking-tight">
 Insight<br/>
 <span className="text-primary/70">Not Found</span>
 </h2>
 <p className="text-black font-medium mb-10 text-base leading-relaxed text-justify">
 The content you are looking for (slug: <span className="font-mono text-xs">{slug}</span>) does not exist. It may not have been synced properly. If you just seeded data, try refreshing.
 </p>
 <Link 
 to="/blog" 
 className="inline-flex items-center space-x-3 bg-primary text-white px-8 lg:px-10 py-4 lg:py-5 rounded-full font-medium uppercase tracking-[0.2em] text-xs hover:bg-primary/90 transition-all shadow-[0_8px_30px_rgb(49,80,160,0.3)] hover:shadow-[0_12px_40px_rgb(49,80,160,0.4)] hover:-translate-y-1"
 >
 <ArrowLeft className="h-4 w-4" />
 <span>Return to Ledger</span>
 </Link>
 </motion.div>
 </div>
 );
 }

 // Gracefully handle missing post during loading without flashing
 if (!post) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-white">
 <Loader2 className="h-8 w-8 text-primary animate-spin" />
 </div>
 );
 }

  const seoExcerpt = post.excerpt || (post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 160) : 'Insights and professional financial guidance from CA Jyoshi Manohar.');

 return (
 <main className="pt-32 pb-24 bg-white">
 <Helmet>
   <title>{post.title}</title>
   <meta name="description" content={seoExcerpt} />
   
   {/* Open Graph */}
   <meta property="og:type" content="article" />
   <meta property="og:title" content={`${post.title} | CA Jyoshi Manohar`} />
   <meta property="og:description" content={seoExcerpt} />
   {post.category && <meta property="article:section" content={post.category} />}
   
   {/* Twitter */}
   <meta name="twitter:title" content={`${post.title} | CA Jyoshi Manohar`} />
   <meta name="twitter:description" content={seoExcerpt} />
 </Helmet>
 <article className="w-[96%] mx-auto px-2 sm:px-4 lg:px-6 border-x border-border">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="py-6 lg:py-10"
 >
 <Link 
 to="/blog" 
 className="inline-flex items-center text-xs uppercase tracking-[0.2em] text-black hover:text-primary transition-colors mb-6 group"
 >
 <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
 Back to Ledger
 </Link>
 
 <div className="mb-6">
 <span className="inline-[35x] items-center space-x-2 bg-primary/5 border border-primary/10 text-primary font-medium tracking-widest uppercase text-xs px-4 py-2 rounded-full shadow-sm">
 {post.category}
 </span>
 </div>
 
 <h1 className="text-4xl lg:text-5xl text-primary leading-tight tracking-tight mb-2">
 {post.title}
 </h1>
 
 <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-y border-border mb-2">
 <div className="flex items-center space-x-10">
 <div className="flex flex-col">
 <span className="text-xs text-black/50 uppercase tracking-widest mb-1">Published</span>
 <span className="text-xs font-medium text-black uppercase tracking-widest">{post.date}</span>
 </div>
 <div className="flex flex-col">
 <span className="text-xs text-black/50 uppercase tracking-widest mb-1">Read Time</span>
 <span className="text-xs font-medium text-black uppercase tracking-widest">{post.readTime}</span>
 </div>
 </div>
 
 <div className="flex items-center space-x-2">
 <a href="https://www.linkedin.com/in/jyoshimanoharg" target="_blank" rel="noopener noreferrer" title="LinkedIn Profile" className="h-12 w-12 flex items-center justify-center border border-border text-black hover:bg-primary hover:text-white transition-all">
 <Linkedin className="h-4 w-4" />
 </a>
 <button title="Share on Twitter" className="h-12 w-12 flex items-center justify-center border border-border text-black hover:bg-primary hover:text-white transition-all"><Twitter className="h-4 w-4" /></button>
 <button title="Copy Link" className="h-12 w-12 flex items-center justify-center border border-border text-black hover:bg-primary hover:text-white transition-all"><Share2 className="h-4 w-4" /></button>
 </div>
 </div>
 </motion.div>

 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.3 }}
 className="prose prose-lg lg:prose-xl prose-slate max-w-none prose-headings: prose-headings:capitalize prose-headings:tracking-tighter prose-a:text-secondary mb-12"
 >
 {post.format === 'markdown' ? (
 <div className="markdown-body leading-[1.8] text-black editor-content" style={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}>
 <Markdown>{post.content}</Markdown>
 </div>
 ) : (
 <div 
 className="markdown-body leading-[1.8] text-black editor-content sun-editor-editable"
 style={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}
 dangerouslySetInnerHTML={{ __html: post.content || '<p><em>Content could not be loaded or is empty.</em></p>' }}
 />
 )}
 </motion.div>

 <div className="py-10 border-t border-border">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
 <div className="flex items-center space-x-8">
 <div>
 <h4 className="text-lg text-primary mb-1">Jyoshi Manohar</h4>
 <p className="text-base font-medium text-black capitalize tracking-widest leading-relaxed text-justify">
 Semi-Qualified Chartered Accountant <br /> Strategic Advisor
 </p>
 </div>
 </div>
 <div className="text-left md:text-right">
 <Link to="/#contact" className="inline-flex items-center bg-primary text-white px-8 lg:px-10 py-4 lg:py-5 rounded-full font-medium uppercase tracking-[0.2em] text-xs hover:bg-primary/90 transition-all shadow-[0_8px_30px_rgb(49,80,160,0.3)] hover:shadow-[0_12px_40px_rgb(49,80,160,0.4)] hover:-translate-y-1">
 Schedule Advice
 </Link>
 </div>
 </div>
 </div>
 </article>
 </main>
 );
}
