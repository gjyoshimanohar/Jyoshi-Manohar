import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Key, LogOut, ChevronDown } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

interface ProfileDropdownProps {
  onViewProfile?: () => void;
  onLogout: () => void;
  onChangePassword: () => void;
  className?: string;
}

export default function ProfileDropdown({ onLogout, onChangePassword, onViewProfile, className = '' }: ProfileDropdownProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [profileName, setProfileName] = useState('');
  
  const user = auth.currentUser;
  
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.displayName) {
          setProfileName(data.displayName);
        } else if (data.firstName) {
          setProfileName(data.firstName + (data.lastName ? ' ' + data.lastName : ''));
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  const displayName = profileName || user?.displayName || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 pr-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm"
      >
        <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
          {initial}
        </div>
        <div className="flex flex-col items-start hidden sm:flex">
          <span className="text-xs font-semibold text-slate-800 leading-tight max-w-[120px] truncate">
            {displayName}
          </span>
          <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
            Account
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100/60 p-1.5 z-50 origin-top-right"
          >
            <div className="p-3 mb-1 bg-slate-50 border border-slate-100 rounded-xl">
              <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{user?.email}</p>
            </div>
            
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/profile');
                  if (onViewProfile) onViewProfile();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors text-slate-700 hover:text-primary hover:bg-slate-50 rounded-lg"
              >
                <User className="w-4 h-4" />
                View Profile
              </button>
              
              <button
                onClick={() => {
                  setIsOpen(false);
                  onChangePassword();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors text-slate-700 hover:text-primary hover:bg-slate-50 rounded-lg"
              >
                <Key className="w-4 h-4" />
                Change Password
              </button>
            </div>
            
            <div className="pt-1 mt-1 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
