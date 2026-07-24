import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  X,
  Check,
  Download,
  ExternalLink,
  RefreshCw,
  Bell,
  Clock,
  ShieldCheck,
  CheckSquare,
  Square,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  CalendarEventItem,
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  downloadIcsFile,
  getStatutoryCompliancePresets
} from '../utils/calendarUtils';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  customEvents?: CalendarEventItem[];
  defaultCategory?: string;
  title?: string;
}

export default function CalendarSyncModal({
  isOpen,
  onClose,
  customEvents = [],
  defaultCategory = 'all',
  title = 'Calendar Sync: Statutory Compliance & Reminders'
}: CalendarSyncModalProps) {
  const [activeTab, setActiveTab] = useState<'statutory' | 'custom' | 'reminders'>('statutory');
  const [categoryFilter, setCategoryFilter] = useState<string>(defaultCategory);
  
  // Combine preset statutory compliance dates with custom events provided from context
  const presets = getStatutoryCompliancePresets();
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());

  const [googleTokens, setGoogleTokens] = useState<any>(null);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [googleOauthConfigured, setGoogleOauthConfigured] = useState<boolean>(true);

  // Reminder Preferences
  const [reminder1Day, setReminder1Day] = useState(true);
  const [reminder3Days, setReminder3Days] = useState(true);
  const [reminderEmail, setReminderEmail] = useState(true);

  useEffect(() => {
    // Check if tokens stored in localStorage
    const savedTokens = localStorage.getItem('google_calendar_tokens');
    if (savedTokens) {
      try {
        setGoogleTokens(JSON.parse(savedTokens));
      } catch (e) {
        console.error('Error parsing stored google tokens', e);
      }
    }

    // Select all presets by default
    const allIds = new Set<string>();
    presets.forEach((p) => allIds.add(p.id));
    customEvents.forEach((c) => allIds.add(c.id));
    setSelectedEventIds(allIds);

    // Listen for OAuth token message from popup window
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_CALENDAR_TOKENS') {
        const tokens = event.data.tokens;
        setGoogleTokens(tokens);
        localStorage.setItem('google_calendar_tokens', JSON.stringify(tokens));
        toast.success('Google Calendar linked successfully!');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!isOpen) return null;

  const allAvailableEvents: CalendarEventItem[] = [
    ...presets,
    ...customEvents.filter((ce) => !presets.some((p) => p.id === ce.id))
  ];

  const filteredEvents = allAvailableEvents.filter((evt) => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'statutory') return ['gst', 'income_tax', 'tds', 'roc'].includes(evt.category || '');
    if (categoryFilter === 'audit') return evt.category === 'audit';
    if (categoryFilter === 'tasks') return evt.category === 'task' || evt.category === 'invoice';
    return evt.category === categoryFilter;
  });

  const toggleSelectAll = () => {
    if (selectedEventIds.size === filteredEvents.length) {
      setSelectedEventIds(new Set());
    } else {
      const newSet = new Set<string>();
      filteredEvents.forEach((e) => newSet.add(e.id));
      setSelectedEventIds(newSet);
    }
  };

  const toggleEventSelect = (id: string) => {
    const next = new Set(selectedEventIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedEventIds(next);
  };

  const getSelectedEvents = (): CalendarEventItem[] => {
    return allAvailableEvents.filter((e) => selectedEventIds.has(e.id));
  };

  // Google OAuth flow launcher
  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/calendar/auth-url');
      const data = await res.json();
      if (data.authUrl) {
        window.open(data.authUrl, 'GoogleCalendarAuth', 'width=600,height=700');
      } else {
        setGoogleOauthConfigured(false);
        toast.error(data.error || 'Google OAuth credentials not configured on server.');
      }
    } catch (error) {
      toast.error('Failed to initiate Google OAuth flow.');
    }
  };

  // Batch sync to Google Calendar via backend API
  const handleDirectGoogleSync = async () => {
    const selected = getSelectedEvents();
    if (selected.length === 0) {
      toast.error('Please select at least one compliance date to sync.');
      return;
    }

    setIsSyncingGoogle(true);
    try {
      const res = await fetch('/api/calendar/batch-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: googleTokens,
          events: selected
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Synced ${data.count} statutory compliance events to Google Calendar!`);
      } else {
        toast.error(data.error || 'Failed to sync with Google Calendar API.');
      }
    } catch (error: any) {
      toast.error('Network error during Google Calendar batch sync.');
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  // Export .ics Download
  const handleDownloadIcs = () => {
    const selected = getSelectedEvents();
    if (selected.length === 0) {
      toast.error('Please select at least one item to export.');
      return;
    }
    downloadIcsFile(selected, `Statutory_Compliance_Schedule_${new Date().getFullYear()}.ics`);
    toast.success(`Exported ${selected.length} items as .ics calendar file!`);
  };

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
          <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
                <p className="text-xs text-slate-300">
                  Sync statutory compliance due dates, audit schedules, & tax filing reminders.
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

          {/* Quick Sync Provider Highlights Bar */}
          <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-semibold text-slate-900">Supported Platforms:</span>
              <span className="px-2 py-0.5 bg-blue-100/80 text-blue-700 font-medium rounded-full">Google Calendar</span>
              <span className="px-2 py-0.5 bg-sky-100/80 text-sky-700 font-medium rounded-full">Microsoft Outlook</span>
              <span className="px-2 py-0.5 bg-purple-100/80 text-purple-700 font-medium rounded-full">Apple Calendar (.ics)</span>
            </div>

            <div className="flex items-center gap-2">
              {googleTokens ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Google Account Linked
                  </span>
                  <button
                    onClick={handleDirectGoogleSync}
                    disabled={isSyncingGoogle}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isSyncingGoogle ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Push Selected ({selectedEventIds.size})
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectGoogle}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Connect Google Account
                </button>
              )}
            </div>
          </div>

          {/* Filters and Search Bar */}
          <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {[
                { id: 'all', label: 'All Schedule Items' },
                { id: 'statutory', label: 'Statutory & Tax' },
                { id: 'audit', label: 'Audit Schedules' },
                { id: 'tasks', label: 'Tasks & Invoices' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCategoryFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    categoryFilter === f.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-medium"
              >
                {selectedEventIds.size === filteredEvents.length ? (
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                Select All ({filteredEvents.length})
              </button>
            </div>
          </div>

          {/* Main Events List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No schedule items found under this category filter.
              </div>
            ) : (
              filteredEvents.map((evt) => {
                const isSelected = selectedEventIds.has(evt.id);
                const googleUrl = getGoogleCalendarUrl(evt);
                const outlookUrl = getOutlookCalendarUrl(evt);

                let badgeColor = 'bg-slate-100 text-slate-700';
                if (evt.category === 'gst') badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
                if (evt.category === 'income_tax') badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                if (evt.category === 'tds') badgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
                if (evt.category === 'audit') badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
                if (evt.category === 'roc') badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';

                return (
                  <div
                    key={evt.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-white border-indigo-200 shadow-md shadow-indigo-50/50 ring-1 ring-indigo-500/20'
                        : 'bg-white/80 border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 flex-1">
                      <button
                        onClick={() => toggleEventSelect(evt.id)}
                        className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${badgeColor}`}>
                            {evt.category || 'compliance'}
                          </span>
                          <h4 className="text-sm font-semibold text-slate-900">{evt.title}</h4>
                        </div>
                        {evt.description && (
                          <p className="text-xs text-slate-500 max-w-xl line-clamp-2">{evt.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            Due Date: {new Date(evt.startDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          {evt.location && (
                            <span className="text-slate-400">| {evt.location}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick One-Click Sync Links for this single item */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <a
                        href={googleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors border border-blue-200/60"
                        title="Add to Google Calendar in browser"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Google Cal
                      </a>

                      <a
                        href={outlookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors border border-sky-200/60"
                        title="Add to Outlook Calendar in browser"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Outlook
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-5 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Bell className="w-4 h-4 text-amber-500" />
              <span>Includes 1-day & 3-day advance alerts on all synced items</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadIcs}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" />
                Download iCal (.ics) File
              </button>

              {googleTokens ? (
                <button
                  onClick={handleDirectGoogleSync}
                  disabled={isSyncingGoogle || selectedEventIds.size === 0}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                >
                  {isSyncingGoogle ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CalendarIcon className="w-4 h-4" />
                  )}
                  Sync {selectedEventIds.size} Selected to Google
                </button>
              ) : (
                <button
                  onClick={handleConnectGoogle}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Authorize Google Calendar
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
