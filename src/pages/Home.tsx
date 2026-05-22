import React from 'react';
import { motion } from 'motion/react';
import Hero from '../components/Hero';
import Services from '../components/Services';
import Contact from '../components/Contact';
import BlogCard from '../components/BlogCard';
import { blogPosts as staticPosts } from '../data';
import { blogService } from '../services/blogService';
import { BlogPost as IBlogPost } from '../types';
import { ArrowRight, Award, Quote, Loader2, Target, Lightbulb, Users, LineChart, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [recentPosts, setRecentPosts] = React.useState<IBlogPost[]>(staticPosts.slice(0, 3));
  const [loadingPosts, setLoadingPosts] = React.useState(true);

  React.useEffect(() => {
    async function fetchRecentPosts() {
      try {
        const fetchedPosts = await blogService.getAllPosts();
        if (fetchedPosts.length > 0) {
          setRecentPosts(fetchedPosts.slice(0, 3));
        }
      } catch (error) {
        console.error("Failed to fetch posts for home", error);
      } finally {
        setLoadingPosts(false);
      }
    }
    fetchRecentPosts();
  }, []);

  return (
    <main>
      <Hero />
      
      {/* About Section */}
      <section id="about" className="bg-[#FDFDFD] overflow-hidden py-10 lg:py-16">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col justify-start">
            <div className="inline-[35x] items-center space-x-2 bg-primary/5 border border-primary/10 text-primary font-bold tracking-widest uppercase text-xs px-4 py-2 rounded-full mb-8 shadow-sm flex w-max">
              <span>The Strategic Partner</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-primary leading-tight tracking-tight mb-8">
              About Me
            </h2>
            
            <div className="space-y-6 text-sm lg:text-base text-black font-normal leading-relaxed text-justify mb-10">
              <p>
                I help startup founders and growing businesses simplify finance, taxation, and compliance, so they can focus on building, scaling, and creating long-term value.
              </p>
              <p>
                I am a Semi-Qualified Chartered Accountant, with over 7 years of experience in finance, accounting, taxation, compliance, and advisory services. As the Co-Founder of MakeEazy Consultants Private Limited, I work with startups, entrepreneurs, and business owners to manage the financial and regulatory backbone of their organizations.
              </p>
              <p>
                For most founders, building a product, acquiring customers, and growing the business are the primary priorities. However, financial planning, GST compliance, tax filings, bookkeeping, payroll, TDS, audit support, and regulatory requirements can quickly become overwhelming if not handled with the right expertise. My goal is to make these areas simple, structured, and stress-free.
              </p>
              <p>
                Through MakeEazy Consultants Pvt. Ltd., I provide end-to-end support across financial advisory, GST and tax compliance, audit and due diligence, financial modelling, MIS reporting, bookkeeping, accounts management, payroll, and TDS compliance. My approach is practical, reliable, and business-focused, helping clients stay compliant, make informed decisions, and remain financially prepared for growth.
              </p>
            </div>

            {/* Mission & Vision inline */}
            <div className="flex items-start gap-5 mb-8">
              <div className="p-4 bg-[#F0F4FF] rounded-2xl shrink-0 border border-blue-100/50 shadow-sm mt-1">
                <Target className="h-6 w-6 text-primary" strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-primary mb-2">Mission</h4>
                <p className="text-sm lg:text-base text-black/80 font-normal leading-relaxed text-justify">
                  To provide reliable, practical, and end-to-end financial, taxation, compliance, accounting, payroll, and advisory solutions that reduce business complexity, support informed decision-making, and allow founders and business owners to focus on building and scaling their ventures.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-5 mb-12">
              <div className="p-4 bg-[#FFF4E5] rounded-2xl shrink-0 border border-orange-100/50 shadow-sm mt-1">
                <Lightbulb className="h-6 w-6 text-[#D97706]" strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-primary mb-2">Vision</h4>
                <p className="text-sm lg:text-base text-black/80 font-normal leading-relaxed text-justify">
                  To become a trusted finance and compliance partner for startups and growing businesses by enabling them to operate with clarity, confidence, and long-term financial discipline.
                </p>
              </div>
            </div>

            <h3 className="text-2xl font-black text-primary mb-6">Professional Journey</h3>
            <div className="space-y-6 text-sm lg:text-base text-black font-normal leading-relaxed text-justify mb-12">
              <p>
                In addition to my consulting work, I am passionate about professional development and communication within the finance community. As a former Member of the Managing Committee at SICASA Hyderabad, I led the Student Speakers’ Forum, an initiative focused on helping CA students build confidence in public speaking and presentation skills.
              </p>
              <p>
                I also had the opportunity to co-organise VENDANT 2019, a CA Students’ Conference attended by over 2,200 delegates from across India, marking a significant milestone in student-led professional events.
              </p>
              <p>
                As a speaker and finance professional, I continue to engage with students, professionals, founders, and business communities through knowledge-sharing, advisory, and professional development initiatives.
              </p>
            </div>

            <h3 className="text-2xl font-black text-primary mb-6">Let’s Work Together</h3>
            <div className="space-y-6 text-sm lg:text-base text-black font-normal leading-relaxed text-justify mb-8">
              <p>
                Whether you are a startup founder seeking a trusted finance partner, a growing business looking for compliance and advisory support, or an organization looking for a finance speaker, I am open to meaningful collaborations across:
              </p>
            </div>

            <div className="inline-block bg-white px-6 lg:px-8 py-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/60 transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-1 w-[fit-content]">
               <span className="text-xs font-black uppercase tracking-[0.2em] text-secondary">
                 Part-time retainers | Freelance projects | Advisory roles | Speaking engagements
               </span>
            </div>
          </div>
        </div>
      </section>

      <Services />

      {/* Blog Preview Section */}
      <section className="bg-white pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 lg:mb-8 gap-8">
            <h2 className="text-4xl lg:text-5xl font-black text-primary leading-tight tracking-tight mb-8">Insights.</h2>
            <Link 
              to="/blog" 
              className="text-xs font-black uppercase tracking-[0.3em] text-[#FF6B4A] border-b-2 border-[#FF6B4A] pb-1 hover:text-primary hover:border-primary transition-all"
            >
              View All Analysis
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {loadingPosts && recentPosts === staticPosts.slice(0, 3) ? (
              <div className="py-20 flex justify-center col-span-full">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : (
              recentPosts.map((post, index) => (
                <BlogCard key={post.id} post={post} index={index} />
              ))
            )}
          </div>
        </div>
      </section>

      <Contact />
    </main>
  );
}
