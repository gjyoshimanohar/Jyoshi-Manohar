import React from 'react';
import { motion } from 'motion/react';
import InteractiveTools from '../components/InteractiveTools';
import Breadcrumb from '../components/Breadcrumb';
import SEO from '../components/SEO';
import { getToolkitSchema } from '../utils/seoSchemas';
import { Sparkles } from 'lucide-react';

export default function Toolkit() {
  return (
    <div className="min-h-screen pt-24 pb-12 bg-[#FAFAFA]">
      <SEO 
        title="Interactive CA Financial Calculators Toolkit"
        description="Free online financial and tax calculators by CA Jyoshi Manohar: Income Tax Estimator, GST Calculator, SIP Future Value Calculator, Capital Gains Tax, and Business Financial Ratios."
        canonical="/toolkit"
        keywords={["Tax Calculator India", "GST Calculator", "SIP Calculator", "EMI Calculator", "Income Tax Estimator", "CA Financial Toolkit", "Capital Gains Calculator"]}
        schemas={[getToolkitSchema()]}
      />
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
