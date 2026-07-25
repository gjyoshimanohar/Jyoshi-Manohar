import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Target, Clock, Zap, CheckCircle2, AlertCircle, LayoutDashboard, Flag } from 'lucide-react';
import { Todo, Project } from '../types';
import { isToday, isThisWeek, startOfWeek, endOfWeek } from 'date-fns';

export interface DashboardWidgetsProps {
  todos: Todo[];
  projects: Project[];
  activeTimerTaskId?: string | null;
  activeTimerElapsed?: number;
  onNavigateToTab: (tab: string, viewMode?: string, entityId?: string) => void;
}

export default function DashboardWidgets({ 
  todos, 
  projects, 
  activeTimerTaskId, 
  activeTimerElapsed,
  onNavigateToTab
}: DashboardWidgetsProps) {
  // Compute some quick stats
  const completedToday = todos.filter(t => t.completed && t.completedAt && isToday(t.completedAt)).length;
  const pendingToday = todos.filter(t => !t.completed && t.dueDate && isToday(new Date(t.dueDate))).length;
  const highPriority = todos.filter(t => !t.completed && t.priority === 1).length;

  const topProjects = projects.map(p => {
    const pTasks = todos.filter(t => t.projectId === p.id);
    const completed = pTasks.filter(t => t.completed).length;
    const progress = pTasks.length > 0 ? (completed / pTasks.length) * 100 : 0;
    return { ...p, progress, activeTasks: pTasks.length - completed };
  }).sort((a, b) => b.activeTasks - a.activeTasks).slice(0, 4);

  return (
    <div className="w-full max-w-5xl mx-auto py-8 animate-in fade-in duration-300">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-indigo-600" />
            Executive Dashboard
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Your centralized hub for immediate priorities, active projects, and time-tracking insights.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => onNavigateToTab("tasks", "today")}
          className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm cursor-pointer transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Completed Today</p>
              <p className="text-2xl font-bold text-slate-900">{completedToday}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => onNavigateToTab("tasks", "today")}
          className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm cursor-pointer transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Due Today</p>
              <p className="text-2xl font-bold text-slate-900">{pendingToday}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => onNavigateToTab("starred")}
          className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm cursor-pointer transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <Flag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Urgent Priorities (P1)</p>
              <p className="text-2xl font-bold text-slate-900">{highPriority}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" />
              Active Projects Overview
            </h3>
          </div>
          <div className="space-y-5">
            {topProjects.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No active projects found.</p>
            ) : (
              topProjects.map(p => (
                <div key={p.id} className="group cursor-pointer" onClick={() => onNavigateToTab("tasks", "project", p.id)}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">{p.name}</span>
                    <span className="text-xs font-bold text-slate-500">{Math.round(p.progress)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${p.progress}%`, backgroundColor: p.color || '#6366f1' }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Focus & Activity
            </h3>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-amber-50/50 border border-amber-100 rounded-xl mb-6 cursor-pointer hover:bg-amber-50 transition-colors" onClick={() => onNavigateToTab("focus")}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                {activeTimerTaskId ? (
                  <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {activeTimerTaskId ? "Active Focus Session" : "Ready to Focus"}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {activeTimerTaskId ? "Currently tracking time..." : "Start a Pomodoro timer"}
                </p>
              </div>
            </div>
            <button className="px-4 py-1.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-200 transition-colors">
              {activeTimerTaskId ? "View" : "Start"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-slate-100 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-slate-200 transition-colors" onClick={() => onNavigateToTab("habits")}>
              <Zap className="w-6 h-6 text-green-500 mb-2" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Habits</p>
              <p className="text-sm font-semibold text-slate-800">View Streaks</p>
            </div>
            <div className="p-4 border border-slate-100 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-slate-200 transition-colors" onClick={() => onNavigateToTab("matrix")}>
              <Target className="w-6 h-6 text-blue-500 mb-2" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Eisenhower</p>
              <p className="text-sm font-semibold text-slate-800">Prioritize</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
