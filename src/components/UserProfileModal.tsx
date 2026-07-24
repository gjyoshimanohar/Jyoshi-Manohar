import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, X, Mail, Shield, Clock, Phone, Building, Briefcase, Edit2, CheckCircle2, Loader2, Save, Globe } from 'lucide-react';
import { auth } from '../lib/firebase';
import { format } from 'date-fns';
import { userService } from '../services/userService';
import { UserProfile } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, GMT+5:30)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT, GMT-5)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT, GMT-6)' },
  { value: 'America/Denver', label: 'America/Denver (MST/MDT, GMT-7)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT, GMT-8)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST, GMT+0)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST, GMT+1)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST, GMT+1)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, GMT+4)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, GMT+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, GMT+9)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT, GMT+10)' },
];

export default function UserProfileModal({ isOpen, onClose, isAdmin = false }: UserProfileModalProps) {
  const user = auth.currentUser;
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    companyName: '',
    displayName: '',
    mobileNo: '',
    timezone: 'Asia/Kolkata',
  });

  useEffect(() => {
    if (!isOpen || !user) return;
    
    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await userService.getUserProfile(user.uid);
        if (data) {
          setProfile(data);
          setFormData({
            firstName: data.firstName || '',
            middleName: data.middleName || '',
            lastName: data.lastName || '',
            companyName: data.companyName || '',
            displayName: data.displayName || '',
            mobileNo: data.mobileNo || '',
            timezone: data.timezone || 'Asia/Kolkata',
          });
        } else {
          setFormData(prev => ({ ...prev, timezone: 'Asia/Kolkata' }));
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [isOpen, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await userService.updateUserProfile(user.uid, formData);
      setProfile({ ...profile, ...formData });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;
  
  const creationTime = user.metadata.creationTime ? new Date(user.metadata.creationTime) : null;
  const displayEmail = profile.email || user.email;
  const displayInitial = (formData.displayName || formData.firstName || user.email || 'U').charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !saving && onClose()}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
          >
            <div className="bg-slate-50/80 pt-6 pb-4 px-6 border-b border-slate-100 flex flex-col items-center relative shrink-0">
              <button
                onClick={onClose}
                disabled={saving}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-200/50 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
              
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="absolute top-4 left-4 text-primary hover:text-secondary transition-colors p-1.5 rounded-full hover:bg-primary/5 flex items-center gap-1.5"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="text-xs font-semibold">Edit</span>
                </button>
              )}
              
              <div className="w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center font-bold text-3xl mb-4 shadow-sm">
                {displayInitial}
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">{formData.displayName || `${formData.firstName} ${formData.lastName}`.trim() || user.email}</h3>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-200/50 text-slate-600 rounded-full text-xs font-semibold uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" />
                <span>{isAdmin ? 'Administrator' : 'Client Account'}</span>
              </div>
            </div>

            <div className="p-6 overflow-y-auto bg-white flex-1">
              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">First Name</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-black"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Middle Name</label>
                      <input
                        type="text"
                        value={formData.middleName}
                        onChange={(e) => setFormData({...formData, middleName: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-black"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-black"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Display Name</label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-black"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Company Name</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-black"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Mobile No.</label>
                    <input
                      type="text"
                      value={formData.mobileNo}
                      onChange={(e) => setFormData({...formData, mobileNo: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-black"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1 flex items-center justify-between">
                      <span>Timezone Configuration</span>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                        Default: Asia/Kolkata
                      </span>
                    </label>
                    <div className="relative">
                      <select
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-black appearance-none pr-8 cursor-pointer font-medium"
                      >
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                      <Globe className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1 flex justify-between">
                      <span>E-mail ID</span>
                      <span className="text-[10px] text-slate-400 normal-case">(Read only)</span>
                    </label>
                    <input
                      type="text"
                      value={displayEmail || ''}
                      disabled
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {(formData.firstName || formData.lastName) && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-0.5">Full Name</p>
                        <p className="text-sm font-medium text-slate-800">
                          {[formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ')}
                        </p>
                      </div>
                    </div>
                  )}

                  {formData.companyName && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <Building className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-0.5">Company Name</p>
                        <p className="text-sm font-medium text-slate-800">{formData.companyName}</p>
                      </div>
                    </div>
                  )}

                  {formData.mobileNo && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-0.5">Mobile No.</p>
                        <p className="text-sm font-medium text-slate-800">{formData.mobileNo}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-0.5">Timezone Preference</p>
                      <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                        <span>{formData.timezone || 'Asia/Kolkata'}</span>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-0.5">E-mail ID</p>
                      <p className="text-sm font-medium text-slate-800">{displayEmail}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-0.5">Member Since</p>
                      <p className="text-sm font-medium text-slate-800">
                        {creationTime ? format(creationTime, 'MMMM d, yyyy') : 'Unknown'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-0.5">Security Actions</p>
                        <p className="text-sm font-medium text-slate-800">
                          Password changed: {profile.passwordLastChanged ? format(profile.passwordLastChanged, 'MMM d, yyyy h:mm a') : 'Never / Unknown'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-6 mt-2">
                {isEditing ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        // Reset to saved profile
                        setFormData({
                          firstName: profile.firstName || '',
                          middleName: profile.middleName || '',
                          lastName: profile.lastName || '',
                          companyName: profile.companyName || '',
                          displayName: profile.displayName || '',
                          mobileNo: profile.mobileNo || '',
                          timezone: profile.timezone || 'Asia/Kolkata',
                        });
                        setIsEditing(false);
                      }}
                      disabled={saving}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 bg-primary hover:bg-secondary text-white py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onClose}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                  >
                    Close Profile
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

