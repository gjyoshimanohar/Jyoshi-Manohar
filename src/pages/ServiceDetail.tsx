import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { services } from '../data';

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const service = services.find(s => s.id === id);

  useEffect(() => {
    if (!service) {
      navigate('/#services');
    }
  }, [service, navigate]);

  if (!service) return null;

  const IconComponent = (Icons as any)[service.iconName];

  // Map service benefits based on ID or Title for realistic content
  const getBenefits = (title: string) => {
    switch(title) {
      case 'Business Advisory':
        return [
          "Comprehensive business health checks and restructuring",
          "Mergers & Acquisitions (M&A) due diligence",
          "Risk management and corporate governance frameworks",
          "Strategic growth and scale planning"
        ];
      case 'Startup Advisory':
        return [
          "Company incorporation and legal structuring",
          "Seed and VC funding readiness and pitch decks",
          "Virtual CFO services and cash flow management",
          "Employee Stock Option Plan (ESOP) structuring"
        ];
      case 'Taxation Services':
        return [
          "Direct and Indirect tax planning and compliance",
          "Representation before tax authorities and tribunals",
          "International taxation and transfer pricing",
          "GST advisory, returns, and periodic audits"
        ];
      case 'Audit & Assurance':
        return [
          "Statutory, Internal, and Concurrent Audits",
          "Information Systems and Cyber Security Audits",
          "Fraud investigations and forensic accounting",
          "IFRS and Ind AS implementation and reporting"
        ];
      case 'Compliance Services':
        return [
          "ROC filings and secretarial compliances",
          "FEMA and RBI regulatory reporting",
          "Labour law compliances (PF, ESI, PT)",
          "Drafting and vetting of commercial agreements"
        ];
      default:
        return [
          "Tailored solutions for your specific industry",
          "Dedicated expert consultation",
          "Transparent and compliant processes",
          "End-to-end implementation support"
        ];
    }
  };

  const benefits = getBenefits(service.title);

  return (
    <div className="min-h-screen pt-28 pb-20 bg-[#FAFAFA]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm font-medium text-slate-500 mb-8" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <Link to="/#services" className="hover:text-primary transition-colors">Services</Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-slate-900" aria-current="page">{service.title}</span>
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden"
        >
          {/* Header Section */}
          <div className="bg-gradient-to-br from-primary/5 to-transparent p-10 md:p-14 border-b border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 -translate-y-10 translate-x-10 opacity-5">
              {IconComponent && <IconComponent className="w-64 h-64" />}
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
              {IconComponent && (
                <div className="flex-shrink-0 w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 text-primary">
                  <IconComponent className="w-10 h-10" strokeWidth={1.5} />
                </div>
              )}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-3">
                  {service.title}
                </h1>
                <p className="text-lg text-slate-600 font-medium max-w-2xl leading-relaxed">
                  {service.description}
                </p>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-10 md:p-14">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Key Offerings & Benefits</h3>
            
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 mb-12">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mt-0.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-slate-700 font-medium leading-relaxed">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">Ready to get started?</h4>
                <p className="text-slate-600">Schedule a consultation to discuss how our {service.title} can benefit you.</p>
              </div>
              <Link 
                to="/#contact"
                className="whitespace-nowrap bg-primary text-white px-8 py-3.5 rounded-full font-bold text-sm tracking-wide hover:bg-secondary transition-all shadow-sm hover:shadow-md"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </motion.div>

        <div className="mt-8">
          <Link 
            to="/#services"
            className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-primary transition-colors gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to all services
          </Link>
        </div>
      </div>
    </div>
  );
}
