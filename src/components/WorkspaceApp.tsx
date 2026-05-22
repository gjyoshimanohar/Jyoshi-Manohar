import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Trash2, Plus, GripVertical, Calendar as CalendarIcon, Inbox, Hash, MoreHorizontal, ChevronDown, ChevronRight, Menu, LogOut, X, Flag, CalendarDays, FlagTriangleRight, Search } from 'lucide-react';
import { todoService } from '../services/todoService';
import { Todo, Project } from '../types';
import { auth } from '../lib/firebase';
import { format, isToday, isTomorrow, isPast, isSameDay, startOfDay } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { signOut } from 'firebase/auth';

type ViewMode = 'inbox' | 'today' | 'upcoming' | 'project';

export default function WorkspaceApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // App State
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add Task State
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskProject, setNewTaskProject] = useState<string>('inbox');
  const [newTaskPriority, setNewTaskPriority] = useState<number>(4);
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    let unsubTodos = () => {};
    let unsubProjects = () => {};

    try {
      unsubTodos = todoService.subscribeToUserTodos(auth.currentUser.uid, (fetchedTodos) => {
        setTodos(fetchedTodos);
        setLoading(false);
      });
      unsubProjects = todoService.subscribeToProjects(auth.currentUser.uid, (fetchedProjects) => {
        setProjects(fetchedProjects);
      });
    } catch(e) {
      console.error(e);
      setLoading(false);
    }
    
    return () => {
      unsubTodos();
      unsubProjects();
    };
  }, []);

  const handleLogout = () => signOut(auth);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !auth.currentUser) return;
    
    await todoService.createTodo({
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      userId: auth.currentUser.uid,
      completed: false,
      projectId: newTaskProject,
      priority: newTaskPriority,
      dueDate: newTaskDueDate ? newTaskDueDate.getTime() : null,
    });
    
    setNewTaskTitle('');
    setNewTaskDesc('');
    setIsAddingTask(false);
  };

  const handleToggleTodo = async (todo: Todo) => {
    await todoService.updateTodoStatus(todo.id, !todo.completed);
  };

  const handleDeleteTodo = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await todoService.deleteTodo(id);
  };

  // Filter Tasks
  const getFilteredTodos = () => {
    let active = todos.filter(t => !t.completed);

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      active = active.filter(t => 
        t.title.toLowerCase().includes(lowerQuery) || 
        (t.description && t.description.toLowerCase().includes(lowerQuery))
      );
    }

    switch (viewMode) {
      case 'inbox':
        return active.filter(t => !t.projectId || t.projectId === 'inbox');
      case 'today':
        return active.filter(t => {
          if (!t.dueDate) return false;
          const due = new Date(t.dueDate);
          return isToday(due) || isPast(due);
        });
      case 'upcoming':
        return active.filter(t => t.dueDate && !isPast(new Date(t.dueDate)));
      case 'project':
        return active.filter(t => t.projectId === selectedProjectId);
      default:
        return active;
    }
  };

  const filteredTodos = getFilteredTodos();
  
  // Sorting: High priority first, then due date
  filteredTodos.sort((a, b) => {
    if ((a.priority || 4) !== (b.priority || 4)) return (a.priority || 4) - (b.priority || 4);
    if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
    return 0;
  });

  const getViewTitle = () => {
    switch (viewMode) {
      case 'inbox': return 'Inbox';
      case 'today': return 'Today';
      case 'upcoming': return 'Upcoming';
      case 'project': return projects.find(p => p.id === selectedProjectId)?.name || 'Project';
    }
  };

  const getPriorityColor = (priority?: number) => {
    switch(priority) {
      case 1: return 'text-red-500 fill-red-500';
      case 2: return 'text-orange-500 fill-orange-500';
      case 3: return 'text-blue-500 fill-blue-500';
      default: return 'text-slate-400';
    }
  };
  
  const getPriorityBg = (priority?: number) => {
    switch(priority) {
      case 1: return 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200';
      case 2: return 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200';
      case 3: return 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200';
      default: return 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200';
    }
  };

  const formatTaskDate = (timestamp?: number | null) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    if (isToday(date)) return <span className="text-green-600 font-semibold text-xs flex items-center"><CalendarIcon className="w-3 h-3 mr-1" /> Today</span>;
    if (isTomorrow(date)) return <span className="text-orange-500 font-semibold text-xs flex items-center"><CalendarIcon className="w-3 h-3 mr-1" /> Tomorrow</span>;
    if (isPast(date)) return <span className="text-red-500 font-semibold text-xs flex items-center"><CalendarIcon className="w-3 h-3 mr-1" /> {format(date, 'MMM d')}</span>;
    return <span className="text-slate-500 text-xs flex items-center"><CalendarIcon className="w-3 h-3 mr-1" /> {format(date, 'MMM d')}</span>;
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/20 z-40" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-[#FAFAFA] border-r border-border shrink-0 h-full overflow-y-auto hidden md:block" // Hidden mobile by motion, fixed below
      >
        <div className="p-4 w-[280px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                {auth.currentUser?.email?.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-sm truncate max-w-[150px]">{auth.currentUser?.email}</span>
            </div>
          </div>

          <nav className="space-y-1 mb-8">
            <button
              onClick={() => { setViewMode('inbox'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); }}
              className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'inbox' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
            >
              <div className="flex items-center space-x-3">
                <Inbox className="w-5 h-5 text-[#246FE0]" />
                <span>Inbox</span>
              </div>
              <span className="text-xs text-gray-500">{todos.filter(t => !t.completed && (!t.projectId || t.projectId === 'inbox')).length || ''}</span>
            </button>
            <button
              onClick={() => { setViewMode('today'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); }}
              className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'today' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
            >
              <div className="flex items-center space-x-3">
                <CalendarIcon className="w-5 h-5 text-green-600" />
                <span>Today</span>
              </div>
              <span className="text-xs text-gray-500">
                {todos.filter(t => !t.completed && t.dueDate && (isToday(new Date(t.dueDate)) || isPast(new Date(t.dueDate)))).length || ''}
              </span>
            </button>
            <button
              onClick={() => { setViewMode('upcoming'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); }}
              className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'upcoming' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
            >
              <div className="flex items-center space-x-3">
                <CalendarDays className="w-5 h-5 text-purple-600" />
                <span>Upcoming</span>
              </div>
            </button>
          </nav>

          <div className="mb-4">
            <div className="flex items-center justify-between px-2 text-gray-500 text-xs font-semibold mb-2 group">
              <span>My Projects</span>
              <button 
                className="opacity-0 group-hover:opacity-100 hover:bg-gray-200 p-1 rounded transition-all"
                onClick={() => { 
                  const name = window.prompt("Project name:"); 
                  if (name) todoService.createProject(name, '#6b7280', auth.currentUser!.uid); 
                }}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1">
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => { setViewMode('project'); setSelectedProjectId(project.id); setIsAddingTask(false); }}
                  className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'project' && selectedProjectId === project.id ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <Hash className="w-5 h-5" style={{ color: project.color }} />
                    <span className="truncate">{project.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{todos.filter(t => !t.completed && t.projectId === project.id).length || ''}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.aside>
      
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="md:hidden fixed inset-y-0 left-0 bg-[#FAFAFA] border-r border-border w-[280px] z-50 h-full overflow-y-auto shadow-2xl"
          >
            {/* Exactly the same sidebar content for mobile */}
            <div className="p-4 pt-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                    {auth.currentUser?.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-sm truncate max-w-[150px]">{auth.currentUser?.email}</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1 mb-8">
                <button
                  onClick={() => { setViewMode('inbox'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'inbox' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
                >
                  <div className="flex items-center space-x-3">
                    <Inbox className="w-5 h-5 text-[#246FE0]" />
                    <span>Inbox</span>
                  </div>
                  <span className="text-xs text-gray-500">{todos.filter(t => !t.completed && (!t.projectId || t.projectId === 'inbox')).length || ''}</span>
                </button>
                <button
                  onClick={() => { setViewMode('today'); selectedProjectId && setSelectedProjectId(null); setIsAddingTask(false); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'today' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
                >
                  <div className="flex items-center space-x-3">
                    <CalendarIcon className="w-5 h-5 text-green-600" />
                    <span>Today</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {todos.filter(t => !t.completed && t.dueDate && (isToday(new Date(t.dueDate)) || isPast(new Date(t.dueDate)))).length || ''}
                  </span>
                </button>
              </nav>

              <div className="mb-4">
                <div className="flex items-center justify-between px-2 text-gray-500 text-xs font-semibold mb-2">
                  <span>My Projects</span>
                </div>
                <div className="space-y-1">
                  {projects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => { setViewMode('project'); setSelectedProjectId(project.id); setIsAddingTask(false); setIsSidebarOpen(false); }}
                      className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${viewMode === 'project' && selectedProjectId === project.id ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <Hash className="w-5 h-5" style={{ color: project.color }} />
                        <span className="truncate">{project.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{todos.filter(t => !t.completed && t.projectId === project.id).length || ''}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mt-8 border-t border-border pt-4">
                <button onClick={handleLogout} className="w-full flex items-center space-x-3 p-2 rounded-md text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="w-5 h-5" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-white flex flex-col items-center">
        <div className="w-full max-w-[800px] px-6 py-8 md:py-12 mt-4 md:mt-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="mr-4 p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-[#202020] flex items-center">
                {getViewTitle()}
                {viewMode === 'today' && <span className="text-xs text-gray-400 font-normal ml-2">{format(new Date(), 'EEE MMM d')}</span>}
              </h1>
            </div>
            
            {/* Search Input */}
            <div className="relative flex-1 md:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-gray-50 focus:bg-white transition-colors"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-0.5">
            <AnimatePresence>
              {filteredTodos.map(todo => (
                <motion.div
                  key={todo.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  className="group flex items-start p-3 py-4 hover:bg-white border-b border-[#f0f0f0] transition-colors"
                >
                  <button 
                    onClick={() => handleToggleTodo(todo)}
                    className="mr-3 mt-0.5 w-5 h-5 flex shrink-0 items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100 peer"
                  >
                    <Check className="w-3 h-3 text-gray-400 opacity-0 transition-opacity" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm text-[#202020] mb-1 ${todo.completed ? 'line-through text-gray-400' : ''}`}>{todo.title}</p>
                    {todo.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-1.5">{todo.description}</p>
                    )}
                    <div className="flex items-center space-x-3">
                      {formatTaskDate(todo.dueDate)}
                      {todo.projectId && todo.projectId !== 'inbox' && (
                        <span className="text-[10px] text-gray-500 flex items-center">
                          <Hash className="w-3 h-3 mr-0.5" /> 
                          {projects.find(p => p.id === todo.projectId)?.name || 'Project'}
                        </span>
                      )}
                      <Flag className={`w-3 h-3 ${getPriorityColor(todo.priority)}`} />
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0">
                    <button 
                      onClick={(e) => handleDeleteTodo(todo.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredTodos.length === 0 && !isAddingTask && (
              <div className="text-center py-20 flex flex-col items-center">
                <div className="w-40 h-40 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <Check className="w-16 h-16 text-gray-200" />
                </div>
                <h3 className="text-lg text-gray-700 font-medium mb-2">You're all done</h3>
                <p className="text-sm text-gray-500">Enjoy the rest of your day and relax.</p>
              </div>
            )}
          </div>

          {!isAddingTask ? (
            <button 
              onClick={() => setIsAddingTask(true)}
              className="group flex items-center text-[#202020] hover:text-primary mt-4 w-full py-2 hover:bg-gray-50 rounded-md transition-colors"
            >
              <div className="w-5 h-5 flex items-center justify-center rounded-full text-primary mr-3 group-hover:bg-primary group-hover:text-white transition-colors">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-sm">Add task</span>
            </button>
          ) : (
            <div className="mt-4 border border-border bg-white rounded-xl shadow-lg p-3">
              <input
                autoFocus
                type="text"
                placeholder="Task name"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); }}
                className="w-full font-medium text-[#202020] text-sm outline-none placeholder:text-gray-400 mb-1"
              />
              <textarea
                placeholder="Description"
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                className="w-full text-xs text-gray-600 outline-none placeholder:text-gray-400 resize-none h-10 mb-3"
              />
              
              <div className="flex flex-wrap gap-2 mb-4 relative">
                {/* Due Date Picker Button */}
                <button 
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center px-2 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition"
                >
                  <CalendarDays className="w-4 h-4 mr-1 text-green-600" />
                  {newTaskDueDate ? (isToday(newTaskDueDate) ? 'Today' : format(newTaskDueDate, 'MMM d')) : 'Due date'}
                </button>

                {/* Priority Picker Button */}
                <button 
                  onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                  className="flex items-center px-2 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition"
                >
                  <Flag className={`w-4 h-4 mr-1 ${getPriorityColor(newTaskPriority)}`} />
                  Priority {newTaskPriority}
                </button>
                
                {/* Dropdowns (Absolute Positioned loosely) */}
                {showDatePicker && (
                  <div className="absolute top-8 left-0 z-10 bg-white border border-gray-200 shadow-2xl rounded-lg p-2">
                    <DayPicker 
                      mode="single" 
                      selected={newTaskDueDate} 
                      onSelect={(d) => { setNewTaskDueDate(d); setShowDatePicker(false); }} 
                    />
                  </div>
                )}
                {showPriorityPicker && (
                  <div className="absolute top-8 left-[90px] z-10 bg-white border border-gray-200 shadow-2xl rounded-lg p-1 w-48">
                    {[1, 2, 3, 4].map(p => (
                      <button 
                        key={p} 
                        onClick={() => { setNewTaskPriority(p); setShowPriorityPicker(false); }}
                        className="w-full flex items-center px-3 py-2 text-sm hover:bg-gray-50 rounded"
                      >
                        <Flag className={`w-4 h-4 mr-3 ${getPriorityColor(p)}`} />
                        Priority {p}
                        {newTaskPriority === p && <Check className="w-4 h-4 ml-auto text-gray-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <select 
                  value={newTaskProject}
                  onChange={(e) => setNewTaskProject(e.target.value)}
                  className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-2 py-1 outline-none appearance-none"
                >
                  <option value="inbox">Inbox</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setIsAddingTask(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-md transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddTask}
                    disabled={!newTaskTitle.trim()}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-primary disabled:opacity-50 hover:bg-secondary rounded-md shadow-sm transition"
                  >
                    Add task
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
