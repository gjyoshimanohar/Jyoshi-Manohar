import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Flame, CloudRain } from 'lucide-react';

export default function PomodoroFocus() {
 const [timeRemaining, setTimeRemaining] = useState(25 * 60);
 const [timerRunning, setTimerRunning] = useState(false);
 const [timerMode, setTimerMode] = useState<'work' | 'break' | 'longBreak'>('work');
 const [focusMinutesLogged, setFocusMinutesLogged] = useState(() => {
 return Number(localStorage.getItem('ticktick_focus_minutes') || '0');
 });

 const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'campfire'>('none');
 const audioCtxRef = useRef<AudioContext | null>(null);
 const generatorNodeRef = useRef<AudioNode | null>(null);

 // Focus Timer Tick
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
 setTimerMode('break');
 setTimeRemaining(5 * 60);
 } else {
 setTimerMode('work');
 setTimeRemaining(25 * 60);
 }
 }
 return () => clearInterval(interval);
 }, [timerRunning, timeRemaining, timerMode, focusMinutesLogged]);

 // Handle ambient background noise synthesizers
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
 // Brownian filter for soothing rumbling rain
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
 
 // Random popping fire crackling
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

 // Clean ambient audio nodes on exit
 useEffect(() => {
 return () => {
 stopAmbient();
 };
 }, []);

 const totalTime = timerMode === 'work' ? 25 * 60 : timerMode === 'break' ? 5 * 60 : 15 * 60;
 const percentage = ((totalTime - timeRemaining) / totalTime) * 100;

 return (
 <div className="w-full max-w-lg mx-auto bg-white border border-[#f0f0f0] rounded-2xl shadow-xl p-8 text-center mt-6">
 <div className="mb-6">
 <span className="px-3 py-1 bg-primary/10 text-primary font-medium text-xs uppercase tracking-widest rounded-full">
 Focus Pomodoro Space
 </span>
 <h2 className="text-2xl text-gray-900 mt-2">Time to Focus</h2>
 <p className="font-medium text-base text-gray-500 mt-1">Boost performance with soothing synthesized background waves</p>
 </div>

 {/* Mode selectors */}
 <div className="flex justify-center space-x-2 bg-gray-50 p-1 rounded-xl mb-8 max-w-md mx-auto">
 <button
 onClick={() => { setTimerMode('work'); setTimeRemaining(25 * 60); setTimerRunning(false); }}
 className={`px-4 py-2 text-xs font-medium uppercase rounded-lg transition-all ${timerMode === 'work' ? 'bg-white shadow-sm text-[#1a2b58]' : 'text-gray-500 hover:text-gray-700'}`}
 >
 Work Loop (25m)
 </button>
 <button
 onClick={() => { setTimerMode('break'); setTimeRemaining(5 * 60); setTimerRunning(false); }}
 className={`px-4 py-2 text-xs font-medium uppercase rounded-lg transition-all ${timerMode === 'break' ? 'bg-white shadow-sm text-[#1a2b58]' : 'text-gray-500 hover:text-gray-700'}`}
 >
 Break Progress (5m)
 </button>
 <button
 onClick={() => { setTimerMode('longBreak'); setTimeRemaining(15 * 60); setTimerRunning(false); }}
 className={`px-4 py-2 text-xs font-medium uppercase rounded-lg transition-all ${timerMode === 'longBreak' ? 'bg-white shadow-sm text-[#1a2b58]' : 'text-gray-500 hover:text-gray-700'}`}
 >
 Long Break (15m)
 </button>
 </div>

 {/* Big Circular Clock */}
 <div className="relative w-64 h-64 mx-auto mb-8 flex items-center justify-center">
 <svg className="absolute w-full h-full -rotate-90">
 <circle
 cx="128"
 cy="128"
 r="110"
 className="stroke-gray-100 fill-none"
 strokeWidth="8"
 />
 <circle
 cx="128"
 cy="128"
 r="110"
 className="stroke-[#1a2b58] fill-none transition-all duration-300"
 strokeWidth="8"
 strokeDasharray={2 * Math.PI * 110}
 strokeDashoffset={2 * Math.PI * 110 * (1 - percentage / 100)}
 strokeLinecap="round"
 />
 </svg>

 <div className="flex flex-col items-center z-10">
 <span className="text-5xl font-light tracking-tight font-mono text-gray-900 tabular-nums">
 {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:{String(timeRemaining % 60).padStart(2, '0')}
 </span>
 <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-2 block">
 {timerMode === 'work' ? 'Working Deep' : 'Relaxing Break'}
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
 className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-600 transition-colors border border-gray-100"
 title="Reset clock"
 >
 <RotateCcw className="w-5 h-5" />
 </button>
 <button
 onClick={() => setTimerRunning(!timerRunning)}
 className={`px-8 py-3.5 rounded-full text-white font-medium text-sm shadow-md transition-all ${timerRunning ? 'bg-gray-800 hover:bg-gray-900' : 'bg-[#1a2b58] hover:bg-[#253c78]'}`}
 >
 {timerRunning ? 'Pause Session' : 'Start Focus'}
 </button>
 </div>

 {/* Soothing Ambient Sound Synthesizer toggles */}
 <div className="border-t border-gray-100 pt-6">
 <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Synthesizer Atmosphere</h4>
 <div className="flex justify-center space-x-3">
 <button
 onClick={() => handleSoundToggle('rain')}
 className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold border rounded-full transition-all ${ambientSound === 'rain' ? 'bg-[#1a2b58] text-white border-[#1a2b58]' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'}`}
 >
 <CloudRain className="w-4 h-4" />
 <span>Rainstorm 🌧️</span>
 </button>
 <button
 onClick={() => handleSoundToggle('campfire')}
 className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold border rounded-full transition-all ${ambientSound === 'campfire' ? 'bg-[#eab308]/10 text-[#a16207] border-[#eab308]/30 font-medium' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'}`}
 >
 <Flame className="w-4 h-4" />
 <span>Campfire 🔥</span>
 </button>
 </div>
 </div>

 {/* Logged stats */}
 <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 mt-6 flex items-center justify-between">
 <div className="text-left">
 <span className="text-xs font-medium text-gray-400 uppercase block tracking-wider">Today's Balance</span>
 <span className="text-sm font-medium text-gray-700">{focusMinutesLogged} minutes logged</span>
 </div>
 <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
 </div>
 </div>
 );
}
