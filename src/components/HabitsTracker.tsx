import React, { useState, useEffect } from 'react';
import { Target, Plus, Flame, Sparkles, Trash2, Trophy, ChevronDown } from 'lucide-react';
import { format, subDays, isSameDay } from 'date-fns';

interface Habit {
 id: string;
 name: string;
 icon: string;
 streak: number;
 totalCompletions: number;
 completions: string[]; // Dates stored as YYYY-MM-DD
 createdAt: number;
}

interface HabitsTrackerProps {
 userId: string;
}

const PRESET_HABITS = [
 { name: 'Drink Water', icon: '💧' },
 { name: 'Exercise Workout', icon: '🏋️' },
 { name: 'Read Material', icon: '📚' },
 { name: 'Mindfulness Meditation', icon: '🧘' },
 { name: 'Sufficient Sleep', icon: '🛌' },
];

export default function HabitsTracker({ userId }: HabitsTrackerProps) {
 const [habits, setHabits] = useState<Habit[]>([]);
 const [newHabitName, setNewHabitName] = useState('');
 const [newHabitIcon, setNewHabitIcon] = useState('🎯');

 // Load habits per user credentials
 useEffect(() => {
 const loaded = localStorage.getItem(`ticktick_habits_${userId}`);
 if (loaded) {
 setHabits(JSON.parse(loaded));
 } else {
 // Default initial bootstrap presets
 const defaults: Habit[] = [
 {
 id: 'h1',
 name: 'CA Final Study Prep',
 icon: '📚',
 streak: 4,
 totalCompletions: 12,
 completions: [
 format(new Date(), 'yyyy-MM-dd'),
 format(subDays(new Date(), 1), 'yyyy-MM-dd'),
 format(subDays(new Date(), 2), 'yyyy-MM-dd'),
 format(subDays(new Date(), 3), 'yyyy-MM-dd'),
 ],
 createdAt: Date.now(),
 },
 {
 id: 'h2',
 name: 'Hydration Intake',
 icon: '💧',
 streak: 2,
 totalCompletions: 5,
 completions: [
 format(new Date(), 'yyyy-MM-dd'),
 format(subDays(new Date(), 1), 'yyyy-MM-dd'),
 ],
 createdAt: Date.now(),
 }
 ];
 setHabits(defaults);
 localStorage.setItem(`ticktick_habits_${userId}`, JSON.stringify(defaults));
 }
 }, [userId]);

 const saveHabits = (updated: Habit[]) => {
 setHabits(updated);
 localStorage.setItem(`ticktick_habits_${userId}`, JSON.stringify(updated));
 };

 const handleAddPreset = (p: { name: string, icon: string }) => {
 const fresh: Habit = {
 id: Date.now().toString(),
 name: p.name,
 icon: p.icon,
 streak: 0,
 totalCompletions: 0,
 completions: [],
 createdAt: Date.now(),
 };
 saveHabits([...habits, fresh]);
 };

 const handleCreateCustom = () => {
 if (!newHabitName.trim()) return;
 const fresh: Habit = {
 id: Date.now().toString(),
 name: newHabitName.trim(),
 icon: newHabitIcon,
 streak: 0,
 totalCompletions: 0,
 completions: [],
 createdAt: Date.now(),
 };
 saveHabits([...habits, fresh]);
 setNewHabitName('');
 };

 const handleDelete = (id: string) => {
 const filtered = habits.filter(h => h.id !== id);
 saveHabits(filtered);
 };

 // Checkbox Days row (Last 5 days counting backwards)
 const lastDays = Array.from({ length: 5 }, (_, i) => {
 const d = subDays(new Date(), 4 - i);
 return {
 date: d,
 key: format(d, 'yyyy-MM-dd'),
 label: format(d, 'EEE').charAt(0), // 'M', 'T', 'W'...
 isToday: isSameDay(d, new Date()),
 };
 });

 const toggleCheckedDay = (habitId: string, dateStr: string) => {
 const updated = habits.map(h => {
 if (h.id !== habitId) return h;

 let completions = [...h.completions];
 if (completions.includes(dateStr)) {
 completions = completions.filter(c => c !== dateStr);
 } else {
 completions.push(dateStr);
 }

 // Recalculate total completions count
 const totalCompletions = completions.length;

 // Calculate Streaks
 let streak = 0;
 let checkDate = new Date();
 // Safe streak loop
 while (true) {
 const checkStr = format(checkDate, 'yyyy-MM-dd');
 if (completions.includes(checkStr)) {
 streak++;
 checkDate = subDays(checkDate, 1);
 } else {
 // If today isn't completed, but yesterday is, streak counts from yesterday
 if (isSameDay(checkDate, new Date())) {
 checkDate = subDays(checkDate, 1);
 continue;
 }
 break;
 }
 if (streak > 365) break; // Defensive boundary
 }

 return {
 ...h,
 completions,
 totalCompletions,
 streak,
 };
 });

 saveHabits(updated);
 };

 return (
 <div className="w-full flex flex-col h-full bg-white select-none">
 <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
 <div>
 <h2 className="text-xl text-gray-900 flex items-center">
 <Target className="w-5 h-5 mr-2 text-[#1a2b58]" />
 Habit Ring Tracker
 </h2>
 <p className="font-medium text-base text-gray-500">Cultivate regular disciplines through logging calendar steaks.</p>
 </div>

 {/* Global Stats Board */}
 <div className="flex space-x-3 bg-[#1a2b58]/5 border border-[#1a2b58]/10 p-3 rounded-xl items-center">
 <Trophy className="w-6 h-6 text-[#1a2b58]" />
 <div>
 <span className="text-xs font-medium text-[#1a2b58] uppercase block tracking-wider">Total Active Habits</span>
 <span className="text-sm text-[#1a2b58]">{habits.length} Tracking</span>
 </div>
 </div>
 </div>

 {/* Preset Pickers */}
 <div className="mb-6 bg-gray-50 border border-gray-100 p-4 rounded-xl">
 <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2.5">Quick Presets</h3>
 <div className="flex flex-wrap gap-2">
 {PRESET_HABITS.map(p => (
 <button
 key={p.name}
 onClick={() => handleAddPreset(p)}
 className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 hover:border-[#1a2b58] hover:text-[#1a2b58] hover:scale-102 rounded-full transition-all flex items-center space-x-1.5 shadow-sm active:scale-98"
 >
 <span>{p.icon}</span>
 <span>{p.name}</span>
 </button>
 ))}
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {/* Habit Card Lists (Takes 2/3 space) */}
 <div className="md:col-span-2 space-y-3 pr-1">
 {habits.length === 0 ? (
 <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
 <span className="text-xs text-gray-400">No habits tracked yet. Kick off with a preset above!</span>
 </div>
 ) : (
 habits.map(habit => (
 <div
 key={habit.id}
 className="bg-white border border-[#f0f0f0] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between shadow-sm hover:shadow-md transition-all duration-200"
 >
 <div className="flex items-center space-x-3.5 mb-3 sm:mb-0 w-full sm:w-auto">
 <div className="text-3xl bg-gray-50 border border-gray-100 w-12 h-12 rounded-xl flex items-center justify-center">
 {habit.icon}
 </div>
 <div className="text-left">
 <h4 className="font-medium text-sm text-gray-900 leading-tight">{habit.name}</h4>
 <div className="flex items-center space-x-2 mt-1">
 <span className="text-xs bg-amber-50 text-amber-700 font-medium px-1.5 py-0.5 rounded-full flex items-center">
 <Flame className="w-3 h-3 mr-0.5 text-amber-500 fill-amber-500" />
 {habit.streak} day streak
 </span>
 <span className="text-xs text-gray-400 font-medium">
 Total {habit.totalCompletions} completions
 </span>
 </div>
 </div>
 </div>

 {/* 5-Day Logger Grid */}
 <div className="flex items-center space-x-4 ml-auto sm:ml-0">
 <div className="flex items-center space-x-1.5">
 {lastDays.map(day => {
 const checked = habit.completions.includes(day.key);
 return (
 <div key={day.key} className="flex flex-col items-center">
 <span className={`text-xs font-medium uppercase mb-1 ${day.isToday ? 'text-[#1a2b58]' : 'text-gray-400'}`}>
 {day.label}
 </span>
 <button
 onClick={() => toggleCheckedDay(habit.id, day.key)}
 className={`w-8 h-8 rounded-full border flex items-center justify-center font-medium text-xs shadow-sm transition-all duration-200 active:scale-90 ${checked ? 'bg-[#1a2b58] text-white border-[#1a2b58]' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-500'}`}
 >
 {checked ? '✓' : ''}
 </button>
 </div>
 );
 })}
 </div>

 <button
 onClick={() => handleDelete(habit.id)}
 className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
 title="Delete habit"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
 ))
 )}
 </div>

 {/* Custom Creator (Takes 1/3 space) */}
 <div className="bg-gray-50 border border-gray-100 p-5 rounded-xl h-fit">
 <h3 className=" text-xs text-gray-500 uppercase tracking-widest mb-4 flex items-center">
 <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
 Custom Creator
 </h3>
 <div className="space-y-4">
 <div>
 <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Habit Title</label>
 <input
 type="text"
 placeholder="e.g. Code every evening"
 value={newHabitName}
 onChange={(e) => setNewHabitName(e.target.value)}
 className="w-full text-xs px-3 py-2 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white rounded-lg text-black transition-all"
 />
 </div>

 <div>
 <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Launch Icon/Emoji</label>
 <div className="relative flex-1 group">
 <select
 value={newHabitIcon}
 onChange={(e) => setNewHabitIcon(e.target.value)}
 className="w-full text-xs sm:text-sm bg-white border border-gray-200 hover:border-blue-400 focus:border-primary focus:ring-4 focus:ring-primary/10 hover:shadow-md rounded-xl px-3 pr-8 py-2.5 outline-none font-medium text-gray-700 shadow-sm transition-all cursor-pointer appearance-none relative z-0"
 >
 <option value="🎯">🎯 Target/Milestone</option>
 <option value="📚">📚 Study/Reading</option>
 <option value="💧">💧 Hydration/Drinking</option>
 <option value="🏋️">🏋️ Gym Workout</option>
 <option value="🧘">🧘 Zen Meditation</option>
 <option value="🛌">🛌 Sleep Cycle</option>
 <option value="🚶">🚶 Walking Steps</option>
 <option value="💻">💻 Code/Work</option>
 <option value="🍎">🍎 Diet/Nutrition</option>
 <option value="🎨">🎨 Creativity/Craft</option>
 </select>
 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-primary transition-colors z-10">
  <ChevronDown className="w-4 h-4" />
 </div>
</div>
 </div>

 <button
 onClick={handleCreateCustom}
 disabled={!newHabitName.trim()}
 className="w-full bg-[#1a2b58] hover:bg-[#253c78] disabled:opacity-50 text-white py-2 px-4 rounded-lg text-xs font-medium transition-all shadow-md mt-2"
 >
 Add Custom Habit
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
