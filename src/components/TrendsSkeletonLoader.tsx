import React from "react";
import { BarChart2, TrendingUp, CheckCircle2, Clock, Calendar, Sparkles } from "lucide-react";

export default function TrendsSkeletonLoader() {
  return (
    <div className="w-full max-w-4xl mx-auto py-4 space-y-6 animate-pulse">
      {/* Top Header Card Skeleton */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-100/70" />
            <div className="h-4 w-36 bg-slate-200 rounded-md" />
            <div className="h-4 w-20 bg-indigo-100 rounded-full" />
          </div>
          <div className="h-3 w-64 bg-slate-100 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-slate-100 rounded-xl" />
          <div className="h-8 w-28 bg-slate-100 rounded-xl" />
        </div>
      </div>

      {/* 4 Summary Metric Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Completed Tasks */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="h-3 w-12 bg-emerald-100/60 rounded-full" />
          </div>
          <div className="space-y-1">
            <div className="h-7 w-16 bg-slate-200 rounded-lg" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
          </div>
        </div>

        {/* Card 2: Pending Tasks */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="h-3 w-12 bg-amber-100/60 rounded-full" />
          </div>
          <div className="space-y-1">
            <div className="h-7 w-16 bg-slate-200 rounded-lg" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
          </div>
        </div>

        {/* Card 3: Total Created */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
              <BarChart2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="h-3 w-12 bg-blue-100/60 rounded-full" />
          </div>
          <div className="space-y-1">
            <div className="h-7 w-16 bg-slate-200 rounded-lg" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
          </div>
        </div>

        {/* Card 4: Completion Rate */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="h-3 w-12 bg-indigo-100/60 rounded-full" />
          </div>
          <div className="space-y-1">
            <div className="h-7 w-16 bg-slate-200 rounded-lg" />
            <div className="h-3 w-20 bg-slate-100 rounded" />
          </div>
        </div>
      </div>

      {/* Main Bar Chart Skeleton Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div className="h-4 w-48 bg-slate-200 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div className="h-3 w-16 bg-slate-100 rounded" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-200" />
              <div className="h-3 w-16 bg-slate-100 rounded" />
            </div>
          </div>
        </div>

        {/* Chart Visualization Area with 7 Bar Columns Skeleton */}
        <div className="h-64 w-full flex items-end justify-between gap-3 px-4 pt-6 pb-2 bg-slate-50/50 rounded-xl border border-slate-100 relative">
          {/* Background grid lines */}
          <div className="absolute inset-x-4 top-1/4 h-px bg-slate-200/60" />
          <div className="absolute inset-x-4 top-2/4 h-px bg-slate-200/60" />
          <div className="absolute inset-x-4 top-3/4 h-px bg-slate-200/60" />

          {/* 7 Days Columns */}
          {[
            { h1: "h-32", h2: "h-16", day: "Mon" },
            { h1: "h-44", h2: "h-10", day: "Tue" },
            { h1: "h-28", h2: "h-20", day: "Wed" },
            { h1: "h-52", h2: "h-12", day: "Thu" },
            { h1: "h-36", h2: "h-24", day: "Fri" },
            { h1: "h-20", h2: "h-08", day: "Sat" },
            { h1: "h-40", h2: "h-16", day: "Sun" },
          ].map((col, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 z-10">
              <div className="w-full max-w-[36px] flex items-end justify-center gap-1 h-48">
                <div className={`w-1/2 ${col.h1} bg-emerald-400/70 rounded-t-md transition-all`} />
                <div className={`w-1/2 ${col.h2} bg-blue-200/80 rounded-t-md transition-all`} />
              </div>
              <div className="h-3 w-8 bg-slate-200 rounded text-center" />
            </div>
          ))}
        </div>
      </div>

      {/* Productivity Insights Card Skeleton */}
      <div className="bg-gradient-to-r from-indigo-50/50 to-blue-50/50 border border-indigo-100/80 rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white border border-indigo-100 rounded-xl text-indigo-500 shadow-xs">
            <Sparkles className="w-5 h-5 text-indigo-500 animate-spin" />
          </div>
          <div className="space-y-1">
            <div className="h-4 w-40 bg-indigo-200/60 rounded-md" />
            <div className="h-3 w-72 bg-slate-200/60 rounded" />
          </div>
        </div>
        <div className="h-8 w-24 bg-indigo-200/50 rounded-xl" />
      </div>
    </div>
  );
}
