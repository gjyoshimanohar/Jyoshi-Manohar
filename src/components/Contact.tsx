import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Phone, MapPin, Send, ChevronDown, Check, Loader2 } from "lucide-react";
import { db, auth } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export default function Contact() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState("Tax Planning");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [requirementBrief, setRequirementBrief] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!firstName.trim()) {
      errors.firstName = "First name is required";
    }
    if (!lastName.trim()) {
      errors.lastName = "Last name is required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      errors.email = "Please enter a valid email address";
    }
    if (!mobileNumber.trim()) {
      errors.mobileNumber = "Mobile number is required";
    } else if (mobileNumber.trim().length < 8) {
      errors.mobileNumber = "Please enter a valid phone number";
    }
    if (!requirementBrief.trim()) {
      errors.requirementBrief = "Brief description is required";
    } else if (requirementBrief.trim().length < 10) {
      errors.requirementBrief = "Please write a bit more about your needs (min 10 characters)";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      // Simulate real processing delay
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Save to Firebase
      const isMatchingKnownUser = auth.currentUser && auth.currentUser.email === email;
      await addDoc(collection(db, "client_requests"), {
        userId: isMatchingKnownUser ? auth.currentUser.uid : "anonymous",
        userEmail: email, // Always use the explicitly provided email in the form
        clientName: `${firstName} ${lastName}`.trim(),
        title: `Consultation request: ${selectedInterest}`,
        type: "engagement",
        category: selectedInterest,
        description: requirementBrief,
        createdAt: Date.now(),
        status: "pending",
        mobile: mobileNumber
      });

      setSubmitSuccess(true);
    } catch (err) {
      console.error("Error submitting contact form:", err);
      setSubmitSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
 <section id="contact" className="bg-[#FDFDFD] py-5 lg:py-8">
 <div className="max-w-7xl mx-auto px-6 lg:px-12">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mt-4">
 <div className="flex flex-col justify-between relative">
 <div className="relative z-10">
 <p className="inline-flex items-center space-x-2 bg-primary/5 border border-primary/10 text-primary font-medium tracking-widest uppercase text-base px-4 py-2 rounded-full mb-4 shadow-sm w-fit">
 Strategic Partnership
 </p>
 <h2 className="text-4xl lg:text-5xl text-primary leading-tight tracking-tight mb-4">
 Ready to <br />
 Secure Your Capital?
 </h2>
 <p className="text-base lg:text-base text-black/70 font-medium leading-relaxed text-justify max-w-sm mb-6">
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
    className="p-10 lg:p-14 flex flex-col justify-center bg-white rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-slate-200 min-h-[500px]"
  >
    {submitSuccess ? (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-6 flex flex-col items-center justify-center space-y-6"
      >
        <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-100 shadow-xs">
          <Check className="h-10 w-10 stroke-[3]" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-primary tracking-tight">Consultation Requested</h3>
          <p className="text-sm text-black/60 max-w-sm mx-auto leading-relaxed">
            Thank you, <span className="font-semibold text-primary">{firstName}</span>. Your brief regarding <span className="font-semibold text-primary">{selectedInterest}</span> has been received!
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-left w-full space-y-3 font-medium text-xs text-black/70">
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
            <span className="text-black/40 text-xs uppercase tracking-wider">Interest</span>
            <span className="text-primary font-bold">{selectedInterest}</span>
          </div>
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
            <span className="text-black/40 text-xs uppercase tracking-wider">Contact Phone</span>
            <span className="text-primary font-semibold">{mobileNumber}</span>
          </div>
          <div className="flex justify-between pb-1">
            <span className="text-black/40 text-xs uppercase tracking-wider">Status</span>
            <span className="text-amber-600 font-bold uppercase tracking-widest text-[9px] bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">Pending Desk Routing</span>
          </div>
        </div>
        <p className="text-xs text-black/40 text-center">
          A licensed partner from CA Manohar's compliance desk will reach out within 1 business day.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitSuccess(false);
            setFirstName("");
            setLastName("");
            setEmail("");
            setMobileNumber("");
            setRequirementBrief("");
          }}
          className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-widest rounded-full transition-colors cursor-pointer"
        >
          Submit Another Request
        </button>
      </motion.div>
    ) : (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 text-left">
            <label className="text-xs font-bold uppercase tracking-widest text-black/70 ml-1">
              First Name
            </label>
            <input
              type="text"
              disabled={isSubmitting}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={`w-full px-5 py-4 bg-slate-50 border rounded-xl text-base font-medium text-primary focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all ${formErrors.firstName ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200'}`}
              placeholder="First Name"
            />
            {formErrors.firstName && (
              <p className="text-xs text-rose-500 font-semibold ml-1">{formErrors.firstName}</p>
            )}
          </div>
          <div className="space-y-2 text-left">
            <label className="text-xs font-bold uppercase tracking-widest text-black/70 ml-1">
              Last Name
            </label>
            <input
              type="text"
              disabled={isSubmitting}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={`w-full px-5 py-4 bg-slate-50 border rounded-xl text-base font-medium text-primary focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all ${formErrors.lastName ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200'}`}
              placeholder="Last Name"
            />
            {formErrors.lastName && (
              <p className="text-xs text-rose-500 font-semibold ml-1">{formErrors.lastName}</p>
            )}
          </div>
          <div className="space-y-2 text-left">
            <label className="text-xs font-bold uppercase tracking-widest text-black/70 ml-1">
              Email Address
            </label>
            <input
              type="email"
              disabled={isSubmitting}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-5 py-4 bg-slate-50 border rounded-xl text-base font-medium text-primary focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all ${formErrors.email ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200'}`}
              placeholder="Enter Email"
            />
            {formErrors.email && (
              <p className="text-xs text-rose-500 font-semibold ml-1">{formErrors.email}</p>
            )}
          </div>
          <div className="space-y-2 text-left">
            <label className="text-xs font-bold uppercase tracking-widest text-black/70 ml-1">
              Mobile Number
            </label>
            <input
              type="tel"
              disabled={isSubmitting}
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              className={`w-full px-5 py-4 bg-slate-50 border rounded-xl text-base font-medium text-primary focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all ${formErrors.mobileNumber ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200'}`}
              placeholder="Enter Mobile Number"
            />
            {formErrors.mobileNumber && (
              <p className="text-xs text-rose-500 font-semibold ml-1">{formErrors.mobileNumber}</p>
            )}
          </div>
        </div>

        <div className="space-y-2 text-left">
          <label className="text-xs font-bold uppercase tracking-widest text-black/70 ml-1">
            Area of Interest
          </label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-primary focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all flex items-center justify-between group disabled:opacity-75"
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

        <div className="space-y-2 text-left">
          <label className="text-xs font-bold uppercase tracking-widest text-black/70 ml-1">
            Requirement Brief
          </label>
          <textarea
            rows={3}
            disabled={isSubmitting}
            value={requirementBrief}
            onChange={(e) => setRequirementBrief(e.target.value)}
            className={`w-full px-5 py-4 bg-slate-50 border rounded-xl text-base font-medium text-primary focus:bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none ${formErrors.requirementBrief ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200'}`}
            placeholder="Describe your context"
          ></textarea>
          {formErrors.requirementBrief && (
            <p className="text-xs text-rose-500 font-semibold ml-1">{formErrors.requirementBrief}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-white py-5 text-sm font-medium tracking-widest uppercase hover:bg-secondary transition-all flex items-center justify-center space-x-3 group rounded-full shadow-md hover:shadow-lg hover:-translate-y-1 disabled:opacity-80 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 text-white" />
              <span>Initiating...</span>
            </>
          ) : (
            <>
              <span>Initiate Consultation</span>
              <Send className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </>
          )}
        </button>
      </form>
    )}
  </motion.div>
</div>
</div>
</section>
);
}
