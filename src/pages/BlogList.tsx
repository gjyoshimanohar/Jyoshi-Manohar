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

  const categories = ['All', ...Array.from(new Set(posts.map(p => p.category)))];

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
            <div className="inline-flex items-center space-x-2 bg-primary/5 border border-primary/10 text-primary font-medium tracking-widest uppercase text-xs px-4 py-2 rounded-full mb-4 shadow-sm flex w-fit">
              <span>Thought Leadership</span>
            </div>
            <h1 className="text-5xl md:text-[90px] leading-[0.95] text-primary uppercase font-bold tracking-tighter mb-6">
              <span className="text-3xl md:text-6xl align-baseline mr-1 md:mr-2">THE</span>
              HUB
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
