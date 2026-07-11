import React from 'react';
import { motion } from 'motion/react';
import InteractiveTools from '../components/InteractiveTools';
import Breadcrumb from '../components/Breadcrumb';
import { Sparkles } from 'lucide-react';

export default function Toolkit() {
  return (
    <div className="min-h-screen pt-24 pb-12 bg-[#FAFAFA]">
      <div className="w-[98%] mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <Breadcrumb items={[
          { label: 'Home', to: '/' },
          { label: 'Interactive Toolkit' }
        ]} />
      </div>
      <InteractiveTools />
    </div>
  );
}
