import React from 'react';
import { X, Target, Clock, Flag, CheckCircle, Flame } from 'lucide-react';

interface GuidePopupProps {
 onClose: () => void;
}

export default function GuidePopup({ onClose }: GuidePopupProps) {
 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
 <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
 
 {/* Header banner */}
 <div className="bg-[#1a2b58] p-6 text-white text-left relative">
 <button 
 onClick={onClose} 
 className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-1.5 rounded-full transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 <span className="text-xs font-medium bg-white/20 text-white uppercase px-2 py-0.5 rounded-full tracking-widest">
 TickTick Desktop Guide
 </span>
 <h3 className="text-xl mt-2">Welcome to your workspace</h3>
 <p className="font-medium text-base text-white/80 mt-1">Discover high productivity and balance inside your structured environment.</p>
 </div>

 {/* Contents grid */}
 <div className="p-6 overflow-y-auto max-h-[400px] space-y-4 text-left">
 <div className="flex items-start space-x-3">
 <div className="bg-[#1a2b58]/10 p-2 rounded-xl text-[#1a2b58] shrink-0">
 <CheckCircle className="w-4 h-4" />
 </div>
 <div>
 <h4 className="font-medium text-sm text-gray-900 leading-normal">Task Columns</h4>
 <p className="font-medium text-base text-gray-500 mt-0.5 leading-relaxed">
 Matches your favorite TickTick screenshot directly! Includes a Countdown sidebar bucket for countdown targets, a primary Weekday block list with fast inline task addition, and collapsible check-offs.
 </p>
 </div>
 </div>

 <div className="flex items-start space-x-3">
 <div className="bg-red-100 p-2 rounded-xl text-red-600 shrink-0">
 <Flag className="w-4 h-4 fill-red-500" />
 </div>
 <div>
 <h4 className="font-medium text-sm text-gray-900 leading-normal">Eisenhower Quadrants</h4>
 <p className="font-medium text-base text-gray-500 mt-0.5 leading-relaxed">
 Sorts todos visually into four boxes under Urgency and Importance. Move priorities instantly via simple drag-and-drop!
 </p>
 </div>
 </div>

 <div className="flex items-start space-x-3">
 <div className="bg-amber-100 p-2 rounded-xl text-amber-600 shrink-0">
 <Flame className="w-4 h-4 fill-amber-500" />
 </div>
 <div>
 <h4 className="font-medium text-sm text-gray-900 leading-normal">Habit Trackers</h4>
 <p className="font-medium text-base text-gray-500 mt-0.5 leading-relaxed">
 Instantly check-off regular routines over the calendar row to increase daily streaks! Your streak indexes are computed and synchronized matching your profile.
 </p>
 </div>
 </div>

 <div className="flex items-start space-x-3">
 <div className="bg-purple-100 p-2 rounded-xl text-purple-600 shrink-0">
 <Clock className="w-4 h-4" />
 </div>
 <div>
 <h4 className="font-medium text-sm text-gray-900 leading-normal">Ambient Sound Synthesizers</h4>
 <p className="font-medium text-base text-gray-500 mt-0.5 leading-relaxed">
 The focus timer includes fully synthesized brown and white audio models, producing soothing real-time rainfall 🌧️ and fire-crackle 🏕️ directly in your client browser!
 </p>
 </div>
 </div>
 </div>

 {/* Footer */}
 <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-100">
 <button
 onClick={onClose}
 className="bg-[#1a2b58] hover:bg-[#253c78] text-white px-5 py-2 rounded-lg text-xs font-medium transition-all shadow-md active:scale-98"
 >
 Acknowledge & Start
 </button>
 </div>
 </div>
 </div>
 );
}
