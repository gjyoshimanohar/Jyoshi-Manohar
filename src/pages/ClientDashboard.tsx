import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  query, 
  where, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { 
  Download, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Plus, 
  Trash2, 
  User as UserIcon, 
  Lock, 
  Mail, 
  Filter, 
  Calendar, 
  ChevronRight, 
  Loader2, 
  Shield, 
  ArrowRight, 
  Upload, 
  Activity, 
  Briefcase, 
  FileSpreadsheet,
  CheckCircle2,
  FileCheck2,
  RefreshCw,
  LogOut,
  Sparkles,
  Search,
  ExternalLink
} from 'lucide-react';

// Pre-defined interfaces
interface Application {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  type: string;
  status: 'Pending Documents' | 'Under Review' | 'Submitted to Department' | 'Query Raised' | 'Approved & Issued';
  currentStep: string;
  description: string;
  updatedAt: number;
  createdAt: number;
  estimatedCompletion?: string;
  steps?: { title: string; description: string; date: string; completed: boolean }[];
}

interface ClientDocument {
  id: string;
  userId: string;
  userEmail: string;
  name: string;
  description: string;
  url: string;
  fileType: string;
  size: string;
  uploadedAt: number;
  category?: string;
}

interface ComplianceFiling {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  serviceType: string; // GST, Income Tax, ROC, Auditing, etc.
  dueDate: number; // timestamp
  status: 'Filed' | 'In Progress' | 'Pending Client Action' | 'Upcoming';
  financialYear: string;
  period: string;
  arn?: string;
  filedDate?: string | null;
}

export default function ClientDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Admin Check
  const [isAdmin, setIsAdmin] = useState(false);

  // Dashboard Data State
  const [applications, setApplications] = useState<Application[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [complianceFilings, setComplianceFilings] = useState<ComplianceFiling[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Admin and Client Selector (for Admin to view specific client data)
  const [clients, setClients] = useState<{ uid: string; email: string; displayName?: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedClientEmail, setSelectedClientEmail] = useState<string>('');

  // Active Tab/Filter State
  const [activeTab, setActiveTab] = useState<'applications' | 'documents' | 'compliance' | 'admin'>('applications');
  const [serviceFilter, setServiceFilter] = useState<string>('All');

  // Form states for Admin actions
  const [newAppTitle, setNewAppTitle] = useState('');
  const [newAppType, setNewAppType] = useState('GST Registration');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [newAppStatus, setNewAppStatus] = useState<Application['status']>('Pending Documents');
  const [newAppStep, setNewAppStep] = useState('');
  const [newAppEstComp, setNewAppEstComp] = useState('');

  const [newDocName, setNewDocName] = useState('');
  const [newDocDesc, setNewDocDesc] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('Certificates');
  const [newDocSize, setNewDocSize] = useState('240 KB');
  const [newDocContent, setNewDocContent] = useState('');

  const [newFilingTitle, setNewFilingTitle] = useState('');
  const [newFilingService, setNewFilingService] = useState('GST');
  const [newFilingFY, setNewFilingFY] = useState('2025-26');
  const [newFilingPeriod, setNewFilingPeriod] = useState('May 2026');
  const [newFilingDueDate, setNewFilingDueDate] = useState('');
  const [newFilingStatus, setNewFilingStatus] = useState<ComplianceFiling['status']>('Upcoming');
  const [newFilingARN, setNewFilingARN] = useState('');

  // Local feedback message
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Set real-time listener for Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsAdmin(currentUser.email === 'gjyoshimanohar@gmail.com');
        // If logged in, automatically trigger seeding if they have no records yet
        await ensureDataIsSeeded(currentUser);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Set real-time database listeners
  useEffect(() => {
    if (!user) return;

    setDataLoading(true);
    // Determine which clients to view: Admin views selectedClientId or all, Client views only their user.uid
    const targetUserId = isAdmin ? (selectedClientId || user.uid) : user.uid;

    const appsQuery = query(collection(db, 'applications'), where('userId', '==', targetUserId));
    const docsQuery = query(collection(db, 'documents'), where('userId', '==', targetUserId));
    const filingsQuery = query(collection(db, 'compliance_filings'), where('userId', '==', targetUserId));

    const unsubscribeApps = onSnapshot(appsQuery, (snapshot) => {
      const list: Application[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Application);
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      setApplications(list);
      setDataLoading(false);
    }, (error) => {
      console.error("Error reading applications: ", error);
    });

    const unsubscribeDocs = onSnapshot(docsQuery, (snapshot) => {
      const list: ClientDocument[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ClientDocument);
      });
      list.sort((a, b) => b.uploadedAt - a.uploadedAt);
      setDocuments(list);
    }, (error) => {
      console.error("Error reading documents: ", error);
    });

    const unsubscribeFilings = onSnapshot(filingsQuery, (snapshot) => {
      const list: ComplianceFiling[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ComplianceFiling);
      });
      list.sort((a, b) => a.dueDate - b.dueDate);
      setComplianceFilings(list);
    }, (error) => {
      console.error("Error reading compliance filings: ", error);
    });

    // If admin is logged in, fetch list of active clients securely
    if (isAdmin) {
      const loadClients = async () => {
        try {
          const uSnap = await getDocs(collection(db, 'users'));
          const clientList: { uid: string; email: string; displayName?: string }[] = [];
          uSnap.forEach((docRef) => {
            const data = docRef.data();
            clientList.push({
              uid: data.uid || docRef.id,
              email: data.email,
              displayName: data.displayName
            });
          });
          setClients(clientList);
        } catch (error) {
          console.error("Error loading clients list:", error);
        }
      };
      loadClients();
    }

    return () => {
      unsubscribeApps();
      unsubscribeDocs();
      unsubscribeFilings();
    };
  }, [user, isAdmin, selectedClientId]);

  // Seeding engine: Auto seed realistic CA dashboard data on first login so users see immediate real-time results
  const ensureDataIsSeeded = async (activeUser: User) => {
    try {
      const checkQuery = query(collection(db, 'applications'), where('userId', '==', activeUser.uid));
      const checkSnap = await getDocs(checkQuery);
      
      // If no application exists, let's create a beautiful profile mapping with default files
      if (checkSnap.empty) {
        console.log("Seeding premium demo dashboard items to Firestore securely for key: ", activeUser.email);
        
        // 1. Create a user document in users collection if not exists
        await setDoc(doc(db, 'users', activeUser.uid), {
          uid: activeUser.uid,
          email: activeUser.email,
          displayName: activeUser.displayName || activeUser.email?.split('@')[0] || 'Premium Client',
          createdAt: Date.now()
        }, { merge: true });

        // 2. Prepare seed Applications
        const sampleApps: Omit<Application, 'id'>[] = [
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || '',
            title: "GST Registration Certificate (Regular GST)",
            type: "GST Service",
            status: "Submitted to Department",
            currentStep: "Pending departmental field inspection of regional physical address proof",
            description: "Registration of business entity to obtain official GSTIN license for legal commercial operations under GST standard regime.",
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
            updatedAt: Date.now() - 12 * 60 * 60 * 1000,
            estimatedCompletion: "June 15, 2026",
            steps: [
              { title: "Documents Collection", description: "PAN card, Aadhaar, bank proof, and office rent deed verified", date: "May 25, 2026", completed: true },
              { title: "Application Compilation", description: "Form GST REG-01 prepared and client signatures validated", date: "May 29, 2026", completed: true },
              { title: "Submission", description: "Form ARN-892701 issued by Ministry of Revenue", date: "June 02, 2026", completed: true },
              { title: "Departmental Review", description: "Awaiting physical address verification by state tax officer", date: "June 05, 2026", completed: false },
              { title: "Approval & Issuance", description: "GSTIN generated and certified GST-06 certificate delivery", date: "TBD", completed: false }
            ]
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || '',
            title: "Manohar Wealth Private Limited Incorporation",
            type: "Corporate Compliance",
            status: "Approved & Issued",
            currentStep: "COI issued by MCA ROC. Corporate Identity Number generated.",
            description: "End-to-end incorporation including SPICe+ filing, Name Approval (RUN), MOA & AOA Drafting, and allotment of PAN/TAN.",
            createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
            updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
            estimatedCompletion: "Completed",
            steps: [
              { title: "DSC & DIN Allotment", description: "Digital Signatures obtained and Director Identification Numbers assigned", date: "May 10, 2026", completed: true },
              { title: "RUN Name Reservation", description: "Business name reservation approved by MCA central registration center", date: "May 15, 2026", completed: true },
              { title: "SPICe+ Part B Filing", description: "Incorporation documents and declarations submitted securely", date: "May 20, 2026", completed: true },
              { title: "COI & Certificate Release", description: "Certificate of Incorporation received and MCA database refreshed", date: "June 04, 2026", completed: true }
            ]
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || '',
            title: "Income Tax Return (ITR-3) Filing FY 2025-26",
            type: "Direct Tax",
            status: "Pending Documents",
            currentStep: "Awaiting client's demat capital gains statement & housing loan interest certificate",
            description: "Strategic tax planning, preparation, and comprehensive filing of personal/business income tax returns to optimize allowances and deductions.",
            createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
            updatedAt: Date.now(),
            estimatedCompletion: "July 31, 2026",
            steps: [
              { title: "AIS/TIS Analysis", description: "Scanned comprehensive Annual Information System statement against client bank books", date: "June 04, 2026", completed: true },
              { title: "Client Documents Upload", description: "Waiting for Demat capital gains ledger, rental proof, and insurance premium bills", date: "Awaiting Upload", completed: false },
              { title: "Draft Tax Computation", description: "Tax calculation under old vs new tax regime", date: "Planned", completed: false },
              { title: "Submission & E-Verification", description: "Final ITR dispatch and verification via Aadhaar OTP", date: "Planned", completed: false }
            ]
          }
        ];

        for (const app of sampleApps) {
          await addDoc(collection(db, 'applications'), app);
        }

        // 3. Prepare seed Documents (certificates/filings)
        const sampleDocs: Omit<ClientDocument, 'id'>[] = [
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || '',
            name: "Certificate of Incorporation - MCA.pdf",
            description: "Certified Memorandum of Incorporation for Manohar Wealth Services Private Limited from standard registry.",
            url: "#",
            fileType: "PDF",
            size: "442 KB",
            uploadedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
            category: "Corporate Certificates"
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || '',
            name: "GST Registration Certificate Form GST-06.pdf",
            description: "Authorized regular tax registration cert with complete schedules containing core business fields.",
            url: "#",
            fileType: "PDF",
            size: "305 KB",
            uploadedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
            category: "Tax Licensing"
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || '',
            name: "Provisional Balance Sheet & PL Draft.xlsx",
            description: "Audited provisional financials mapped with complete general ledgers for financing evaluation.",
            url: "#",
            fileType: "Excel",
            size: "1.2 MB",
            uploadedAt: Date.now() - 12 * 60 * 60 * 1000,
            category: "Financial Statements"
          }
        ];

        for (const docObj of sampleDocs) {
          await addDoc(collection(db, 'documents'), docObj);
        }

        // 4. Prepare seed Compliance Tracker
        const sampleFilings: Omit<ComplianceFiling, 'id'>[] = [
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || '',
            title: "GSTR-1 GST Monthly Outward Supplies (May 2026)",
            serviceType: "GST",
            dueDate: Date.now() + 5 * 24 * 60 * 60 * 1000, // early June 11
            status: "In Progress",
            financialYear: "2026-27",
            period: "May 2026"
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || '',
            title: "Advance Tax Installment - Q1 (15% Share)",
            serviceType: "Income Tax",
            dueDate: Date.now() + 9 * 24 * 60 * 60 * 1000, // June 15
            status: "Pending Client Action",
            financialYear: "2026-27",
            period: "Q1 FY27"
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || '',
            title: "GSTR-3B Monthly Tax Computation (April 2026)",
            serviceType: "GST",
            dueDate: Date.now() - 16 * 24 * 60 * 60 * 1000, // May 20
            status: "Filed",
            financialYear: "2026-27",
            period: "April 2026",
            arn: "ARN-GST209930812",
            filedDate: "2026-05-18"
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || '',
            title: "Corporate Income Tax Filing (ITR-6) FY25-26",
            serviceType: "Income Tax",
            dueDate: Date.now() + 115 * 24 * 60 * 60 * 1000, // Sept 30
            status: "Upcoming",
            financialYear: "2025-26",
            period: "Annual Return"
          }
        ];

        for (const filing of sampleFilings) {
          await addDoc(collection(db, 'compliance_filings'), filing);
        }
      }
    } catch (err) {
      console.error("Failed to seed premium default user dashboard widgets:", err);
    }
  };

  // Auth Handling
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Create user doc
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: displayName || email.split('@')[0],
          isAdmin: false,
          createdAt: Date.now()
        }, { merge: true });
        
        await ensureDataIsSeeded(cred.user);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Auth error: ", error);
      setAuthError(error.message || "Authentication process failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Direct demo logging with a preconfigured user or dynamically created client for seamless preview testing
  const handleDemoSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    const demoEmail = 'demo.client@jyoshimanohar.com';
    const demoPassword = 'clientPass123';

    try {
      // Attempt login
      await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
    } catch (loginErr: any) {
      // If error (such as user not existing in clean database instances), create account immediately
      if (loginErr.code === 'auth/user-not-found' || loginErr.message?.includes('not found') || loginErr.code === 'auth/invalid-credential') {
        try {
          const cred = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
          await setDoc(doc(db, 'users', cred.user.uid), {
            uid: cred.user.uid,
            email: demoEmail,
            displayName: "Premium Demo Client",
            isAdmin: false,
            createdAt: Date.now()
          }, { merge: true });

          await ensureDataIsSeeded(cred.user);
        } catch (createErr: any) {
          setAuthError("Failed to initialize demo credential. Please try registering with a custom email instead.");
        }
      } else {
        setAuthError(loginErr.message || "Demo login error.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setApplications([]);
    setDocuments([]);
    setComplianceFilings([]);
    setSelectedClientId('');
  };

  // Dynamic on-the-fly PDF and Tax summary report generator
  const triggerDocumentDownload = (file: ClientDocument) => {
    // Elegant client-side simulated PDF generator making actual browser files down-ready
    const docHeader = `
========================================================================
             OFFICIAL PROFESSIONAL LEGAL & FINANCIAL MEMORANDUM
                     OFFICE OF CA JYOSHI MANOHAR
             Chartered Accountants & Financial Advisory
========================================================================

Document Name       : ${file.name}
Sub-Category        : ${file.fileType} Document
Classification      : Highly Confidential & Attorney-Client Protected
Issue Date          : ${new Date(file.uploadedAt).toLocaleString()}
Authorized Client   : ${user?.email || 'N/A'}
Service Sector      : ${file.category || 'General Audit & Taxes'}

===================================================================
1. EXECUTIVE SUMMARY & STATUTORY CERTIFICATION
===================================================================
This document serves as an official certified audit certificate and ledger registry issued by the corporate bureau under the representation of CA Jyoshi Manohar.
The financial records, applications, declarations, and tax forms submitted have been thoroughly assessed against appropriate schedules of the MCA Registry and the National Board of Direct Taxes, Government of India.

===================================================================
2. REGISTERED DETAILS & FILED ACCOUNT LEDGERS
===================================================================
- Client Id         : ${file.userId}
- Associated Email  : ${file.userEmail}
- Document Metadata : ${file.description}
- Verification Code : MD5-HASH-${file.id.substring(0, 8).toUpperCase()}-${Date.now().toString().substring(5, 12)}
- Registered Status : ACTIVE LICENSE / FILED

===================================================================
3. AUDIT STATEMENT OF INTEGRITY
===================================================================
The organization complies fully with required accounting declarations, internal compliance metrics, and audit validations for the current financial assessment year. All values conform truthfully to statutory declarations and audited ledgers of business income.

Issued and Certified under Electronic Signature,
CA Jyoshi Manohar, FCA & Associates
Stewardship, Accuracy, Legacy.
===================================================================
`;

    // Package as native Blob and create immediate link
    const blob = new Blob([docHeader], { type: 'text/plain' });
    const blobUrl = URL.createObjectURL(blob);
    
    const dLink = document.createElement('a');
    dLink.href = blobUrl;
    dLink.download = file.name.endsWith('.xlsx') || file.name.endsWith('.pdf') ? file.name : `${file.name}.txt`;
    document.body.appendChild(dLink);
    dLink.click();
    document.body.removeChild(dLink);
    URL.revokeObjectURL(blobUrl);

    setFeedback({
      message: `"${file.name}" has been dynamic-compiled and downloaded to your local device successfully!`,
      type: 'success'
    });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Create Application (Admin Flow)
  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert("Please select a target client first.");
      return;
    }
    try {
      const parentUserEmail = clients.find(c => c.uid === selectedClientId)?.email || selectedClientEmail || "client@manohar.com";
      const newApp: Omit<Application, 'id'> = {
        userId: selectedClientId,
        userEmail: parentUserEmail,
        title: newAppTitle,
        type: newAppType,
        status: newAppStatus,
        currentStep: newAppStep || "Document submission review in progress",
        description: newAppDesc || "General corporate consultative portfolio.",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        estimatedCompletion: newAppEstComp || "TBD",
        steps: [
          { title: "Application Created", description: "CA Jyoshi Manohar initialized the tax filing process", date: new Date().toLocaleDateString(), completed: true },
          { title: "Internal Verification", description: newAppStep || "Awaiting document verification", date: "In Progress", completed: false }
        ]
      };

      await addDoc(collection(db, 'applications'), newApp);
      setNewAppTitle('');
      setNewAppDesc('');
      setNewAppStep('');
      setNewAppEstComp('');
      setFeedback({ message: "Successfully created new target client application status block!", type: 'success' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error(err);
      setFeedback({ message: "Failed to create application entry in Firestore: " + err.message, type: 'error' });
    }
  };

  // Create Document (Admin Flow)
  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert("Please select a target client first.");
      return;
    }
    try {
      const parentUserEmail = clients.find(c => c.uid === selectedClientId)?.email || selectedClientEmail || "client@manohar.com";
      const newDocument: Omit<ClientDocument, 'id'> = {
        userId: selectedClientId,
        userEmail: parentUserEmail,
        name: newDocName.endsWith('.pdf') || newDocName.endsWith('.xlsx') ? newDocName : `${newDocName}.pdf`,
        description: newDocDesc || "CA-certified official client report file.",
        url: "#",
        fileType: newDocName.endsWith('.xlsx') ? "Excel" : "PDF",
        size: newDocSize || "240 KB",
        uploadedAt: Date.now(),
        category: newDocCategory
      };

      await addDoc(collection(db, 'documents'), newDocument);
      setNewDocName('');
      setNewDocDesc('');
      setFeedback({ message: "Successfully delivered official document file to client portal!", type: 'success' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error(err);
      setFeedback({ message: "Cloud save error: " + err.message, type: 'error' });
    }
  };

  // Create Compliance Filing (Admin Flow)
  const handleCreateFiling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert("Please select a target client first.");
      return;
    }
    try {
      const parentUserEmail = clients.find(c => c.uid === selectedClientId)?.email || selectedClientEmail || "client@manohar.com";
      const timestampDueDate = newFilingDueDate ? new Date(newFilingDueDate).getTime() : Date.now() + 30 * 24 * 60 * 60 * 1000;
      
      const newFiling: Omit<ComplianceFiling, 'id'> = {
        userId: selectedClientId,
        userEmail: parentUserEmail,
        title: newFilingTitle,
        serviceType: newFilingService,
        dueDate: timestampDueDate,
        status: newFilingStatus,
        financialYear: newFilingFY,
        period: newFilingPeriod,
        arn: newFilingARN || undefined,
        filedDate: newFilingStatus === 'Filed' ? new Date().toISOString().split('T')[0] : null
      };

      await addDoc(collection(db, 'compliance_filings'), newFiling);
      setNewFilingTitle('');
      setNewFilingARN('');
      setFeedback({ message: "Successfully loaded real-time compliance tracker filing item!", type: 'success' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error(err);
      setFeedback({ message: "Filing tracker registry error: " + err.message, type: 'error' });
    }
  };

  // Core administrative updater to advance steps and statuses seamlessly
  const handleUpdateAppStatus = async (appId: string, status: Application['status'], nextStep: string) => {
    try {
      await updateDoc(doc(db, 'applications', appId), {
        status: status,
        currentStep: nextStep,
        updatedAt: Date.now()
      });
      setFeedback({ message: "Perfect! Client status advanced successfully.", type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert("Status edit failed: " + err.message);
    }
  };

  // Delete operational items
  const handleDeleteItem = async (col: 'applications' | 'documents' | 'compliance_filings', itemId: string) => {
    if (!confirm("Are you absolutely sure you want to remove this client record permanently? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, col, itemId));
      setFeedback({ message: "Item deleted successfully from client registers.", type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  // Helper sorting and visual mappings
  const getStatusBadge = (status: Application['status']) => {
    const maps = {
      'Pending Documents': 'bg-amber-100 text-amber-800 border-amber-200/50',
      'Under Review': 'bg-blue-100 text-blue-800 border-blue-200/50',
      'Submitted to Department': 'bg-purple-100 text-purple-800 border-purple-200/50',
      'Query Raised': 'bg-red-100 text-red-800 border-red-200/50',
      'Approved & Issued': 'bg-emerald-100 text-emerald-800 border-emerald-200/50'
    };
    return maps[status] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const getFilingStatusBadge = (status: ComplianceFiling['status']) => {
    const maps = {
      'Filed': 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      'In Progress': 'bg-blue-50 text-blue-700 border-blue-200/80',
      'Pending Client Action': 'bg-amber-50 text-amber-700 border-amber-200/80',
      'Upcoming': 'bg-slate-50 text-slate-600 border-slate-200'
    };
    return maps[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm font-medium text-slate-600 tracking-wider font-mono">ESTABLISHING SECURE AUDIT CONNS...</p>
        </div>
      </div>
    );
  }

  // LOGOUT OR NOT SIGNED IN VIEW
  if (!user) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white border border-slate-100 shadow-2xl p-8 sm:p-12 rounded-3xl"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-primary flex items-center justify-center rounded-xl mx-auto mb-4 shadow-md">
                <span className="text-white font-serif font-semibold text-xl tracking-tighter">JM</span>
              </div>
              <h2 className="text-2xl font-serif text-slate-900 tracking-tight font-medium">
                CA Client Portal
              </h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">
                Secure Financial Command Dashboard
              </p>
            </div>

            {/* Error alerts */}
            {authError && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-50 border border-red-200/60 rounded-xl p-4 text-xs text-red-600 font-medium mb-6 flex items-start gap-2"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
                    Full Name / Enterprise Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium text-slate-950 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      placeholder="e.g., Manohar Enterprises"
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium text-slate-950 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                    Portal Security Pin / Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium text-slate-950 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="••••••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-primary text-white py-3.5 rounded-xl font-medium text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center space-x-2 mt-4 cursor-pointer"
              >
                {authLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>{isSignUp ? "Generate Secure Account" : "Access Command Cabin"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Visual Divider */}
            <div className="relative my-6 text-center">
              <span className="absolute inset-x-0 top-1/2 h-px bg-slate-100" />
              <span className="relative bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Testing Command
              </span>
            </div>

            {/* Quick Demo Access Button */}
            <button
              onClick={handleDemoSignIn}
              disabled={authLoading}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-slate-700 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 group transition-all"
            >
              <Sparkles className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform duration-300" />
              <span>Simulate client dashboard (Instant demo)</span>
            </button>

            {/* Switch sign-in mode */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError(null);
                }}
                className="text-xs text-slate-500 hover:text-primary transition-colors focus:outline-none"
              >
                {isSignUp 
                  ? "Already registered? Sign in to your dashboard" 
                  : "New client? Setup your legal portal registration here"
                }
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // SIGNED IN VIEW
  return (
    <main className="min-h-screen pt-28 pb-20 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Banner Notification feedback messages */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-24 left-1/2 -translate-x-1/2 z-[80] w-[90%] max-w-lg p-4 rounded-xl border shadow-lg ${
                feedback.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              } flex items-start gap-2`}
            >
              <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
              <div className="text-xs font-semibold">{feedback.message}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Title Ribbon */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 text-primary text-[10px] uppercase font-bold tracking-widest rounded-full w-max border border-primary/10">
              <Shield className="h-3 w-3" />
              <span>Secure CA Terminal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-slate-900 tracking-tight font-medium mt-2">
              Welcome, {user.displayName || user.email?.split('@')[0]}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Active Session Token: <span className="font-mono text-[11px] font-bold bg-slate-100 px-1 rounded text-primary">{user.uid.substring(0, 8).toUpperCase()}</span> • Enterprise Class Encryption Enabled
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <span className="bg-primary hover:bg-slate-900 text-white border border-transparent font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                ADMIN PORTAL ACCESS
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary transition-all whitespace-nowrap cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Admin client switching view */}
        {isAdmin && (
          <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 mb-8 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <h2 className="text-lg font-serif font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span>Admin Control Room (Change Active Client Scope)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Select client in registry</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    const sel = clients.find(c => c.uid === e.target.value);
                    setSelectedClientEmail(sel?.email || '');
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs font-bold text-white outline-none focus:border-primary"
                >
                  <option value="">-- View My Self Account (Default Seeding) --</option>
                  {clients.map(c => (
                    <option key={c.uid} value={c.uid}>
                      {c.displayName || c.email} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Manual email link (Not registered users)</label>
                <input 
                  type="email"
                  placeholder="e.g. client@partner.com"
                  value={selectedClientEmail}
                  onChange={(e) => setSelectedClientEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs font-bold text-white outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!selectedClientEmail) {
                      alert("Please type an email first.");
                      return;
                    }
                    const cleanId = selectedClientEmail.replace(/[^a-zA-Z0-9]/g, '_');
                    try {
                      await setDoc(doc(db, 'users', cleanId), {
                        uid: cleanId,
                        email: selectedClientEmail,
                        displayName: selectedClientEmail.split('@')[0],
                        createdAt: Date.now()
                      });
                      setSelectedClientId(cleanId);
                      alert("Successfully created client profile stub! Initial records seeded.");
                    } catch (e: any) {
                      alert("Failed to create stub: " + e.message);
                    }
                  }}
                  className="w-full bg-primary hover:bg-slate-950 text-white rounded-xl py-3.5 text-xs font-bold uppercase tracking-wide border border-transparent hover:border-slate-800 transition-all text-center"
                >
                  Create client stub
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grid and Tabs layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Navigation drawer rail (Desktop) */}
          <div className="lg:col-span-1 space-y-3">
            <button
              onClick={() => setActiveTab('applications')}
              className={`w-full flex items-center justify-between p-4 rounded-xl text-left transition-all border ${
                activeTab === 'applications'
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-50 border-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">Application tracker</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'applications' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {applications.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`w-full flex items-center justify-between p-4 rounded-xl text-left transition-all border ${
                activeTab === 'documents'
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-50 border-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">Document vaults</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'documents' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {documents.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('compliance')}
              className={`w-full flex items-center justify-between p-4 rounded-xl text-left transition-all border ${
                activeTab === 'compliance'
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-50 border-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">Compliance track</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'compliance' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {complianceFilings.length}
              </span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center justify-between p-4 rounded-xl text-left transition-all border ${
                  activeTab === 'admin'
                    ? 'bg-slate-950 text-white border-slate-950 shadow-md animate-pulse'
                    : 'bg-white text-rose-700 hover:bg-rose-50/50 border-rose-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Upload className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">Deploy data flow</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                  Filing Panel
                </span>
              </button>
            )}

            {/* Quick Consultation help box */}
            <div className="mt-8 bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-serif font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-amber-500" />
                <span>Regulatory updates</span>
              </h3>
              <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                Central Board of Direct Taxes extended non-corporate auditing submissions. Ensure appropriate Form 10A are signed in the portal on time this financial year.
              </p>
              <a href="/#contact" className="inline-flex items-center gap-1 mt-4 text-[10px] font-bold text-primary hover:text-slate-900 uppercase tracking-widest">
                <span>Book expert desk</span>
                <ChevronRight className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Dynamic Content boards */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Real-time Loader Indicator */}
            {dataLoading && (
              <div className="flex items-center space-x-2 bg-white/60 p-4 rounded-xl shadow-sm border border-slate-100">
                <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                <span className="text-xs font-medium text-slate-600">Verifying synchronization across active registers...</span>
              </div>
            )}

            {/* APPLICATION TRACKER BOARD */}
            {activeTab === 'applications' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h2 className="text-lg font-serif font-medium text-slate-900">Active Service Applications ({applications.length})</h2>
                  <div className="flex gap-2 text-xs font-semibold text-slate-500">
                    <span>Live sync</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 animate-ping" />
                  </div>
                </div>

                {applications.length === 0 ? (
                  <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm max-w-xl mx-auto">
                    <FileCheck2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-sm font-bold text-slate-700">No Applications Assigned</h3>
                    <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                      If you recently signed up, our team is seeding standard default documents. Use the Demo Mode or ask CA Jyoshi Manohar Admin to push a target tracking portfolio.
                    </p>
                  </div>
                ) : (
                  applications.map((app) => (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow relative"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{app.type}</span>
                          <h3 className="text-lg font-serif font-medium text-slate-900 mt-1">{app.title}</h3>
                        </div>
                        <span className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full border ${getStatusBadge(app.status)}`}>
                          {app.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed mb-6 bg-slate-50/50 p-4 border border-slate-100/50 rounded-xl">
                        {app.description}
                      </p>

                      {/* Timeline flow */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="h-4 w-4 text-primary" />
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Milestones & Verification Steps</span>
                        </div>
                        
                        <div className="relative border-l-2 border-slate-100 pl-6 ml-3 space-y-6">
                          {app.steps?.map((step, idx) => (
                            <div key={idx} className="relative">
                              <span className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                                step.completed ? 'border-primary ring-4 ring-primary/10' : 'border-slate-200'
                              }`}>
                                {step.completed && <div className="w-1.5 h-1.5 bg-primary rounded-full" />}
                              </span>
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                                <span className={`text-[12px] font-bold ${step.completed ? 'text-slate-900' : 'text-slate-500'}`}>
                                  {step.title}
                                </span>
                                <span className="text-[10px] font-mono tracking-wider font-semibold text-slate-400">
                                  {step.date}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer tracking values */}
                      <div className="border-t border-slate-100/80 pt-4 mt-6 flex flex-wrap justify-between items-center text-xs font-semibold text-slate-500 gap-2">
                        <span>Estimated Complete: <span className="text-slate-800 font-bold">{app.estimatedCompletion || 'TBD'}</span></span>
                        <span>Client Ref: <span className="text-primary font-mono">{app.id?.substring(0, 8).toUpperCase() || 'STUB'}</span></span>
                      </div>

                      {/* Admin update triggers inside the card dynamically */}
                      {isAdmin && (
                        <div className="border-t border-red-50 pt-4 mt-4 bg-rose-50/20 p-4 rounded-xl flex flex-wrap gap-2 justify-between items-center">
                          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-widest flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Quick Advance state</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleUpdateAppStatus(app.id, 'Query Raised', 'Officer requested modified digital utility sign lease deed')}
                              className="bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-transform active:scale-95 cursor-pointer"
                            >
                              Raise Query
                            </button>
                            <button
                              onClick={() => handleUpdateAppStatus(app.id, 'Submitted to Department', 'Pending department validation and review')}
                              className="bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-200 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-transform active:scale-95 cursor-pointer"
                            >
                              Submit
                            </button>
                            <button
                              onClick={() => handleUpdateAppStatus(app.id, 'Approved & Issued', 'Incorporation COI/GSTIN distributed to client')}
                              className="bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-transform active:scale-95 cursor-pointer"
                            >
                              Issue Cert
                            </button>
                            <button
                              onClick={() => handleDeleteItem('applications', app.id)}
                              className="bg-slate-100 text-slate-800 border border-slate-200 hover:bg-rose-100 hover:text-rose-800 hover:border-rose-200 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-transform active:scale-95 cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* DOCUMENT VAULT BOARD (DOWNLOAD CENTER) */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-serif font-medium text-slate-900">Document Command Central</h2>
                    <p className="text-xs text-slate-500 mt-1">Official MCA filings, Income tax acknowledgements, and certification letters.</p>
                  </div>
                  <div className="flex bg-slate-100 rounded-xl p-1 w-max border self-start">
                    <button onClick={() => setServiceFilter('All')} className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${serviceFilter === 'All' ? 'bg-white text-primary shadow-sm' : 'text-slate-600'}`}>All</button>
                    <button onClick={() => setServiceFilter('Certificates')} className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${serviceFilter === 'Certificates' ? 'bg-white text-primary shadow-sm' : 'text-slate-600'}`}>Certificates</button>
                    <button onClick={() => setServiceFilter('Financials')} className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${serviceFilter === 'Financials' ? 'bg-white text-primary shadow-sm' : 'text-slate-600'}`}>Financials</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {documents.length === 0 ? (
                    <div className="col-span-full bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm">
                      <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-sm font-bold text-slate-700">Vault Empty</h3>
                      <p className="text-xs text-slate-500 mt-1">Certified audit copies will appear here once drafted by CA Manohar.</p>
                    </div>
                  ) : (
                    documents
                      .filter(d => serviceFilter === 'All' || (d.category && d.category.toLowerCase().includes(serviceFilter.toLowerCase().substring(0, 5))))
                      .map((docItem) => (
                        <motion.div
                          key={docItem.id}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-[9px] font-bold bg-primary/5 border border-primary/10 text-primary px-2.5 py-1 rounded-full uppercase tracking-widest">{docItem.fileType || "PDF"}</span>
                              <span className="text-[10px] font-mono text-slate-500 font-semibold">{docItem.size}</span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-snug line-clamp-1">{docItem.name}</h3>
                            <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed min-h-[40px] line-clamp-2">{docItem.description}</p>
                            <div className="text-[10px] text-slate-400 mt-3 font-semibold pb-4">
                              Delivery: {new Date(docItem.uploadedAt).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="border-t border-slate-50 pt-4 flex gap-2 justify-between items-center mt-3">
                            <button
                              onClick={() => triggerDocumentDownload(docItem)}
                              className="bg-primary hover:bg-slate-950 text-white w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm focus:ring-2 focus:ring-primary inline-flex transition-colors cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Download Document</span>
                            </button>
                            
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteItem('documents', docItem.id)}
                                className="bg-red-50 border border-red-200 text-red-600 p-2.5 rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
                                title="Delete document"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* COMPLIANCE CHRONOLOGY TRACKER */}
            {activeTab === 'compliance' && (
              <div className="space-y-6">
                {/* Visual scorecard for client transparency */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Filed returns</span>
                      <h4 className="text-xl font-bold font-serif text-slate-900 mt-0.5">{complianceFilings.filter(f => f.status === 'Filed').length} Completed</h4>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100">
                      <AlertTriangle className="h-6 w-6 font-bold" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Immediate action</span>
                      <h4 className="text-xl font-bold font-serif text-slate-900 mt-0.5">{complianceFilings.filter(f => f.status === 'Pending Client Action').length} Outstanding</h4>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                      <Clock className="h-6 w-6 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filing horizon</span>
                      <h4 className="text-xl font-bold font-serif text-slate-900 mt-0.5">{complianceFilings.filter(f => f.status === 'Upcoming' || f.status === 'In Progress').length} Pending</h4>
                    </div>
                  </div>
                </div>

                {/* Calendar compliance board */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <h2 className="text-lg font-serif font-medium text-slate-900 mb-6 border-b border-slate-100 pb-4 flex items-center justify-between">
                    <span>Static Compliance Checklist & Timeline (Real-Time Calendar)</span>
                    <span className="text-xs font-mono font-bold text-primary bg-primary/5 px-2.5 py-1 border border-primary/10 rounded-full">FY 2026-2027</span>
                  </h2>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Compliance Details</th>
                          <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Cycle / Period</th>
                          <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Due Date</th>
                          <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Filing Status</th>
                          <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Acknowledgement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {complianceFilings.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-xs text-slate-400">No scheduled returns. Contact CA Manohar compliance desk to activate statutory calendars.</td>
                          </tr>
                        ) : (
                          complianceFilings.map((filing) => (
                            <tr key={filing.id} className="hover:bg-slate-50/40 relative">
                              <td className="py-4 pr-4">
                                <div className="text-xs font-bold text-slate-900 leading-tight">{filing.title}</div>
                                <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{filing.serviceType} Return</div>
                              </td>
                              <td className="py-4 text-xs font-semibold text-slate-700">
                                {filing.period} <span className="text-[10px] text-slate-400 px-1 hover:underline">({filing.financialYear})</span>
                              </td>
                              <td className="py-4 text-xs font-mono font-medium text-slate-600">
                                {new Date(filing.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="py-4">
                                <span className={`px-2.5 py-1 text-[9px] uppercase font-bold tracking-widest rounded-full border ${getFilingStatusBadge(filing.status)}`}>
                                  {filing.status}
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                {filing.status === 'Filed' ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-emerald-700 text-xs font-bold font-mono tracking-tight flex items-center gap-1">
                                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                                      <span>Success</span>
                                    </span>
                                    <span className="text-[9px] font-mono font-semibold text-slate-400 mt-0.5">{filing.arn || "ARN-GENERATED"}</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      alert("Disclaimer: If supporting tax logs or general ledger registers are pending, compile records and upload the spreadsheet files to Document vaults first so CA can sign off and dispatch.");
                                    }}
                                    className="text-[10px] font-bold text-primary hover:text-slate-900 uppercase tracking-widest border border-slate-100 hover:bg-white bg-slate-50/50 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                                  >
                                    Prepare
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ADMIN PUSH AND DEPLOY CORE PANEL */}
            {activeTab === 'admin' && isAdmin && (
              <div className="space-y-8">
                
                {/* Panel Overview */}
                <div className="bg-slate-950 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-lg">
                  <h2 className="text-xl font-serif text-white tracking-tight flex items-center gap-2">
                    <Shield className="h-5 w-5 text-amber-500" />
                    <span>Deploy Service Registry Flow</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Set up direct profiles. Securely push interactive data blocks, certified PDF vouchers, or GSTR compliance dates to the selected client's command interface in real-time.
                  </p>
                  
                  <div className="bg-slate-900 border border-slate-800/60 p-4 rounded-xl mt-4 flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-xs font-semibold text-slate-100">
                      Active client focus: <span className="text-amber-300 underline underline-offset-4">{selectedClientEmail || 'Self Default Sandbox'}</span>
                    </span>
                  </div>
                </div>

                {/* Grid for forms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Form 1: New Application */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2 pb-3 border-b border-slate-100">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <span>Push Service Engagement</span>
                    </h3>
                    <form onSubmit={handleCreateApp} className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Application title name</label>
                        <input
                          type="text"
                          value={newAppTitle}
                          onChange={(e) => setNewAppTitle(e.target.value)}
                          placeholder="e.g. Corporate Auditing FY25-26"
                          required
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Department Sector</label>
                          <select
                            value={newAppType}
                            onChange={(e) => setNewAppType(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium"
                          >
                            <option value="GST Service">GST Service</option>
                            <option value="Direct Tax">Direct Tax</option>
                            <option value="Corporate Compliance">Corporate Compliance</option>
                            <option value="Statutory Audit">Statutory Audit</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Target Status</label>
                          <select
                            value={newAppStatus}
                            onChange={(e) => setNewAppStatus(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium"
                          >
                            <option value="Pending Documents">Pending Documents</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Submitted to Department">Submitted</option>
                            <option value="Query Raised">Query Raised</option>
                            <option value="Approved & Issued">Issued</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Description summary</label>
                        <textarea
                          value={newAppDesc}
                          onChange={(e) => setNewAppDesc(e.target.value)}
                          placeholder="Provide statutory guidelines or overview of documentation requirements..."
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium min-h-[85px] resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Active current step</label>
                          <input
                            type="text"
                            value={newAppStep}
                            onChange={(e) => setNewAppStep(e.target.value)}
                            placeholder="e.g. Verifying physical ledger lease deeds"
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Target date or completion</label>
                          <input
                            type="text"
                            value={newAppEstComp}
                            onChange={(e) => setNewAppEstComp(e.target.value)}
                            placeholder="e.g. July 31, 2026"
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-primary hover:bg-slate-900 border border-transparent text-white rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider transition-all shadow-md focus:outline-none cursor-pointer"
                      >
                        Publish Tracking Instance
                      </button>
                    </form>
                  </div>

                  {/* Form 2: Deliver Certified document */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2 pb-3 border-b border-slate-100">
                      <FileText className="h-4 w-4 text-primary" />
                      <span>Deliver Legal Certified Document</span>
                    </h3>
                    <form onSubmit={handleCreateDoc} className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Document display name</label>
                        <input
                          type="text"
                          value={newDocName}
                          onChange={(e) => setNewDocName(e.target.value)}
                          placeholder="e.g. MCA certificate - MCA_GSTIN.pdf"
                          required
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Subcategory</label>
                          <select
                            value={newDocCategory}
                            onChange={(e) => setNewDocCategory(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium"
                          >
                            <option value="Certificates">Certificates</option>
                            <option value="Taxes and Filing">Taxes and Filing</option>
                            <option value="Internal Financials">Internal Financials</option>
                            <option value="Audited Statements">Audited Statements</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Payload size estimation</label>
                          <input
                            type="text"
                            value={newDocSize}
                            onChange={(e) => setNewDocSize(e.target.value)}
                            placeholder="e.g. 1.2 MB"
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Document context details</label>
                        <textarea
                          value={newDocDesc}
                          onChange={(e) => setNewDocDesc(e.target.value)}
                          placeholder="Draft concise instructions or content description detailing the significance of this ledger file..."
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium min-h-[90px] resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-primary hover:bg-slate-900 border border-transparent text-white rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider transition-all shadow-md focus:outline-none cursor-pointer"
                      >
                        Publish File into Vault
                      </button>
                    </form>
                  </div>

                  {/* Form 3: Push Compliance Calendar */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm md:col-span-2">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2 pb-3 border-b border-slate-100">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>Push Scheduled Compliance Calendar Date</span>
                    </h3>
                    <form onSubmit={handleCreateFiling} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Statutory Filing Title</label>
                          <input
                            type="text"
                            value={newFilingTitle}
                            onChange={(e) => setNewFilingTitle(e.target.value)}
                            placeholder="e.g., GSTR-3B Outward return for Quarter 1"
                            required
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Segment Sector</label>
                            <select
                              value={newFilingService}
                              onChange={(e) => setNewFilingService(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium"
                            >
                              <option value="GST">GST</option>
                              <option value="Income Tax">Income Tax</option>
                              <option value="Corporate Compliance">Corporate Compliance</option>
                              <option value="TDS and PF">TDS and PF</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Financial Assessment Year</label>
                            <input
                              type="text"
                              value={newFilingFY}
                              onChange={(e) => setNewFilingFY(e.target.value)}
                              placeholder="e.g. 2026-27"
                              required
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Statutory Due date</label>
                          <input
                            type="date"
                            value={newFilingDueDate}
                            onChange={(e) => setNewFilingDueDate(e.target.value)}
                            required
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Periodic Window (Month/Quarter)</label>
                          <input
                            type="text"
                            value={newFilingPeriod}
                            onChange={(e) => setNewFilingPeriod(e.target.value)}
                            placeholder="e.g. May 2026"
                            required
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Filing status</label>
                            <select
                              value={newFilingStatus}
                              onChange={(e) => setNewFilingStatus(e.target.value as any)}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium"
                            >
                              <option value="Upcoming">Upcoming</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Pending Client Action">Action Required</option>
                              <option value="Filed">Filed (Success)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Govt Receipt ARN Reference</label>
                            <input
                              type="text"
                              value={newFilingARN}
                              onChange={(e) => setNewFilingARN(e.target.value)}
                              placeholder="e.g. ARN-29001"
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium"
                            />
                          </div>
                        </div>

                        <div className="pt-5">
                          <button
                            type="submit"
                            className="w-full bg-slate-950 hover:bg-slate-900 border border-transparent text-white rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider transition-all shadow-md focus:outline-none cursor-pointer"
                          >
                            Add Scheduled Compliance Event
                          </button>
                        </div>
                      </div>
                    </form>
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
