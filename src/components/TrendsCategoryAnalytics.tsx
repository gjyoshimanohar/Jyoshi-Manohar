import React, { useState } from "react";
import { Todo, Folder, Project, TaskCategory } from "../types";
import {
  getAllCategoriesForScope,
  getCategoryDetails,
  getCategoryBadgeStyle,
} from "../utils/categoryUtils";
import {
  Layers,
  CheckCircle2,
  Clock,
  Tag,
  Filter,
  BarChart2,
  PieChart as PieChartIcon,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";

const CustomGlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="backdrop-blur-md bg-slate-900/90 text-white rounded-xl p-3 shadow-2xl border border-slate-700/60 min-w-[150px] transition-all z-50">
      {label && (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 border-b border-slate-800 pb-1">
          {label}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry: any, index: number) => {
          return (
            <div key={`item-${index}`} className="flex items-center justify-between text-xs gap-3">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_6px_currentColor]"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                {entry.name}:
              </span>
              <span className="font-bold text-white tracking-tight">{entry.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface TrendsCategoryAnalyticsProps {
  tasksInPeriod: Todo[];
  allTodos: Todo[];
  folders: Folder[];
  projects: Project[];
  selectedCategoryId: string | null;
  onSelectCategoryFilter: (catId: string | null) => void;
  onManageCategoriesClick: () => void;
}

export const TrendsCategoryAnalytics: React.FC<TrendsCategoryAnalyticsProps> = ({
  tasksInPeriod,
  allTodos,
  folders,
  projects,
  selectedCategoryId,
  onSelectCategoryFilter,
  onManageCategoriesClick,
}) => {
  const [chartView, setChartView] = useState<"bar" | "pie">("bar");

  // Get all categories across folders/projects
  const availableCategories = getAllCategoriesForScope({ folders, projects });

  // Compute category breakdown metrics for tasksInPeriod
  const categoryStatsMap = new Map<
    string,
    {
      category: TaskCategory;
      total: number;
      completed: number;
      pending: number;
      timeSpentSeconds: number;
    }
  >();

  tasksInPeriod.forEach((t) => {
    const catNameOrId = t.category || "Uncategorized";
    const details = getCategoryDetails(catNameOrId, availableCategories) || {
      id: "uncategorized",
      name: "Uncategorized",
      color: "#94a3b8",
      icon: "📌",
      description: "Tasks without a assigned sub-type category",
    };

    const key = details.name.toLowerCase();
    const existing = categoryStatsMap.get(key) || {
      category: details,
      total: 0,
      completed: 0,
      pending: 0,
      timeSpentSeconds: 0,
    };

    existing.total += 1;
    if (t.completed) existing.completed += 1;
    else existing.pending += 1;
    existing.timeSpentSeconds += t.timeSpentSeconds || 0;

    categoryStatsMap.set(key, existing);
  });

  const categoryStatsList = Array.from(categoryStatsMap.values()).sort(
    (a, b) => b.total - a.total
  );

  // Chart data
  const chartData = categoryStatsList.map((item) => ({
    name: item.category.name,
    iconName: `${item.category.icon || "🏷️"} ${item.category.name}`,
    total: item.total,
    completed: item.completed,
    pending: item.pending,
    completionRate: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0,
    color: item.category.color || "#6366f1",
  }));

  const totalPeriodTasks = tasksInPeriod.length;
  const topCategory = categoryStatsList[0];

  const formatHours = (seconds: number) => {
    if (seconds <= 0) return "0m";
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Task Sub-Type Category Granular Analysis
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {categoryStatsList.length} Sub-Types Active
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Breakdown of task distribution, resolution velocity, and time allocation by sub-types.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onManageCategoriesClick}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Tag className="w-3.5 h-3.5 text-indigo-600" />
            <span>Manage Folder Sub-Types</span>
          </button>
        </div>
      </div>

      {/* Sub-Type Category Filter Pills Toolbar */}
      <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-600" /> Filter Analytics by Category:
          </span>
          <button
            onClick={() => onSelectCategoryFilter(null)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
              !selectedCategoryId
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Sub-Types ({totalPeriodTasks})
          </button>
          {availableCategories.map((cat) => {
            const count = tasksInPeriod.filter(
              (t) =>
                t.category?.toLowerCase() === cat.id.toLowerCase() ||
                t.category?.toLowerCase() === cat.name.toLowerCase()
            ).length;
            const isSelected = selectedCategoryId === cat.id || selectedCategoryId === cat.name;

            return (
              <button
                key={cat.id}
                onClick={() =>
                  onSelectCategoryFilter(isSelected ? null : cat.id)
                }
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{cat.icon || "🏷️"}</span>
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Highlights & Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Top Workload Category */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Primary Workload Sub-Type
          </span>
          {topCategory ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{topCategory.category.icon || "🚀"}</span>
                <span className="text-sm font-black text-slate-900">{topCategory.category.name}</span>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                {topCategory.total} tasks ({totalPeriodTasks > 0 ? Math.round((topCategory.total / totalPeriodTasks) * 100) : 0}%)
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">No category activity</span>
          )}
        </div>

        {/* Highest Resolution Velocity Category */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Highest Completion Rate Sub-Type
          </span>
          {(() => {
            const bestVelocityCat = categoryStatsList
              .slice()
              .sort((a, b) => (b.completed / (b.total || 1)) - (a.completed / (a.total || 1)))[0];

            if (!bestVelocityCat || bestVelocityCat.total === 0) {
              return <span className="text-xs text-slate-400">No completion data</span>;
            }

            const rate = Math.round((bestVelocityCat.completed / bestVelocityCat.total) * 100);

            return (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{bestVelocityCat.category.icon || "🧪"}</span>
                  <span className="text-sm font-black text-slate-900">{bestVelocityCat.category.name}</span>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {rate}% Completed ({bestVelocityCat.completed}/{bestVelocityCat.total})
                </span>
              </div>
            );
          })()}
        </div>

        {/* Total Time Logged across Sub-Types */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Sub-Type Time Logged
          </span>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-black">
                {formatHours(
                  categoryStatsList.reduce((acc, curr) => acc + curr.timeSpentSeconds, 0)
                )}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-full">
              Across Period
            </span>
          </div>
        </div>
      </div>

      {/* Visual Distribution Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-indigo-600" /> Sub-Type Distribution Chart
          </h4>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setChartView("bar")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                chartView === "bar" ? "bg-white text-indigo-950 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              <span>Bar Chart</span>
            </button>
            <button
              onClick={() => setChartView("pie")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                chartView === "pie" ? "bg-white text-indigo-950 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <PieChartIcon className="w-3 h-3" />
              <span>Pie Distribution</span>
            </button>
          </div>
        </div>

        <div className="h-64 w-full bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold">
              No task category data available in this period.
            </div>
          ) : chartView === "bar" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barCompl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="barPend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} />
                <Tooltip content={<CustomGlassTooltip />} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="completed" name="Completed Tasks" fill="url(#barCompl)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                <Bar dataKey="pending" name="Pending Tasks" fill="url(#barPend)" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="total"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomGlassTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Granular Sub-Type Performance Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-indigo-600" /> Sub-Type Granular Performance Breakdown
        </h4>

        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Sub-Type Category</th>
                <th className="py-3 px-4">Total Tasks</th>
                <th className="py-3 px-4">Completed</th>
                <th className="py-3 px-4">Pending</th>
                <th className="py-3 px-4">Completion Velocity %</th>
                <th className="py-3 px-4 text-right">Time Logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {categoryStatsList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 font-medium">
                    No tasks categorized in this date window.
                  </td>
                </tr>
              ) : (
                categoryStatsList.map((item) => {
                  const style = getCategoryBadgeStyle(item.category.color);
                  const rate = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
                  const pctWorkload = totalPeriodTasks > 0 ? Math.round((item.total / totalPeriodTasks) * 100) : 0;

                  return (
                    <tr
                      key={item.category.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${style.bg} ${style.text} ${style.border}`}
                          >
                            <span>{item.category.icon || "🏷️"}</span>
                            <span>{item.category.name}</span>
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            ({pctWorkload}% of total)
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-800">{item.total}</td>
                      <td className="py-3 px-4 font-bold text-emerald-600">{item.completed}</td>
                      <td className="py-3 px-4 font-bold text-amber-600">{item.pending}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <span className="font-bold text-slate-800 w-8">{rate}%</span>
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">
                        {formatHours(item.timeSpentSeconds)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
