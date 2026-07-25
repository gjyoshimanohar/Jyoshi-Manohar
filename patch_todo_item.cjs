const fs = require('fs');
const content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf-8');

const targetFunctionStart = `  // Render individual todo item row
  const renderTodoItem = (todo: Todo, index?: number) => {`;

const startIdx = content.indexOf(targetFunctionStart);
if (startIdx === -1) throw new Error("Could not find start");

const endStr = `      </motion.div>
    );
  };`;
const endIdx = content.indexOf(endStr, startIdx);
if (endIdx === -1) throw new Error("Could not find end");

let functionBody = content.substring(startIdx, endIdx + endStr.length);

// Let's replace the outer element.
// 1. Find `    return (\n      <motion.div`
const returnStartStr = `    return (
      <motion.div`;
const returnStartIdx = functionBody.indexOf(returnStartStr);

const originalReturnBlock = functionBody.substring(returnStartIdx);

let newReturnBlock = originalReturnBlock.replace(
  `    return (
      <motion.div
        layout="position"
        key={todo.id}
        draggable={currentViewType === "list" && viewMode !== "trash"}
        onDragStart={(e: any) => {`,
  `    const isTouchDevice = typeof window !== 'undefined' && window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    return (
      <motion.div
        layout="position"
        key={todo.id}
        initial={{ opacity: 0, scale: 0.99, y: 10 }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, delay: (index ?? 0) * 0.05, ease: "easeOut" }}
        className="relative w-full mb-0.5 rounded-lg"
      >
        {isTouchDevice && (
          <div className="absolute inset-0 flex justify-between items-center px-4 bg-slate-100/80 rounded-xl overflow-hidden shadow-inner">
            <div className="flex items-center text-blue-500 font-bold text-xs uppercase tracking-wider"><CalendarIcon className="w-4 h-4 mr-2" /> Reschedule</div>
            <div className="flex items-center text-red-500 font-bold text-xs uppercase tracking-wider">Delete <Trash2 className="w-4 h-4 ml-2" /></div>
          </div>
        )}
        <motion.div
          drag={isTouchDevice ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={isTouchDevice ? 0.8 : 0}
          draggable={!isTouchDevice && currentViewType === "list" && viewMode !== "trash"}
          onDragStart={(e: any) => {
            if (isTouchDevice) return;`
);

// We must also replace the onDragEnd block.
newReturnBlock = newReturnBlock.replace(
  `        onDragEnd={() => {
          setDraggedTaskId(null);
          setDragOverTaskId(null);
        }}`,
  `        onDragEnd={(e: any, info: any) => {
          if (isTouchDevice && info) {
            if (info.offset.x > 80) {
              setEditingTodoDateId(todo.id);
            } else if (info.offset.x < -80) {
              setDeletingTodoState({ id: todo.id, title: todo.title });
            }
          } else {
            setDraggedTaskId(null);
            setDragOverTaskId(null);
          }
        }}`
);

// We should remove the duplicate initial/exit/animate from the inner motion.div since they are on the outer motion.div now.
newReturnBlock = newReturnBlock.replace(
  `        initial={{ opacity: 0, scale: 0.99, y: 10 }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, delay: (index ?? 0) * 0.05, ease: "easeOut" }}`,
  `        /* animations moved to parent */
        style={isTouchDevice ? { touchAction: "pan-y" } : {}}`
);

// Finally, we need to add an extra </motion.div> at the end of the return block
newReturnBlock = newReturnBlock.replace(
  `      </motion.div>
    );`,
  `        </motion.div>
      </motion.div>
    );`
);

// Add isTouchDevice check to other drag handlers
newReturnBlock = newReturnBlock.replace(
  `        onDragOver={(e: any) => {`,
  `        onDragOver={(e: any) => {
          if (isTouchDevice) return;`
);
newReturnBlock = newReturnBlock.replace(
  `        onDragLeave={() => {`,
  `        onDragLeave={() => {
          if (isTouchDevice) return;`
);
newReturnBlock = newReturnBlock.replace(
  `        onDrop={(e: any) => {`,
  `        onDrop={(e: any) => {
          if (isTouchDevice) return;`
);


const newFunctionBody = functionBody.substring(0, returnStartIdx) + newReturnBlock;
const newContent = content.substring(0, startIdx) + newFunctionBody + content.substring(endIdx + endStr.length);
fs.writeFileSync('src/components/WorkspaceApp.tsx', newContent);
