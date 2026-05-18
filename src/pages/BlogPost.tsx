import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { blogPosts as staticPosts } from '../data';
import { blogService } from '../services/blogService';
import { BlogPost as IBlogPost } from '../types';
import { ArrowLeft, Clock, Calendar, Share2, Linkedin, Twitter, Loader2 } from 'lucide-react';
import React from 'react';

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
          <h2 className="text-4xl font-black text-primary mb-6 uppercase tracking-tight">
            Insight<br/>
            <span className="text-slate-300">Not Found</span>
          </h2>
          <p className="text-slate-500 font-medium mb-10 text-sm leading-relaxed">
            The content you are looking for (slug: <span className="font-mono text-xs">{slug}</span>) does not exist. It may not have been synced properly. If you just seeded data, try refreshing.
          </p>
          <Link 
            to="/blog" 
            className="inline-flex items-center space-x-3 bg-primary text-white px-8 py-4 font-black uppercase text-xs tracking-widest hover:bg-secondary transition-all rounded-md"
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

  return (
    <main className="pt-32 pb-24 bg-white">
      <article className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 border-x border-border">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-12 lg:py-20"
        >
          <Link 
            to="/blog" 
            className="inline-flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-colors mb-12 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Ledger
          </Link>
          
          <div className="mb-6">
            <span className="text-[10px] font-black text-secondary uppercase tracking-[0.3em]">
              {post.category}
            </span>
          </div>
          
          <h1 className="text-[36px] font-black text-primary leading-tight tracking-tight mb-12 uppercase">
            {post.title}
          </h1>
          
          <div className="flex flex-wrap items-center justify-between gap-10 py-10 border-y border-border mb-16">
            <div className="flex items-center space-x-10">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Published</span>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">{post.date}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Read Time</span>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">{post.readTime}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <a href="https://www.linkedin.com/in/jyoshimanoharg" target="_blank" rel="noopener noreferrer" title="LinkedIn Profile" className="h-12 w-12 flex items-center justify-center border border-border text-slate-400 hover:bg-primary hover:text-white transition-all">
                <Linkedin className="h-4 w-4" />
              </a>
              <button title="Share on Twitter" className="h-12 w-12 flex items-center justify-center border border-border text-slate-400 hover:bg-primary hover:text-white transition-all"><Twitter className="h-4 w-4" /></button>
              <button title="Copy Link" className="h-12 w-12 flex items-center justify-center border border-border text-slate-400 hover:bg-primary hover:text-white transition-all"><Share2 className="h-4 w-4" /></button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="prose prose-lg lg:prose-xl prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter prose-a:text-secondary mb-24"
        >
          <div 
            className="markdown-body leading-[1.8] text-black editor-content"
            dangerouslySetInnerHTML={{ __html: post.content || '<p><em>Content could not be loaded or is empty.</em></p>' }}
          />
        </motion.div>

        <div className="py-20 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex items-center space-x-8">
              <div>
                <h4 className="text-lg font-black uppercase text-primary mb-1">Jyoshi Manohar</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Semi-Qualified Chartered Accountant <br /> Strategic Advisor
                </p>
              </div>
            </div>
            <div className="text-left md:text-right">
              <Link to="/#contact" className="inline-flex items-center bg-primary text-white px-10 py-5 text-xs font-black uppercase tracking-widest hover:bg-secondary transition-all rounded-md">
                Schedule Advice
              </Link>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
