import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Terminal, 
  LayoutDashboard, 
  CheckSquare, 
  FileText, 
  FolderLock, 
  Settings, 
  HelpCircle, 
  Wrench, 
  BookOpen, 
  ShieldAlert, 
  X,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  shortcut?: string;
  icon: React.ComponentType<any>;
  action: () => void;
  category: "Navigation" | "Invoices" | "Actions" | "Support";
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      // Let the modal render, then focus
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const commands: CommandItem[] = [
    {
      id: "portal-dashboard",
      title: "Client Portal & Compliance Checklist",
      subtitle: "View statutory calendars, filing statuses, and client items",
      shortcut: "G + D",
      icon: LayoutDashboard,
      category: "Navigation",
      action: () => {
        navigate("/dashboard");
        setIsOpen(false);
      }
    },
    {
      id: "portal-invoices",
      title: "Tax Invoices & Accounts",
      subtitle: "Manage billing, create GST corporate invoice sheets, or export PDFs",
      shortcut: "G + I",
      icon: FileText,
      category: "Invoices",
      action: () => {
        // Navigate to dashboard and append hash or set state for active tab if possible
        navigate("/dashboard?tab=invoices");
        setIsOpen(false);
        // Force trigger custom event to switch tabs inside ClientDashboard
        window.dispatchEvent(new CustomEvent("switch-dashboard-tab", { detail: "invoices" }));
      }
    },
    {
      id: "workspace-tasks",
      title: "Productivity Task Workspace",
      subtitle: "TickTick replica, Eisenhower quadrants, and habit streaks",
      shortcut: "G + T",
      icon: CheckSquare,
      category: "Navigation",
      action: () => {
        navigate("/tasks");
        setIsOpen(false);
      }
    },
    {
      id: "toolkit-calculator",
      title: "Interactive CA Toolkit",
      subtitle: "Run GST calculators, late filing fee simulators, or HRA formulas",
      shortcut: "G + K",
      icon: Wrench,
      category: "Support",
      action: () => {
        navigate("/toolkit");
        setIsOpen(false);
      }
    },
    {
      id: "blog-posts",
      title: "Knowledge Base & Blog",
      subtitle: "Read statutory compliance updates and taxation advisory columns",
      shortcut: "G + B",
      icon: BookOpen,
      category: "Navigation",
      action: () => {
        navigate("/blog");
        setIsOpen(false);
      }
    },
    {
      id: "admin-panel",
      title: "Administrative Control Desk",
      subtitle: "Configure global parameters and verify security logs",
      shortcut: "G + A",
      icon: FolderLock,
      category: "Navigation",
      action: () => {
        navigate("/admin");
        setIsOpen(false);
      }
    },
    {
      id: "trigger-alert-checks",
      title: "Trigger Background Alert Check",
      subtitle: "Force instant sweep of upcoming/pending returns for SMS/Email warnings",
      shortcut: "⌘ + U",
      icon: ShieldAlert,
      category: "Actions",
      action: () => {
        setIsOpen(false);
        window.dispatchEvent(new CustomEvent("trigger-compliance-alerts-sweep"));
      }
    },
    {
      id: "interactive-guide",
      title: "Launch Interactive Walkthrough Tour",
      subtitle: "Take step-by-step tour showing how the CRM components sync",
      shortcut: "⌘ + T",
      icon: Sparkles,
      category: "Support",
      action: () => {
        setIsOpen(false);
        // Launch walkthrough event
        window.dispatchEvent(new CustomEvent("launch-interactive-tour"));
      }
    },
    {
      id: "user-profile",
      title: "Manage My Account Profile",
      subtitle: "Configure security clearances, personal emails, or credentials",
      shortcut: "G + P",
      icon: Settings,
      category: "Navigation",
      action: () => {
        navigate("/profile");
        setIsOpen(false);
      }
    }
  ];

  // Global keyboard shortcuts (G + letter)
  useEffect(() => {
    let lastKey = "";
    const handleShortcut = (e: KeyboardEvent) => {
      // Skip if typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const key = e.key.toLowerCase();
      if (lastKey === "g") {
        if (key === "d") {
          e.preventDefault();
          navigate("/dashboard");
        } else if (key === "i") {
          e.preventDefault();
          navigate("/dashboard?tab=invoices");
          window.dispatchEvent(new CustomEvent("switch-dashboard-tab", { detail: "invoices" }));
        } else if (key === "t") {
          e.preventDefault();
          navigate("/tasks");
        } else if (key === "k") {
          e.preventDefault();
          navigate("/toolkit");
        } else if (key === "b") {
          e.preventDefault();
          navigate("/blog");
        } else if (key === "a") {
          e.preventDefault();
          navigate("/admin");
        } else if (key === "p") {
          e.preventDefault();
          navigate("/profile");
        }
        lastKey = "";
      } else {
        if (key === "g") {
          lastKey = "g";
          // Clear after 1 sec
          setTimeout(() => {
            if (lastKey === "g") lastKey = "";
          }, 1000);
        }
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [navigate]);

  // Filter commands
  const filteredCommands = commands.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
  );

  // Keyboard navigation within results
  const handleResultKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  // Scroll active element into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  return (
    <>
      {/* Floating command helper banner at top right of layout */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[90] bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-lg text-slate-500 hover:text-slate-900 h-11 px-3.5 rounded-full flex items-center gap-2 transition-all cursor-pointer font-medium text-xs shadow-md group select-none"
        title="Open Command Palette (Ctrl+K)"
        id="cmd-palette-trigger-floating"
      >
        <Terminal className="w-4 h-4 text-primary animate-pulse" />
        <span className="hidden sm:inline">Commands</span>
        <kbd className="bg-slate-100 text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded border border-slate-200/40 group-hover:bg-slate-200/60 transition-colors">
          Ctrl K
        </kbd>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[10vh] px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden text-left max-h-[70vh]"
            >
              {/* Search Bar */}
              <div className="flex items-center gap-3 px-4 border-b border-slate-100 h-14 shrink-0">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search pages, tools, client files, or execute shortcuts..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleResultKeyDown}
                  className="w-full text-slate-800 placeholder-slate-400 text-sm border-none outline-none focus:ring-0 py-1 bg-transparent"
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Suggestions list */}
              <div ref={listRef} className="overflow-y-auto p-2 space-y-1 divide-y divide-slate-50 flex-grow">
                {filteredCommands.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No commands matched "{search}". Try searching for <span className="font-semibold text-slate-600">Invoices</span>, <span className="font-semibold text-slate-600">Tasks</span>, or <span className="font-semibold text-slate-600">Alerts</span>.
                  </div>
                ) : (
                  Object.entries(
                    filteredCommands.reduce((groups, item) => {
                      if (!groups[item.category]) groups[item.category] = [];
                      groups[item.category].push(item);
                      return groups;
                    }, {} as Record<string, CommandItem[]>)
                  ).map(([category, items]) => (
                    <div key={category} className="pt-2 first:pt-0">
                      <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                        {category}
                      </span>
                      {items.map((cmd) => {
                        const globalIndex = filteredCommands.findIndex((c) => c.id === cmd.id);
                        const isSelected = globalIndex === selectedIndex;
                        const IconComponent = cmd.icon;
                        return (
                          <div
                            key={cmd.id}
                            data-active={isSelected}
                            onClick={() => cmd.action()}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer select-none ${
                              isSelected
                                ? "bg-primary text-white shadow-md shadow-primary/10"
                                : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                                  isSelected
                                    ? "bg-white/20 border-white/20 text-white"
                                    : "bg-slate-50 border-slate-100 text-slate-500"
                                }`}
                              >
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="text-xs font-bold leading-normal">{cmd.title}</span>
                                <span
                                  className={`text-[10px] leading-normal mt-0.5 ${
                                    isSelected ? "text-slate-200" : "text-slate-400"
                                  }`}
                                >
                                  {cmd.subtitle}
                                </span>
                              </div>
                            </div>

                            {cmd.shortcut && (
                              <kbd
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border transition-colors ${
                                  isSelected
                                    ? "bg-white/20 border-white/10 text-white"
                                    : "bg-slate-100/50 border-slate-200/40 text-slate-400"
                                }`}
                              >
                                {cmd.shortcut}
                              </kbd>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Keyboard Footer */}
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between font-medium shrink-0">
                <div className="flex items-center gap-3">
                  <span>
                    <kbd className="font-mono bg-white px-1 py-0.5 rounded shadow-sm border border-slate-200/40 mr-1">↑↓</kbd>{" "}
                    to navigate
                  </span>
                  <span>
                    <kbd className="font-mono bg-white px-1 py-0.5 rounded shadow-sm border border-slate-200/40 mr-1">Enter</kbd>{" "}
                    to select
                  </span>
                  <span>
                    <kbd className="font-mono bg-white px-1 py-0.5 rounded shadow-sm border border-slate-200/40 mr-1">Esc</kbd>{" "}
                    to close
                  </span>
                </div>
                <div>
                  <span>Power User Console</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
