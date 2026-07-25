import React, { useMemo } from 'react';
import { Todo, Project } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format, differenceInDays } from 'date-fns';
import { Clock } from 'lucide-react';

interface ProjectTimelineProps {
  todos: Todo[];
  projects: Project[];
}

export default function ProjectTimeline({ todos, projects }: ProjectTimelineProps) {
  // Process tasks to map to timeline
  const timelineData = useMemo(() => {
    const tasksWithDates = todos.filter(t => t.dueDate && t.createdAt);
    
    // Group by project
    const grouped = tasksWithDates.reduce((acc, task) => {
      const projId = task.projectId || 'unassigned';
      if (!acc[projId]) acc[projId] = [];
      acc[projId].push(task);
      return acc;
    }, {} as Record<string, Todo[]>);

    const chartData: any[] = [];
    
    const now = new Date().getTime();
    
    Object.entries(grouped).forEach(([projId, tasks]) => {
      const project = projects.find(p => p.id === projId) || { name: 'Inbox', color: '#94a3b8' };
      
      tasks.forEach(task => {
        const start = new Date(task.createdAt || Date.now()).getTime();
        const end = task.dueDate ? new Date(task.dueDate).getTime() : now;
        
        // Ensure start is before end
        const finalStart = Math.min(start, end);
        const finalEnd = Math.max(start, end);
        
        chartData.push({
          taskId: task.id,
          taskName: task.title,
          projectName: project.name,
          color: project.color,
          // Recharts range bar format: [start, end]
          dateRange: [finalStart, finalEnd],
          start: finalStart,
          end: finalEnd,
          durationDays: differenceInDays(finalEnd, finalStart) || 1,
        });
      });
    });
    
    // Sort chronologically by start date
    return chartData.sort((a, b) => a.start - b.start);
  }, [todos, projects]);

  if (timelineData.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-white border border-slate-200/60 rounded-2xl">
        <Clock className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-500 font-medium">No tasks with dates found to generate timeline.</p>
      </div>
    );
  }

  // Calculate global min and max for X axis domain
  const minDate = Math.min(...timelineData.map(d => d.start));
  const maxDate = Math.max(...timelineData.map(d => d.end));

  const formatXAxis = (tickItem: any) => {
    return format(new Date(tickItem), 'MMM dd');
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs z-50">
          <p className="font-bold mb-1">{data.taskName}</p>
          <p className="text-slate-300 mb-2">{data.projectName}</p>
          <p className="text-slate-400">
            {format(new Date(data.start), 'MMM dd, yyyy')} - {format(new Date(data.end), 'MMM dd, yyyy')}
          </p>
          <p className="text-indigo-300 mt-1">{data.durationDays} days duration</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-4 animate-in fade-in duration-300">
      <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" />
            Project Timeline (Gantt)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Visual map of task durations from creation to deadline across all active projects.
          </p>
        </div>
        
        <div className="w-full overflow-x-auto">
          <div style={{ minWidth: '700px', height: `${Math.max(400, timelineData.length * 45)}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={timelineData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
              >
                <XAxis 
                  type="number" 
                  domain={[minDate, maxDate]} 
                  tickFormatter={formatXAxis}
                  scale="time"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis 
                  type="category" 
                  dataKey="taskName" 
                  width={120}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                
                <Bar dataKey="dateRange" barSize={16} radius={[4, 4, 4, 4]}>
                  {timelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
