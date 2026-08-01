import React from 'react';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import BlogCard from '../components/BlogCard';
import ResourceCard from '../components/ResourceCard';
import Breadcrumb from '../components/Breadcrumb';
import { blogPosts as staticPosts, resources as staticResources } from '../data';
import { resourceService } from '../services/resourceService';
import { Resource } from '../types';
import { blogService } from '../services/blogService';
import { BlogPost } from '../types';
import { Search, Loader2, BookOpen, Download } from 'lucide-react';

export default function BlogList() {
  const [posts, setPosts] = React.useState<BlogPost[]>(staticPosts);
  const [loading, setLoading] = React.useState(true);
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const [activeTab, setActiveTab] = React.useState<'insights' | 'resources'>('insights');
  const [resources, setResources] = React.useState<Resource[]>(staticResources as Resource[]);
  const [loadingResources, setLoadingResources] = React.useState(true);

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
    async function fetchResources() {
      try {
        const fetchedResources = await resourceService.getAllResources();
        setResources(fetchedResources);
      } catch (error) {
        console.error("Failed to fetch resources", error);
      } finally {
        setLoadingResources(false);
      }
    }
    fetchResources();
  }, []);

  const categories = ['All', ...Array.from(new Set(posts.map(p => p.category))) as string[]];

  const filteredPosts = selectedCategory === 'All'
    ? posts
    : posts.filter(p => p.category === selectedCategory);

  return (
    <main className="pt-32 pb-24 bg-white min-h-screen">
      <Helmet>
        <title>Financial Insights & Resources</title>
        <meta name="description" content="Read expert articles, download whitepapers, tax guides, and annual budget reports from CA Jyoshi Manohar." />
      </Helmet>

      <div className="w-[98%] mx-auto px-3 sm:px-6">
        <Breadcrumb items={[
          { label: 'Home', to: '/' },
          { label: 'Insights & Resources' }
        ]} />

        <header className="mb-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="block mb-4">
              <div className="inline-flex items-center space-x-2 bg-primary/5 border border-primary/10 text-primary font-medium tracking-widest uppercase text-xs px-4 py-2 rounded-full shadow-sm">
                <span>Thought Leadership</span>
              </div>
            </div>
            <h1 className="text-5xl md:text-[80px] text-primary uppercase font-extrabold tracking-tighter mb-6 flex items-start">
              <span className="text-[0.3em] font-extrabold tracking-wider text-primary leading-none mr-1 sm:mr-2 pt-[0.08em]">
                THE
              </span>
              <span className="leading-none">LEDGERS</span>
            </h1>
            <p className="space-y-6 text-base lg:text-lg text-slate-700 font-medium leading-relaxed text-left max-w-2xl">
              Explore our latest financial analyses, or download in-depth whitepapers and industry tax guides to stay ahead.
            </p>
          </motion.div>
        </header>

        {/* Top-Level Tabs */}
        <div className="flex items-center space-x-2 mb-10 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 flex items-center space-x-2 ${
              activeTab === 'insights'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>Articles & Insights</span>
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 flex items-center space-x-2 ${
              activeTab === 'resources'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Download className="w-5 h-5" />
            <span>Whitepapers & Guides</span>
          </button>
        </div>

        {activeTab === 'insights' ? (
          <motion.div
            key="insights-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
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


            {/* Newsletter Subscription */}
            <div className="mt-20 bg-primary rounded-3xl p-8 sm:p-12 border border-primary/20 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -z-0" />
              
              <div className="relative z-10 max-w-xl text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Stay Ahead of the Curve</h3>
                <p className="text-white/80 font-medium leading-relaxed">
                  Subscribe to our newsletter for exclusive financial insights, regulatory updates, and expert tax strategies delivered straight to your inbox.
                </p>
              </div>
              
              <div className="relative z-10 w-full md:w-auto flex-1 max-w-md">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    import('react-hot-toast').then(mod => {
                      mod.default.success("Subscribed successfully! Check your email for confirmation.");
                    });
                  }} 
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <input 
                    type="email" 
                    required 
                    placeholder="Enter your email address" 
                    className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:outline-none focus:border-white/50 transition-all font-medium"
                  />
                  <button 
                    type="submit"
                    className="shrink-0 bg-white text-primary px-8 py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-slate-50 hover:-translate-y-0.5 transition-all shadow-lg"
                  >
                    Subscribe
                  </button>
                </form>
                <p className="text-white/50 text-[10px] mt-3 font-medium uppercase tracking-widest text-center sm:text-left">
                  We respect your privacy. No spam.
                </p>
              </div>
            </div>

            {filteredPosts.length === 0 && (
              <div className="text-center py-24">
                <h3 className="text-2xl font-serif text-black">No insights found in this category.</h3>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="resources-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Downloadable Resources</h2>
              <p className="text-slate-600 font-medium">Access our premium research, budget analyses, and actionable guides.</p>
            </div>
            
            {!loadingResources && resources && resources.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
                {resources.map((resource, index) => (
                  <ResourceCard key={resource.id} resource={resource} index={index} />
                ))}
              </div>
            )}
            
            {loadingResources && (
              <div className="py-24 flex flex-col items-center justify-center w-full bg-slate-50/50 rounded-3xl border border-slate-100">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <p className="text-slate-600 font-medium animate-pulse">Retrieving documents from secure vault...</p>
              </div>
            )}
            
            {!loadingResources && (!resources || resources.length === 0) && (
              <div className="text-center py-24 px-6 bg-slate-50 rounded-3xl border border-slate-200 flex flex-col items-center w-full">
                <div className="bg-white p-5 rounded-full shadow-sm mb-6 border border-slate-100">
                  <Download className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">Looking for specific tax guides?</h3>
                <p className="text-slate-600 max-w-md mx-auto mb-8 leading-relaxed">
                  We are currently updating our repository of whitepapers and industry tax guides. If you need immediate assistance or specific financial documents, please reach out to our advisory team.
                </p>
                <a 
                  href="/#contact"
                  className="inline-flex items-center justify-center space-x-2 bg-primary hover:bg-primary/90 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  <span>Request a Document</span>
                </a>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}
