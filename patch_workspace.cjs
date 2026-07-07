const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf-8');

// Add import for ChangePasswordModal
code = code.replace(
  "import { determineProjectByTitle } from '../utils/autoCategorize';",
  "import { determineProjectByTitle } from '../utils/autoCategorize';\nimport ChangePasswordModal from './ChangePasswordModal';"
);

// Add Key to lucide-react imports if not there
if (!code.includes("import { Key")) {
  code = code.replace(
    "import { FileText, MessageSquare, CornerDownRight } from 'lucide-react';",
    "import { FileText, MessageSquare, CornerDownRight, Key } from 'lucide-react';"
  );
}

// Add state for ChangePasswordModal
if (!code.includes("const [showPasswordModal, setShowPasswordModal] = useState(false);")) {
  code = code.replace(
    "const [viewMode, setViewMode] = useState<ViewMode>('today');",
    "const [viewMode, setViewMode] = useState<ViewMode>('today');\n  const [showPasswordModal, setShowPasswordModal] = useState(false);"
  );
}

// Add ChangePasswordModal component rendering
if (!code.includes("<ChangePasswordModal")) {
  code = code.replace(
    "</AnimatePresence>\n\n      <main",
    "</AnimatePresence>\n\n      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />\n\n      <main"
  );
}

// Add Change Password button
if (!code.includes("onClick={() => setShowPasswordModal(true)}")) {
  code = code.replace(
    "<button onClick={handleLogout}",
    "<button onClick={() => setShowPasswordModal(true)} className=\"w-full flex items-center space-x-2 p-2 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors font-medium select-none justify-center border border-transparent mb-2 bg-slate-50\">\n                  <Key className=\"w-4 h-4 shrink-0\" />\n                  <span>Change Password</span>\n                </button>\n                <button onClick={handleLogout}"
  );
}

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
