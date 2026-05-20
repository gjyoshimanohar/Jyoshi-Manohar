import React from 'react';
import { motion } from 'motion/react';
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
    <main className="pt-32 pb-24 bg-accent min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-primary font-bold tracking-widest capitalize text-xs mb-6">Financial Intelligence</p>
            <h1 className="text-5xl lg:text-6xl font-black text-primary mb-8 tracking-tighter leading-none">The Ledger.</h1>
            <p className="text-sm lg:text-base text-black max-w-2xl font-normal leading-relaxed text-justify">
              In-depth analysis on the evolving world of finance, tax, and corporate policy.
            </p>
          </motion.div>
        </header>

        <div className="flex flex-wrap items-center gap-2 mb-20 border-b border-border pb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-8 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all border ${
                selectedCategory === cat
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-black border-slate-200 hover:border-primary hover:text-primary'
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
