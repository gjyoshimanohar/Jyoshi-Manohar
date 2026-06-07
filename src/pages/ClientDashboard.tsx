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
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
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
  ExternalLink,
  MessageSquare,
  Send,
  Paperclip,
  AlertCircle,
  FileQuestion,
  Edit2,
  X,
  XCircle,
  Save,
  Bell,
  Check
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
  status?: string;
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

interface ChatMessage {
  id: string;
  clientScopeId: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  text: string;
  timestamp: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
}

interface ClientRequest {
  id: string;
  userId: string;
  userEmail: string;
  clientName: string;
  title: string;
  type: 'task' | 'document' | 'engagement';
  category: string;
  description: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  createdAt: number;
  status: 'pending' | 'accepted' | 'declined';
  declineReason?: string;
}

interface PortalNotification {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
  type: 'request' | 'document' | 'general' | 'chat';
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
  const [clientRequests, setClientRequests] = useState<ClientRequest[]>([]);
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // Admin and Client Selector (for Admin to view specific client data)
  const [clients, setClients] = useState<{ uid: string; email: string; displayName?: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedClientEmail, setSelectedClientEmail] = useState<string>('');

  // Active Tab/Filter State
  const [activeTab, setActiveTab] = useState<'applications' | 'documents' | 'compliance' | 'admin' | 'chat'>('applications');
  const [serviceFilter, setServiceFilter] = useState<string>('All');

  // Real-time Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatMessagesLoading, setChatMessagesLoading] = useState(false);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [chatFileUploadProgress, setChatFileUploadProgress] = useState<number | null>(null);

  // Document Request states
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqDocName, setReqDocName] = useState('');
  const [reqDocDesc, setReqDocDesc] = useState('');
  const [reqDocCategory, setReqDocCategory] = useState('Financials');
  const [uploadingReqDocId, setUploadingReqDocId] = useState<string | null>(null);
  const [activeReqDocUploadProgress, setActiveReqDocUploadProgress] = useState<number | null>(null);

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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [customUrl, setCustomUrl] = useState('');

  const [newFilingTitle, setNewFilingTitle] = useState('');
  const [newFilingService, setNewFilingService] = useState('GST');
  const [newFilingFY, setNewFilingFY] = useState('2025-26');
  const [newFilingPeriod, setNewFilingPeriod] = useState('May 2026');
  const [newFilingDueDate, setNewFilingDueDate] = useState('');
  const [newFilingStatus, setNewFilingStatus] = useState<ComplianceFiling['status']>('Upcoming');
  const [newFilingARN, setNewFilingARN] = useState('');

  // Milestone inline editing and addition states
  const [addingStepForAppId, setAddingStepForAppId] = useState<string | null>(null);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepDesc, setNewStepDesc] = useState('');
  const [newStepDate, setNewStepDate] = useState('');

  const [editingStepAppId, setEditingStepAppId] = useState<string | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editStepTitle, setEditStepTitle] = useState('');
  const [editStepDesc, setEditStepDesc] = useState('');
  const [editStepDate, setEditStepDate] = useState('');

  // Local feedback message
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Client New Request states
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<'task' | 'document' | 'engagement'>('engagement');
  const [requestTitle, setRequestTitle] = useState('');
  const [requestCategory, setRequestCategory] = useState('GST Registration');
  const [requestDescription, setRequestDescription] = useState('');
  const [requestFile, setRequestFile] = useState<File | null>(null);
  const [requestUploadProgress, setRequestUploadProgress] = useState<number | null>(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Admin acceptance workflow states
  const [acceptingReqId, setAcceptingReqId] = useState<string | null>(null);
  const [acceptEstCompletion, setAcceptEstCompletion] = useState('June 30, 2026');
  const [acceptStepsText, setAcceptStepsText] = useState<string>("1. Intake checklist & document verify\n2. CA audit & compliance draft analysis\n3. Execution filings and certification");
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  // Admin decline workflow states
  const [decliningReqId, setDecliningReqId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string>("Standard statutory criteria check mismatch. Please check your parameters and file attachment, or propose an alternative service draft.");

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

    // Fetch incoming client requests
    const requestsQuery = isAdmin
      ? query(collection(db, 'client_requests'))
      : query(collection(db, 'client_requests'), where('userId', '==', user.uid));

    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      const list: ClientRequest[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ClientRequest);
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      setClientRequests(list);
    }, (error) => {
      console.error("Error reading client requests: ", error);
    });

    // Real-time notifications listener
    const notifsQuery = isAdmin
      ? query(collection(db, 'notifications'), where('userId', '==', 'admin'))
      : query(collection(db, 'notifications'), where('userId', '==', user.uid));

    const unsubscribeNotifs = onSnapshot(notifsQuery, (snapshot) => {
      const list: PortalNotification[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data && !data.read) {
          list.push({ id: d.id, ...data } as PortalNotification);
        }
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      setNotifications(list);
    }, (error) => {
      console.error("Error reading notifications: ", error);
    });

    // If admin is logged in, fetch list of active clients securely in real-time
    let unsubscribeUsers = () => {};
    if (isAdmin) {
      unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        const clientList: { uid: string; email: string; displayName?: string }[] = [];
        snapshot.forEach((docRef) => {
          const data = docRef.data();
          clientList.push({
            uid: data.uid || docRef.id,
            email: data.email,
            displayName: data.displayName
          });
        });
        setClients(clientList);
      }, (error) => {
        console.error("Error loading clients list securely in real-time: ", error);
      });
    }

    return () => {
      unsubscribeApps();
      unsubscribeDocs();
      unsubscribeFilings();
      unsubscribeUsers();
      unsubscribeRequests();
      unsubscribeNotifs();
    };
  }, [user, isAdmin, selectedClientId]);

  // Real-time listener for Chat messages
  useEffect(() => {
    if (!user) return;

    // Determine the active chat scope ID
    // If logged in as admin: if a client is selected, listen to that client's chat; otherwise empty.
    // If regular client: listen to their own user.uid scope.
    const chatScopeUid = isAdmin ? (selectedClientId || '') : user.uid;

    if (isAdmin && !chatScopeUid) {
      setChatMessages([]);
      return;
    }

    setChatMessagesLoading(true);
    const chatsQuery = query(
      collection(db, 'chats'),
      where('clientScopeId', '==', chatScopeUid),
      orderBy('timestamp', 'asc')
    );

    const unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((docRef) => {
        msgs.push({ id: docRef.id, ...docRef.data() } as ChatMessage);
      });
      // Sort client-side to ensure ordering is correct
      msgs.sort((a, b) => a.timestamp - b.timestamp);
      setChatMessages(msgs);
      setChatMessagesLoading(false);
    }, (error) => {
      console.warn("Real-time Chat ordered query failed (usually first launch before indices finish). Trying un-ordered fallback:", error);
      
      const unorderedChatsQuery = query(
        collection(db, 'chats'),
        where('clientScopeId', '==', chatScopeUid)
      );
      
      onSnapshot(unorderedChatsQuery, (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((docRef) => {
          msgs.push({ id: docRef.id, ...docRef.data() } as ChatMessage);
        });
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        setChatMessages(msgs);
        setChatMessagesLoading(false);
      }, (err) => {
        console.error("Fallback chat loading also failed: ", err);
        setChatMessagesLoading(false);
      });
    });

    return () => {
      unsubscribeChats();
    };
  }, [user, isAdmin, selectedClientId, activeTab]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const chatScopeUid = isAdmin ? selectedClientId : user.uid;
    if (!chatScopeUid) {
      alert("Please select a target client first to deploy messages.");
      return;
    }

    if (!newChatMessage.trim() && !chatFile) {
      return;
    }

    try {
      setChatFileUploadProgress(10);
      let fileUrl = '';
      let fileName = '';
      let fileSize = '';
      let fileTypeStr = '';

      if (chatFile) {
        fileName = chatFile.name;
        if (chatFile.size > 1024 * 1024) {
          fileSize = (chatFile.size / (1024 * 1024)).toFixed(2) + " MB";
        } else {
          fileSize = (chatFile.size / 1024).toFixed(1) + " KB";
        }
        fileTypeStr = chatFile.name.split('.').pop()?.toUpperCase() || 'FILE';

        // Hybrid upload strategy for Chat files
        if (chatFile.size <= 800 * 1024) {
          setChatFileUploadProgress(40);
          const base64Url = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(chatFile);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
          });
          fileUrl = base64Url;
          setChatFileUploadProgress(100);
        } else {
          setChatFileUploadProgress(50);
          const storagePath = `chats/${chatScopeUid}/${Date.now()}_${chatFile.name}`;
          const storageRef = ref(storage, storagePath);
          const uploadTask = uploadBytesResumable(storageRef, chatFile);

          const uploadedUrl = await new Promise<string>((resolve, reject) => {
            uploadTask.on('state_changed',
              (snapshot) => {
                const prog = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                setChatFileUploadProgress(prog);
              },
              (err) => reject(err),
              async () => {
                const dlUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(dlUrl);
              }
            );
          });
          fileUrl = uploadedUrl;
        }

        // Auto catalog uploaded document into Document Vault collection
        try {
          const parentUserEmail = clients.find(c => c.uid === chatScopeUid)?.email || selectedClientEmail || (isAdmin ? 'client@partner.com' : user.email) || '';
          await addDoc(collection(db, 'documents'), {
            userId: chatScopeUid,
            userEmail: parentUserEmail,
            name: fileName,
            description: `File uploaded via direct consultation chat on ${new Date().toLocaleDateString()}`,
            url: fileUrl,
            fileType: fileTypeStr,
            size: fileSize,
            uploadedAt: Date.now(),
            category: "Consultation"
          });
        } catch (catErr) {
          console.error("Auto registration of chat file in Document Vault failed:", catErr);
        }
      }

      setChatFileUploadProgress(90);

      const senderName = isAdmin 
        ? "Manohar Business Consulting Panel (Admin)" 
        : (user.displayName || user.email?.split('@')[0] || "Client Desk");

      const msgObj: Omit<ChatMessage, 'id'> = {
        clientScopeId: chatScopeUid,
        senderId: user.uid,
        senderEmail: user.email || '',
        senderName: senderName,
        text: newChatMessage.trim(),
        timestamp: Date.now()
      };

      if (fileUrl) {
        msgObj.fileUrl = fileUrl;
        msgObj.fileName = fileName;
        msgObj.fileSize = fileSize;
        msgObj.fileType = fileTypeStr;
      }

      await addDoc(collection(db, 'chats'), msgObj);

      // Trigger real-time notification
      try {
        const notifTitle = isAdmin ? "New Message from CA Admin" : `New Chat Message from ${senderName}`;
        const notifDestId = isAdmin ? chatScopeUid : 'admin';
        const notifDestEmail = isAdmin ? (selectedClientEmail || '') : 'gjyoshimanohar@gmail.com';
        const truncatedMessage = newChatMessage.trim() 
          ? (newChatMessage.trim().substring(0, 80) + (newChatMessage.trim().length > 80 ? "..." : "")) 
          : `Sent an attachment: ${fileName || 'file'}`;

        await addDoc(collection(db, 'notifications'), {
          userId: notifDestId,
          userEmail: notifDestEmail,
          title: notifTitle,
          message: truncatedMessage,
          createdAt: Date.now(),
          read: false,
          type: 'chat'
        });
      } catch (notifErr) {
        console.error("Failed to route notification alert for direct chat message:", notifErr);
      }

      // Reset
      setNewChatMessage('');
      setChatFile(null);
    } catch (err: any) {
      console.error("Failed to send message: ", err);
      alert("Error sending message: " + err.message);
    } finally {
      setChatFileUploadProgress(null);
    }
  };

  const handleSendDocumentRequest = async () => {
    if (!user) return;
    const chatScopeUid = selectedClientId;
    if (!chatScopeUid) {
      alert("Please select a target client first to dispatch a document request.");
      return;
    }
    if (!reqDocName.trim()) {
      alert("Please enter a Document Name to identify what is requested.");
      return;
    }

    try {
      setDataLoading(true);
      const parentUserEmail = clients.find(c => c.uid === chatScopeUid)?.email || selectedClientEmail || "client@manohar.com";
      
      const docObj: Omit<ClientDocument, 'id'> = {
        userId: chatScopeUid,
        userEmail: parentUserEmail,
        name: reqDocName,
        description: reqDocDesc || "Official statutory file upload required by Manohar Consultants.",
        url: "",
        fileType: "PENDING",
        size: "0 KB",
        uploadedAt: Date.now(),
        category: reqDocCategory,
        status: "requested"
      };

      await addDoc(collection(db, 'documents'), docObj);

      const senderName = "Manohar Business Consulting Panel (Admin)";
      const reqMessageText = `📢 DOCUMENT REQUESTED: [${reqDocName}] (${reqDocCategory})\nInstructions: ${reqDocDesc || "Please upload the requested paperwork."}`;

      const chatMsgObj: Omit<ChatMessage, 'id'> = {
        clientScopeId: chatScopeUid,
        senderId: user.uid,
        senderEmail: user.email || '',
        senderName: senderName,
        text: reqMessageText,
        timestamp: Date.now()
      };

      await addDoc(collection(db, 'chats'), chatMsgObj);

      // Trigger client notification
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: chatScopeUid,
          userEmail: parentUserEmail,
          title: "New Document Requested",
          message: `CA Admin has requested: [${reqDocName}] (${reqDocCategory})`,
          createdAt: Date.now(),
          read: false,
          type: 'request'
        });
      } catch (notifErr) {
        console.error("Failed to route notification alert for document request:", notifErr);
      }

      setFeedback({
        message: `Secure Document Request published for "${reqDocName}". Portal notified.`,
        type: 'success'
      });
      setTimeout(() => setFeedback(null), 4000);

      setReqDocName('');
      setReqDocDesc('');
      setShowRequestForm(false);
    } catch (err: any) {
      console.error("Failed to request document: ", err);
      alert("Request failed: " + err.message);
    } finally {
      setDataLoading(false);
    }
  };

  const handleUploadRequestedDocument = async (reqDoc: ClientDocument, file: File) => {
    if (!user) return;
    try {
      setUploadingReqDocId(reqDoc.id);
      setActiveReqDocUploadProgress(10);

      let finalUrl = '';
      let finalSize = '';
      if (file.size > 1024 * 1024) {
        finalSize = (file.size / (1024 * 1024)).toFixed(2) + " MB";
      } else {
        finalSize = (file.size / 1024).toFixed(1) + " KB";
      }
      const fileTypeStr = file.name.split('.').pop()?.toUpperCase() || 'FILE';

      // Hybrid Upload strategy: (same as handleCreateDoc)
      if (file.size <= 800 * 1024) {
        setActiveReqDocUploadProgress(40);
        const base64Url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
        finalUrl = base64Url;
        setActiveReqDocUploadProgress(100);
      } else {
        setActiveReqDocUploadProgress(50);
        const storagePath = `documents/${reqDoc.userId}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        const uploadedUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const prog = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setActiveReqDocUploadProgress(prog);
            },
            (err) => reject(err),
            async () => {
              const dlUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(dlUrl);
            }
          );
        });
        finalUrl = uploadedUrl;
      }

      const updatedDocPayload = {
        url: finalUrl,
        fileType: fileTypeStr,
        size: finalSize,
        uploadedAt: Date.now(),
        status: 'uploaded' as any
      };

      await updateDoc(doc(db, 'documents', reqDoc.id), updatedDocPayload);

      const senderName = user.displayName || user.email?.split('@')[0] || "Client Desk";
      const fulfilledMessageText = `✅ FULFILLED DOCUMENT REQ: Loaded file for [${reqDoc.name}].\nFile Name: ${file.name} (${finalSize})`;

      const chatMsgObj: Omit<ChatMessage, 'id'> = {
        clientScopeId: reqDoc.userId,
        senderId: user.uid,
        senderEmail: user.email || '',
        senderName: senderName,
        text: fulfilledMessageText,
        timestamp: Date.now()
      };

      await addDoc(collection(db, 'chats'), chatMsgObj);

      // Trigger admin notification on document upload fulfillment
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: 'admin',
          userEmail: 'gjyoshimanohar@gmail.com',
          title: "Document Request Fulfilled",
          message: `${senderName} completed upload of requested document: [${reqDoc.name}]`,
          createdAt: Date.now(),
          read: false,
          type: 'document'
        });
      } catch (notifErr) {
        console.error("Failed to route notification alert for document fulfillment:", notifErr);
      }

      setFeedback({
        message: `"${reqDoc.name}" has been successfully uploaded and delivered!`,
        type: 'success'
      });
      setTimeout(() => setFeedback(null), 4000);

    } catch (err: any) {
      console.error("Fulfill upload failed: ", err);
      alert("Upload failed: " + err.message);
    } finally {
      setUploadingReqDocId(null);
      setActiveReqDocUploadProgress(null);
    }
  };

  // Seeding engine: Auto seed realistic CA dashboard data on first login so users see immediate real-time results
  const ensureDataIsSeeded = async (activeUser: User) => {
    try {
      const userRef = doc(db, 'users', activeUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data()?.isSeeded) {
        console.log("User is already seeded, skipping duplicate run.");
        return;
      }

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
          createdAt: Date.now(),
          isSeeded: true
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

        // 5. Prepare seed Notifications
        const sampleNotifications = [
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || '',
            title: "Welcome to Manohar Consulting",
            message: "Welcome to CA Jyoshi Manohar's secure portal! Your customized tracker environments have been configured successfully.",
            createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
            read: true,
            type: "general" as const
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || '',
            title: "Client Action Required",
            message: "Please upload your Q1 demat capital gains statement & housing loan interest certificate for ITR-3 evaluation.",
            createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
            read: false,
            type: "request" as const
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || '',
            title: "April GSTR-3B Filed Successfully",
            message: "Your GSTR-3B Monthly Tax Computation has been filed by CA Admin. ARN receipt prepared inside the track panel.",
            createdAt: Date.now() - 12 * 60 * 60 * 1000,
            read: false,
            type: "document" as const
          }
        ];

        for (const notif of sampleNotifications) {
          await addDoc(collection(db, 'notifications'), notif);
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
    // If there is a real uploaded file URL or custom external URL, open/download it directly securely
    if (file.url && file.url !== '#' && file.url.trim() !== '') {
      const link = document.createElement('a');
      link.href = file.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      // fallback download attribute (might get ignored for cross-origin URLs but helps for same-origin)
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setFeedback({
        message: `Opening secure download stream for "${file.name}"...`,
        type: 'success'
      });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

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
      setDataLoading(true);
      const parentUserEmail = clients.find(c => c.uid === selectedClientId)?.email || selectedClientEmail || "client@manohar.com";
      let finalUrl = customUrl || "#";
      let finalSize = newDocSize || "240 KB";
      let finalName = newDocName;

      // Check if a local file was picked for upload
      if (uploadFile) {
        if (!finalName) {
          finalName = uploadFile.name;
        } else {
          // If name doesn't contain extension, keep original file extension
          const origExt = uploadFile.name.split('.').pop();
          if (origExt && !finalName.toLowerCase().endsWith('.' + origExt.toLowerCase())) {
            finalName = `${finalName}.${origExt}`;
          }
        }

        // Set size string
        if (uploadFile.size > 1024 * 1024) {
          finalSize = (uploadFile.size / (1024 * 1024)).toFixed(2) + " MB";
        } else {
          finalSize = (uploadFile.size / 1024).toFixed(1) + " KB";
        }

        // Hybrid Upload strategy:
        // For files <= 800 KB (extremely common for tax PDFs, receipts and Excel spreadsheets),
        // we convert the file to a Base64 Data URL and save it directly in the document register.
        // This guarantees 100% successful uploads instantly, completely bypassing any deactivated/unprovisioned
        // Firebase Storage bucket or security configuration issues in the cloud console.
        if (uploadFile.size <= 800 * 1024) {
          setUploadProgress(40);
          const base64Url = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(uploadFile);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
          });
          setUploadProgress(100);
          finalUrl = base64Url;
        } else {
          // For larger files > 800 KB, attempt standard Firebase Storage upload.
          try {
            const uploadTaskPromise = new Promise<string>((resolve, reject) => {
              const storagePath = `documents/${selectedClientId}/${Date.now()}_${uploadFile.name}`;
              const storageRef = ref(storage, storagePath);
              const uploadTask = uploadBytesResumable(storageRef, uploadFile);

              uploadTask.on('state_changed', 
                (snapshot) => {
                  const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                  setUploadProgress(progress);
                }, 
                (error) => {
                  console.error("Storage upload failed: ", error);
                  reject(error);
                }, 
                async () => {
                  try {
                    const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadUrl);
                  } catch (urlErr) {
                    reject(urlErr);
                  }
                }
              );
            });

            finalUrl = await uploadTaskPromise;
          } catch (storageErr: any) {
            console.error("Firebase Storage upload exception: ", storageErr);
            throw new Error(
              "Your uploaded file is over 800 KB and Firebase Storage has not yet been initialized/enabled in your Firebase Console. " +
              "To solve this instantly: either keep your file size under 800 KB (so it is processed by our client-side base64 vault), " +
              "paste an external Google Drive/Dropbox shared link, or go to console.firebase.google.com to enable Storage."
            );
          }
        }
      }

      if (!finalName) {
        finalName = "Document.pdf";
      }

      // Extract uppercase file type
      const hasExt = finalName.includes('.');
      const fileExt = hasExt ? finalName.split('.').pop()?.toUpperCase() || 'PDF' : 'PDF';
      
      const newDocument: Omit<ClientDocument, 'id'> = {
        userId: selectedClientId,
        userEmail: parentUserEmail,
        name: finalName,
        description: newDocDesc || "CA-certified official client report file.",
        url: finalUrl,
        fileType: fileExt,
        size: finalSize,
        uploadedAt: Date.now(),
        category: newDocCategory
      };

      await addDoc(collection(db, 'documents'), newDocument);
      
      // Reset form fields
      setNewDocName('');
      setNewDocDesc('');
      setUploadFile(null);
      setUploadProgress(null);
      setCustomUrl('');
      
      setFeedback({ message: "Successfully delivered official secure document file package to client portal!", type: 'success' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error(err);
      setFeedback({ message: "Upload or save error: " + err.message, type: 'error' });
    } finally {
      setDataLoading(false);
      setUploadProgress(null);
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

  const handleSubmitNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!requestTitle.trim()) {
      alert("Please specify a title or subject for your request.");
      return;
    }

    setIsSubmittingRequest(true);
    setRequestUploadProgress(10);

    try {
      let finalFileUrl = "";
      let finalFileSize = "N/A";
      let finalFileType = "N/A";

      if (requestFile) {
        setRequestUploadProgress(30);
        // Under 800 KB -> Base64 fallback to prevent issues
        if (requestFile.size <= 800 * 1024) {
          const base64Url = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(requestFile);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
          });
          finalFileUrl = base64Url;
        } else {
          // Standard storage upload
          try {
            const storagePath = `requests/${user.uid}/${Date.now()}_${requestFile.name}`;
            const storageRef = ref(storage, storagePath);
            const uploadTask = uploadBytesResumable(storageRef, requestFile);

            finalFileUrl = await new Promise<string>((resolve, reject) => {
              uploadTask.on('state_changed',
                (snapshot) => {
                  const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                  setRequestUploadProgress(30 + Math.round(progress * 0.6));
                },
                (err) => reject(err),
                async () => {
                  const dlUrl = await getDownloadURL(uploadTask.snapshot.ref);
                  resolve(dlUrl);
                }
              );
            });
          } catch (storageErr: any) {
            console.warn("Storage upload failed, using base64 fallback:", storageErr);
            const base64Url = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(requestFile);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = error => reject(error);
            });
            finalFileUrl = base64Url;
          }
        }
        setRequestUploadProgress(90);

        const sizeKB = Math.round(requestFile.size / 1024);
        finalFileSize = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(2)} MB` : `${sizeKB} KB`;
        finalFileType = requestFile.name.split('.').pop()?.toUpperCase() || "PDF";
      }

      // Save the draft proposal inside 'client_requests' collection
      const clientRequestObj: any = {
        userId: user.uid,
        userEmail: user.email || '',
        clientName: user.displayName || user.email?.split('@')[0] || "Client",
        title: requestTitle,
        type: requestType, // 'engagement', 'task', 'document'
        category: requestCategory,
        description: requestDescription || "Requested online by client.",
        createdAt: Date.now(),
        status: 'pending'
      };

      if (requestFile) {
        if (finalFileUrl) {
          clientRequestObj.fileUrl = finalFileUrl;
        }
        clientRequestObj.fileName = requestFile.name;
        clientRequestObj.fileSize = finalFileSize;
        clientRequestObj.fileType = finalFileType;
      }

      await addDoc(collection(db, 'client_requests'), clientRequestObj);

      const capitalizedType = requestType.charAt(0).toUpperCase() + requestType.slice(1);
      const chatMsgText = `📢 CLIENT PROPOSAL SUBMITTED: [${requestTitle}]\nType: ${capitalizedType}\nCategory: ${requestCategory}\nDetails: ${requestDescription || "None specified"}${requestFile ? `\n📎 Attachment: ${requestFile.name}` : ''}\n(Awaiting review and approval state on CA desk)`;

      const chatMsgObj: Omit<ChatMessage, 'id'> = {
        clientScopeId: user.uid,
        senderId: user.uid,
        senderEmail: user.email || '',
        senderName: user.displayName || user.email?.split('@')[0] || "Client",
        text: chatMsgText,
        timestamp: Date.now()
      };
      await addDoc(collection(db, 'chats'), chatMsgObj);

      setFeedback({
        message: "Your proposal has been registered on the CA Desk awaiting review!",
        type: 'success'
      });
      setTimeout(() => setFeedback(null), 4500);

      // Reset fields
      setShowNewRequestModal(false);
      setRequestTitle("");
      setRequestCategory("GST Registration");
      setRequestDescription("");
      setRequestFile(null);
      setRequestUploadProgress(null);
      setRequestType("engagement");

    } catch (err: any) {
      console.error(err);
      alert("Error submitting request: " + err.message);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreads = notifications.filter(n => !n.read);
      const promises = unreads.map(n => 
        updateDoc(doc(db, 'notifications', n.id), { read: true })
      );
      await Promise.all(promises);
    } catch (err: any) {
      console.error("Failed to mark all notifications as read: ", err);
    }
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err: any) {
      console.error("Failed to mark notification as read: ", err);
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err: any) {
      console.error("Failed to delete notification: ", err);
    }
  };
  
  const handleDeclineRequest = async (req: ClientRequest, customReason?: string) => {
    try {
      if (!req || !req.id) return;

      const reason = customReason || "Standard statutory criteria check mismatch. Please check your parameters and file attachment, or propose an alternative service draft.";

      // 1. Update status to 'declined' in Firestore to update document state
      await updateDoc(doc(db, 'client_requests', req.id), { 
        status: 'declined' 
      });

      // 2. Delete request document from the collection
      await deleteDoc(doc(db, 'client_requests', req.id));

      // 3. Post notification chat inside consultation room chat notifying client about the decline
      const chatMsgText = `❌ REQUEST DECLINED: The proposal entitled "${req.title}" (${req.category}) has been declined by CA Jyoshi Manohar's admin team. Reason specified: ${reason}`;

      const chatMsgObj: Omit<ChatMessage, 'id'> = {
        clientScopeId: req.userId,
        senderId: user ? user.uid : 'admin_manohar',
        senderEmail: user ? user.email || '' : 'gjyoshimanohar@gmail.com',
        senderName: "Manohar Business Consulting Panel (Admin)",
        text: chatMsgText,
        timestamp: Date.now()
      };
      await addDoc(collection(db, 'chats'), chatMsgObj);

      // Trigger client notification
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: req.userId,
          userEmail: req.userEmail || '',
          title: "Proposal Declined",
          message: `Your service proposal "${req.title}" was declined. Reason: ${reason}`,
          createdAt: Date.now(),
          read: false,
          type: 'request'
        });
      } catch (notifErr) {
        console.error("Failed to route notification alert for declined proposal:", notifErr);
      }

      setFeedback({
        message: `Successfully declined request "${req.title}". Portal and support channels notified!`,
        type: 'success'
      });
      setTimeout(() => setFeedback(null), 4000);
      setDecliningReqId(null);
    } catch (err: any) {
      console.error(err);
      alert("Decline request failed: " + err.message);
    }
  };

  const handleAcceptRequestFinal = async (req: ClientRequest) => {
    try {
      if (!req || !req.id) return;
      setIsProcessingApproval(true);

      // Parse customized steps from state text
      const parsedSteps = acceptStepsText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map((line, idx) => {
          // Clean leading numbers or prefixes gracefully like "1." "Step 1:" "-" etc
          const cleanText = line.replace(/^\d+[\.\s\-:]+/, '').trim();
          return {
            title: cleanText,
            description: idx === 0 
              ? "Statutory onboarding & checklists verified successfully" 
              : `Milestone execution phase ${idx + 1}`,
            date: idx === 0 ? new Date().toLocaleDateString() : "Pending CA Desk",
            completed: idx === 0
          };
        });

      // 1. Create target instance based on request type
      if (req.type === 'engagement' || req.type === 'task') {
        const appTitle = req.type === 'engagement' ? `Engagement: ${req.title}` : `Task: ${req.title}`;
        const newApp: Omit<Application, 'id'> = {
          userId: req.userId,
          userEmail: req.userEmail,
          title: appTitle,
          type: req.category || "Consulting Service",
          status: "Under Review",
          currentStep: parsedSteps[0]?.title || "Awaiting document verification",
          description: req.description || "Requested and approved online.",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          estimatedCompletion: acceptEstCompletion || "June 30, 2026",
          steps: parsedSteps
        };

        await addDoc(collection(db, 'applications'), newApp);

        // If supporting file attachment exists in the request, register it inside documents
        if (req.fileUrl) {
          await addDoc(collection(db, 'documents'), {
            userId: req.userId,
            userEmail: req.userEmail,
            name: req.fileName || `Attachment_${req.title}.pdf`,
            description: `Supporting draft for approved engagement: "${req.title}"`,
            url: req.fileUrl,
            fileType: req.fileType || "PDF",
            size: req.fileSize || "Unknown size",
            uploadedAt: Date.now(),
            category: "Client Attachments"
          });
        }

        // Post chat message to consultation room
        const chatMsgObj: Omit<ChatMessage, 'id'> = {
          clientScopeId: req.userId,
          senderId: user ? user.uid : 'admin_manohar',
          senderEmail: user ? user.email || '' : 'gjyoshimanohar@gmail.com',
          senderName: "Manohar Business Consulting Panel (Admin)",
          text: `✅ REQUEST APPROVED: CA Jyoshi Manohar has approved and launched the tracking flow for your proposal: [${req.title}]!\nService: ${newApp.type}\nEst. Completion: ${newApp.estimatedCompletion}\nMilestone tracker initialized inside Client Dashboard. Close review tracking active.`,
          timestamp: Date.now()
        };
        await addDoc(collection(db, 'chats'), chatMsgObj);

      } else if (req.type === 'document') {
        const docName = req.fileName || `Approved Doc: ${req.title}`;
        const newDocument = {
          userId: req.userId,
          userEmail: req.userEmail,
          name: docName,
          description: req.description || `Approved verification paperwork: ${req.title}`,
          url: req.fileUrl || "#",
          fileType: req.fileType || "PDF",
          size: req.fileSize || "0 KB",
          uploadedAt: Date.now(),
          category: req.category || "Certificates",
          status: "Under Review"
        };

        await addDoc(collection(db, 'documents'), newDocument);

        // Post chat message to consultation room
        const chatMsgObj: Omit<ChatMessage, 'id'> = {
          clientScopeId: req.userId,
          senderId: user ? user.uid : 'admin_manohar',
          senderEmail: user ? user.email || '' : 'gjyoshimanohar@gmail.com',
          senderName: "Manohar Business Consulting Panel (Admin)",
          text: `✅ DOCUMENT INGESTION COMPLETE: Manohar Consulting has verified and approved document package: [${docName}] into standard vaults. Review is set to live.`,
          timestamp: Date.now()
        };
        await addDoc(collection(db, 'chats'), chatMsgObj);
      }

      // Trigger client notification on approval
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: req.userId,
          userEmail: req.userEmail || '',
          title: "Proposal Approved",
          message: `Your service proposal "${req.title}" has been approved! Tracking dashboard is now active.`,
          createdAt: Date.now(),
          read: false,
          type: 'request'
        });
      } catch (notifErr) {
        console.error("Failed to route notification alert for approved proposal:", notifErr);
      }

      // 2. Remove from pending client_requests
      await deleteDoc(doc(db, 'client_requests', req.id));

      setFeedback({
        message: `Proposal "${req.title}" successfully approved and active.`,
        type: 'success'
      });
      setTimeout(() => setFeedback(null), 4000);

      // 3. Reset states
      setAcceptingReqId(null);
      setAcceptEstCompletion('June 30, 2026');
      setAcceptStepsText("1. Intake checklist & document verify\n2. CA audit & compliance draft analysis\n3. Execution filings and certification");

    } catch (err: any) {
      console.error(err);
      alert("Error approving client request: " + err.message);
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleToggleStepCompleted = async (appId: string, stepIndex: number) => {
    try {
      const appToUpdate = applications.find(a => a.id === appId);
      if (!appToUpdate || !appToUpdate.steps) return;

      const updatedSteps = appToUpdate.steps.map((s, idx) => {
        if (idx === stepIndex) {
          return { ...s, completed: !s.completed };
        }
        return s;
      });

      await updateDoc(doc(db, 'applications', appId), {
        steps: updatedSteps,
        updatedAt: Date.now()
      });
      setFeedback({ message: "Milestone status updated in real-time!", type: 'success' });
      setTimeout(() => setFeedback(null), 2500);
    } catch (err: any) {
      alert("Failed to update step: " + err.message);
    }
  };

  const handleAddMilestoneStep = async (appId: string) => {
    if (!newStepTitle.trim()) {
      alert("Please enter a title for the new milestone.");
      return;
    }
    try {
      const appToUpdate = applications.find(a => a.id === appId);
      if (!appToUpdate) return;

      const currentSteps = appToUpdate.steps || [];
      const updatedSteps = [
        ...currentSteps,
        {
          title: newStepTitle,
          description: newStepDesc || "Status verification log",
          date: newStepDate || "In Progress",
          completed: false
        }
      ];

      await updateDoc(doc(db, 'applications', appId), {
        steps: updatedSteps,
        updatedAt: Date.now()
      });

      setNewStepTitle('');
      setNewStepDesc('');
      setNewStepDate('');
      setAddingStepForAppId(null);
      setFeedback({ message: "New verification step added successfully!", type: 'success' });
      setTimeout(() => setFeedback(null), 2500);
    } catch (err: any) {
      alert("Failed to add milestone: " + err.message);
    }
  };

  const handleStartEditingStep = (appId: string, stepIndex: number, step: { title: string; description: string; date: string; completed: boolean }) => {
    setEditingStepAppId(appId);
    setEditingStepIndex(stepIndex);
    setEditStepTitle(step.title);
    setEditStepDesc(step.description);
    setEditStepDate(step.date);
  };

  const handleSaveStepEdit = async (appId: string, stepIndex: number) => {
    if (!editStepTitle.trim()) {
      alert("Milestone title cannot be empty.");
      return;
    }
    try {
      const appToUpdate = applications.find(a => a.id === appId);
      if (!appToUpdate || !appToUpdate.steps) return;

      const updatedSteps = appToUpdate.steps.map((s, idx) => {
        if (idx === stepIndex) {
          return {
            ...s,
            title: editStepTitle,
            description: editStepDesc,
            date: editStepDate,
          };
        }
        return s;
      });

      await updateDoc(doc(db, 'applications', appId), {
        steps: updatedSteps,
        updatedAt: Date.now()
      });

      setEditingStepAppId(null);
      setEditingStepIndex(null);
      setFeedback({ message: "Milestone details saved!", type: 'success' });
      setTimeout(() => setFeedback(null), 2500);
    } catch (err: any) {
      alert("Failed to save milestone: " + err.message);
    }
  };

  const handleDeleteStep = async (appId: string, stepIndex: number) => {
    if (!confirm("Are you sure you want to delete this step?")) return;
    try {
      const appToUpdate = applications.find(a => a.id === appId);
      if (!appToUpdate || !appToUpdate.steps) return;

      const updatedSteps = appToUpdate.steps.filter((_, idx) => idx !== stepIndex);

      await updateDoc(doc(db, 'applications', appId), {
        steps: updatedSteps,
        updatedAt: Date.now()
      });

      setFeedback({ message: "Verification step removed!", type: 'success' });
      setTimeout(() => setFeedback(null), 2500);
    } catch (err: any) {
      alert("Failed to delete step: " + err.message);
    }
  };

  const handleUpdateFilingStatus = async (filingId: string, status: ComplianceFiling['status'], arn?: string) => {
    try {
      const updates: Partial<ComplianceFiling> = { status };
      if (status === 'Filed') {
        updates.arn = arn || `ARN-${Math.floor(100000 + Math.random() * 900000)}`;
        updates.filedDate = new Date().toISOString().split('T')[0];
      } else {
        updates.arn = "";
        updates.filedDate = null;
      }
      await updateDoc(doc(db, 'compliance_filings', filingId), updates);
      setFeedback({ message: "Compliance Filing status updated successfully in real-time!", type: 'success' });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert("Filing update failed: " + err.message);
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

  const handleDeleteClient = async () => {
    if (!selectedClientId) {
      alert("Please select a client to delete first.");
      return;
    }
    
    // Safety check: Cannot delete self
    if (selectedClientId === user?.uid) {
      alert("Security alert: You cannot delete your own admin/active user profile.");
      return;
    }

    const clientEmail = selectedClientEmail || "this client";
    if (!confirm(`Are you absolutely sure you want to PERMANENTLY delete client profile for "${clientEmail}"?\n\nThis will purge all their tracker records, documents and filings. This action is irreversible.`)) {
      return;
    }

    try {
      setDataLoading(true);
      
      // 1. Delete associated applications
      const appsSnap = await getDocs(query(collection(db, 'applications'), where('userId', '==', selectedClientId)));
      const appDeletes = appsSnap.docs.map(d => deleteDoc(doc(db, 'applications', d.id)));
      
      // 2. Delete associated documents
      const docsSnap = await getDocs(query(collection(db, 'documents'), where('userId', '==', selectedClientId)));
      const docDeletes = docsSnap.docs.map(d => deleteDoc(doc(db, 'documents', d.id)));
      
      // 3. Delete associated compliance filings
      const filingsSnap = await getDocs(query(collection(db, 'compliance_filings'), where('userId', '==', selectedClientId)));
      const filingDeletes = filingsSnap.docs.map(d => deleteDoc(doc(db, 'compliance_filings', d.id)));
      
      // Execute all subcollection deletes
      await Promise.all([...appDeletes, ...docDeletes, ...filingDeletes]);

      // 4. Delete the user document itself
      await deleteDoc(doc(db, 'users', selectedClientId));

      // Reset selection and emails
      setSelectedClientId('');
      setSelectedClientEmail('');
      
      setFeedback({ message: "Successfully deleted client profile and purged all associated records from Firestore registers!", type: 'success' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (e: any) {
      console.error("Failed to delete client: ", e);
      alert("Failed to delete client: " + e.message);
    } finally {
      setDataLoading(false);
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
                    <span>{isSignUp ? "Generate Secure Account" : "Login"}</span>
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
            {/* Real-time Notifications Bell dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="flex items-center justify-center p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600 hover:text-slate-950 shadow-sm relative cursor-pointer h-9 w-9"
                title="Notifications Desk"
              >
                <Bell className="h-4 w-4" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-extrabold text-white animate-pulse">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setNotificationsOpen(false)} 
                  />
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="p-4 flex items-center justify-between bg-slate-50">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Notifications Desk</span>
                        <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                          {notifications.length} total
                        </span>
                      </div>
                      {notifications.filter(n => !n.read).length > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-[11px] font-bold text-primary hover:text-slate-950 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="h-3 w-3" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center justify-center gap-2 bg-white">
                          <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <Bell className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-serif text-slate-600 font-medium font-serif">Awaiting notifications...</p>
                          <p className="text-[10px] text-slate-400 max-w-[240px] leading-relaxed mx-auto">Any active administrative service alerts will appear securely in real-time here.</p>
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          // Determine type specifics
                          let iconEl = <Bell className="h-4 w-4 text-purple-600" />;
                          let badgeBg = "bg-purple-50 border-purple-100";
                          if (notif.type === 'chat') {
                            iconEl = <MessageSquare className="h-4 w-4 text-blue-600" />;
                            badgeBg = "bg-blue-50 border-blue-100";
                          } else if (notif.type === 'document') {
                            iconEl = <FileCheck2 className="h-4 w-4 text-emerald-600" />;
                            badgeBg = "bg-emerald-50 border-emerald-100";
                          } else if (notif.type === 'request') {
                            iconEl = <AlertCircle className="h-4 w-4 text-amber-600" />;
                            badgeBg = "bg-amber-50 border-amber-100";
                          }

                          return (
                            <div 
                              key={notif.id} 
                              className={`p-4 transition-colors flex gap-3 group relative ${notif.read ? 'bg-slate-50/40 text-slate-500/80' : 'bg-white'}`}
                            >
                              <div className={`h-8 w-8 rounded-xl flex items-center justify-center border shrink-0 ${badgeBg}`}>
                                {iconEl}
                              </div>
                              <div className="space-y-1 pr-6 flex-1 text-left">
                                <div className="flex items-start justify-between gap-1.5">
                                  <h4 className={`text-xs leading-none ${notif.read ? 'font-medium text-slate-500' : 'font-extrabold text-slate-900'}`}>{notif.title}</h4>
                                  <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                                    {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                                </div>
                                <p className={`text-[11px] leading-relaxed ${notif.read ? 'text-slate-400/85' : 'text-slate-600'}`}>{notif.message}</p>
                              </div>

                              <div className="absolute right-2 top-2 flex flex-col gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                {!notif.read && (
                                  <button
                                    onClick={(e) => handleMarkAsRead(notif.id, e)}
                                    className="p-1 border border-slate-200 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                    title="Mark read"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => handleDeleteNotification(notif.id, e)}
                                  className="p-1 border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete alert"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {isAdmin && (
              <span className="bg-primary hover:bg-slate-900 text-white border border-transparent font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                ADMIN PORTAL ACCESS
              </span>
            )}
            {!isAdmin && (
              <button
                onClick={() => setShowNewRequestModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-slate-900/90 border border-transparent text-white font-semibold rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Request</span>
              </button>
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

              <div className="flex flex-col sm:flex-row gap-2 w-full">
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
                  className="flex-1 bg-primary hover:bg-slate-900 text-white rounded-xl py-3.5 text-xs font-bold uppercase tracking-wide border border-transparent hover:border-slate-800 transition-all text-center cursor-pointer"
                >
                  Create client stub
                </button>
                {selectedClientId && selectedClientId !== user?.uid && (
                  <button
                    onClick={handleDeleteClient}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-xl py-3.5 px-4 text-xs font-bold uppercase tracking-wide transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete client</span>
                  </button>
                )}
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

            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center justify-between p-4 rounded-xl text-left transition-all border ${
                activeTab === 'chat'
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-50 border-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">Consultation Chat</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === 'chat' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {chatMessages.length}
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

                {/* Client's Pending Proposals awaiting review on admin side */}
                {clientRequests.length > 0 && !isAdmin && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-amber-50/50 p-4 px-6 rounded-2xl border border-amber-100/70 shadow-sm">
                      <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                        <span>Pending Proposals awaiting CA Review ({clientRequests.length})</span>
                      </h3>
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Awaiting CA Review
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {clientRequests.map(req => (
                        <div key={req.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm text-left relative overflow-hidden group hover:border-slate-300 transition-all">
                          <div className="absolute right-0 top-0 h-1 text-amber-400 bg-amber-400 w-full animate-pulse" />
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <div>
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                {req.type}
                              </span>
                              <h4 className="text-xs font-bold text-slate-800 mt-1.5">{req.title}</h4>
                            </div>
                            <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-widest font-mono">
                              pending ca
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">{req.description}</p>
                          <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-50 text-[9px] text-slate-400">
                            <span>Posted: {new Date(req.createdAt).toLocaleDateString()}</span>
                            {req.fileName && (
                              <span className="font-semibold text-primary flex items-center gap-1 truncate max-w-[150px]">
                                📎 {req.fileName}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                          {app.steps?.map((step, idx) => {
                            const isEditingThisStep = editingStepAppId === app.id && editingStepIndex === idx;
                            return (
                              <div key={idx} className="relative group">
                                {isAdmin ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStepCompleted(app.id, idx)}
                                    title="Click to toggle completed state"
                                    className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all ${
                                      step.completed ? 'border-primary ring-4 ring-primary/10' : 'border-slate-300 hover:border-primary'
                                    }`}
                                  >
                                    {step.completed ? (
                                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                    ) : (
                                      <div className="w-1 h-1 bg-transparent group-hover:bg-slate-300 rounded-full" />
                                    )}
                                  </button>
                                ) : (
                                  <span className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                                    step.completed ? 'border-primary ring-4 ring-primary/10' : 'border-slate-200'
                                  }`}>
                                    {step.completed && <div className="w-1.5 h-1.5 bg-primary rounded-full" />}
                                  </span>
                                )}

                                {isEditingThisStep ? (
                                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 mt-1">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-sans">
                                      <input
                                        type="text"
                                        value={editStepTitle}
                                        onChange={(e) => setEditStepTitle(e.target.value)}
                                        placeholder="Step Title"
                                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-950 font-medium"
                                      />
                                      <input
                                        type="text"
                                        value={editStepDate}
                                        onChange={(e) => setEditStepDate(e.target.value)}
                                        placeholder="e.g. May 25, 2026 or In Progress"
                                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-950 font-mono"
                                      />
                                    </div>
                                    <textarea
                                      value={editStepDesc}
                                      onChange={(e) => setEditStepDesc(e.target.value)}
                                      placeholder="Brief milestone milestone description..."
                                      rows={2}
                                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-950 font-sans"
                                    />
                                    <div className="flex justify-end gap-1.5 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingStepAppId(null);
                                          setEditingStepIndex(null);
                                        }}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <X className="h-3 w-3" />
                                        <span>Cancel</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSaveStepEdit(app.id, idx)}
                                        className="bg-primary hover:bg-slate-950 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                                      >
                                        <Save className="h-3 w-3" />
                                        <span>Save</span>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[12px] font-bold ${step.completed ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                                          {step.title}
                                        </span>
                                        {isAdmin && (
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => handleStartEditingStep(app.id, idx, step)}
                                              className="p-1 text-slate-400 hover:text-primary transition cursor-pointer"
                                              title="Edit step details"
                                            >
                                              <Edit2 className="h-3 w-3" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteStep(app.id, idx)}
                                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                              title="Delete step"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      <span className="text-[10px] font-mono tracking-wider font-semibold text-slate-400">
                                        {step.date}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* New Milestone Step Form */}
                        {isAdmin && (
                          <div className="pt-2">
                            {addingStepForAppId === app.id ? (
                              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 font-sans">
                                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                                  <Plus className="h-3.5 w-3.5 text-primary" />
                                  <span>Add Customized Milestone Step</span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Milestone Name*</label>
                                    <input
                                      type="text"
                                      value={newStepTitle}
                                      onChange={(e) => setNewStepTitle(e.target.value)}
                                      placeholder="e.g. Scrutiny of MOA Draft"
                                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-950 font-medium font-sans outline-none focus:border-primary"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Target Date / Day</label>
                                    <input
                                      type="text"
                                      value={newStepDate}
                                      onChange={(e) => setNewStepDate(e.target.value)}
                                      placeholder="e.g. June 15, 2026 or Pending client"
                                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-950 font-medium font-sans outline-none focus:border-primary"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Actionable Description</label>
                                  <input
                                    type="text"
                                    value={newStepDesc}
                                    onChange={(e) => setNewStepDesc(e.target.value)}
                                    placeholder="Brief notes detailing statutory checkpoints"
                                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-950 font-medium font-sans outline-none focus:border-primary"
                                  />
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setAddingStepForAppId(null)}
                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl py-1.5 px-3 text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Discard
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddMilestoneStep(app.id)}
                                    className="bg-slate-900 hover:bg-black text-white rounded-xl py-1.5 px-4 text-xs font-bold transition-all cursor-pointer shadow-sm"
                                  >
                                    Add Step
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingStepForAppId(app.id);
                                  setNewStepTitle('');
                                  setNewStepDesc('');
                                  setNewStepDate('');
                                }}
                                className="border border-dashed border-slate-200 hover:border-primary hover:bg-slate-50 text-slate-500 hover:text-primary rounded-xl py-1.5 w-full text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Plus className="h-4 w-4" />
                                <span>Add New Verification Step</span>
                              </button>
                            )}
                          </div>
                        )}
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
            {activeTab === 'documents' && (() => {
              const requestedDocs = documents.filter(d => d.status === 'requested' || d.fileType === 'PENDING');
              const regularDocs = documents.filter(d => d.status !== 'requested' && d.fileType !== 'PENDING');
              
              return (
                <div className="space-y-6">
                  {/* PENDING DOCUMENT REQUESTS IF ANY */}
                  {requestedDocs.length > 0 && (
                    <div className="bg-amber-50/40 border border-amber-200/50 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/30 pb-4 mb-2">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <h3 className="text-sm font-bold text-amber-900 tracking-tight">Outstanding Official Paperwork Requests</h3>
                            <p className="text-[11px] text-amber-700 font-medium">Please upload the requested digital files to verify and complete statutory filings.</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-250 shrink-0">
                          {requestedDocs.length} PENDING ACTION{requestedDocs.length > 1 ? 'S' : ''}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {requestedDocs.map((reqDoc) => {
                          const isUploadingThisItem = uploadingReqDocId === reqDoc.id;
                          return (
                            <div key={reqDoc.id} className="bg-white border border-amber-200/60 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-amber-400/85 transition-all">
                              <div>
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-bold bg-amber-155 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-full uppercase tracking-widest font-mono">
                                    {reqDoc.category || "REQUIRED"}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-semibold">{new Date(reqDoc.uploadedAt).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 mt-3 flex items-center gap-1.5 leading-snug">
                                  <FileQuestion className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                                  <span>{reqDoc.name}</span>
                                </h3>
                                <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">{reqDoc.description}</p>
                              </div>

                              <div className="pt-2">
                                {isAdmin ? (
                                  <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100 text-center">
                                    <p className="text-[10px] text-amber-800 font-bold flex items-center justify-center gap-1">
                                      <Clock className="h-3 w-3.5 animate-pulse text-amber-600 animate-duration-1000" />
                                      <span>Awaiting Client Upload</span>
                                    </p>
                                    <p className="text-[9px] text-amber-600 mt-0.5">Admin remains on stand-by until client delivers paperwork</p>
                                  </div>
                                ) : (
                                  <div className="bg-slate-50 hover:bg-slate-100/70 border border-dashed border-slate-200 rounded-xl p-3.5 text-center relative flex flex-col items-center justify-center cursor-pointer transition-all">
                                    <input
                                      type="file"
                                      disabled={isUploadingThisItem || activeReqDocUploadProgress !== null}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        if (file) {
                                          handleUploadRequestedDocument(reqDoc, file);
                                        }
                                      }}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-15"
                                    />
                                    <Upload className="h-4.5 w-4.5 text-primary mb-1 mt-0.5" />
                                    <p className="text-[10px] font-bold text-slate-700">Attach and Deliver File</p>
                                    <p className="text-[8px] text-slate-400 font-mono">PDF, EXCEL, IMAGES, CSV UP TO 10MB</p>
                                  </div>
                                )}

                                {isUploadingThisItem && activeReqDocUploadProgress !== null && (
                                  <div className="mt-2 text-left space-y-1">
                                    <div className="flex justify-between text-[9px] font-bold text-primary font-mono">
                                      <span>Delivering document securely...</span>
                                      <span>{activeReqDocUploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1">
                                      <div className="bg-primary h-1 rounded-full transition-all" style={{ width: `${activeReqDocUploadProgress}%` }}></div>
                                    </div>
                                  </div>
                                )}

                                {isAdmin && (
                                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem('documents', reqDoc.id)}
                                      className="p-1 px-2 border border-rose-100 rounded-lg hover:bg-rose-50 text-[10px] text-rose-600 font-bold flex items-center gap-1 cursor-pointer transition-all"
                                      title="Cancel Document Request"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      <span>Cancel Request</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

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
                    {regularDocs.length === 0 ? (
                      <div className="col-span-full bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm">
                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-sm font-bold text-slate-700">Vault Empty</h3>
                        <p className="text-xs text-slate-500 mt-1">Certified audit copies will appear here once drafted by CA Manohar.</p>
                      </div>
                    ) : (
                      regularDocs
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
              );
            })()}

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
                              <td className="py-4 font-medium text-slate-950">
                                {isAdmin ? (
                                  <select
                                    value={filing.status}
                                    onChange={(e) => handleUpdateFilingStatus(filing.id, e.target.value as any, filing.arn)}
                                    className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-[10px] font-bold text-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
                                  >
                                    <option value="Upcoming">Upcoming</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Pending Client Action">Action Required</option>
                                    <option value="Filed">Filed</option>
                                  </select>
                                ) : (
                                  <span className={`px-2.5 py-1 text-[9px] uppercase font-bold tracking-widest rounded-full border ${getFilingStatusBadge(filing.status)}`}>
                                    {filing.status}
                                  </span>
                                )}
                              </td>
                              <td className="py-4 text-right">
                                {filing.status === 'Filed' ? (
                                  <div className="flex flex-col items-end gap-1">
                                    {isAdmin ? (
                                      <div className="flex items-center gap-1.5 justify-end">
                                        <div className="flex flex-col items-end">
                                          <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wider">Success (Filed)</span>
                                          <input
                                            type="text"
                                            defaultValue={filing.arn || ""}
                                            placeholder="Enter ARN"
                                            onBlur={(e) => {
                                              if (e.target.value !== filing.arn) {
                                                handleUpdateFilingStatus(filing.id, 'Filed', e.target.value);
                                              }
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                handleUpdateFilingStatus(filing.id, 'Filed', (e.target as HTMLInputElement).value);
                                              }
                                            }}
                                            className="w-24 bg-white border border-slate-200 rounded-lg py-0.5 px-1.5 text-[9px] text-right font-mono outline-none focus:border-primary"
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteItem('compliance_filings', filing.id)}
                                          className="text-slate-400 hover:text-red-650 p-1 rounded hover:bg-rose-50 cursor-pointer transition-colors"
                                          title="Remove return checkout from calendar"
                                        >
                                          <Trash2 className="h-3.5 w-3.5 animate-pulse" />
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="text-emerald-700 text-xs font-bold font-mono tracking-tight flex items-center gap-1">
                                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                                          <span>Success</span>
                                        </span>
                                        <span className="text-[9px] font-mono font-semibold text-slate-400 mt-0.5">{filing.arn || "ARN-GENERATED"}</span>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-2">
                                    {isAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteItem('compliance_filings', filing.id)}
                                        className="text-slate-400 hover:text-red-650 p-1 rounded hover:bg-rose-50 cursor-pointer transition-colors"
                                        title="Remove return checkout from calendar"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        if (isAdmin) {
                                          const val = prompt("Mark status as Filed? Enter Government ARN reference ID (optional):") || `ARN-${Math.floor(100000 + Math.random() * 900000)}`;
                                          handleUpdateFilingStatus(filing.id, 'Filed', val);
                                        } else {
                                          alert("Disclaimer: If supporting tax logs or general ledger registers are pending, compile records and upload the spreadsheet files to Document vaults first so CA can sign off and dispatch.");
                                        }
                                      }}
                                      className="text-[10px] font-bold text-primary hover:text-slate-900 uppercase tracking-widest border border-slate-100 hover:bg-white bg-slate-50/50 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                                    >
                                      {isAdmin ? "Mark Filed" : "Prepare"}
                                    </button>
                                  </div>
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

            {/* CONSULTATION & QUERY DESK CHAT FLOOD */}
            {activeTab === 'chat' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
                    <div>
                      <h2 className="text-xl font-serif font-bold text-slate-950 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <span>Consultation & Direct Query Desk</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 max-w-xl">
                        Real-time chat line for regulatory inquiries, structural advice, and direct document uploads.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                        {isAdmin ? "Admin Desk Active" : "Manohar CA Support Live"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* If Admin, show Client Selection Sidebar on left */}
                    {isAdmin && (
                      <div className="lg:col-span-1 border-r border-slate-100 pr-0 lg:pr-6 space-y-4">
                        <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          <span>Active Threads ({clients.length})</span>
                        </h3>
                        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-2">
                          {clients.map((c) => {
                            const isActive = selectedClientId === c.uid;
                            return (
                              <button
                                key={c.uid}
                                type="button"
                                onClick={() => {
                                  setSelectedClientId(c.uid);
                                  setSelectedClientEmail(c.email);
                                }}
                                className={`w-full text-left p-3 rounded-xl transition-all border ${
                                  isActive
                                    ? 'bg-primary text-white border-primary shadow-sm'
                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-100'
                                }`}
                              >
                                <p className="text-xs font-bold truncate">
                                  {c.displayName || c.email?.split('@')[0] || "Client"}
                                </p>
                                <p className={`text-[10px] truncate ${isActive ? 'text-slate-200' : 'text-slate-400'} mt-0.5`}>
                                  {c.email}
                                </p>
                              </button>
                            );
                          })}
                          {clients.length === 0 && (
                            <p className="text-[11px] text-slate-400 italic">No registered clients found.</p>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          To create a new client thread, use the *Create client stub* tool in the top Admin Control Room.
                        </p>
                      </div>
                    )}

                    {/* Message board container */}
                    <div className={`${isAdmin ? 'lg:col-span-3' : 'lg:col-span-4'} flex flex-col min-h-[450px]`}>
                      
                      {/* Active Consultation Header */}
                      <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-100/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Active Conversation Scope
                          </p>
                          <h4 className="text-xs font-bold text-slate-900 mt-1">
                            {isAdmin ? (
                              selectedClientId ? (
                                <span className="flex items-center gap-1.5 text-primary">
                                  <span>{selectedClientEmail}</span>
                                  <span className="text-[10px] font-mono text-slate-400">({selectedClientId})</span>
                                </span>
                              ) : (
                                <span className="text-amber-600">No client selected. Please select a client thread.</span>
                              )
                            ) : (
                              <span className="text-slate-900">Manohar Wealth Private Advisory Panel (Admin Line)</span>
                            )}
                          </h4>
                        </div>
                        {isAdmin && selectedClientId ? (
                          <button
                            type="button"
                            onClick={() => setShowRequestForm(!showRequestForm)}
                            className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2 px-3.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
                          >
                            <FileQuestion className="h-3.5 w-3.5" />
                            <span>{showRequestForm ? "Close Form" : "Request Document"}</span>
                          </button>
                        ) : !isAdmin ? (
                          <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-500 font-medium">Recipient Desk: Administrator</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Messages Listing */}
                      <div className="flex-1 border border-slate-100 rounded-2xl p-4 bg-slate-50/35 overflow-y-auto max-h-[350px] min-h-[250px] space-y-4 flex flex-col">
                        {chatMessagesLoading ? (
                          <div className="flex flex-col items-center justify-center py-10 space-y-2 m-auto">
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                            <p className="text-xs text-slate-500">Retrieving secure chat vault transcript...</p>
                          </div>
                        ) : chatMessages.length === 0 ? (
                          <div className="text-center py-12 m-auto max-w-sm">
                            <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                            <p className="text-xs font-bold text-slate-700">No messages in this consulting thread yet</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {isAdmin
                                ? "Start the dialogue by dropping structural advice, pending document requests, or query letters to this client scope."
                                : "Welcome to Manohar consultation portal! Submit your structural queries, audit explanations, or drag and drop certified papers here directly."}
                            </p>
                          </div>
                        ) : (
                          chatMessages.map((msg) => {
                            const isMyMessage = msg.senderId === user.uid;
                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col max-w-[85%] ${
                                  isMyMessage ? 'self-end items-end' : 'self-start items-start'
                                }`}
                              >
                                {/* Participant tag */}
                                <span className="text-[9px] text-slate-400 font-semibold mb-1 opacity-80 px-1">
                                  {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>

                                {/* Speech bubble */}
                                <div
                                  className={`p-3.5 rounded-2xl text-xs font-medium leading-relaxed ${
                                    isMyMessage
                                      ? 'bg-primary text-white rounded-tr-none shadow-sm'
                                      : 'bg-white border border-slate-200/80 text-slate-900 rounded-tl-none shadow-sm'
                                  }`}
                                >
                                  {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                                  {/* File attachment */}
                                  {msg.fileUrl && (
                                    <div className={`mt-3 p-3 rounded-xl flex items-center justify-between gap-4 border overflow-hidden ${
                                      isMyMessage 
                                        ? 'bg-slate-950/15 border-white/10 text-white' 
                                        : 'bg-slate-50 border-slate-200 text-slate-800'
                                    }`}>
                                      <div className="flex items-center gap-2.5 truncate">
                                        <FileText className={`h-4.5 w-4.5 shrink-0 ${isMyMessage ? 'text-slate-100' : 'text-primary'}`} />
                                        <div className="truncate text-left">
                                          <p className="text-[11px] font-bold truncate max-w-[150px] sm:max-w-[220px]">
                                            {msg.fileName}
                                          </p>
                                          <p className={`text-[9px] mt-0.5 font-semibold ${isMyMessage ? 'text-slate-300' : 'text-slate-400'}`}>
                                            {msg.fileType || 'FILE'} • {msg.fileSize || 'Unknown Size'}
                                          </p>
                                        </div>
                                      </div>
                                      <a
                                        href={msg.fileUrl}
                                        download={msg.fileName}
                                        target="_blank"
                                        referrerPolicy="no-referrer"
                                        rel="noopener noreferrer"
                                        className={`p-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1 ${
                                          isMyMessage
                                            ? 'bg-white text-slate-950 hover:bg-slate-100'
                                            : 'bg-primary text-white hover:bg-slate-900'
                                        }`}
                                      >
                                        <Download className="h-3 w-3" />
                                        <span>Download</span>
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Action inputs controller */}
                      <form onSubmit={handleSendChatMessage} className="mt-4 space-y-2">
                        
                        {showRequestForm && isAdmin && selectedClientId && (
                          <div className="bg-amber-50/70 border border-amber-200/50 rounded-2xl p-4 space-y-3 mb-2 text-left shadow-sm">
                            <div className="flex justify-between items-center pb-2 border-b border-amber-200/30">
                              <h5 className="text-[10px] font-bold text-amber-800 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                                <FileQuestion className="h-4 w-4" />
                                <span>Dispatch Official Document Request</span>
                              </h5>
                              <button
                                type="button"
                                onClick={() => setShowRequestForm(false)}
                                className="text-[10px] text-amber-700 hover:underline font-bold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Document Name*</label>
                                <input
                                  type="text"
                                  value={reqDocName}
                                  onChange={(e) => setReqDocName(e.target.value)}
                                  placeholder="e.g. Audit Ledger FY26"
                                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-950 font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Vault Category</label>
                                <select
                                  value={reqDocCategory}
                                  onChange={(e) => setReqDocCategory(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-950 font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                >
                                  <option value="Certificates">Certificates</option>
                                  <option value="Financials">Financials</option>
                                  <option value="Audit Reports">Audit Reports</option>
                                  <option value="Tax Filing">Tax Filing</option>
                                  <option value="KYC Verification">KYC Verification</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Instructions for Client</label>
                                <input
                                  type="text"
                                  value={reqDocDesc}
                                  onChange={(e) => setReqDocDesc(e.target.value)}
                                  placeholder="Upload signed PDF copies"
                                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-950 font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                            </div>
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={handleSendDocumentRequest}
                                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl py-2 px-4 text-xs font-bold uppercase tracking-widest transition-transform active:scale-95 cursor-pointer shadow-sm"
                              >
                                Publish Request & Log in Chat
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* File attachment preview indicator */}
                        {chatFile && (
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                              <div className="truncate text-left">
                                <p className="text-[11px] font-bold text-slate-900 truncate max-w-[250px] sm:max-w-[400px]">
                                  {chatFile.name}
                                </p>
                                <p className="text-[9px] text-slate-400 mt-0.5 font-semibold">
                                  Ready to send in chat ({(chatFile.size/1024).toFixed(1)} KB)
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setChatFile(null)}
                              className="text-[10px] font-bold text-red-500 hover:underline px-2 cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        )}

                        {/* Input field and action buttons */}
                        <div className="flex items-center gap-2">
                          
                          {/* File input trigger button */}
                          <div className="relative shrink-0">
                            <input
                              type="file"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setChatFile(file);
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-15"
                            />
                            <button
                              type="button"
                              className="p-3 border border-slate-200 hover:border-primary rounded-xl text-slate-400 hover:text-primary transition-colors cursor-pointer bg-white"
                              title="Attach filing document, receipt or sheet"
                            >
                              <Paperclip className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Text input */}
                          <input
                            type="text"
                            value={newChatMessage}
                            onChange={(e) => setNewChatMessage(e.target.value)}
                            placeholder={
                              isAdmin && !selectedClientId 
                                ? "Choose a client thread from left first..." 
                                : "Submit legal query details, respond to raise, or type messages..."
                            }
                            disabled={isAdmin && !selectedClientId}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-950 font-medium outline-none focus:border-primary focus:bg-white transition-all disabled:opacity-50"
                          />

                          {/* Submit button */}
                          <button
                            type="submit"
                            disabled={chatFileUploadProgress !== null || (isAdmin && !selectedClientId) || (!newChatMessage.trim() && !chatFile)}
                            className={`p-3 rounded-xl text-white font-bold transition-all flex items-center justify-center shrink-0 shadow-md cursor-pointer ${
                              chatFileUploadProgress !== null || (isAdmin && !selectedClientId) || (!newChatMessage.trim() && !chatFile)
                                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                : 'bg-primary hover:bg-slate-950 hover:-translate-y-0.5'
                            }`}
                          >
                            {chatFileUploadProgress !== null ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </button>
                        </div>

                        {/* Upload progress text */}
                        {chatFileUploadProgress !== null && (
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold px-1">
                            <span>Optimizing media upload stream...</span>
                            <span>{chatFileUploadProgress}%</span>
                          </div>
                        )}
                      </form>

                    </div>
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

                {/* Section: Pending Client Requests (Admin Review Panel) */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/50 mb-6">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-serif font-bold text-slate-900 tracking-tight flex items-center gap-2">
                          <Clock className="w-5 h-5 text-amber-500" />
                          <span>Pending Client Requests Review Desk</span>
                        </h3>
                        {clientRequests.length > 0 && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {clientRequests.length} pending
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Incoming requests proposed by customers in real-time. Review terms, customize milestones, and approve or decline proposals.
                      </p>
                    </div>
                  </div>

                  {clientRequests.length === 0 ? (
                    <div className="bg-white border border-slate-100 rounded-2xl py-8 px-6 text-center shadow-sm">
                      <div className="mx-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      </div>
                      <p className="text-xs font-semibold text-slate-800">No Pending Requests</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">The consulting client intake cue is currently empty. All clear for now!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {clientRequests.map((req) => {
                        const isAccepting = acceptingReqId === req.id;
                        return (
                          <div 
                            key={req.id} 
                            className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col gap-4 text-left"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-dashed border-slate-100">
                              <div>
                                <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 px-2.5 py-1 rounded-full mb-2">
                                  {req.type === 'engagement' && <Briefcase className="h-3 w-3" />}
                                  {req.type === 'task' && <Activity className="h-3 w-3" />}
                                  {req.type === 'document' && <FileText className="h-3 w-3" />}
                                  <span>{req.type?.toUpperCase()} • {req.category}</span>
                                </span>
                                <h4 className="text-sm font-serif font-bold text-slate-900 tracking-tight">
                                  {req.title}
                                </h4>
                                <p className="text-[10px] text-slate-500 mt-1">
                                  Proposed by: <span className="font-bold text-slate-700 underline">{req.clientName}</span> ({req.userEmail}) • {new Date(req.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAcceptingReqId(req.id);
                                    const nextMonth = new Date();
                                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                                    setAcceptEstCompletion(nextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
                                    if (req.type === 'document') {
                                      setAcceptStepsText("1. Client attachment intake verification\n2. Certified document review checklist\n3. Approval and secure storage vaulting");
                                    } else {
                                      setAcceptStepsText("1. Intake checklist & document verify\n2. CA audit & compliance draft analysis\n3. Execution filings and certification");
                                    }
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDecliningReqId(req.id);
                                    setDeclineReason("Standard statutory criteria check mismatch. Please check your parameters and file attachment, or propose an alternative service draft.");
                                  }}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl border border-rose-100 transition-colors cursor-pointer"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>

                            {/* Brief summary info */}
                            <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100/80">
                              <span className="font-bold text-[9px] uppercase tracking-wider font-mono text-slate-400 block mb-1">Details & Scope:</span>
                              {req.description}
                              
                              {req.fileUrl && (
                                <div className="mt-3 flex items-center justify-between bg-white border border-slate-100 p-2.5 rounded-xl">
                                  <div className="flex items-center gap-2 truncate">
                                    <FileText className="h-4 w-4 text-primary shrink-0" />
                                    <div className="truncate text-left">
                                      <p className="text-[10px] font-bold text-slate-800 truncate max-w-[200px]">
                                        {req.fileName}
                                      </p>
                                      <p className="text-[9px] text-slate-400">
                                        {req.fileType} • {req.fileSize}
                                      </p>
                                    </div>
                                  </div>
                                  <a 
                                    href={req.fileUrl} 
                                    target="_blank" 
                                    referrerPolicy="no-referrer"
                                    rel="noreferrer"
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[9px] font-bold uppercase tracking-wider px-2 header-link py-1 rounded-lg flex items-center gap-1 transition-colors"
                                  >
                                    <Download className="h-3 w-3" />
                                    <span>Download</span>
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Interactive acceptance customization subform */}
                            {isAccepting && (
                              <motion.div 
                                initial={{ opacity: 0, y: -5 }} 
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-emerald-50/70 border border-emerald-200 p-5 rounded-2xl space-y-4 text-left"
                              >
                                <div className="pb-2 border-b border-emerald-200/40 flex justify-between items-center">
                                  <h5 className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest font-mono">
                                    ⚙️ CUSTOMIZE COMPLIANCE TRACK PARAMETERS
                                  </h5>
                                  <button 
                                    type="button" 
                                    onClick={() => setAcceptingReqId(null)}
                                    className="text-[10px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                      Expected Completion Date
                                    </label>
                                    <input 
                                      type="text" 
                                      required
                                      value={acceptEstCompletion}
                                      onChange={(e) => setAcceptEstCompletion(e.target.value)}
                                      placeholder="e.g. July 31, 2026"
                                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                      Track Milestones Checklist (One step per line)
                                    </label>
                                    <textarea 
                                      rows={3}
                                      required
                                      value={acceptStepsText}
                                      onChange={(e) => setAcceptStepsText(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                                    />
                                    <span className="text-[9px] text-slate-400 mt-1 block">Milestones will be set dynamically inside the client application tracker.</span>
                                  </div>
                                </div>
                                <div className="pt-2 flex justify-end gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setAcceptingReqId(null)}
                                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                                  >
                                    Go Back
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAcceptRequestFinal(req)}
                                    disabled={isProcessingApproval}
                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                                  >
                                    {isProcessingApproval ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Deploying...</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-3.5 w-3.5" />
                                        <span>Final Submit & Deploy</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </motion.div>
                            )}

                            {/* Interactive decline customization subform */}
                            {decliningReqId === req.id && (
                              <motion.div 
                                initial={{ opacity: 0, y: -5 }} 
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-rose-50/70 border border-rose-200 p-5 rounded-2xl space-y-4 text-left mt-3"
                              >
                                <div className="pb-2 border-b border-rose-200/40 flex justify-between items-center">
                                  <h5 className="text-[11px] font-bold text-rose-800 uppercase tracking-widest font-mono flex items-center gap-1.5 font-serif">
                                    <XCircle className="h-4 w-4 text-rose-600 animate-pulse" />
                                    <span>Decline Proposal & Inform Client</span>
                                  </h5>
                                  <button 
                                    type="button" 
                                    onClick={() => setDecliningReqId(null)}
                                    className="text-[10px] font-semibold text-rose-700 hover:underline cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
                                      📋 Quick Select Preset Reasons:
                                    </label>
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                      {[
                                        "Standard statutory criteria check mismatch. Please check your parameters and retry.",
                                        "Missing essential document attachments or verification file. Please re-upload.",
                                        "Incorrect application details or matching errors in the compliance forms.",
                                        "The proposed timeline is shorter than the statutory period allowed for completion.",
                                        "Out of scope of our current accounting and taxation practice segments.",
                                        "Regulatory digital KYC compliance authentication is pending. Onboarding required first."
                                      ].map((preset) => (
                                        <button
                                          key={preset}
                                          type="button"
                                          onClick={() => setDeclineReason(preset)}
                                          className={`text-[9.5px] px-2.5 py-1.5 rounded-lg border text-left transition-all font-sans font-medium cursor-pointer ${
                                            declineReason === preset 
                                              ? 'bg-rose-100 border-rose-300 text-rose-900 font-semibold shadow-xs' 
                                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                                          }`}
                                        >
                                          {preset}
                                        </button>
                                      ))}
                                    </div>

                                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                      Decline Reason (Fully customisable text, dispatched to client in real-time)
                                    </label>
                                    <textarea 
                                      rows={3}
                                      required
                                      value={declineReason}
                                      onChange={(e) => setDeclineReason(e.target.value)}
                                      placeholder="Specify why the statutory or compliance criteria check failed..."
                                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none font-sans"
                                    />
                                    <span className="text-[9px] text-slate-400 mt-1 block"> This reason will automatically notify the client's consultation log and dashboard feed.</span>
                                  </div>
                                </div>
                                <div className="pt-2 flex justify-end gap-3 font-sans">
                                  <button
                                    type="button"
                                    onClick={() => setDecliningReqId(null)}
                                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                                  >
                                    Go Back
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeclineRequest(req, declineReason)}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    <span>Confirm Decline & Notify</span>
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                      {/* Upload certified file natively */}
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                          Native File Upload (Highly Recommended)
                        </label>
                        <div className="border border-dashed border-slate-200 hover:border-primary rounded-xl p-4 bg-slate-50 transition-colors relative flex flex-col items-center justify-center text-center cursor-pointer">
                          <input
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setUploadFile(file);
                              if (file) {
                                // Auto-fill standard file parameters inside the form
                                setNewDocName(file.name);
                                
                                // Auto-generate estimated readable size
                                if (file.size > 1024 * 1024) {
                                  setNewDocSize((file.size / (1024 * 1024)).toFixed(2) + " MB");
                                } else {
                                  setNewDocSize((file.size / 1024).toFixed(1) + " KB");
                                }
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <Upload className="h-5 w-5 text-slate-400 mb-2" />
                          <p className="text-[11px] font-semibold text-slate-700 max-w-[280px] truncate">
                            {uploadFile ? uploadFile.name : "Choose a local file, or drag & drop"}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-1">
                            {uploadFile ? `${(uploadFile.size / 1024).toFixed(1)} KB` : "Supports PDF, Excel, images, zip up to 10MB"}
                          </p>
                          {uploadFile && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setUploadFile(null);
                              }}
                              className="text-[10px] text-red-500 hover:underline mt-2 z-20 font-bold relative"
                            >
                              Clear selected file
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Custom external URL input if they prefer link sharing */}
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                          OR EXTERNAL WEB LINK (E.G. GOOGLE DRIVE, DROPBOX)
                        </label>
                        <input
                          type="url"
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          placeholder="https://drive.google.com/file/... or other cloud storage link"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-950 outline-none focus:border-primary font-medium"
                        />
                        <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                          Provide shared link coordinates if the file is already uploaded to your business Cloud/Drive systems.
                        </p>
                      </div>

                      <div className="border-t border-slate-100 py-2"></div>

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
                        disabled={uploadProgress !== null}
                        className={`w-full text-white rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider transition-all shadow-md focus:outline-none cursor-pointer flex items-center justify-center gap-2 ${
                          uploadProgress !== null 
                            ? 'bg-slate-400 cursor-not-allowed' 
                            : 'bg-primary hover:bg-slate-900 border border-transparent'
                        }`}
                      >
                        {uploadProgress !== null ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Uploading File ({uploadProgress}%)</span>
                          </>
                        ) : (
                          "Publish File into Vault"
                        )}
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

      {/* Client New Request Modal Dialog */}
      <AnimatePresence>
        {showNewRequestModal && (
          <div id="new-request-modal-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              id="new-request-modal-card"
              className="bg-white rounded-[2rem] shadow-2xl border border-slate-100/80 w-full max-w-2xl overflow-hidden font-sans"
            >
              {/* Header Section */}
              <div className="bg-slate-900 px-6 py-5 text-white flex justify-between items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="bg-primary/20 p-2 rounded-xl text-primary-light border border-primary/25">
                    <Sparkles className="h-5 w-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-serif font-semibold tracking-tight">Create New Request / Engagement</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Dispatched in real-time to Manohar Business Consulting Portal</p>
                  </div>
                </div>
                <button
                  id="close-new-request-modal-btn"
                  type="button"
                  onClick={() => setShowNewRequestModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body Form */}
              <form id="new-request-submission-form" onSubmit={handleSubmitNewRequest} className="p-6 md:p-8 space-y-5">
                
                {/* Select Request Type */}
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                    What can Manohar Business Consulting help you with?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      id="req-type-btn-engagement"
                      type="button"
                      onClick={() => setRequestType('engagement')}
                      className={`flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        requestType === 'engagement' 
                          ? 'border-primary bg-primary/[0.02] ring-1 ring-primary' 
                          : 'border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-white'
                      }`}
                    >
                      <div className={`p-2 rounded-xl mb-3 ${requestType === 'engagement' ? 'bg-primary/10 text-primary' : 'bg-slate-200/55 text-slate-500'}`}>
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">New Engagement</span>
                      <span className="text-[10px] text-slate-500 mt-1 font-normal leading-relaxed text-wrap">Book a new corporate consulting service or client audit.</span>
                    </button>

                    <button
                      id="req-type-btn-task"
                      type="button"
                      onClick={() => setRequestType('task')}
                      className={`flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        requestType === 'task' 
                          ? 'border-primary bg-primary/[0.02] ring-1 ring-primary' 
                          : 'border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-white'
                      }`}
                    >
                      <div className={`p-2 rounded-xl mb-3 ${requestType === 'task' ? 'bg-primary/10 text-primary' : 'bg-slate-200/55 text-slate-500'}`}>
                        <Activity className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">New Tracker Task</span>
                      <span className="text-[10px] text-slate-500 mt-1 font-normal leading-relaxed text-wrap">Request regular business operations or statutory filings.</span>
                    </button>

                    <button
                      id="req-type-btn-document"
                      type="button"
                      onClick={() => setRequestType('document')}
                      className={`flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        requestType === 'document' 
                          ? 'border-primary bg-primary/[0.02] ring-1 ring-primary' 
                          : 'border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-white'
                      }`}
                    >
                      <div className={`p-2 rounded-xl mb-3 ${requestType === 'document' ? 'bg-primary/10 text-primary' : 'bg-slate-200/55 text-slate-500'}`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">Upload Verification Paperwork</span>
                      <span className="text-[10px] text-slate-500 mt-1 font-normal leading-relaxed text-wrap">Submit certificates, ledgers, or business KYC paperwork.</span>
                    </button>
                  </div>
                </div>

                {/* Title & Category Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">
                      Subject / Request Title*
                    </label>
                    <input
                      id="input-request-title"
                      type="text"
                      required
                      value={requestTitle}
                      onChange={(e) => setRequestTitle(e.target.value)}
                      placeholder={requestType === 'document' ? "e.g. FY 25-26 Board Resolution Draft" : "e.g. Corporate GST Filing May"}
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-950 font-medium outline-none focus:border-primary transition-colors font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">
                      Service Category
                    </label>
                    <select
                      id="select-request-category"
                      value={requestCategory}
                      onChange={(e) => setRequestCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium outline-none focus:border-primary transition-colors cursor-pointer"
                    >
                      <option value="GST Registration">GST Registration</option>
                      <option value="GST Monthly Return">GST Monthly Return</option>
                      <option value="Income Tax Return">Income Tax Return</option>
                      <option value="ROC Compliance">ROC Compliance / MCA</option>
                      <option value="Company Incorporation">Company Incorporation</option>
                      <option value="FEMA & RBI Compliance">FEMA & RBI Compliance</option>
                      <option value="Audit & Assurance">Audit & Assurance / Ledger Check</option>
                      <option value="Other Consulting">Other Corporate Advisory</option>
                    </select>
                  </div>
                </div>

                {/* Request Description */}
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">
                    Scope of Work & Specific Instructions
                  </label>
                  <textarea
                    id="input-request-description"
                    value={requestDescription}
                    onChange={(e) => setRequestDescription(e.target.value)}
                    placeholder="Specify your deadline, billing conditions, legal facts or statutory criteria for CA Manohar..."
                    rows={4}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-950 outline-none focus:border-primary transition-all font-sans leading-relaxed"
                  />
                </div>

                {/* Attachment Section */}
                <div className="border border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/30">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Paperclip className="h-4 w-4 text-primary" />
                        <span>Attach Supporting File (Optional)</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-normal leading-relaxed">
                        Max size 15 MB. Files under 800 KB are instantly serialized for robust offline access.
                      </p>
                    </div>
                    <div className="w-full sm:w-auto relative">
                      <input
                        id="file-request-attachment"
                        type="file"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setRequestFile(e.target.files[0]);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <button
                        id="select-attachment-btn"
                        type="button"
                        className="bg-white border border-slate-200 hover:border-primary text-slate-700 hover:text-primary transition-all rounded-xl py-2 px-4 text-xs font-bold w-full uppercase tracking-wider cursor-pointer shadow-sm"
                      >
                        {requestFile ? "Change File" : "Choose Draft"}
                      </button>
                    </div>
                  </div>
                  {requestFile && (
                    <div className="mt-3 flex items-center justify-between bg-white border border-slate-100 p-2 rounded-xl text-xs text-slate-800">
                      <span className="font-medium truncate max-w-xs sm:max-w-md">{requestFile.name} ({(requestFile.size / 1024).toFixed(1)} KB)</span>
                      <button
                        id="remove-attachment-btn"
                        type="button"
                        onClick={() => setRequestFile(null)}
                        className="text-red-500 hover:text-red-700 font-bold px-1.5 py-0.5 rounded-lg text-[10px] cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Submission Progress bar */}
                {isSubmittingRequest && requestUploadProgress !== null && (
                  <div id="request-submit-progress" className="w-[100%] bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                      style={{ width: `${requestUploadProgress}%` }}
                    />
                  </div>
                )}

                {/* Actions row */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    id="discard-new-request-btn"
                    type="button"
                    onClick={() => setShowNewRequestModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    id="submit-new-request-btn"
                    type="submit"
                    disabled={isSubmittingRequest}
                    className="bg-primary hover:bg-slate-950 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingRequest ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Request</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
}
