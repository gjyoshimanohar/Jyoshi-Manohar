const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const targetStr = '<div className="flex items-center space-x-1">';

const newStr = `{(todo.timeSpentSeconds || 0) > 0 || activeTimerTaskId === todo.id ? (
            <div className={\`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold select-none transition-colors \${activeTimerTaskId === todo.id ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-50 text-slate-500 border border-slate-100'}\`}>
              {activeTimerTaskId === todo.id ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span>{formatTimer((todo.timeSpentSeconds || 0) + activeTimerElapsed)}</span>
                  <button onClick={(e) => handleStopTimer(e)} className="ml-1 hover:text-indigo-900 transition-colors" title="Stop Timer"><Square className="w-3 h-3 fill-current" /></button>
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 opacity-60" />
                  <span>{formatTimer(todo.timeSpentSeconds || 0)}</span>
                  <button onClick={(e) => handleStartTimer(todo.id, e)} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-indigo-600" title="Start Timer"><Play className="w-3 h-3 fill-current" /></button>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={(e) => handleStartTimer(todo.id, e)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
              title="Start Timer"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex items-center space-x-1">`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
