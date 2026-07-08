import React, { useMemo, useState } from 'react';
import { Todo } from '../types';
import { Network, CheckCircle2, Circle, ChevronDown, ChevronRight, AlertCircle, ArrowRight, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DependencyTreeProps {
  todos: Todo[];
}

export default function DependencyTree({ todos }: DependencyTreeProps) {
  const blockingMap = useMemo(() => {
    const map = new Map<string, string[]>();
    todos.forEach(t => map.set(t.id, []));
    
    todos.forEach(todo => {
      if (todo.blockedBy && todo.blockedBy.length > 0) {
        todo.blockedBy.forEach(blockerId => {
          if (map.has(blockerId)) {
            map.get(blockerId)!.push(todo.id);
          }
        });
      }
    });
    return map;
  }, [todos]);

  const rootBlockers = useMemo(() => {
    return todos.filter(t => {
      const blocksOthers = (blockingMap.get(t.id) || []).length > 0;
      const isBlocked = (t.blockedBy || []).filter(id => todos.find(td => td.id === id)).length > 0;
      return blocksOthers && !isBlocked;
    });
  }, [todos, blockingMap]);

  if (rootBlockers.length === 0) {
    const hasAnyDependencies = todos.some(t => t.blockedBy && t.blockedBy.length > 0);
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center h-full w-full">
        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100">
          <Network className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1.5">No Dependency Chains</h3>
        <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
          {hasAnyDependencies 
            ? "There are some dependencies, but they might be circular or pointing to missing tasks."
            : "Tasks that block others will appear here in a hierarchical tree. Add blockers to tasks to build a chain."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto w-full text-left">
      <div className="mb-8 pl-4 border-l-4 border-primary">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2 mb-1">
          Dependency Tree
        </h2>
        <p className="text-gray-500 text-sm">
          Visualize task bottlenecks. Complete the root tasks to unblock the rest of the chain.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
        <div className="space-y-6">
          {rootBlockers.map(root => (
            <DependencyNode 
              key={root.id} 
              todo={root} 
              todos={todos} 
              blockingMap={blockingMap} 
              visited={new Set()} 
              level={0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const DependencyNode = ({ todo, todos, blockingMap, visited, level }: { 
  todo: Todo; 
  todos: Todo[]; 
  blockingMap: Map<string, string[]>;
  visited: Set<string>;
  level: number;
}) => {
  const [expanded, setExpanded] = useState(true);
  const blockedIds = blockingMap.get(todo.id) || [];
  
  const blockedTodos = blockedIds
    .map(id => todos.find(t => t.id === id))
    .filter((t): t is Todo => t !== undefined);

  const hasChildren = blockedTodos.length > 0;
  const isCircular = visited.has(todo.id);
  const nextVisited = new Set(visited).add(todo.id);

  return (
    <div className="relative">
      <div className={`flex items-start gap-2 sm:gap-3 py-1.5 relative z-10`}>
        {hasChildren && !isCircular ? (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="mt-[10px] p-0.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded shrink-0 transition-colors z-20 bg-white"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <div className="w-5 shrink-0" />
        )}

        <div className={`flex-1 border rounded-2xl p-3 sm:p-4 transition-all shadow-sm group
          ${todo.completed ? 'bg-gray-50/60 border-gray-100' : 'bg-white border-gray-200 hover:border-gray-300'}`}
        >
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {todo.completed ? (
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
                )}
              </div>
              <div className="pt-0.5">
                <h4 className={`text-sm sm:text-base font-semibold leading-tight ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {todo.title}
                </h4>
                {todo.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-xl pr-4">{todo.description}</p>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
              {isCircular && (
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-md">
                  <AlertCircle className="w-3 h-3" /> Circular
                </span>
              )}
              {hasChildren && (
                <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">
                  <ArrowRight className="w-3.5 h-3.5" /> 
                  <span className="hidden sm:inline">Blocks</span> {blockedTodos.length}
                </span>
              )}
              {(!todo.completed && !hasChildren && (todo.blockedBy?.length || 0) > 0) && (
                <span className="flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 px-2 py-1 rounded-lg">
                   <Lock className="w-3 h-3" /> Waiting
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && hasChildren && !isCircular && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-[9px] sm:ml-[11px] pl-4 sm:pl-6 border-l-[2px] border-gray-200 relative overflow-hidden"
          >
            <div className="pt-2 pb-1 space-y-1">
              {blockedTodos.map((childTodo, index) => (
                <div key={childTodo.id} className="relative">
                  <div className="absolute -left-4 sm:-left-6 top-[28px] w-4 sm:w-6 h-[2px] bg-gray-200" />
                  <DependencyNode 
                    todo={childTodo} 
                    todos={todos} 
                    blockingMap={blockingMap} 
                    visited={nextVisited}
                    level={level + 1}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
