import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Phone, MapPin, Send, ChevronDown, Check } from "lucide-react";

export default function Contact() {
 const [isDropdownOpen, setIsDropdownOpen] = useState(false);
 const [selectedInterest, setSelectedInterest] = useState("Tax Planning");
 const dropdownRef = useRef<HTMLDivElement>(null);

 const interests = [
 "Tax Planning",
 "Internal Audit",
 "Corporate Advisory",
 "Compliance Services",
 ];

 useEffect(() => {
 function handleClickOutside(event: MouseEvent) {
 if (
 dropdownRef.current &&
 !dropdownRef.current.contains(event.target as Node)
 ) {
 setIsDropdownOpen(false);
 }
 }
 document.addEventListener("mousedown", handleClickOutside);
 return () => document.removeEventListener("mousedown", handleClickOutside);
 }, []);

 return (
 <section id="contact" className="bg-[#FDFDFD] py-10 lg:py-16">
 <div className="max-w-7xl mx-auto px-6 lg:px-12">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mt-8">
 <div className="flex flex-col justify-between relative">
 <div className="relative z-10">
 <p className="inline-flex items-center space-x-2 bg-primary/5 border border-primary/10 text-primary font-medium tracking-widest uppercase text-base px-4 py-2 rounded-full mb-8 shadow-sm w-max">
 Strategic Partnership
 </p>
 <h2 className="text-4xl lg:text-5xl text-primary leading-tight tracking-tight mb-8">
 Ready to <br />
 Secure Your Capital?
 </h2>
 <p className="text-base lg:text-base text-black/70 font-medium leading-relaxed text-justify max-w-sm mb-12">
 Schedule a private session to discuss taxation, audit, or
 corporate strategy.
 </p>

 <div className="space-y-8">
 {[
 {
 icon: Mail,
 label: "Correspondence",
 values: ["contact@jyoshimanohar.com"],
 },
 {
 icon: Phone,
 label: "Direct Line",
 value: "+91 9492377780",
 },
 { icon: MapPin, label: "Presence", value: "Hyderabad, TG" },
 ].map((item, idx) => (
 <div key={idx} className="flex items-center space-x-6">
 <div className="h-12 w-12 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-primary">
 <item.icon className="h-6 w-6" />
 </div>
 <div>
 <div className="text-xs font-medium text-black/50 uppercase tracking-widest leading-none mb-2">
 {item.label}
 </div>
 <div className="flex flex-col">
 {"values" in item ? (
 item.values.map((v, i) => (
 <div
 key={i}
 className="text-lg font-medium text-primary leading-tight"
 >
 {v}
 </div>
 ))
 ) : (
 <div className="text-lg font-medium text-primary">
 {item.value}
 </div>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 <motion.div
 initial={{ opacity: 0 }}
 whileInView={{ opacity: 1 }}
 viewport={{ once: true }}
 className="p-10 lg:p-14 flex flex-col justify-center bg-white rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-200"
 >
 <form className="space-y-8">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-widest text-black/70 ml-1">
 First Name
 </label>
 <input
 type="text"
 className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-primary focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
 placeholder="First Name"
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-widest text-black/70 ml-1">
 Last Name
 </label>
 <input
 type="text"
 className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-primary focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
 placeholder="Last Name"
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-widest text-black/70 ml-1">
 Email Address
 </label>
 <input
 type="email"
 className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-primary focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
 placeholder="Enter Email"
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-widest text-black/70 ml-1">
 Mobile Number
 </label>
 <input
 type="tel"
 className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-primary focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
 placeholder="Enter Mobile Number"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-widest text-black/70 ml-1">
 Area of Interest
 </label>
 <div className="relative" ref={dropdownRef}>
 <button
 type="button"
 onClick={() => setIsDropdownOpen(!isDropdownOpen)}
 className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-primary focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all flex items-center justify-between group"
 >
 <span>{selectedInterest}</span>
 <ChevronDown
 className={`h-5 w-5 text-black transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`}
 />
 </button>

 <AnimatePresence>
 {isDropdownOpen && (
 <motion.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 transition={{ duration: 0.2 }}
 className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
 >
 <div className="py-2">
 {interests.map((interest) => (
 <button
 key={interest}
 type="button"
 onClick={() => {
 setSelectedInterest(interest);
 setIsDropdownOpen(false);
 }}
 className={`w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors ${
 selectedInterest === interest
 ? "text-primary bg-slate-50/50"
 : "text-black"
 }`}
 >
 <span className="text-base font-semibold">
 {interest}
 </span>
 {selectedInterest === interest && (
 <Check className="h-5 w-5 text-secondary" />
 )}
 </button>
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-widest text-black/70 ml-1">
 Requirement Brief
 </label>
 <textarea
 rows={3}
 className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-primary focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none"
 placeholder="Describe your context"
 ></textarea>
 </div>
 <button
 type="button"
 className="w-full bg-primary text-white py-5 text-sm font-medium tracking-widest uppercase hover:bg-secondary transition-all flex items-center justify-center space-x-3 group rounded-full shadow-md hover:shadow-lg hover:-translate-y-1"
 >
 <span>Initiate Consultation</span>
 <Send className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
 </button>
 </form>
 </motion.div>
 </div>
 </div>
 </section>
 );
}
