import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import {
  Sparkles,
  X,
  RefreshCw,
  Copy,
  Check,
  Send,
  Volume2,
  VolumeX,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  FileText,
  Mail,
  Zap,
  Layers,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DailyStandupModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks?: any[];
  complianceEvents?: any[];
  invoices?: any[];
  initialType?: 'daily' | 'weekly';
}

export default function DailyStandupModal({
  isOpen,
  onClose,
  tasks = [],
  complianceEvents = [],
  invoices = [],
  initialType = 'daily'
}: DailyStandupModalProps) {
  const [briefingType, setBriefingType] = useState<'daily' | 'weekly'>(initialType);
  const [focusGoal, setFocusGoal] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [summary, setSummary] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Email state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  // Speech synthesis audio playback state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [speechUtterance, setSpeechUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (isOpen && !summary) {
      generateBriefing(briefingType);
    }
  }, [isOpen]);

  // Clean up audio when modal closes
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!isOpen) return null;

  const generateBriefing = async (type: 'daily' | 'weekly' = briefingType) => {
    setIsGenerating(true);
    // Stop speech if playing
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }

    try {
      const res = await fetch('/api/ai/daily-standup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks,
          complianceEvents,
          invoices,
          briefingType: type,
          focusGoal
        })
      });

      const data = await res.json();
      if (res.ok && data.summary) {
        setSummary(data.summary);
        setStats(data.stats);
      } else {
        toast.error(data.error || 'Failed to generate AI standup briefing.');
      }
    } catch (error) {
      console.error('Error generating briefing:', error);
      toast.error('Network error generating briefing.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyText = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success('Standup summary copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadText = () => {
    if (!summary) return;
    const blob = new Blob([summary], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${briefingType.toUpperCase()}_Standup_Summary_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Briefing downloaded as Markdown file!');
  };

  const toggleSpeechPlayback = () => {
    if (!window.speechSynthesis) {
      toast.error('Text-to-speech audio is not supported in this browser.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      // Clean markdown tags for audio reading
      const cleanText = summary
        .replace(/[#*`_~]/g, '')
        .replace(/\n+/g, '. ');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setSpeechUtterance(utterance);
      setIsPlayingAudio(true);
      toast.success('Playing audio briefing...');
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast.error('Please enter a valid recipient email address.');
      return;
    }

    setIsSendingEmail(true);
    try {
      // Convert basic markdown formatting to HTML for email
      const formattedHtml = summary
        .replace(/### (.*)/g, '<h3 style="color:#1e293b;margin-top:16px;">$1</h3>')
        .replace(/## (.*)/g, '<h2 style="color:#0f172a;margin-top:20px;">$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 16px;">
          <div style="background: linear-gradient(to right, #0f172a, #312e81); padding: 20px; border-radius: 12px; color: white; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 20px;">CA Jyoshi Manohar - ${briefingType.toUpperCase()} Standup Summary</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.85;">AI-Generated Executive Briefing & Action Plan (${new Date().toLocaleDateString('en-IN')})</p>
          </div>
          <div style="color: #334155; line-height: 1.6; font-size: 14px;">
            ${formattedHtml}
          </div>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">
            Generated via CA Jyoshi Manohar Compliance & Workstation Suite • Confidential
          </p>
        </div>
      `;

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `Daily Briefing: ${briefingType === 'weekly' ? 'Weekly Executive Standup' : 'Daily Standup Summary'} - ${new Date().toLocaleDateString('en-IN')}`,
          htmlContent: emailHtml,
          senderName: 'CA Jyoshi Manohar Workstation AI',
          senderEmail: 'connect@jyoshimanohar.com'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Briefing emailed to ${recipientEmail}!`);
        setIsEmailModalOpen(false);
      } else {
        toast.error(data.error || 'Failed to dispatch email.');
      }
    } catch (error) {
      toast.error('Error sending email briefing.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Calculate completion percentage safely
  const completedRatio = stats?.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 100;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Sparkles className="w-5 h-5 animate-pulse text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-white">AI Daily Standup & Executive Briefings</h2>
                  <span className="px-2 py-0.5 bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-[10px] font-mono font-bold rounded-full uppercase">
                    Gemini 3.6 Flash
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Automated intelligence summarizing task completion, upcoming deadlines, overdue invoices, and daily priorities.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Controls Bar */}
          <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Briefing Cadence:</span>
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl">
                <button
                  onClick={() => {
                    setBriefingType('daily');
                    generateBriefing('daily');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    briefingType === 'daily'
                      ? 'bg-white text-indigo-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Daily Standup
                </button>
                <button
                  onClick={() => {
                    setBriefingType('weekly');
                    generateBriefing('weekly');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    briefingType === 'weekly'
                      ? 'bg-white text-indigo-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Weekly Executive
                </button>
              </div>
            </div>

            <div className="flex-1 max-w-sm min-w-[200px] flex items-center gap-2">
              <input
                type="text"
                placeholder="Optional Focus (e.g. GST Filing & Client Invoicing)..."
                value={focusGoal}
                onChange={(e) => setFocusGoal(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
              />
            </div>

            <button
              onClick={() => generateBriefing(briefingType)}
              disabled={isGenerating}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              Regenerate AI Briefing
            </button>
          </div>

          {/* Quick Metrics Bento Bar */}
          {stats && (
            <div className="px-6 py-3 bg-white border-b border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Tasks Completed</div>
                  <div className="text-sm font-bold text-slate-900">
                    {stats.completedTasks} / {stats.totalTasks} <span className="text-xs text-emerald-600 font-normal">({completedRatio}%)</span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-indigo-700">Pending Filings</div>
                  <div className="text-sm font-bold text-slate-900">{stats.pendingCompliance} Upcoming</div>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-amber-50/60 border border-amber-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-amber-700">Outstanding Invoices</div>
                  <div className="text-sm font-bold text-slate-900">
                    ₹{stats.totalPendingAmount?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-purple-700">Velocity Index</div>
                  <div className="text-sm font-bold text-slate-900">
                    {completedRatio > 70 ? '🚀 High Velocity' : '⚡ Steady Momentum'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {isGenerating ? (
              <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 border border-indigo-200 flex items-center justify-center text-indigo-600 animate-bounce">
                    <Sparkles className="w-8 h-8 animate-spin" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Generating Daily Standup Briefing...</h3>
                  <p className="text-xs text-slate-500 max-w-md mt-1">
                    Analyzing completed workspace tasks, statutory compliance due dates, and pending invoice receivables with Gemini AI...
                  </p>
                </div>
              </div>
            ) : summary ? (
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm text-slate-800 space-y-4">
                <div className="markdown-body text-sm leading-relaxed text-slate-700 space-y-3">
                  <Markdown>{summary}</Markdown>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-sm">
                Click regenerate to fetch real-time AI standup briefing.
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-5 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSpeechPlayback}
                disabled={!summary || isGenerating}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors border ${
                  isPlayingAudio
                    ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                {isPlayingAudio ? <VolumeX className="w-4 h-4 text-rose-600" /> : <Volume2 className="w-4 h-4 text-indigo-600" />}
                {isPlayingAudio ? 'Stop Audio Briefing' : 'Listen to Briefing (Audio)'}
              </button>

              <button
                onClick={handleCopyText}
                disabled={!summary || isGenerating}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-200"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                {copied ? 'Copied!' : 'Copy Text'}
              </button>

              <button
                onClick={handleDownloadText}
                disabled={!summary || isGenerating}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-200"
              >
                <Download className="w-4 h-4 text-slate-500" />
                Export Markdown
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEmailModalOpen(true)}
                disabled={!summary || isGenerating}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                <Mail className="w-4 h-4" />
                Email Briefing to Team
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Email Recipient Sub-Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-100"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                Email AI Standup Briefing
              </h3>
              <button onClick={() => setIsEmailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Dispatch this formatted {briefingType} briefing directly to client, team manager, or team email addresses.
            </p>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-semibold text-slate-700">Recipient Email Address</label>
              <input
                type="email"
                placeholder="e.g. manager@company.com or team@firm.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isSendingEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Dispatch Email
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
