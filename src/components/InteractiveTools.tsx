import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  Calendar, 
  CheckSquare, 
  ArrowRight, 
  ChevronRight, 
  Info, 
  CheckCircle2, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  Download, 
  Copy, 
  HelpCircle,
  FileText,
  Briefcase,
  Users,
  Percent,
  Check,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Define Types
type ToolTab = 'tax' | 'deadlines' | 'checklist' | 'pricing';

interface Deadline {
  id: string;
  title: string;
  category: 'GST' | 'Income Tax' | 'Corporate';
  dueDate: string;
  description: string;
  daysRemaining: number;
}

interface ChecklistItem {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

interface ServiceChecklist {
  id: string;
  serviceName: string;
  category: string;
  items: ChecklistItem[];
}

export default function InteractiveTools() {
  const [activeTab, setActiveTab] = useState<ToolTab>('tax');

  // --- 1. Tax & GST Calculator State ---
  const [calcType, setCalcType] = useState<'income' | 'gst'>('income');
  
  // Income Tax variables
  const [annualSalary, setAnnualSalary] = useState<number>(1200000);
  const [otherIncome, setOtherIncome] = useState<number>(50000);
  const [deduction80C, setDeduction80C] = useState<number>(150000);
  const [deduction80D, setDeduction80D] = useState<number>(25000);
  const [otherDeductions, setOtherDeductions] = useState<number>(0);
  const [taxResult, setTaxResult] = useState<{
    oldTax: number;
    newTax: number;
    savings: number;
    oldTaxBreakdown: any[];
    newTaxBreakdown: any[];
  } | null>(null);

  // GST variables
  const [gstAmount, setGstAmount] = useState<number>(10000);
  const [gstRate, setGstRate] = useState<number>(18);
  const [gstType, setGstType] = useState<'inclusive' | 'exclusive'>('exclusive');
  const [gstTransaction, setGstTransaction] = useState<'intra' | 'inter'>('intra');
  const [gstResult, setGstResult] = useState<{
    originalAmount: number;
    gstAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalAmount: number;
  } | null>(null);

  // --- 2. Statutory Deadlines State ---
  const [selectedDeadlineCategory, setSelectedDeadlineCategory] = useState<'All' | 'GST' | 'Income Tax' | 'Corporate'>('All');
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);

  // --- 3. Document Checklist State ---
  const [selectedService, setSelectedService] = useState<string>('gst_reg');
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  // --- 4. Service Cost Estimator State ---
  const [turnover, setTurnover] = useState<string>('under_10l');
  const [businessType, setBusinessType] = useState<string>('proprietorship');
  const [neededServices, setNeededServices] = useState<string[]>(['gst_returns', 'bookkeeping']);

  // Initial Calculation & Deadlines Generation
  useEffect(() => {
    calculateIncomeTax();
  }, [annualSalary, otherIncome, deduction80C, deduction80D, otherDeductions]);

  useEffect(() => {
    calculateGst();
  }, [gstAmount, gstRate, gstType, gstTransaction]);

  useEffect(() => {
    // Generate static but realistic upcoming compliance deadlines for India based on current local time
    const today = new Date();
    
    const rawDeadlines: Deadline[] = [
      {
        id: '1',
        title: 'GST GSTR-1 (Outward Supplies)',
        category: 'GST',
        dueDate: getNextDateOfMonth(11),
        description: 'Filing of details of outward supplies of goods or services for monthly taxpayers.',
        daysRemaining: 0
      },
      {
        id: '2',
        title: 'GST GSTR-3B (Summary Return)',
        category: 'GST',
        dueDate: getNextDateOfMonth(20),
        description: 'Monthly self-assessment return and payment of tax for GSTR-3B taxpayers.',
        daysRemaining: 0
      },
      {
        id: '3',
        title: 'TDS/TCS Tax Deposit (Challan 281)',
        category: 'Income Tax',
        dueDate: getNextDateOfMonth(7),
        description: 'Challan payment for TDS/TCS deducted in the preceding month.',
        daysRemaining: 0
      },
      {
        id: '4',
        title: 'Quarterly TDS Return Filing (Form 24Q / 26Q)',
        category: 'Income Tax',
        dueDate: '2026-07-31',
        description: 'Filing of quarterly return of tax deducted at source for salaries and other payments.',
        daysRemaining: 0
      },
      {
        id: '5',
        title: 'Income Tax Return (ITR) Filing (Individuals)',
        category: 'Income Tax',
        dueDate: '2026-07-31',
        description: 'Statutory deadline for individual taxpayers, HUFs, and non-audit firms to file annual returns.',
        daysRemaining: 0
      },
      {
        id: '6',
        title: 'ROC Annual Filing Form AOC-4',
        category: 'Corporate',
        dueDate: '2026-10-30',
        description: 'Filing of Financial Statements with the Registrar of Companies (within 30 days of AGM).',
        daysRemaining: 0
      }
    ];

    // Compute remaining days dynamically
    const processed = rawDeadlines.map(d => {
      const due = new Date(d.dueDate);
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...d,
        daysRemaining: diffDays < 0 ? diffDays + 30 : diffDays // Cycle monthly ones forward if passed
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);

    setDeadlines(processed);
  }, []);

  function getNextDateOfMonth(day: number): string {
    const d = new Date();
    if (d.getDate() > day) {
      d.setMonth(d.getMonth() + 1);
    }
    d.setDate(day);
    return d.toISOString().split('T')[0];
  }

  // --- INCOME TAX CALCULATION LOGIC ---
  const calculateIncomeTax = () => {
    const grossIncome = Number(annualSalary) + Number(otherIncome);
    
    // 1. OLD REGIME CALCULATION
    const oldStandardDeduction = 50000;
    const old80C = Math.min(Number(deduction80C), 150000);
    const old80D = Math.min(Number(deduction80D), 25000);
    const totalOldDeductions = oldStandardDeduction + old80C + old80D + Number(otherDeductions);
    const oldTaxableIncome = Math.max(0, grossIncome - totalOldDeductions);

    let oldTax = 0;
    const oldBreakdown: any[] = [];

    if (oldTaxableIncome > 250000) {
      if (oldTaxableIncome <= 500000) {
        oldTax += (oldTaxableIncome - 250000) * 0.05;
      } else {
        oldTax += 250000 * 0.05; // 5% of 2.5L-5L
        if (oldTaxableIncome <= 1000000) {
          oldTax += (oldTaxableIncome - 500000) * 0.20;
        } else {
          oldTax += 500000 * 0.20; // 20% of 5L-10L
          oldTax += (oldTaxableIncome - 1000000) * 0.30;
        }
      }
    }

    // Tax Rebate under 87A (Old Regime)
    if (oldTaxableIncome <= 500000) {
      oldTax = 0;
    }

    // Health & Education Cess (4%)
    const oldCess = oldTax * 0.04;
    const totalOldTax = oldTax + oldCess;

    // 2. NEW REGIME CALCULATION (FY 2024-25 / AY 2025-26 under Finance Act 2024)
    const newStandardDeduction = 75000;
    // No 80C, 80D deductions allowed under New Regime
    const totalNewDeductions = newStandardDeduction;
    const newTaxableIncome = Math.max(0, grossIncome - totalNewDeductions);

    let newTax = 0;
    
    if (newTaxableIncome > 300000) {
      if (newTaxableIncome <= 600000) {
        newTax += (newTaxableIncome - 300000) * 0.05;
      } else {
        newTax += 300000 * 0.05;
        if (newTaxableIncome <= 900000) {
          newTax += (newTaxableIncome - 600000) * 0.10;
        } else {
          newTax += 300000 * 0.10;
          if (newTaxableIncome <= 1200000) {
            newTax += (newTaxableIncome - 900000) * 0.15;
          } else {
            newTax += 300000 * 0.15;
            if (newTaxableIncome <= 1500000) {
              newTax += (newTaxableIncome - 1200000) * 0.20;
            } else {
              newTax += 300000 * 0.20;
              newTax += (newTaxableIncome - 1500000) * 0.30;
            }
          }
        }
      }
    }

    // Tax Rebate under 87A (New Regime)
    // Full rebate if taxable income is up to ₹7,00,000 (Marginal relief applies if slightly higher, let's keep it simple)
    if (newTaxableIncome <= 700000) {
      newTax = 0;
    }

    const newCess = newTax * 0.04;
    const totalNewTax = newTax + newCess;

    setTaxResult({
      oldTax: Math.round(totalOldTax),
      newTax: Math.round(totalNewTax),
      savings: Math.max(0, Math.round(totalOldTax - totalNewTax)),
      oldTaxBreakdown: [
        { label: 'Gross Income', value: grossIncome },
        { label: 'Total Deductions', value: totalOldDeductions },
        { label: 'Taxable Income', value: oldTaxableIncome },
        { label: 'Base Tax', value: oldTax },
        { label: 'Cess (4%)', value: oldCess },
      ],
      newTaxBreakdown: [
        { label: 'Gross Income', value: grossIncome },
        { label: 'Standard Deduction', value: totalNewDeductions },
        { label: 'Taxable Income', value: newTaxableIncome },
        { label: 'Base Tax', value: newTax },
        { label: 'Cess (4%)', value: newCess },
      ]
    });
  };

  // --- GST CALCULATION LOGIC ---
  const calculateGst = () => {
    const amt = Number(gstAmount);
    const rate = Number(gstRate);
    
    let original = 0;
    let tax = 0;
    let total = 0;

    if (gstType === 'exclusive') {
      original = amt;
      tax = amt * (rate / 100);
      total = amt + tax;
    } else {
      total = amt;
      original = amt / (1 + (rate / 100));
      tax = amt - original;
    }

    const cgst = gstTransaction === 'intra' ? tax / 2 : 0;
    const sgst = gstTransaction === 'intra' ? tax / 2 : 0;
    const igst = gstTransaction === 'inter' ? tax : 0;

    setGstResult({
      originalAmount: Math.round(original * 100) / 100,
      gstAmount: Math.round(tax * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      totalAmount: Math.round(total * 100) / 100
    });
  };

  // --- COMPLIANCE DOCUMENT CHECKLISTS DATA ---
  const checklists: Record<string, ServiceChecklist> = {
    gst_reg: {
      id: 'gst_reg',
      serviceName: 'GST Registration (New Business)',
      category: 'GST Compliance',
      items: [
        { id: '1a', name: 'PAN Card of Applicant', description: 'PAN of the business/proprietor is mandatory.', required: true },
        { id: '1b', name: 'Aadhaar Card of Applicant', description: 'For biometric KYC and authentication.', required: true },
        { id: '1c', name: 'Proof of Business Premises', description: 'Electricity bill / property tax receipt / land register copy.', required: true },
        { id: '1d', name: 'NOC or Rent Agreement', description: 'NOC from the owner if the property is rented or shared.', required: true },
        { id: '1e', name: 'Bank Account Proof', description: 'Cancelled cheque or first page of bank passbook.', required: true },
        { id: '1f', name: 'Passport size Photograph', description: 'Digital photo of the promoter/authorized signatory.', required: true }
      ]
    },
    itr_filing: {
      id: 'itr_filing',
      serviceName: 'Individual ITR Filing',
      category: 'Income Tax Return',
      items: [
        { id: '2a', name: 'Form 16 (from Employer)', description: 'Salary certificate with details of tax deducted at source.', required: true },
        { id: '2b', name: 'Annual Information Statement (AIS)', description: 'Downloadable from Income Tax portal summarizing financial transactions.', required: true },
        { id: '2c', name: 'Bank Statements / Interest Certs', description: 'For all active bank accounts for the financial year.', required: true },
        { id: '2d', name: 'Tax Saving Proofs (Section 80C)', description: 'PPF, ELSS, Insurance receipts, School fees, Home loan principal, etc.', required: false },
        { id: '2e', name: 'Health Insurance Premium (80D)', description: 'Premium payment certificate for self and family/parents.', required: false },
        { id: '2f', name: 'Capital Gains Statement', description: 'From stock/mutual fund brokers if shares were sold.', required: false }
      ]
    },
    llp_inc: {
      id: 'llp_inc',
      serviceName: 'LLP / Company Incorporation',
      category: 'Corporate Secretarial',
      items: [
        { id: '3a', name: 'PAN and Aadhaar of Directors/Partners', description: 'Mandatory identity and address proofs for all promoters.', required: true },
        { id: '3b', name: 'Address Proof of Directors/Partners', description: 'Latest bank statement, electricity bill, or phone bill.', required: true },
        { id: '3c', name: 'Registered Office Address Proof', description: 'Latest electricity bill or water bill of the office premises.', required: true },
        { id: '3d', name: 'NOC from Property Owner', description: 'No Objection Certificate allowing company registration on address.', required: true },
        { id: '3e', name: 'Digital Signature Certificate (DSC)', description: 'Required for e-signing incorporation forms.', required: true },
        { id: '3f', name: 'Proposed Names for Business', description: '2 to 3 unique names in order of preference for RUN filing.', required: true }
      ]
    },
    audit_prep: {
      id: 'audit_prep',
      serviceName: 'Tax Audit Preparation (Sec 44AB)',
      category: 'Auditing & Assurance',
      items: [
        { id: '4a', name: 'Complete Bookkeeping & Ledger Ledger', description: 'Trial balance, Profit & Loss Statement, and Balance Sheet.', required: true },
        { id: '4b', name: 'GST Filing Reconciliation', description: 'Reconciliation of GSTR-1, GSTR-3B, and sales ledger books.', required: true },
        { id: '4c', name: 'Bank Reconciliation Statements (BRS)', description: 'BRS for all bank accounts as of March 31st.', required: true },
        { id: '4d', name: 'TDS Deduction & Returns Proof', description: 'Quarterly filing statements and TDS payment challans.', required: true },
        { id: '4e', name: 'Cash Transaction Ledger', description: 'Details of any cash payments exceeding ₹10,000 to a person in a day.', required: true },
        { id: '4f', name: 'Fixed Asset Additions Invoices', description: 'Invoices for purchase of plant, machinery, or office equipment.', required: false }
      ]
    }
  };

  const handleToggleCheck = (itemId: string) => {
    setCompletedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const currentChecklist = checklists[selectedService] || checklists.gst_reg;
  const totalItemsCount = currentChecklist.items.length;
  const completedItemsCount = currentChecklist.items.filter(item => completedItems[item.id]).length;
  const progressPercent = Math.round((completedItemsCount / totalItemsCount) * 100);

  const handleResetChecklist = () => {
    const fresh: Record<string, boolean> = {};
    currentChecklist.items.forEach(it => {
      fresh[it.id] = false;
    });
    setCompletedItems(fresh);
    toast.success('Checklist reset successfully');
  };

  const handleCopyChecklist = () => {
    const textToCopy = `Compliance Document Checklist for ${currentChecklist.serviceName}:\n\n` +
      currentChecklist.items.map((item, i) => {
        const isDone = completedItems[item.id] ? '[✓]' : '[ ]';
        return `${i + 1}. ${isDone} ${item.name} (${item.required ? 'Required' : 'Optional'}) - ${item.description}`;
      }).join('\n');
    
    navigator.clipboard.writeText(textToCopy);
    toast.success('Checklist copied to clipboard!');
  };

  // --- SERVICE ENGAGEMENT COST ESTIMATOR LOGIC ---
  const getEstimatedFeeRange = () => {
    let baseMin = 1500;
    let baseMax = 3500;

    // Adjust based on turnover
    if (turnover === '10l_50l') {
      baseMin = 4000;
      baseMax = 8000;
    } else if (turnover === '50l_2cr') {
      baseMin = 10000;
      baseMax = 20000;
    } else if (turnover === 'above_2cr') {
      baseMin = 25000;
      baseMax = 55000;
    }

    // Adjust based on constitution type
    if (businessType === 'partnership') {
      baseMin *= 1.2;
      baseMax *= 1.25;
    } else if (businessType === 'pvt_ltd') {
      baseMin *= 1.5;
      baseMax *= 1.6;
    }

    // Add service costs
    let serviceAdderMin = 0;
    let serviceAdderMax = 0;

    if (neededServices.includes('gst_returns')) {
      serviceAdderMin += 2000;
      serviceAdderMax += 4500;
    }
    if (neededServices.includes('bookkeeping')) {
      serviceAdderMin += 2500;
      serviceAdderMax += 6000;
    }
    if (neededServices.includes('itr_filing')) {
      serviceAdderMin += 1500;
      serviceAdderMax += 3000;
    }
    if (neededServices.includes('audit')) {
      serviceAdderMin += 15000;
      serviceAdderMax += 30000;
    }
    if (neededServices.includes('startup_compliance')) {
      serviceAdderMin += 5000;
      serviceAdderMax += 12000;
    }

    const minTotal = Math.round((baseMin + serviceAdderMin) / 500) * 500;
    const maxTotal = Math.round((baseMax + serviceAdderMax) / 500) * 500;

    return { min: minTotal, max: maxTotal };
  };

  const pricingEstimate = getEstimatedFeeRange();

  const handleToggleServiceNeed = (svcId: string) => {
    setNeededServices(prev => 
      prev.includes(svcId) ? prev.filter(x => x !== svcId) : [...prev, svcId]
    );
  };

  return (
    <section id="interactive-tools" className="py-20 bg-gradient-to-b from-[#FAFBFD] to-white border-y border-slate-100">
      <div className="w-[98%] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center space-x-2 bg-secondary/10 border border-secondary/20 text-secondary font-semibold tracking-widest uppercase text-[10px] px-4 py-2 rounded-full mb-4 shadow-sm"
          >
            <Sparkles className="h-3 w-3 mr-1 animate-pulse" />
            <span>Interactive Business Assistant</span>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-5xl text-primary leading-tight tracking-tight mb-4"
          >
            Smart Financial Toolkit
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-slate-600 text-base"
          >
            Utilize our real-time estimators, interactive compliance calendar, and dynamic document checklists to instantly simplify your financial operations.
          </motion.p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-12">
          {[
            { id: 'tax', name: 'Tax & GST Estimator', icon: Calculator },
            { id: 'deadlines', name: 'Compliance Deadlines', icon: Calendar },
            { id: 'checklist', name: 'Document Checklist', icon: CheckSquare },
            { id: 'pricing', name: 'Fee Estimator', icon: Briefcase },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ToolTab)}
                id={`tab-btn-${tab.id}`}
                className={`flex items-center gap-2 px-5 py-3 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-300 border ${
                  isActive 
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105' 
                    : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Main Tool Content Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.06)] overflow-hidden max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="p-6 md:p-10 lg:p-12"
            >
              
              {/* --- TAB 1: TAX & GST ESTIMATOR --- */}
              {activeTab === 'tax' && (
                <div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-6 mb-8">
                    <div>
                      <h3 className="text-2xl font-bold text-primary flex items-center gap-2">
                        <Calculator className="h-6 w-6 text-secondary" />
                        Taxation Estimators
                      </h3>
                      <p className="text-slate-500 text-xs mt-1">Estimate GST breakdowns or calculate income tax regime benefits side-by-side.</p>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200">
                      <button
                        onClick={() => setCalcType('income')}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                          calcType === 'income' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Income Tax
                      </button>
                      <button
                        onClick={() => setCalcType('gst')}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                          calcType === 'gst' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        GST Calc
                      </button>
                    </div>
                  </div>

                  {calcType === 'income' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                      {/* Inputs Column */}
                      <div className="lg:col-span-5 space-y-5 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                          <span>Financial Parameters</span>
                          <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded font-bold">FY 2024-25</span>
                        </h4>
                        
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Annual Gross Salary (₹)</label>
                          <input
                            type="number"
                            value={annualSalary}
                            onChange={(e) => setAnnualSalary(Math.max(0, Number(e.target.value)))}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Other Income (Rent, Interest, etc.) (₹)</label>
                          <input
                            type="number"
                            value={otherIncome}
                            onChange={(e) => setOtherIncome(Math.max(0, Number(e.target.value)))}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800"
                          />
                        </div>

                        <div className="border-t border-slate-200/60 pt-4 space-y-4">
                          <h5 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Regime Deductions (Old Regime Only)</h5>
                          
                          <div>
                            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-2">
                              <span className="uppercase tracking-wider">Sec 80C Investments (Max 1.5L)</span>
                              <span className="text-slate-400 font-normal">PPF, EPF, ELSS, Insurance</span>
                            </div>
                            <input
                              type="number"
                              value={deduction80C}
                              onChange={(e) => setDeduction80C(Math.min(150000, Math.max(0, Number(e.target.value))))}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-2">
                              <span className="uppercase tracking-wider">Sec 80D Health Insurance (Max 25k)</span>
                              <span className="text-slate-400 font-normal">Self & Family Premium</span>
                            </div>
                            <input
                              type="number"
                              value={deduction80D}
                              onChange={(e) => setDeduction80D(Math.min(25000, Math.max(0, Number(e.target.value))))}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Other Deductions (HRA, 80G, LTA, etc.) (₹)</label>
                            <input
                              type="number"
                              value={otherDeductions}
                              onChange={(e) => setOtherDeductions(Math.max(0, Number(e.target.value)))}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Results Dashboard Column */}
                      <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
                        
                        {/* Comparison cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Old Regime Card */}
                          <div className="border border-slate-200 rounded-2xl p-5 bg-[#FAFBFD] relative overflow-hidden">
                            <span className="absolute top-0 right-0 bg-slate-200 text-slate-700 text-[9px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-bl-xl">
                              Old Regime
                            </span>
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Estimated Annual Tax</span>
                            <h4 className="text-3xl font-extrabold text-primary mt-2">
                              ₹{taxResult?.oldTax.toLocaleString('en-IN') || 0}
                            </h4>
                            <p className="text-slate-400 text-[10px] mt-1.5">Includes Standard Deduction of ₹50K & exemptions.</p>
                          </div>

                          {/* New Regime Card */}
                          <div className="border-2 border-secondary/30 rounded-2xl p-5 bg-secondary/[0.02] relative overflow-hidden">
                            <span className="absolute top-0 right-0 bg-secondary text-white text-[9px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-bl-xl">
                              New Regime
                            </span>
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Estimated Annual Tax</span>
                            <h4 className="text-3xl font-extrabold text-secondary mt-2">
                              ₹{taxResult?.newTax.toLocaleString('en-IN') || 0}
                            </h4>
                            <p className="text-slate-500 text-[10px] mt-1.5">Includes Standard Deduction of ₹75K. Simple tax slabs.</p>
                          </div>
                        </div>

                        {/* Recommendation Highlight Banner */}
                        {taxResult && (
                          <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-primary text-white rounded-xl">
                                <TrendingUp className="h-5 w-5" />
                              </div>
                              <div>
                                <h5 className="text-sm font-bold text-primary">
                                  {taxResult.savings > 0 
                                    ? `Opt for New Tax Regime to save ₹${taxResult.savings.toLocaleString('en-IN')}!` 
                                    : taxResult.oldTax < taxResult.newTax 
                                      ? `Old Tax Regime is more beneficial by ₹${(taxResult.newTax - taxResult.oldTax).toLocaleString('en-IN')}!`
                                      : 'Both regimes yield identical tax obligations.'}
                                </h5>
                                <p className="text-slate-500 text-xs mt-0.5">Based on your current investments and declarations.</p>
                              </div>
                            </div>
                            <span className="text-xl font-extrabold text-primary shrink-0">
                              ₹{Math.abs(taxResult.oldTax - taxResult.newTax).toLocaleString('en-IN')} Saved
                            </span>
                          </div>
                        )}

                        {/* Breakdown tables side-by-side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                          <div>
                            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Old Regime Breakdown</h5>
                            <div className="space-y-2 text-xs">
                              {taxResult?.oldTaxBreakdown.map((row, idx) => (
                                <div key={idx} className="flex justify-between py-1 border-b border-slate-50">
                                  <span className="text-slate-500">{row.label}</span>
                                  <span className="font-semibold text-slate-800">₹{row.value.toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">New Regime Breakdown</h5>
                            <div className="space-y-2 text-xs">
                              {taxResult?.newTaxBreakdown.map((row, idx) => (
                                <div key={idx} className="flex justify-between py-1 border-b border-slate-50">
                                  <span className="text-slate-500">{row.label}</span>
                                  <span className="font-semibold text-slate-800">₹{row.value.toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Disclaimer info */}
                        <div className="text-[10px] text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-1.5">
                          <Info className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                          <span>Disclaimer: This estimator provides indicative tax comparisons only. Under Section 87A, rebate is fully applicable if net taxable income remains under specified threshold limits. Consult our team for specific corporate tax or structured payroll planning.</span>
                        </div>

                      </div>
                    </div>
                  ) : (
                    /* GST CALCULATOR */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                      {/* Inputs */}
                      <div className="lg:col-span-5 space-y-5 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Transaction Values</h4>
                        
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Base Principal Amount (₹)</label>
                          <input
                            type="number"
                            value={gstAmount}
                            onChange={(e) => setGstAmount(Math.max(0, Number(e.target.value)))}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">GST Slabs (%)</label>
                          <div className="grid grid-cols-4 gap-2">
                            {[5, 12, 18, 28].map((rate) => (
                              <button
                                key={rate}
                                onClick={() => setGstRate(rate)}
                                className={`py-2 rounded-lg text-xs font-bold tracking-wider transition-all border ${
                                  gstRate === rate 
                                    ? 'bg-primary text-white border-primary shadow-sm' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {rate}%
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Calculation Model</label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => setGstType('exclusive')}
                              className={`py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase border transition-all ${
                                gstType === 'exclusive' 
                                  ? 'bg-white border-primary text-primary font-bold shadow-sm' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              Add GST (Exclusive)
                            </button>
                            <button
                              onClick={() => setGstType('inclusive')}
                              className={`py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase border transition-all ${
                                gstType === 'inclusive' 
                                  ? 'bg-white border-primary text-primary font-bold shadow-sm' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              Extract GST (Inclusive)
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Transaction Type</label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => setGstTransaction('intra')}
                              className={`py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase border transition-all ${
                                gstTransaction === 'intra' 
                                  ? 'bg-white border-primary text-primary font-bold shadow-sm' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              Intra-State (CGST + SGST)
                            </button>
                            <button
                              onClick={() => setGstTransaction('inter')}
                              className={`py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase border transition-all ${
                                gstTransaction === 'inter' 
                                  ? 'bg-white border-primary text-primary font-bold shadow-sm' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              Inter-State (IGST)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Display Receipt Results */}
                      <div className="lg:col-span-7 flex flex-col justify-between bg-slate-50/20 border border-slate-200/60 rounded-2xl p-6 md:p-8">
                        <div className="space-y-6">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3">Filing & Invoice Summary</h4>
                          
                          <div className="space-y-4">
                            <div className="flex justify-between items-center py-1">
                              <span className="text-slate-500 font-medium text-sm">Net Taxable Value (Principal)</span>
                              <span className="text-slate-800 font-bold text-lg">₹{gstResult?.originalAmount.toLocaleString('en-IN') || 0}</span>
                            </div>

                            <div className="flex justify-between items-center py-1">
                              <span className="text-slate-500 font-medium text-sm">Calculated GST ({gstRate}%)</span>
                              <span className="text-slate-800 font-bold text-lg">₹{gstResult?.gstAmount.toLocaleString('en-IN') || 0}</span>
                            </div>

                            {gstTransaction === 'intra' ? (
                              <div className="space-y-2.5 pl-4 border-l-2 border-slate-200 py-1">
                                <div className="flex justify-between text-xs text-slate-400">
                                  <span>CGST (Central GST - {gstRate / 2}%)</span>
                                  <span>₹{gstResult?.cgst.toLocaleString('en-IN') || 0}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-400">
                                  <span>SGST (State GST - {gstRate / 2}%)</span>
                                  <span>₹{gstResult?.sgst.toLocaleString('en-IN') || 0}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2.5 pl-4 border-l-2 border-slate-200 py-1">
                                <div className="flex justify-between text-xs text-slate-400">
                                  <span>IGST (Integrated GST - {gstRate}%)</span>
                                  <span>₹{gstResult?.igst.toLocaleString('en-IN') || 0}</span>
                                </div>
                              </div>
                            )}

                            <div className="border-t border-dashed border-slate-200 pt-4 mt-2 flex justify-between items-center">
                              <span className="text-primary font-bold text-base">Grand Billing Total</span>
                              <span className="text-primary font-extrabold text-2xl">₹{gstResult?.totalAmount.toLocaleString('en-IN') || 0}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-slate-100 flex gap-3">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(`GST INVOICE BREAKDOWN:\nPrincipal: ₹${gstResult?.originalAmount}\nGST (${gstRate}%): ₹${gstResult?.gstAmount}\nGrand Total: ₹${gstResult?.totalAmount}`);
                              toast.success('Breakdown copied successfully');
                            }}
                            className="flex-1 bg-primary text-white py-3.5 rounded-xl text-xs font-semibold uppercase tracking-widest hover:bg-secondary transition-all flex items-center justify-center gap-2 shadow-sm"
                          >
                            <Copy className="h-4 w-4" />
                            Copy Invoice Text
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* --- TAB 2: COMPLIANCE DEADLINES --- */}
              {activeTab === 'deadlines' && (
                <div>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-6 mb-8 gap-4">
                    <div>
                      <h3 className="text-2xl font-bold text-primary flex items-center gap-2">
                        <Calendar className="h-6 w-6 text-secondary" />
                        Statutory Compliance Calendar
                      </h3>
                      <p className="text-slate-500 text-xs mt-1">Stay updated with structural regulatory filing timelines for businesses and individuals in India.</p>
                    </div>
                    
                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-full border border-slate-200 w-fit">
                      {['All', 'GST', 'Income Tax', 'Corporate'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedDeadlineCategory(cat as any)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                            selectedDeadlineCategory === cat ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Timeline Cards Container */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {deadlines
                      .filter(d => selectedDeadlineCategory === 'All' || d.category === selectedDeadlineCategory)
                      .map((deadline) => {
                        const isClose = deadline.daysRemaining <= 10;
                        return (
                          <div 
                            key={deadline.id}
                            className={`border rounded-2xl p-6 transition-all duration-300 relative flex flex-col justify-between min-h-[220px] bg-white ${
                              isClose 
                                ? 'border-amber-200 shadow-md shadow-amber-500/[0.02] hover:border-amber-300' 
                                : 'border-slate-200/80 hover:border-slate-300'
                            }`}
                          >
                            <div>
                              {/* Header tags */}
                              <div className="flex items-center justify-between mb-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest ${
                                  deadline.category === 'GST' 
                                    ? 'bg-blue-50 border border-blue-100 text-blue-600' 
                                    : deadline.category === 'Income Tax'
                                      ? 'bg-amber-50 border border-amber-100 text-amber-600'
                                      : 'bg-purple-50 border border-purple-100 text-purple-600'
                                }`}>
                                  {deadline.category}
                                </span>
                                
                                <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{new Date(deadline.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                              </div>

                              <h4 className="text-base font-bold text-primary mb-2 line-clamp-1">{deadline.title}</h4>
                              <p className="text-slate-500 text-xs leading-relaxed text-justify line-clamp-3 mb-4">{deadline.description}</p>
                            </div>

                            {/* Remaining status */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Status</span>
                              
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-block w-2 h-2 rounded-full ${isClose ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                                <span className={`text-xs font-bold ${isClose ? 'text-amber-600' : 'text-slate-700'}`}>
                                  {deadline.daysRemaining === 0 ? 'Due Today' : `${deadline.daysRemaining} Days Left`}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Sync Alert */}
                  <div className="bg-[#FAFBFD] p-4 rounded-xl border border-slate-100 mt-8 flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <p className="text-slate-500 text-xs">
                      <strong>Automatic Reminder Service:</strong> Register or login on our Client Portal to get direct, customized WhatsApp and email reminders 7 days prior to any corporate compliance deadlines.
                    </p>
                  </div>
                </div>
              )}

              {/* --- TAB 3: DOCUMENT CHECKLISTS --- */}
              {activeTab === 'checklist' && (
                <div>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-6 mb-8 gap-4">
                    <div>
                      <h3 className="text-2xl font-bold text-primary flex items-center gap-2">
                        <CheckSquare className="h-6 w-6 text-secondary" />
                        Compliance Document Checklist
                      </h3>
                      <p className="text-slate-500 text-xs mt-1">Interactively review and check-off the mandated documentation checklist for corporate, taxation, and secretarial filings.</p>
                    </div>

                    {/* Service Selector */}
                    <div className="relative">
                      <select
                        value={selectedService}
                        onChange={(e) => {
                          setSelectedService(e.target.value);
                          setCompletedItems({});
                        }}
                        className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all outline-none"
                      >
                        <option value="gst_reg">GST Registration</option>
                        <option value="itr_filing">Individual ITR Filing</option>
                        <option value="llp_inc">LLP / Co Incorporation</option>
                        <option value="audit_prep">Tax Audit Preparation</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                    {/* Check items list */}
                    <div className="lg:col-span-7 space-y-3">
                      {currentChecklist.items.map((item) => {
                        const isDone = !!completedItems[item.id];
                        return (
                          <div 
                            key={item.id}
                            onClick={() => handleToggleCheck(item.id)}
                            className={`flex items-start gap-4 p-4 rounded-2xl border transition-all duration-250 cursor-pointer select-none ${
                              isDone 
                                ? 'bg-primary/[0.01] border-primary/20 shadow-sm' 
                                : 'bg-white border-slate-200/80 hover:border-slate-300'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 border transition-all ${
                              isDone 
                                ? 'bg-primary border-primary text-white' 
                                : 'bg-white border-slate-300 text-transparent'
                            }`}>
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className={`text-sm font-bold text-primary transition-all ${isDone ? 'line-through opacity-50' : ''}`}>
                                  {item.name}
                                </h4>
                                <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 tracking-wider rounded ${
                                  item.required 
                                    ? 'bg-rose-50 text-rose-500 border border-rose-100' 
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {item.required ? 'Mandatory' : 'Optional'}
                                </span>
                              </div>
                              <p className={`text-slate-500 text-xs mt-1 transition-all ${isDone ? 'opacity-40' : ''}`}>
                                {item.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress Panel */}
                    <div className="lg:col-span-5 bg-slate-50 border border-slate-200/60 rounded-2xl p-6 md:p-8 flex flex-col justify-between">
                      <div className="space-y-6">
                        <div className="text-center">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Completion Status</span>
                          <h4 className="text-5xl font-extrabold text-primary mt-2">{progressPercent}%</h4>
                          <p className="text-xs text-slate-500 mt-1">{completedItemsCount} of {totalItemsCount} documents prepared</p>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full transition-all duration-300" 
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>

                        <div className="border-t border-slate-200 pt-4 space-y-3 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Service Requested:</span>
                            <span className="text-slate-800 font-bold">{currentChecklist.serviceName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Filing Category:</span>
                            <span className="text-slate-800 font-bold">{currentChecklist.category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 mt-8">
                        <button 
                          onClick={handleCopyChecklist}
                          className="w-full bg-primary hover:bg-secondary text-white py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Copy className="h-4 w-4" />
                          Copy Clipboard
                        </button>
                        <button 
                          onClick={handleResetChecklist}
                          className="w-full bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200 py-3 rounded-xl text-xs font-semibold tracking-widest uppercase transition-all"
                        >
                          Reset Checklist
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB 4: SERVICE FEE ESTIMATOR --- */}
              {activeTab === 'pricing' && (
                <div>
                  <div className="border-b border-slate-100 pb-6 mb-8">
                    <h3 className="text-2xl font-bold text-primary flex items-center gap-2">
                      <Briefcase className="h-6 w-6 text-secondary" />
                      Professional Service Fee Estimator
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">Configure your business criteria and operational volume to obtain an upfront price range estimation.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                    {/* Inputs */}
                    <div className="lg:col-span-7 space-y-6">
                      
                      {/* Turnover Tier */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Annual Turn-Over of Entity</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[
                            { id: 'under_10l', label: '< ₹10 Lakh' },
                            { id: '10l_50l', label: '₹10L - ₹50L' },
                            { id: '50l_2cr', label: '₹50L - ₹2 Crore' },
                            { id: 'above_2cr', label: '> ₹2 Crore' }
                          ].map((tier) => (
                            <button
                              key={tier.id}
                              onClick={() => setTurnover(tier.id)}
                              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                                turnover === tier.id 
                                  ? 'bg-primary text-white border-primary shadow-sm' 
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {tier.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Business Constitution */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Business Constitution Type</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[
                            { id: 'proprietorship', label: 'Proprietorship / Individual' },
                            { id: 'partnership', label: 'Partnership / LLP' },
                            { id: 'pvt_ltd', label: 'Pvt Ltd Company' }
                          ].map((type) => (
                            <button
                              key={type.id}
                              onClick={() => setBusinessType(type.id)}
                              className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                                businessType === type.id 
                                  ? 'bg-primary text-white border-primary shadow-sm' 
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {type.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Service check tags */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Select Services Required</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { id: 'gst_returns', label: 'GST Monthly Filings & Reconciliation' },
                            { id: 'bookkeeping', label: 'End-to-End Accounting & Bookkeeping' },
                            { id: 'itr_filing', label: 'Annual Income Tax Return (ITR) Filing' },
                            { id: 'audit', label: 'Statutory or Internal Audits (Sec 44AB)' },
                            { id: 'startup_compliance', label: 'Startup Advisory & ROC Filings' }
                          ].map((svc) => {
                            const selected = neededServices.includes(svc.id);
                            return (
                              <div
                                key={svc.id}
                                onClick={() => handleToggleServiceNeed(svc.id)}
                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                                  selected 
                                    ? 'border-primary bg-primary/[0.01]' 
                                    : 'border-slate-200 bg-white hover:bg-slate-50'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                  selected ? 'bg-primary border-primary text-white' : 'bg-white border-slate-300 text-transparent'
                                }`}>
                                  <Check className="h-3 w-3" strokeWidth={3} />
                                </div>
                                <span className="text-xs font-semibold text-slate-700">{svc.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Output Price Result Card */}
                    <div className="lg:col-span-5 bg-gradient-to-br from-primary to-[#1e2f5c] text-white rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-xl">
                      <div className="space-y-6">
                        <div className="inline-flex items-center space-x-1.5 bg-white/10 border border-white/20 text-white font-bold tracking-widest uppercase text-[8px] px-2.5 py-1 rounded-full">
                          <span>Custom Estimate</span>
                        </div>
                        
                        <div>
                          <span className="text-white/60 text-xs uppercase tracking-wider font-semibold block mb-1">Estimated Retainer Slabs</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-4xl md:text-5xl font-extrabold text-white">₹{pricingEstimate.min.toLocaleString('en-IN')}</span>
                            <span className="text-white/40 text-lg font-medium">-</span>
                            <span className="text-4xl md:text-5xl font-extrabold text-white">₹{pricingEstimate.max.toLocaleString('en-IN')}</span>
                          </div>
                          <span className="text-white/50 text-[10px] mt-1.5 block">Estimated annual/project retainer range.</span>
                        </div>

                        <div className="space-y-3.5 border-t border-white/10 pt-5 text-xs text-white/80">
                          <div className="flex justify-between">
                            <span className="text-white/60">Constitution:</span>
                            <span className="font-bold text-white capitalize">{businessType.replace('_', ' ')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/60">Turnover Category:</span>
                            <span className="font-bold text-white capitalize">{turnover.replace('under_', '< ').replace('above_', '> ').replace('_', ' - ')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/60">Selected Addons:</span>
                            <span className="font-bold text-white">{neededServices.length} Services Selected</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 mt-8">
                        <div className="flex items-start gap-2 text-[10px] text-white/60 bg-white/5 p-3 rounded-xl border border-white/10">
                          <AlertCircle className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                          <span>Fee ranges shown are indicative for standard operations. Actual packages are finalized post-consultation depending on ledger size and transaction volumes.</span>
                        </div>

                        <a 
                          href="/#contact"
                          className="block text-center w-full bg-secondary hover:bg-white hover:text-primary text-primary py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-md"
                        >
                          Book Personal Audit
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
