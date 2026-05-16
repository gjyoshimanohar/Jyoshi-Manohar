import React from 'react';
import { motion } from 'motion/react';
import Hero from '../components/Hero';
import Services from '../components/Services';
import Contact from '../components/Contact';
import BlogCard from '../components/BlogCard';
import { blogPosts } from '../data';
import { ArrowRight, Award, Quote } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main>
      <Hero />
      
      {/* About Section */}
      <section id="about" className="bg-white border-b border-border overflow-hidden">
        <div className="max-w-7xl mx-auto border-x border-border">
          <div className="flex flex-col">
            <div className="p-12 lg:p-20 flex flex-col justify-center">
              <div className="inline-flex items-center space-x-2 text-secondary font-black uppercase tracking-[0.3em] text-[10px] mb-8">
                <span>The Strategic Partner</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-black text-primary leading-[1.1] tracking-tight mb-8 uppercase">
                I help startup founders stop worrying about compliance — <span className="text-slate-300">and start focusing on building.</span>
              </h2>
              
              <div className="text-xs font-black uppercase tracking-widest text-secondary border-b-2 border-secondary/20 pb-4 mb-8">
                Semi-Qualified Chartered Accountant | CA Final Group 2 Cleared | 7+ Years in Finance & Advisory | Co-Founder, MakeEazy Consultants Pvt. Ltd.
              </div>

              <div className="space-y-6 text-slate-500 font-medium leading-relaxed mb-10">
                <p>
                  Most startup founders are brilliant at their product. But financial planning, GST filings, regulatory compliance, and tax structures? That's where things get overwhelming — and costly if ignored.
                </p>
                <p className="text-primary font-bold text-lg italic">
                  That's the gap I've spent my career closing.
                </p>
                <p>
                  As co-founder of MakeEazy Consultants Private Limited, I lead a corporate consulting firm built specifically for startups. We handle the financial and compliance backbone of new businesses - so founders can stay laser-focused on what they do best: building and growing their ventures.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 mb-12">
                {[
                  { title: 'Financial Advisory', desc: 'strategic financial planning, cash flow, investor-ready reports' },
                  { title: 'GST & Tax Compliance', desc: 'end-to-end filings, reconciliation, notices, and advisory' },
                  { title: 'Audit & Due Diligence', desc: 'internal audits, statutory support, risk assessment' },
                  { title: 'Financial Modelling & MIS', desc: 'scenario planning, dashboards, and business performance reports' },
                  { title: 'Bookkeeping & Accounts', desc: 'clean books, monthly closes, P&L management' },
                  { title: 'Payroll & TDS', desc: 'processing, compliance, and filings' }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">0{idx + 1}</span>
                    <span className="font-bold text-primary uppercase text-xs tracking-tight mb-1">{item.title}</span>
                    <span className="text-[11px] text-slate-400 font-medium leading-tight">{item.desc}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-6 text-slate-500 font-medium leading-relaxed mb-12">
                <p>
                  Beyond consulting, I'm passionate about developing the next generation of finance professionals.
                </p>
                <p>
                  As a past Member of the Managing Committee (MCM) at SICASA Hyderabad, I led the Student Speakers' Forum (SSF) — a platform dedicated to building communication and presentation skills for CA students. One of my proudest milestones: co-organising VENDANT 2019, a CA Students' Conference that drew 2,200+ delegates from across India — the highest attendance ever recorded for a non-international ICAI student event.
                </p>
                <p>
                  I'm also an active student speaker and communicator, having spoken at numerous forums connecting aspiring finance professionals with real-world career insights.
                </p>
                <p className="text-primary font-bold">
                  If you're a startup founder looking for a trusted finance partner, or a finance professional looking to connect and grow — let's talk.
                </p>
              </div>

              <div className="inline-block bg-accent px-6 py-4 border border-border">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">
                   Open to: Part-time retainers | Freelance projects | Advisory roles | Speaking engagements
                 </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Services />

      {/* Blog Preview Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto border-x border-border p-12 lg:p-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <h2 className="text-5xl lg:text-7xl font-black text-primary leading-none tracking-tighter uppercase">Insights.</h2>
            <Link 
              to="/blog" 
              className="text-[11px] font-black uppercase tracking-[0.3em] text-secondary border-b-2 border-secondary pb-1 hover:text-primary hover:border-primary transition-all"
            >
              View All Analysis
            </Link>
          </div>

          <div className="border-t border-border">
            {blogPosts.slice(0, 3).map((post, index) => (
              <BlogCard key={post.id} post={post} index={index} />
            ))}
          </div>
        </div>
      </section>

      <Contact />
    </main>
  );
}
