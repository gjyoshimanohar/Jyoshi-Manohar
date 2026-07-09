import React, { useState } from 'react';
import { Todo, Project } from '../types';
import { Flag, Trash2, Plus, Calendar, RefreshCw, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { determineProjectByTitle } from '../utils/autoCategorize';

interface EisenhowerMatrixProps {
 todos: Todo[];
 todoService: any;
 onSelectTodoId: (id: string) => void;
 userId: string;
 projects?: Project[];
 onAutoCategorize?: (matchedProjectName: string) => void;
 onToggleTodo?: (todo: Todo) => void;
}

export default function EisenhowerMatrix({ todos, todoService, onSelectTodoId, userId, projects, onAutoCategorize, onToggleTodo }: EisenhowerMatrixProps) {
 const [newTitles, setNewTitles] = useState<Record<number, string>>({ 1: '', 2: '', 3: '', 4: '' });

 const activeTodos = todos.filter(t => !t.completed && !t.deletedAt);

 const quadrants = [
 {
 priority: 1,
 title: "Urgent & Important (P1)",
 desc: "Do it now. Immediate attention required.",
 borderColor: "border-red-500",
 bgColor: "bg-red-50/20",
 textColor: "text-red-700",
 iconColor: "text-red-500 fill-red-500",
 },
 {
 priority: 2,
 title: "Important but Not Urgent (P2)",
 desc: "Schedule it. Essential for long-term targets.",
 borderColor: "border-orange-500",
 bgColor: "bg-orange-50/20",
 textColor: "text-orange-700",
 iconColor: "text-orange-500 fill-orange-500",
 },
 {
 priority: 3,
 title: "Urgent but Not Important (P3)",
 desc: "Delegate it. Distractions demanding immediate action.",
 borderColor: "border-primary",
 bgColor: "bg-blue-50/20",
 textColor: "text-blue-700",
 iconColor: "text-primary fill-primary",
 },
 {
 priority: 4,
 title: "Not Urgent & Not Important (P4)",
 desc: "Eliminate it. Low-value items wasting cycles.",
 borderColor: "border-gray-300",
 bgColor: "bg-gray-50/40",
 textColor: "text-gray-600",
 iconColor: "text-gray-400",
 }
 ];

 const handleAddTask = async (priority: number) => {
 const title = newTitles[priority]?.trim();
 if (!title) return;

 let targetProjectId = 'inbox';
 if (projects) {
 const { projectId, matchedProjectName } = determineProjectByTitle(title, projects, 'inbox');
 targetProjectId = projectId;
 if (matchedProjectName && onAutoCategorize) {
 onAutoCategorize(matchedProjectName);
 }
 }

 await todoService.createTodo({
 title,
 userId,
 completed: false,
 priority,
 projectId: targetProjectId,
 dueDate: Date.now(),
 });

 setNewTitles(prev => ({ ...prev, [priority]: '' }));
 };

 const handleDragStart = (e: React.DragEvent, id: string) => {
 e.dataTransfer.setData('matrixTaskId', id);
 };

 const handleDrop = async (e: React.DragEvent, priority: number) => {
 e.preventDefault();
 const taskId = e.dataTransfer.getData('matrixTaskId');
 if (taskId) {
 await todoService.updateTodo(taskId, { priority });
 }
 };

 return (
 <div className="w-full flex flex-col h-full">
 <div className="mb-6">
 <h2 className="text-xl text-gray-900">Eisenhower Priority Matrix</h2>
 <p className="font-medium text-base text-gray-500">Drag and drop cards across quadrants to optimize your focus workflow.</p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
 {quadrants.map(q => {
 const items = activeTodos.filter(t => (t.priority || 4) === q.priority);

 return (
 <div
 key={q.priority}
 onDragOver={(e) => e.preventDefault()}
 onDrop={(e) => handleDrop(e, q.priority)}
 className={`flex flex-col border-2 rounded-xl p-4 min-h-[220px] transition-all duration-200 ${q.borderColor} ${q.bgColor}`}
 >
 {/* Box Heading */}
 <div className="flex items-center justify-between mb-1">
 <h3 className={`font-medium text-sm tracking-tight ${q.textColor} flex items-center`}>
 <Flag className={`w-4 h-4 mr-2 ${q.iconColor}`} />
 {q.title}
 </h3>
 <span className="text-xs bg-white border border-gray-100 px-2 py-0.5 rounded-full text-gray-500 font-semibold shadow-sm">
 {items.length} tasks
 </span>
 </div>
 <p className="text-xs text-gray-500 font-medium mb-3 italic">{q.desc}</p>

 {/* Box Cards */}
 <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[260px] pr-1">
 {items.length === 0 ? (
 <div className="h-full min-h-[80px] border border-dashed border-gray-200 hover:border-gray-300 rounded-lg flex items-center justify-center transition-colors">
 <span className="text-xs text-gray-400">Drag/drop or create task here</span>
 </div>
 ) : (
 items.map(item => (
 <div
 key={item.id}
 draggable
 onDragStart={(e) => handleDragStart(e, item.id)}
 onClick={() => onSelectTodoId(item.id)}
 className="bg-white border border-gray-100 rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 duration-200 cursor-grab active:cursor-grabbing flex flex-col justify-between"
 >
 <div className="flex items-start justify-between">
 <span className="text-sm font-bold text-gray-800 tracking-tight truncate flex-1 leading-normal pr-2 flex items-center gap-1">
 {item.repeatInterval && <RefreshCw className="inline-block w-3 h-3 text-primary flex-shrink-0" />}
 {(item.blockedBy?.length || 0) > 0 && <Lock className="inline-block w-3 h-3 text-rose-500 flex-shrink-0" />}
 {item.title}
 </span>
 <span className="text-xs text-gray-400 select-none">⋮⋮</span>
 </div>
 
 <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-50">
 <span className={`text-[11px] font-medium flex items-center ${item.dueDate && item.dueDate < new Date().setHours(0,0,0,0) ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
 <Calendar className="w-2.5 h-2.5 mr-1" />
 {item.dueDate && item.dueDate < new Date().setHours(0,0,0,0) ? `Overdue (${format(new Date(item.dueDate), 'MMM d')})` : item.dueDate ? format(new Date(item.dueDate), 'MMM d') : 'No date'}
 </span>
 <div className="flex items-center space-x-1.5">
 <button
 onClick={(e) => {
 e.stopPropagation();
 if (onToggleTodo) {
 onToggleTodo(item);
 } else {
 todoService.updateTodoStatus(item.id, true);
 }
 }}
 className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium transition-all"
 >
 Done ✓
 </button>
 </div>
 </div>
 </div>
 ))
 )}
 </div>

 {/* Quick Adder Form */}
 <div className="mt-4 pt-3 border-t border-gray-100/50 flex space-x-1.5">
 <input
 type="text"
 placeholder="Quick add task..."
 value={newTitles[q.priority]}
 onChange={(e) => setNewTitles(p => ({ ...p, [q.priority]: e.target.value }))}
 onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(q.priority); }}
 className="flex-grow text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white transition-all text-black"
 />
 <button
 onClick={() => handleAddTask(q.priority)}
 disabled={!newTitles[q.priority]?.trim()}
 className="bg-primary/10 hover:bg-primary hover:text-white text-primary p-1.5 rounded-lg border border-transparent disabled:opacity-40 transition-all shrink-0"
 >
 <Plus className="w-4 h-4" />
 </button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
}
