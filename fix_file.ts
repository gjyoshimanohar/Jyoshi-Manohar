import fs from 'fs';

let content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

// For the first picker
const regex1 = /<Ani\s*\{showDatePicker && \(/g;
content = content.replace(regex1, '<AnimatePresence>\n{showDatePicker && (');

const regex2 = /\)\}\/motion\.div>\)\}\n\s*<\/AnimatePresence>/g;
content = content.replace(regex2, ')}\n</AnimatePresence>');

// For the second picker
let parts = content.split('<ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 ml-1 transition-transform duration-200 ${showDetailDatePicker ? \'rotate-180\' : \'\'}`} />');
if (parts.length > 1) {
    let secondPart = parts[1];
    secondPart = secondPart.replace(/^\s*\{showDetailDatePicker && \(/, '\n</button>\n<AnimatePresence>\n{showDetailDatePicker && (');
    secondPart = secondPart.replace(/\)\}\s*\}\}\s*\/>\s*<\/div>\\n<\/motion\.div>\)\}\n\s*<\/AnimatePresence>/, ')}\n</AnimatePresence>');
    content = parts[0] + '<ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 ml-1 transition-transform duration-200 ${showDetailDatePicker ? \'rotate-180\' : \'\'}`} />' + secondPart;
}

fs.writeFileSync('src/components/WorkspaceApp.tsx', content, 'utf8');
