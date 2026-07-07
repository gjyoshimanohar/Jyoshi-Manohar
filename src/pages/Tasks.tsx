import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import WorkspaceApp from '../components/WorkspaceApp';
import { LogOut } from 'lucide-react';

export default function Tasks() {
 const [user, setUser] = useState<User | null>(null);
 const [loading, setLoading] = useState(true);
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');

 useEffect(() => {
 const unsubscribe = onAuthStateChanged(auth, (u) => {
 setUser(u);
 setLoading(false);
 });
 return unsubscribe;
 }, []);

 const handleLogin = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 await signInWithEmailAndPassword(auth, email, password);
 } catch (error: any) {
 // Supress confusing firebase errors in console\n      console.error("Login failed: ", error.code === "auth/invalid-credential" ? "Invalid credentials" : error.message);
 alert(error.code === "auth/invalid-credential" ? "Invalid email or password." : (error.message || "Login failed"));
 }
 };

 const handleLogout = () => signOut(auth);

 if (loading) return (
 <div className="min-h-screen flex items-center justify-center bg-accent">
 <div className="animate-pulse flex flex-col items-center">
 <div className="h-12 w-48 bg-slate-200 rounded mb-4"></div>
 <div className="h-4 w-32 bg-slate-200 rounded"></div>
 </div>
 </div>
 );

 if (!user) {
 return (
 <div className="min-h-screen pt-32 pb-24 bg-accent flex items-center justify-center">
 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="max-w-md w-full bg-white p-12 border border-border shadow-2xl"
 >
 <div className="text-center mb-8">
 <h1 className="text-4xl text-primary mb-2">Workspace</h1>
 <p className="text-black font-medium">Please sign in to view your tasks</p>
 </div>
 <form onSubmit={handleLogin} className="space-y-4">
 <div>
 <label className="block text-xs uppercase tracking-widest text-black mb-2">Email</label>
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full bg-accent border-none p-4 font-medium text-primary focus:ring-2 focus:ring-primary outline-none"
 placeholder="Enter your email"
 required
 />
 </div>
 <div className="mb-6">
 <label className="block text-xs uppercase tracking-widest text-black mb-2">Password</label>
 <input
 type="password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 className="w-full bg-accent border-none p-4 font-medium text-primary focus:ring-2 focus:ring-primary outline-none"
 placeholder="Enter your password"
 required
 />
 </div>
 <button
 type="submit"
 className="w-full bg-primary text-white py-4 px-6 uppercase tracking-widest hover:bg-secondary transition-colors flex items-center justify-center space-x-3 mt-4 rounded-md"
 >
 <span>Sign In</span>
 </button>
 </form>
 </motion.div>
 </div>
 );
 }

 return (
 <main className="h-screen pt-20 bg-white flex flex-col overflow-hidden">
 <WorkspaceApp />
 </main>
 );
}
