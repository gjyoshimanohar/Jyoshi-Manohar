import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Flame, 
  CloudRain, 
  Clock, 
  User, 
  DollarSign, 
  Receipt, 
  Plus, 
  CheckCircle, 
  Trash2, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { isToday, isThisWeek, isThisMonth, format } from 'date-fns';
import CustomSelect from './CustomSelect';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { timesheetService } from '../services/timesheetService';
import { invoiceService } from '../services/invoiceService';
import { TimesheetLog } from '../types';

export default function PomodoroFocus({ 
  todos = [],
  projects = [],
  activeTimerTaskId = null,
  activeTimerElapsed = 0
}: { 
  todos?: import("../types").Todo[];
  projects?: import("../types").Project[];
  activeTimerTaskId?: string | null;
  activeTimerElapsed?: number;
}) {
  // Timer States
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'work' | 'break' | 'longBreak'>('work');
  const [focusMinutesLogged, setFocusMinutesLogged] = useState(() => {
    return Number(localStorage.getItem('ticktick_focus_minutes') || '0');
  });

  // Smart Retainer Billing States
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [description, setDescription] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number>(2500); // Default flat rate ₹2,500/hr
  const [timesheets, setTimesheets] = useState<TimesheetLog[]>([]);
  const [convertingTimesheetId, setConvertingTimesheetId] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'timer' | 'reports'>('timer');
  const [reportDateRange, setReportDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };


  // When a task is selected, auto-fill description and try to match client
  useEffect(() => {
    if (selectedTaskId) {
      const task = todos.find(t => t.id === selectedTaskId);
      if (task) {
        setDescription(`Working on: ${task.title}`);
        if (task.clientId) {
          setSelectedClientId(task.clientId);
        }
      }
    }
  }, [selectedTaskId, todos]);

  // Synthesizer States
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'campfire'>('none');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const generatorNodeRef = useRef<AudioNode | null>(null);

  // Fetch clients from users collection (filtering out admin itself)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const clientList: any[] = [];
      snapshot.forEach((docRef) => {
        const data = docRef.data();
        if (data.email !== "gjyoshimanohar@gmail.com") {
          clientList.push({
            uid: data.uid || docRef.id,
            email: data.email,
            displayName: data.displayName || data.email,
            address: data.address || ''
          });
        }
      });
      setClients(clientList);
    });
    return () => unsub();
  }, []);

  // Fetch logged timesheets for current user
  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = timesheetService.subscribeToUserTimesheets(auth.currentUser.uid, (fetchedLogs) => {
      setTimesheets(fetchedLogs);
    });
    return () => unsub();
  }, []);

  // Focus Timer Tick & Auto Log Retainer Minutes
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      setTimerRunning(false);
      if (timerMode === 'work') {
        const logged = focusMinutesLogged + 25;
        setFocusMinutesLogged(logged);
        localStorage.setItem('ticktick_focus_minutes', String(logged));

        // Auto-log to selected client if configured
        if (auth.currentUser && (selectedClientId || selectedTaskId)) {
          const clientObj = clients.find(c => c.uid === selectedClientId);
          const clientName = clientObj?.displayName || "Retainer Account";
          
          timesheetService.createTimesheet({
            userId: auth.currentUser.uid,
            clientId: selectedClientId || 'internal',
            clientName: clientName || 'Internal Task',
            durationMinutes: 25,
            description: description.trim() || "Deep Focus Pomodoro Session",
            status: 'pending',
            billingRate: hourlyRate,
            taskId: selectedTaskId || undefined,
            taskTitle: selectedTaskId ? todos.find(t => t.id === selectedTaskId)?.title : undefined
          }).then(() => {
            alert(`Auto-logged 25m retainer focus session to client: ${clientName}!`);
          }).catch(err => {
            console.error("Auto-log failed:", err);
          });
        }

        setTimerMode('break');
        setTimeRemaining(5 * 60);
      } else {
        setTimerMode('work');
        setTimeRemaining(25 * 60);
      }
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeRemaining, timerMode, focusMinutesLogged, selectedClientId, clients, description, hourlyRate]);

  // Handle ambient background noise synthesizers (Preserved Original Audio Engine)
  const stopAmbient = () => {
    if (generatorNodeRef.current) {
      try {
        generatorNodeRef.current.disconnect();
      } catch (e) {}
      generatorNodeRef.current = null;
    }
  };

  const playAmbientRain = () => {
    stopAmbient();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }
      
      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);
      
      source.connect(filter);
      filter.connect(ctx.destination);
      source.start();
      generatorNodeRef.current = source;
    } catch(e) {
      console.error(e);
    }
  };

  const playAmbientCampfire = () => {
    stopAmbient();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.012 * white)) / 1.012;
        lastOut = output[i];
        
        if (Math.random() < 0.0001) {
          output[i] += (Math.random() > 0.5 ? 1 : -1) * 0.7;
        }
        output[i] *= 4.0;
      }
      
      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(380, ctx.currentTime);
      filter.Q.setValueAtTime(0.7, ctx.currentTime);
      
      source.connect(filter);
      filter.connect(ctx.destination);
      source.start();
      generatorNodeRef.current = source;
    } catch(e) {
      console.error(e);
    }
  };

  const handleSoundToggle = (sound: 'rain' | 'campfire') => {
    if (ambientSound === sound) {
      setAmbientSound('none');
      stopAmbient();
    } else {
      setAmbientSound(sound);
      if (sound === 'rain') playAmbientRain();
      if (sound === 'campfire') playAmbientCampfire();
    }
  };

  useEffect(() => {
    return () => {
      stopAmbient();
    };
  }, []);

  // Quick manual log helper
  const handleQuickLog = async (minutes: number) => {
    if (!auth.currentUser) return;
    if (!selectedClientId) {
      alert("Please select a client account to log minutes.");
      return;
    }

    const clientObj = clients.find(c => c.uid === selectedClientId);
    const clientName = clientObj?.displayName || "Retainer Account";

    try {
      await timesheetService.createTimesheet({
        userId: auth.currentUser.uid,
        clientId: selectedClientId || 'internal',
        clientName: clientName || 'Internal Task',
        durationMinutes: minutes,
        description: description.trim() || "Consulting & Retainer Services",
        status: 'pending',
        billingRate: hourlyRate,
        taskId: selectedTaskId || undefined,
        taskTitle: selectedTaskId ? todos.find(t => t.id === selectedTaskId)?.title : undefined
      });
      
      setFocusMinutesLogged(prev => prev + minutes);
      setDescription('');
    } catch (err) {
      console.error("Failed to log timesheet manually:", err);
    }
  };

  // Convert Pending Timesheet to Draft Invoice
  const handleConvertToInvoice = async (timesheet: TimesheetLog) => {
    if (!auth.currentUser) return;
    setConvertingTimesheetId(timesheet.id);
    try {
      const rate = timesheet.billingRate || hourlyRate || 2500;
      const amount = Number(((timesheet.durationMinutes / 60) * rate).toFixed(2));
      const invoiceNum = `INV-T-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const clientObj = clients.find(c => c.uid === timesheet.clientId);
      const clientEmail = clientObj?.email || "client@example.com";
      const clientName = clientObj?.displayName || timesheet.clientName;

      const newInvoice = {
        userId: timesheet.clientId,
        invoiceNumber: invoiceNum,
        clientName: clientName,
        clientEmail: clientEmail,
        clientAddress: clientObj?.address || "Registered Client Account",
        senderName: "Jyoshi Manohar",
        senderEmail: "gjyoshimanohar@gmail.com",
        senderAddress: "Chartered Accountant Office, Bangalore",
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 Days
        status: 'draft' as const,
        taxRate: 18, // 18% standard GST
        discount: 0,
        subtotal: amount,
        total: Number((amount * 1.18).toFixed(2)),
        notes: `Automatically generated from smart retainer focus time-log of ${timesheet.durationMinutes} minutes.`,
        items: [
          {
            id: Math.random().toString(36).substring(2, 9),
            description: `Retainer Consulting Work: ${timesheet.description || 'General Consulting'}`,
            quantity: Number((timesheet.durationMinutes / 60).toFixed(2)),
            rate: rate,
            amount: amount,
            type: 'time' as const
          }
        ]
      };

      const createdInvoice = await invoiceService.createInvoice(newInvoice);
      
      await timesheetService.updateTimesheet(timesheet.id, {
        status: 'billed',
        invoiceId: createdInvoice.id
      });

      alert(`Success! Generated draft invoice ${invoiceNum} for ${clientName}. Access this draft anytime in Services > Billing.`);
    } catch (err) {
      console.error("Failed to convert timesheet:", err);
      alert("Error: Failed to convert timesheet log to draft invoice.");
    } finally {
      setConvertingTimesheetId(null);
    }
  };

  const handleDeleteTimesheet = async (id: string) => {
    if (confirm("Are you sure you want to delete this timesheet log?")) {
      try {
        await timesheetService.deleteTimesheet(id);
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  const totalTime = timerMode === 'work' ? 25 * 60 : timerMode === 'break' ? 5 * 60 : 15 * 60;
  const percentage = ((totalTime - timeRemaining) / totalTime) * 100;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <div className="flex gap-4 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('timer')}
          className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'timer' ? 'text-[#1a2b58] border-[#1a2b58]' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
        >
          Focus Timer & Logs
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'reports' ? 'text-[#1a2b58] border-[#1a2b58]' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
        >
          Timesheet Reports
        </button>
      </div>
      
      {activeTab === 'timer' ? (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: FOCUS ENVIRONMENT */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl shadow-sm p-8 text-center">
          <div className="mb-6">
            <span className="px-3 py-1 bg-[#1a2b58]/10 text-[#1a2b58] font-medium text-xs uppercase tracking-widest rounded-full">
              Atmospheric Focus Space
            </span>
            <h2 className="text-2xl font-bold text-slate-800 mt-2">Deep Focus Clock</h2>
            <p className="text-sm text-slate-500 mt-1">
              Synchronize your mind with raw ambient acoustic waves
            </p>
          </div>

          {/* Mode selectors */}
          <div className="flex justify-center space-x-2 bg-slate-50 p-1 rounded-xl mb-8 max-w-md mx-auto">
            <button
              onClick={() => { setTimerMode('work'); setTimeRemaining(25 * 60); setTimerRunning(false); }}
              className={`px-3 py-1.5 text-xs font-semibold uppercase rounded-lg transition-all ${timerMode === 'work' ? 'bg-white shadow-sm text-[#1a2b58]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Work (25m)
            </button>
            <button
              onClick={() => { setTimerMode('break'); setTimeRemaining(5 * 60); setTimerRunning(false); }}
              className={`px-3 py-1.5 text-xs font-semibold uppercase rounded-lg transition-all ${timerMode === 'break' ? 'bg-white shadow-sm text-[#1a2b58]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Short Break (5m)
            </button>
            <button
              onClick={() => { setTimerMode('longBreak'); setTimeRemaining(15 * 60); setTimerRunning(false); }}
              className={`px-3 py-1.5 text-xs font-semibold uppercase rounded-lg transition-all ${timerMode === 'longBreak' ? 'bg-white shadow-sm text-[#1a2b58]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Long Break (15m)
            </button>
          </div>

          {/* Big Circular Clock */}
          <div className="relative w-56 h-56 mx-auto mb-8 flex items-center justify-center">
            <svg className="absolute w-full h-full -rotate-90">
              <circle
                cx="112"
                cy="112"
                r="96"
                className="stroke-slate-100 fill-none"
                strokeWidth="6"
              />
              <circle
                cx="112"
                cy="112"
                r="96"
                className="stroke-[#1a2b58] fill-none transition-all duration-300"
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 96}
                strokeDashoffset={2 * Math.PI * 96 * (1 - percentage / 100)}
                strokeLinecap="round"
              />
            </svg>

            <div className="flex flex-col items-center z-10">
              <span className="text-4xl font-light tracking-tight font-mono text-slate-800 tabular-nums">
                {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:{String(timeRemaining % 60).padStart(2, '0')}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">
                {timerMode === 'work' ? 'Deep Work' : 'Break Time'}
              </span>
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex justify-center items-center space-x-4 mb-8">
            <button
              onClick={() => {
                setTimerRunning(false);
                setTimeRemaining(timerMode === 'work' ? 25 * 60 : timerMode === 'break' ? 5 * 60 : 15 * 60);
              }}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 transition-colors border border-slate-100"
              title="Reset clock"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className={`px-8 py-3 rounded-full text-white font-semibold text-xs uppercase tracking-wider shadow-md transition-all ${timerRunning ? 'bg-slate-800 hover:bg-slate-900' : 'bg-[#1a2b58] hover:bg-[#253c78]'}`}
            >
              {timerRunning ? 'Pause Session' : 'Start Focus'}
            </button>
          </div>

          {/* Soothing Ambient Sound Synthesizer toggles */}
          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Synthesizer Atmosphere</h4>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => handleSoundToggle('rain')}
                className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold border rounded-full transition-all ${ambientSound === 'rain' ? 'bg-[#1a2b58] text-white border-[#1a2b58]' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'}`}
              >
                <CloudRain className="w-3.5 h-3.5" />
                <span>Rainstorm 🌧️</span>
              </button>
              <button
                onClick={() => handleSoundToggle('campfire')}
                className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold border rounded-full transition-all ${ambientSound === 'campfire' ? 'bg-[#eab308]/10 text-[#a16207] border-[#eab308]/30 font-medium' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'}`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Campfire 🔥</span>
              </button>
            </div>
          </div>

          {/* Logged stats balance card */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-6 flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Session Balance</span>
              <span className="text-xs font-semibold text-slate-600">{focusMinutesLogged} total minutes logged</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* RIGHT COLUMN: SMART TIME-TRACKING FOR RETAINERS */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Smart Retainer Console */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#1a2b58]/10 text-[#1a2b58] rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Smart Retainer Billing</h3>
                  <p className="text-xs text-slate-400">Map active focus sessions directly to billing and invoice generation</p>
                </div>
              </div>
            </div>

            {/* Config Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Select Task to Focus On
                </label>
                <CustomSelect
                  value={selectedTaskId}
                  placeholder="-- Select a specific task (Optional) --"
                  onChange={(val) => setSelectedTaskId(val)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a2b58]/15 transition-colors"
                  options={todos ? todos.map((t) => ({value: t.id, label: t.title})) : []}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <User className="w-3 h-3" /> Select Client Account
                </label>
                <CustomSelect
                  value={selectedClientId}
                  placeholder="-- Choose client --"
                  onChange={(val) => setSelectedClientId(val)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a2b58]/15 transition-colors"
                  options={clients.map((c) => ({value: c.uid, label: `${c.displayName} (${c.email})`}))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Hourly Retainer Rate
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-semibold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    placeholder="Rate per hour"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#1a2b58] transition-colors font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Focus Session Activity Details
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Audit review, corporate tax advisory, GST filing planning..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#1a2b58] transition-colors"
              />
            </div>

            {selectedClientId && (
              <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 mb-4 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-normal">
                  <strong>Active Session Auto-Logging:</strong> With a client account selected, letting the Pomodoro clock complete its 25-minute cycle will automatically log 25 minutes of consulting work to their timesheet!
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Quick Retainer Log Shortcuts
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleQuickLog(15)}
                  disabled={!selectedClientId && !selectedTaskId}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-slate-600 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Log 15m
                </button>
                <button
                  onClick={() => handleQuickLog(30)}
                  disabled={!selectedClientId && !selectedTaskId}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-slate-600 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Log 30m
                </button>
                <button
                  onClick={() => handleQuickLog(45)}
                  disabled={!selectedClientId && !selectedTaskId}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-slate-600 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Log 45m
                </button>
                <button
                  onClick={() => handleQuickLog(60)}
                  disabled={!selectedClientId && !selectedTaskId}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-slate-600 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Log 1h
                </button>
              </div>
            </div>
          </div>

          {/* Active Logs / History */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#1a2b58]" /> Retainer Timesheet History
              </h3>
              <span className="text-xs font-bold text-[#1a2b58] bg-[#1a2b58]/5 px-2 py-0.5 rounded-full">
                {timesheets.length} Logs
              </span>
            </div>

            {timesheets.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No active retainer timesheet logs recorded yet.</p>
                <p className="text-[10px] text-slate-400/80 mt-1">Select a client and log minutes to generate records.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pr-2">Client</th>
                      <th className="pb-3 px-2">Log Details</th>
                      <th className="pb-3 px-2">Time</th>
                      <th className="pb-3 px-2">Estimated Billing</th>
                      <th className="pb-3 px-2">Status</th>
                      <th className="pb-3 pl-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {timesheets.map((ts) => {
                      const rate = ts.billingRate || 2500;
                      const amount = ((ts.durationMinutes / 60) * rate).toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0
                      });

                      return (
                        <tr key={ts.id} className="text-xs text-slate-600 hover:bg-slate-50/40 transition-colors">
                          <td className="py-3 pr-2 font-semibold text-slate-800 max-w-[120px] truncate">
                            {ts.clientName}
                          </td>
                          <td className="py-3 px-2 max-w-[160px] truncate">
                            <span className="text-slate-500 leading-normal block">
                              {ts.description || "Retainer Services"}
                            </span>
                            <span className="text-[9px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              {new Date(ts.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-mono font-medium text-slate-700">
                            {ts.durationMinutes}m
                          </td>
                          <td className="py-3 px-2 font-mono font-semibold text-slate-800">
                            {amount}
                            <span className="text-[9px] text-slate-400 font-normal block">
                              @ ₹{rate}/hr
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            {ts.status === 'billed' ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold text-[10px] rounded-full">
                                <CheckCircle className="w-3 h-3" /> Billed
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 font-semibold text-[10px] rounded-full">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 pl-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {ts.status === 'pending' ? (
                                <button
                                  onClick={() => handleConvertToInvoice(ts)}
                                  disabled={convertingTimesheetId !== null}
                                  className="px-2.5 py-1 bg-[#1a2b58] hover:bg-[#253c78] disabled:opacity-50 text-white font-bold text-[10px] rounded-md transition-all shadow-sm"
                                  title="Generate Draft Invoice"
                                >
                                  {convertingTimesheetId === ts.id ? 'Billing...' : 'Bill Client'}
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Invoiced</span>
                              )}
                              <button
                                onClick={() => handleDeleteTimesheet(ts.id)}
                                className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors"
                                title="Delete log"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                Integrated Timesheet Report
                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                  IST (Asia/Kolkata)
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Unified report of active task timers and logged timesheets
              </p>
            </div>

            <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shrink-0">
              <button 
                onClick={() => setReportDateRange('today')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${reportDateRange === 'today' ? 'bg-white text-[#1a2b58] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >Today</button>
              <button 
                onClick={() => setReportDateRange('week')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${reportDateRange === 'week' ? 'bg-white text-[#1a2b58] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >This Week</button>
              <button 
                onClick={() => setReportDateRange('month')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${reportDateRange === 'month' ? 'bg-white text-[#1a2b58] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >This Month</button>
              <button 
                onClick={() => setReportDateRange('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${reportDateRange === 'all' ? 'bg-white text-[#1a2b58] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >All Time</button>
            </div>
          </div>

          {(() => {
            // Build unified list of time tracking items
            type UnifiedReportItem = {
              id: string;
              type: 'task_timer' | 'timesheet';
              title: string;
              category: string;
              durationSeconds: number;
              date: Date;
              isActiveNow?: boolean;
              isCompleted?: boolean;
              statusText: string;
              originalItem?: any;
            };

            const unifiedItems: UnifiedReportItem[] = [];

            // IST Timezone helpers (Asia/Kolkata)
            const getISTDateStr = (dateInput: Date | number) => {
              return new Date(dateInput).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            };

            const isTodayIST = (dateInput: Date | number) => {
              return getISTDateStr(dateInput) === getISTDateStr(Date.now());
            };

            const isThisWeekIST = (dateInput: Date | number) => {
              const dIST = new Date(new Date(dateInput).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
              const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
              const diffTime = Math.abs(nowIST.getTime() - dIST.getTime());
              const diffDays = diffTime / (1000 * 60 * 60 * 24);
              return diffDays <= 7;
            };

            const isThisMonthIST = (dateInput: Date | number) => {
              const dStr = new Date(dateInput).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month: '2-digit', year: 'numeric' });
              const nowStr = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month: '2-digit', year: 'numeric' });
              return dStr === nowStr;
            };

            const formatISTDate = (dateInput: Date | number) => {
              return new Date(dateInput).toLocaleDateString('en-IN', {
                timeZone: 'Asia/Kolkata',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });
            };

            // 1. Task Timers
            todos.forEach(t => {
              const totalSec = (t.timeSpentSeconds || 0) + (t.id === activeTimerTaskId ? (activeTimerElapsed || 0) : 0);
              if (totalSec > 0 || t.id === activeTimerTaskId) {
                // Use completion date first if task is completed, or updatedAt/createdAt
                const rawTimestamp = t.completedAt || (t as any).updatedAt || t.createdAt || Date.now();
                const taskDate = new Date(rawTimestamp);
                let matchesFilter = true;

                if (t.id !== activeTimerTaskId) {
                  if (reportDateRange === 'today') matchesFilter = isTodayIST(taskDate);
                  else if (reportDateRange === 'week') matchesFilter = isThisWeekIST(taskDate);
                  else if (reportDateRange === 'month') matchesFilter = isThisMonthIST(taskDate);
                }

                if (matchesFilter) {
                  const projName = t.projectId ? (projects.find(p => p.id === t.projectId)?.name || 'Inbox') : 'Inbox';
                  unifiedItems.push({
                    id: `task-${t.id}`,
                    type: 'task_timer',
                    title: t.title,
                    category: projName,
                    durationSeconds: totalSec,
                    date: taskDate,
                    isActiveNow: t.id === activeTimerTaskId,
                    isCompleted: t.completed,
                    statusText: t.id === activeTimerTaskId ? 'Active Now' : (t.completed ? 'Completed' : 'In Progress'),
                    originalItem: t
                  });
                }
              }
            });

            // 2. Timesheet Logs
            timesheets.forEach(log => {
              const logDate = new Date(log.createdAt);
              let matchesFilter = true;
              if (reportDateRange === 'today') matchesFilter = isTodayIST(logDate);
              else if (reportDateRange === 'week') matchesFilter = isThisWeekIST(logDate);
              else if (reportDateRange === 'month') matchesFilter = isThisMonthIST(logDate);

              if (matchesFilter) {
                unifiedItems.push({
                  id: `timesheet-${log.id}`,
                  type: 'timesheet',
                  title: log.taskTitle || log.description || 'General Work',
                  category: log.clientName === 'Internal Task' ? 'Internal' : (log.clientName || 'General'),
                  durationSeconds: (log.durationMinutes || 0) * 60,
                  date: logDate,
                  statusText: log.status === 'billed' ? 'Billed' : 'Logged',
                  originalItem: log
                });
              }
            });

            // Sort active first, then date descending
            unifiedItems.sort((a, b) => {
              if (a.isActiveNow) return -1;
              if (b.isActiveNow) return 1;
              return b.date.getTime() - a.date.getTime();
            });

            const totalDurationSeconds = unifiedItems.reduce((sum, item) => sum + item.durationSeconds, 0);

            const formatDuration = (totalSec: number) => {
              if (!totalSec || totalSec <= 0) return '0m';
              const hrs = Math.floor(totalSec / 3600);
              const mins = Math.floor((totalSec % 3600) / 60);
              const secs = totalSec % 60;
              if (hrs > 0) return `${hrs}h ${mins}m`;
              if (mins > 0) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
              return `${secs}s`;
            };

            return (
              <div className="space-y-6">
                {/* Summary KPI Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm relative overflow-hidden">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Time Tracked</p>
                    <p className="text-2xl font-black mt-1">{formatDuration(totalDurationSeconds)}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{unifiedItems.length} report items</p>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                    <p className="text-indigo-600 text-[10px] font-bold uppercase tracking-wider">Active Task Timers</p>
                    <p className="text-2xl font-black text-indigo-900 mt-1">
                      {formatDuration(unifiedItems.filter(i => i.type === 'task_timer').reduce((s, i) => s + i.durationSeconds, 0))}
                    </p>
                    <p className="text-[11px] text-indigo-600 font-medium mt-1">
                      {unifiedItems.filter(i => i.type === 'task_timer').length} task timer items
                    </p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <p className="text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Timesheet Logs</p>
                    <p className="text-2xl font-black text-emerald-950 mt-1">
                      {formatDuration(unifiedItems.filter(i => i.type === 'timesheet').reduce((s, i) => s + i.durationSeconds, 0))}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-medium mt-1">
                      {unifiedItems.filter(i => i.type === 'timesheet').length} logged timesheets
                    </p>
                  </div>
                </div>

                {/* Unified Report Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Task / Description</th>
                        <th className="py-3 px-4">Client / Project</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Time Spent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {unifiedItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 text-sm font-medium">
                            No time logs or active task timers found for this period.
                          </td>
                        </tr>
                      ) : (
                        unifiedItems.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                  {item.title}
                                </span>
                                {item.isActiveNow && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active Now
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                              {item.category}
                            </td>
                            <td className="py-3.5 px-4">
                              {item.type === 'task_timer' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md">
                                  Task Timer
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                                  Timesheet Log
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">
                              {formatISTDate(item.date)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span className="text-xs font-black text-slate-800 font-mono bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                                {formatDuration(item.durationSeconds)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
