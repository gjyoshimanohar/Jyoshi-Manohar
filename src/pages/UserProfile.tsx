import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User, ArrowLeft, Mail, Shield, Clock, Phone, Building, Edit2, Loader2, Save } from 'lucide-react';
import { auth } from '../lib/firebase';
import { format } from 'date-fns';
import { userService } from '../services/userService';
import { UserProfile as UserProfileType } from '../types';
import { onAuthStateChanged } from 'firebase/auth';

export default function UserProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(auth.currentUser);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<UserProfileType>>({});
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    companyName: '',
    displayName: '',
    mobileNo: '',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Check admin token if needed (basic check here)
        currentUser.getIdTokenResult().then(idTokenResult => {
          setIsAdmin(!!idTokenResult.claims.admin);
        }).catch(() => setIsAdmin(false));
      } else {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    
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
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [user]);

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

  if (!user) {
    return (
      <div className="min-h-screen pt-28 pb-20 bg-[#FDFDFD] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }
  
  const creationTime = user.metadata.creationTime ? new Date(user.metadata.creationTime) : null;
  const displayEmail = profile.email || user.email;
  const displayInitial = (formData.displayName || formData.firstName || user.email || 'U').charAt(0).toUpperCase();

  return (
    <main className="min-h-screen pt-28 pb-20 bg-[#FDFDFD]">
      <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 lg:px-6">
        
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors mb-6 font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row">
          {/* Sidebar / Header section */}
          <div className="md:w-1/3 bg-slate-50/80 p-8 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col items-center text-center relative shrink-0">
            <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center font-bold text-4xl mb-5 shadow-sm">
              {displayInitial}
            </div>
            <h1 className="font-bold text-slate-800 text-xl mb-2">{formData.displayName || `${formData.firstName} ${formData.lastName}`.trim() || user.email}</h1>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-full text-xs font-semibold uppercase tracking-wider mb-6">
              <Shield className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Administrator' : 'Client Account'}</span>
            </div>

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-slate-700 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors text-sm font-semibold shadow-sm"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          {/* Details section */}
          <div className="md:w-2/3 p-8 bg-white">
            {loading ? (
              <div className="flex justify-center items-center h-full min-h-[300px]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : isEditing ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 mb-4">Edit Profile</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">First Name</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-black"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Middle Name</label>
                      <input
                        type="text"
                        value={formData.middleName}
                        onChange={(e) => setFormData({...formData, middleName: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-black"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-black"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Display Name</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-black"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-black"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">Mobile No.</label>
                  <input
                    type="text"
                    value={formData.mobileNo}
                    onChange={(e) => setFormData({...formData, mobileNo: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-black"
                  />
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
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="pt-4 flex gap-3">
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
                      });
                      setIsEditing(false);
                    }}
                    disabled={saving}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-primary hover:bg-secondary text-white py-3 rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <h2 className="text-lg font-bold text-slate-800 mb-6">Personal Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                  {(formData.firstName || formData.lastName) && (
                    <div className="flex items-start gap-4 col-span-1 sm:col-span-2">
                      <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="pt-0.5">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Full Name</p>
                        <p className="text-base font-medium text-slate-800">
                          {[formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ')}
                        </p>
                      </div>
                    </div>
                  )}

                  {formData.companyName && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <Building className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="pt-0.5">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Company Name</p>
                        <p className="text-base font-medium text-slate-800">{formData.companyName}</p>
                      </div>
                    </div>
                  )}

                  {formData.mobileNo && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="pt-0.5">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Mobile No.</p>
                        <p className="text-base font-medium text-slate-800">{formData.mobileNo}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="pt-0.5 overflow-hidden">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">E-mail ID</p>
                      <p className="text-base font-medium text-slate-800 truncate" title={displayEmail}>{displayEmail}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="pt-0.5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Member Since</p>
                      <p className="text-base font-medium text-slate-800">
                        {creationTime ? format(creationTime, 'MMMM d, yyyy') : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 mt-6">
                  <h3 className="text-sm font-bold text-slate-800 mb-4">Security Overview</h3>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="pt-0.5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Recent Security Actions</p>
                      <p className="text-sm font-medium text-slate-800">
                        Password changed: {profile.passwordLastChanged ? format(profile.passwordLastChanged, 'MMM d, yyyy h:mm a') : 'Never / Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
