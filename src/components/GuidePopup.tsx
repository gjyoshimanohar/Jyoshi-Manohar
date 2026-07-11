import React, { useState } from 'react';
import { X, Target, Clock, Flag, CheckCircle, Flame, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GuidePopupProps {
  onClose: () => void;
}

interface Step {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  accentBg: string;
  accentColor: string;
}

export default function GuidePopup({ onClose }: GuidePopupProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: Step[] = [
    {
      title: "Welcome to your CA Workspace",
      subtitle: "The Ultimate Productivity Hub",
      description: "Discover a tailored, high-performance environment designed for modern Chartered Accountants and business advisors. Manage compliance deadlines, client portfolios, invoices, and your personal focus in one unified screen.",
      icon: <Target className="w-10 h-10 animate-bounce text-indigo-600" />,
      accentBg: "bg-indigo-50",
      accentColor: "text-indigo-600",
    },
    {
      title: "Task Boards & Checklists",
      subtitle: "Seamless Organization",
      description: "Keep track of daily audits, CA filings, and tasks. Our board matches your favorite layouts, featuring live countdown buckets, weekday checklists, and collapsible check-offs that sync across devices.",
      icon: <CheckCircle className="w-10 h-10 text-emerald-600" />,
      accentBg: "bg-emerald-50",
      accentColor: "text-emerald-600",
    },
    {
      title: "Eisenhower Quadrants",
      subtitle: "Visual Prioritization",
      description: "Sort files and action plans instantly. Place items in Urgency vs. Importance boxes so you never miss critical tax return filings or government deadlines while managing lower-priority advisory work.",
      icon: <Flag className="w-10 h-10 fill-red-500 text-red-600" />,
      accentBg: "bg-red-50",
      accentColor: "text-red-600",
    },
    {
      title: "Daily Habit Trackers",
      subtitle: "Maintaining High Performance",
      description: "Form lasting professional and personal routines. Check off recurring compliance checkups or client reviews directly on the calendar grid to multiply your streak scores and metrics.",
      icon: <Flame className="w-10 h-10 fill-amber-500 text-amber-600 animate-pulse" />,
      accentBg: "bg-amber-50",
      accentColor: "text-amber-600",
    },
    {
      title: "Ambient Sound Synth",
      subtitle: "Deep Focus & Pomodoro",
      description: "Get in the zone using the customizable focus clock. Experience built-in browser-based synthesis engines for relaxing rainfall, crackling campfires, and steady white noise.",
      icon: <Clock className="w-10 h-10 text-purple-600" />,
      accentBg: "bg-purple-50",
      accentColor: "text-purple-600",
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const activeStep = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/45 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-100/80 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Progress Bar Header */}
        <div className="w-full bg-slate-100 h-1.5 flex">
          {steps.map((_, idx) => (
            <div 
              key={idx}
              className={`flex-1 h-full transition-all duration-300 ${
                idx <= currentStep ? 'bg-[#1a2b58]' : 'bg-slate-100'
              }`}
            />
          ))}
        </div>

        {/* Header Banner */}
        <div className="bg-[#1a2b58] p-6 text-white text-left relative flex justify-between items-start gap-4">
          <div>
            <span className="text-[10px] font-bold bg-white/20 text-white uppercase px-2.5 py-1 rounded-full tracking-wider">
              Workspace Onboarding Guide
            </span>
            <h3 className="text-xl font-bold mt-3 leading-tight">Welcome, CA Jyoshi Manohar</h3>
          </div>
          <button 
            onClick={onClose} 
            className="bg-white/15 hover:bg-white/25 text-white p-1.5 rounded-full transition-colors cursor-pointer"
            title="Skip walkthrough"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Box with motion transitions */}
        <div className="p-8 flex flex-col items-center text-center min-h-[290px] justify-center space-y-5">
          <div className={`${activeStep.accentBg} p-5 rounded-2xl border border-slate-100 flex items-center justify-center shadow-xs`}>
            {activeStep.icon}
          </div>
          
          <div className="space-y-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${activeStep.accentColor}`}>
              {activeStep.subtitle}
            </span>
            <h4 className="text-lg font-extrabold text-slate-900 tracking-tight">
              {activeStep.title}
            </h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
              {activeStep.description}
            </p>
          </div>
        </div>

        {/* Footer controls with indicators */}
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-100">
          <div className="flex gap-1">
            {steps.map((_, idx) => (
              <span 
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep ? 'w-4 bg-[#1a2b58]' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 disabled:opacity-40 disabled:hover:bg-white px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 bg-[#1a2b58] hover:bg-[#121f40] text-white px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <span>{currentStep === steps.length - 1 ? "Let's Begin" : "Next"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
