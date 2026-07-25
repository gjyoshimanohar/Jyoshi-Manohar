import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import ResourceCard from '../components/ResourceCard';
import Breadcrumb from '../components/Breadcrumb';
import { resourceService } from '../services/resourceService';
import { Resource } from '../types';
import { Loader2, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResources() {
      try {
        const fetchedResources = await resourceService.getAllResources();
        setResources(fetchedResources);
      } catch (error) {
        console.error("Failed to fetch resources", error);
        toast.error("Failed to load resources.");
      } finally {
        setLoading(false);
      }
    }
    fetchResources();
  }, []);

  return (
    <main className="pt-32 pb-24 bg-white min-h-screen">
      <Helmet>
        <title>Whitepapers & Guides - Resources</title>
        <meta name="description" content="Download our in-depth whitepapers and industry tax guides." />
      </Helmet>

      <div className="w-[98%] mx-auto px-3 sm:px-6">
        <Breadcrumb items={[
          { label: 'Home', to: '/' },
          { label: 'Resources' }
        ]} />

        <header className="mb-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="inline-flex items-center space-x-2 bg-primary/5 border border-primary/10 text-primary font-medium tracking-widest uppercase text-xs px-4 py-2 rounded-full mb-4 shadow-sm flex w-fit">
              <span>Free Assets</span>
            </div>
            <h1 className="text-5xl md:text-[90px] leading-[0.95] text-primary uppercase font-bold tracking-tighter mb-6">
              <span className="text-3xl md:text-6xl align-baseline mr-1 md:mr-2">THE</span>
              RESOURCES
            </h1>
            <p className="space-y-6 text-base lg:text-lg text-slate-700 font-medium leading-relaxed text-left max-w-2xl">
              Download in-depth whitepapers and industry tax guides to stay ahead.
            </p>
          </motion.div>
        </header>

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
          
          {loading ? (
            <div className="py-20 flex justify-center w-full">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {resources.map((resource, index) => (
                  <ResourceCard key={resource.id} resource={resource} index={index} />
                ))}
              </div>
              
              {resources.length === 0 && (
                <div className="text-center py-24 bg-slate-50 rounded-2xl border border-slate-200">
                  <Download className="w-10 h-10 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-800">No resources available right now.</h3>
                  <p className="text-slate-500 mt-2">Check back later for new whitepapers and guides.</p>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </main>
  );
}
