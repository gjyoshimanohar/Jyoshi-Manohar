import React, { useState, useEffect } from "react";
import JSZip from "jszip";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { initializeApp, getApps, getApp } from "firebase/app";
import CustomSelect from "../components/CustomSelect";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  getAuth,
  User,
} from "firebase/auth";
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
  orderBy,
  or,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  auth,
  db,
  storage,
  secondaryAuth,
  firebaseConfig,
} from "../lib/firebase";
import {
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  FolderLock,
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
  Key,
  Activity,
  Briefcase,
  FileSpreadsheet,
  CheckCircle2,
  FileCheck2,
  RefreshCw,
  LogOut,
  Sparkles,
  Search,
  Menu,
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
  Check,
  Users,
  LayoutDashboard,
  Eye,
  EyeOff,
  Copy,
} from "lucide-react";

// Pre-defined interfaces
interface Application {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  type: string;
  status:
    | "Pending Documents"
    | "Under Review"
    | "Submitted to Department"
    | "Query Raised"
    | "Approved & Issued";
  currentStep: string;
  description: string;
  updatedAt: number;
  createdAt: number;
  estimatedCompletion?: string;
  steps?: {
    title: string;
    description: string;
    date: string;
    completed: boolean;
  }[];
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
  status: "Filed" | "In Progress" | "Pending Client Action" | "Upcoming";
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
  type: "task" | "document" | "engagement";
  category: string;
  description: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  createdAt: number;
  status: "pending" | "accepted" | "declined";
  declineReason?: string;
}

interface ClientLogin {
  id: string;
  userId: string;
  portalName: string;
  username: string;
  password?: string;
  notes?: string;
  createdAt: number;
}

interface PortalNotification {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
  type: "request" | "document" | "general" | "chat" | "system";
  relatedClientId?: string;
}

// Helper function to assemble and download the autofill browser extension
const downloadBrowserExtension = async () => {
  const zip = new JSZip();

  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        manifest_version: 3,
        name: "Portal Login Autofill",
        version: "1.3",
        description:
          "Autofills credentials from the CA admin dashboard into government portals automatically.",
        permissions: ["storage"],
        host_permissions: ["<all_urls>"],
        background: { service_worker: "background.js" },
        content_scripts: [
          {
            matches: ["<all_urls>"],
            all_frames: true,
            js: ["app-script.js"],
          },
          {
            matches: [
              "*://*.incometax.gov.in/*",
              "*://*.gst.gov.in/*",
              "*://*.mca.gov.in/*",
              "*://*.epfindia.gov.in/*",
              "*://*.tdscpc.gov.in/*",
              "*://*.esic.in/*",
            ],
            all_frames: true,
            js: ["portal-script.js"],
            run_at: "document_idle",
          },
        ],
      },
      null,
      2,
    ),
  );

  zip.file(
    "background.js",
    `
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'STORE_CREDENTIALS') {
    chrome.storage.local.set({ storedCredentials: request.data }, () => {
      console.log('Extension Background: Credentials securely stored for autofill.');
      sendResponse({ success: true });
    });
    return true; // Keep channel open for async response
  }
});
  `.trim(),
  );

  zip.file(
    "app-script.js",
    `
console.log("Portal Login extension hook loaded.");
document.addEventListener('PORTAL_LOGIN_AUTOFILL', function(event) {
  if (!event.detail) return;
  console.log("Extension intercepted login signal for:", event.detail.portalName);
  chrome.runtime.sendMessage({ type: 'STORE_CREDENTIALS', data: event.detail }, (response) => {
    console.log("Extension acknowledged credentials storage.");
  });
});
  `.trim(),
  );

  zip.file(
    "portal-script.js",
    `
console.log("Portal Login extension loaded on " + window.location.href);
chrome.storage.local.get(['storedCredentials'], (result) => {
  const creds = result.storedCredentials;
  if (creds && window.location.href.includes(new URL(creds.url).hostname)) {
    console.log("Credentials found for this portal! Initiating autofill sequence...");
    let attempts = 0;
    const interval = setInterval(() => {
      attemptAutofill(creds);
      attempts++;
      if (attempts > 40) clearInterval(interval);
    }, 500);
  } else {
    console.log("No credentials queued for this site.");
  }
});

function setInputValue(input, value) {
  // Check if readonly or disabled as an extra safeguard
  if (!input || !value || input.value === value || input.readOnly || input.disabled) return false;
  
  input.focus();
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value);
  } else {
    input.value = value;
  }
  
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.blur();
  return true;
}

function attemptAutofill(creds) {
  const { username, password } = creds;
  
  // Find visible inputs EXCLUDING readonly and disabled
  const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([readonly]):not([disabled])'))
    .filter(i => i.offsetWidth > 0 && i.offsetHeight > 0 && getComputedStyle(i).visibility !== 'hidden');
  
  const isPasswordField = (i) => i.type === 'password' || /pass|pwd/i.test(i.name) || /pass|pwd/i.test(i.id) || /pass|pwd/i.test(i.placeholder);
  
  const textInputs = inputs.filter(i => (i.type === 'text' || i.type === 'email' || !i.type || i.type === 'number') && !isPasswordField(i));
  const passInputs = inputs.filter(i => isPasswordField(i));
  
  // Advanced heuristic for username
  const matchedUserInput = textInputs.find(i => 
    /user|login|id|email|pan|gst|name|userid/i.test(i.name) || 
    /user|login|id|email|pan|gst|name|userid/i.test(i.id) ||
    /user|login|id|email|pan|gst|userid/i.test(i.placeholder)
  );
  
  // Only fallback to the first text input if we are confident it's the right one 
  // (e.g. it's the only text input and there's no password input on this page, or it's accompanied by exactly 1 password field)
  const userInput = matchedUserInput || ((textInputs.length === 1) ? textInputs[0] : null);
  
  const passInput = passInputs[0];

  if (passInput && password) {
    setInputValue(passInput, password);
  }

  // Only fill user input if it hasn't been accidentally filled with the password (which would indicate a wrong selection)
  if (userInput && username && userInput !== passInput && userInput.value !== password) {
    setInputValue(userInput, username);
  }
}
  `.trim(),
  );

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "autofill-extension-v1.3.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function ClientDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Admin Check
  const [isAdmin, setIsAdmin] = useState(false);

  // Dashboard Data State
  const [applications, setApplications] = useState<Application[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [complianceFilings, setComplianceFilings] = useState<
    ComplianceFiling[]
  >([]);
  const [clientRequests, setClientRequests] = useState<ClientRequest[]>([]);
  const [clientLogins, setClientLogins] = useState<ClientLogin[]>([]);
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // Admin and Client Selector (for Admin to view specific client data)
  const [clients, setClients] = useState<
    {
      uid: string;
      email: string;
      displayName?: string;
      kycStatus?: string;
      services?: string[];
      entityType?: string;
      mobile?: string;
      gstin?: string;
      pan?: string;
      tan?: string;
      address?: string;
    }[]
  >([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedClientEmail, setSelectedClientEmail] = useState<string>("");

  // Active Tab/Filter State
  const [activeTab, setActiveTab] = useState<
    | "portal-dashboard"
    | "applications"
    | "documents"
    | "compliance"
    | "admin"
    | "logins"
    | "chat"
    | "clients"
  >("applications");
  const [serviceFilter, setServiceFilter] = useState<string>("All");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOpsDropdownOpen, setIsOpsDropdownOpen] = useState(false);
  const [opsModalType, setOpsModalType] = useState<"app" | "doc" | "filing" | null>(null);
  const [opsTargetClientId, setOpsTargetClientId] = useState<string>("");

  // Real-time Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatMessagesLoading, setChatMessagesLoading] = useState(false);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [chatFileUploadProgress, setChatFileUploadProgress] = useState<
    number | null
  >(null);

  // Document Request states
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqDocName, setReqDocName] = useState("");
  const [reqDocDesc, setReqDocDesc] = useState("");
  const [reqDocCategory, setReqDocCategory] = useState("Financials");
  const [uploadingReqDocId, setUploadingReqDocId] = useState<string | null>(
    null,
  );
  const [activeReqDocUploadProgress, setActiveReqDocUploadProgress] = useState<
    number | null
  >(null);

  // Form states for Admin actions
  const [newAppTitle, setNewAppTitle] = useState("");
  const [newAppType, setNewAppType] = useState("GST Registration");
  const [newAppDesc, setNewAppDesc] = useState("");
  const [newAppStatus, setNewAppStatus] =
    useState<Application["status"]>("Pending Documents");
  const [newAppStep, setNewAppStep] = useState("");
  const [newAppEstComp, setNewAppEstComp] = useState("");

  const [newDocName, setNewDocName] = useState("");
  const [newDocDesc, setNewDocDesc] = useState("");
  const [newDocCategory, setNewDocCategory] = useState("Certificates");
  const [newDocSize, setNewDocSize] = useState("240 KB");
  const [newDocContent, setNewDocContent] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [customUrl, setCustomUrl] = useState("");

  // Form states for Logins
  const [editingLoginId, setEditingLoginId] = useState<string | null>(null);
  const [newLoginPortal, setNewLoginPortal] = useState("Income Tax Portal");
  const [newLoginUsername, setNewLoginUsername] = useState("");
  const [newLoginPassword, setNewLoginPassword] = useState("");
  const [newLoginNotes, setNewLoginNotes] = useState("");
  const [showAddLoginModal, setShowAddLoginModal] = useState(false);
  const [isAddingLogin, setIsAddingLogin] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<Set<string>>(
    new Set(),
  );

  const [newFilingTitle, setNewFilingTitle] = useState("");
  const [newFilingService, setNewFilingService] = useState("GST");
  const [newFilingFY, setNewFilingFY] = useState("2025-26");
  const [newFilingPeriod, setNewFilingPeriod] = useState("May 2026");
  const [newFilingDueDate, setNewFilingDueDate] = useState("");
  const [newFilingStatus, setNewFilingStatus] =
    useState<ComplianceFiling["status"]>("Upcoming");
  const [newFilingARN, setNewFilingARN] = useState("");

  // Milestone inline editing and addition states
  const [addingStepForAppId, setAddingStepForAppId] = useState<string | null>(
    null,
  );
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepDesc, setNewStepDesc] = useState("");
  const [newStepDate, setNewStepDate] = useState("");

  const [editingStepAppId, setEditingStepAppId] = useState<string | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editStepTitle, setEditStepTitle] = useState("");
  const [editStepDesc, setEditStepDesc] = useState("");
  const [editStepDate, setEditStepDate] = useState("");

  // Local feedback message
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Client New Request states
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  // Clients Master Modal States
  const [showClientsMasterModal, setShowClientsMasterModal] = useState(false);
  const [showAddNewClientModal, setShowAddNewClientModal] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPassword, setNewClientPassword] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientKyc, setNewClientKyc] = useState<string>("Pending");
  const [newClientServices, setNewClientServices] = useState<string[]>([]);
  const [editingClientUid, setEditingClientUid] = useState<string | null>(null);
  const [newClientLoading, setNewClientLoading] = useState(false);
  const [newClientEntityType, setNewClientEntityType] = useState("Individual");
  const [newClientMobile, setNewClientMobile] = useState("");
  const [newClientGstin, setNewClientGstin] = useState("");
  const [newClientPan, setNewClientPan] = useState("");
  const [newClientTan, setNewClientTan] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [requestType, setRequestType] = useState<
    "task" | "document" | "engagement"
  >("engagement");
  const [requestTitle, setRequestTitle] = useState("");
  const [requestCategory, setRequestCategory] = useState("GST Registration");
  const [requestDescription, setRequestDescription] = useState("");
  const [requestFile, setRequestFile] = useState<File | null>(null);
  const [requestUploadProgress, setRequestUploadProgress] = useState<
    number | null
  >(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const switchClientAndTab = (
    clientUid: string,
    clientEmail: string,
    targetTab:
      | "portal-dashboard"
      | "applications"
      | "documents"
      | "compliance"
      | "admin"
      | "chat"
      | "clients",
  ) => {
    setSelectedClientId(clientUid);
    setSelectedClientEmail(clientEmail);
    setActiveTab(targetTab);
  };

  // Admin acceptance workflow states
  const [acceptingReqId, setAcceptingReqId] = useState<string | null>(null);
  const [acceptEstCompletion, setAcceptEstCompletion] =
    useState("June 30, 2026");
  const [acceptStepsText, setAcceptStepsText] = useState<string>(
    "1. Intake checklist & document verify\n2. CA audit & compliance draft analysis\n3. Execution filings and certification",
  );
  const [acceptUserPassword, setAcceptUserPassword] = useState<string>("");
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  // Admin decline workflow states
  const [decliningReqId, setDecliningReqId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string>(
    "Standard statutory criteria check mismatch. Please check your parameters and file attachment, or propose an alternative service draft.",
  );

  // Set real-time listener for Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const isAdminUser = currentUser.email === "gjyoshimanohar@gmail.com";
        setIsAdmin(isAdminUser);
        if (isAdminUser && !selectedClientId) {
          setActiveTab("portal-dashboard");
        }
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
    const targetUserId = isAdmin ? selectedClientId || user.uid : user.uid;

    const appsQuery =
      isAdmin && !selectedClientId
        ? query(collection(db, "applications"))
        : query(
            collection(db, "applications"),
            where("userId", "==", targetUserId),
          );

    const docsQuery =
      isAdmin && !selectedClientId
        ? query(collection(db, "documents"))
        : query(
            collection(db, "documents"),
            where("userId", "==", targetUserId),
          );

    const filingsQuery =
      isAdmin && !selectedClientId
        ? query(collection(db, "compliance_filings"))
        : query(
            collection(db, "compliance_filings"),
            where("userId", "==", targetUserId),
          );

    const unsubscribeApps = onSnapshot(
      appsQuery,
      (snapshot) => {
        const list: Application[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Application);
        });
        list.sort((a, b) => b.createdAt - a.createdAt);
        setApplications(list);
        setDataLoading(false);
      },
      (error) => {
        console.error("Error reading applications: ", error);
      },
    );

    const unsubscribeDocs = onSnapshot(
      docsQuery,
      (snapshot) => {
        const list: ClientDocument[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ClientDocument);
        });
        list.sort((a, b) => b.uploadedAt - a.uploadedAt);
        setDocuments(list);
      },
      (error) => {
        console.error("Error reading documents: ", error);
      },
    );

    const unsubscribeFilings = onSnapshot(
      filingsQuery,
      (snapshot) => {
        const list: ComplianceFiling[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ComplianceFiling);
        });
        list.sort((a, b) => a.dueDate - b.dueDate);
        setComplianceFilings(list);
      },
      (error) => {
        console.error("Error reading compliance filings: ", error);
      },
    );

    // Fetch incoming client requests
    const requestsQuery = isAdmin
      ? query(collection(db, "client_requests"))
      : query(
          collection(db, "client_requests"),
          where("userId", "==", user.uid),
        );

    const unsubscribeRequests = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const list: ClientRequest[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ClientRequest);
        });
        list.sort((a, b) => b.createdAt - a.createdAt);
        setClientRequests(list);
      },
      (error) => {
        console.error("Error reading client requests: ", error);
      },
    );

    // Fetch client logins
    const loginsQuery =
      isAdmin && !selectedClientId
        ? query(collection(db, "client_logins"))
        : query(
            collection(db, "client_logins"),
            where("userId", "==", targetUserId),
          );

    const unsubscribeLogins = onSnapshot(
      loginsQuery,
      (snapshot) => {
        const list: ClientLogin[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ClientLogin);
        });
        list.sort((a, b) => b.createdAt - a.createdAt);
        setClientLogins(list);
      },
      (error) => {
        console.error("Error reading client logins: ", error);
      },
    );

    // Real-time notifications listener
    const notifsQuery = isAdmin
      ? query(
          collection(db, "notifications"),
          or(where("userId", "==", "admin"), where("userId", "==", user.uid)),
        )
      : query(collection(db, "notifications"), where("userId", "==", user.uid));

    const unsubscribeNotifs = onSnapshot(
      notifsQuery,
      (snapshot) => {
        const list: PortalNotification[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          if (data && !data.read) {
            list.push({ id: d.id, ...data } as PortalNotification);
          }
        });
        list.sort((a, b) => b.createdAt - a.createdAt);
        setNotifications(list);
      },
      (error) => {
        console.error("Error reading notifications: ", error);
      },
    );

    // If admin is logged in, fetch list of active clients securely in real-time
    let unsubscribeUsers = () => {};
    if (isAdmin) {
      unsubscribeUsers = onSnapshot(
        collection(db, "users"),
        (snapshot) => {
          const clientList: {
            uid: string;
            email: string;
            displayName?: string;
            kycStatus?: string;
            services?: string[];
            entityType?: string;
            mobile?: string;
            gstin?: string;
            pan?: string;
            tan?: string;
            address?: string;
          }[] = [];
          snapshot.forEach((docRef) => {
            const data = docRef.data();
            clientList.push({
              uid: data.uid || docRef.id,
              email: data.email,
              displayName: data.displayName,
              kycStatus: data.kycStatus || "Pending",
              services: data.services || [],
              entityType: data.entityType || "Individual",
              mobile: data.mobile || "",
              gstin: data.gstin || "",
              pan: data.pan || "",
              tan: data.tan || "",
              address: data.address || "",
            });
          });
          setClients(clientList);
        },
        (error) => {
          console.error(
            "Error loading clients list securely in real-time: ",
            error,
          );
        },
      );
    }

    return () => {
      unsubscribeApps();
      unsubscribeDocs();
      unsubscribeFilings();
      unsubscribeUsers();
      unsubscribeRequests();
      unsubscribeLogins();
      unsubscribeNotifs();
    };
  }, [user, isAdmin, selectedClientId]);

  // Real-time listener for Chat messages
  useEffect(() => {
    if (!user) return;

    // Determine the active chat scope ID
    // If logged in as admin: if a client is selected, listen to that client's chat; otherwise empty.
    // If regular client: listen to their own user.uid scope.
    const chatScopeUid = isAdmin ? selectedClientId || "" : user.uid;

    if (isAdmin && !chatScopeUid) {
      setChatMessages([]);
      return;
    }

    setChatMessagesLoading(true);
    const chatsQuery = query(
      collection(db, "chats"),
      where("clientScopeId", "==", chatScopeUid),
      orderBy("timestamp", "asc"),
    );

    const unsubscribeChats = onSnapshot(
      chatsQuery,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((docRef) => {
          msgs.push({ id: docRef.id, ...docRef.data() } as ChatMessage);
        });
        // Sort client-side to ensure ordering is correct
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        setChatMessages(msgs);
        setChatMessagesLoading(false);
      },
      (error) => {
        console.warn(
          "Real-time Chat ordered query failed (usually first launch before indices finish). Trying un-ordered fallback:",
          error,
        );

        const unorderedChatsQuery = query(
          collection(db, "chats"),
          where("clientScopeId", "==", chatScopeUid),
        );

        onSnapshot(
          unorderedChatsQuery,
          (snapshot) => {
            const msgs: ChatMessage[] = [];
            snapshot.forEach((docRef) => {
              msgs.push({ id: docRef.id, ...docRef.data() } as ChatMessage);
            });
            msgs.sort((a, b) => a.timestamp - b.timestamp);
            setChatMessages(msgs);
            setChatMessagesLoading(false);
          },
          (err) => {
            console.error("Fallback chat loading also failed: ", err);
            setChatMessagesLoading(false);
          },
        );
      },
    );

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
      let fileUrl = "";
      let fileName = "";
      let fileSize = "";
      let fileTypeStr = "";

      if (chatFile) {
        fileName = chatFile.name;
        if (chatFile.size > 1024 * 1024) {
          fileSize = (chatFile.size / (1024 * 1024)).toFixed(2) + " MB";
        } else {
          fileSize = (chatFile.size / 1024).toFixed(1) + " KB";
        }
        fileTypeStr = chatFile.name.split(".").pop()?.toUpperCase() || "FILE";

        // Hybrid upload strategy for Chat files
        if (chatFile.size <= 800 * 1024) {
          setChatFileUploadProgress(40);
          const base64Url = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(chatFile);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
          });
          fileUrl = base64Url;
          setChatFileUploadProgress(100);
        } else {
          setChatFileUploadProgress(50);
          const storagePath = `chats/${chatScopeUid}/${Date.now()}_${chatFile.name}`;
          const storageRef = ref(storage, storagePath);
          const uploadTask = uploadBytesResumable(storageRef, chatFile);

          const uploadedUrl = await new Promise<string>((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              (snapshot) => {
                const prog = Math.round(
                  (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
                );
                setChatFileUploadProgress(prog);
              },
              (err) => reject(err),
              async () => {
                const dlUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(dlUrl);
              },
            );
          });
          fileUrl = uploadedUrl;
        }

        // Auto catalog uploaded document into Document Vault collection
        try {
          const parentUserEmail =
            clients.find((c) => c.uid === chatScopeUid)?.email ||
            selectedClientEmail ||
            (isAdmin ? "client@partner.com" : user.email) ||
            "";
          await addDoc(collection(db, "documents"), {
            userId: chatScopeUid,
            userEmail: parentUserEmail,
            name: fileName,
            description: `File uploaded via direct consultation chat on ${new Date().toLocaleDateString()}`,
            url: fileUrl,
            fileType: fileTypeStr,
            size: fileSize,
            uploadedAt: Date.now(),
            category: "Consultation",
          });
        } catch (catErr) {
          console.error(
            "Auto registration of chat file in Document Vault failed:",
            catErr,
          );
        }
      }

      setChatFileUploadProgress(90);

      const senderName = isAdmin
        ? "Manohar Business Consulting Panel (Admin)"
        : user.displayName || user.email?.split("@")[0] || "Client Desk";

      const msgObj: Omit<ChatMessage, "id"> = {
        clientScopeId: chatScopeUid,
        senderId: user.uid,
        senderEmail: user.email || "",
        senderName: senderName,
        text: newChatMessage.trim(),
        timestamp: Date.now(),
      };

      if (fileUrl) {
        msgObj.fileUrl = fileUrl;
        msgObj.fileName = fileName;
        msgObj.fileSize = fileSize;
        msgObj.fileType = fileTypeStr;
      }

      await addDoc(collection(db, "chats"), msgObj);

      // Trigger real-time notification
      try {
        const notifTitle = isAdmin
          ? "New Message from CA Admin"
          : `New Chat Message from ${senderName}`;
        const notifDestId = isAdmin ? chatScopeUid : "admin";
        const notifDestEmail = isAdmin
          ? selectedClientEmail || ""
          : "gjyoshimanohar@gmail.com";
        const truncatedMessage = newChatMessage.trim()
          ? newChatMessage.trim().substring(0, 80) +
            (newChatMessage.trim().length > 80 ? "..." : "")
          : `Sent an attachment: ${fileName || "file"}`;

        await addDoc(collection(db, "notifications"), {
          userId: notifDestId,
          userEmail: notifDestEmail,
          title: notifTitle,
          message: truncatedMessage,
          createdAt: Date.now(),
          read: false,
          type: "chat",
          relatedClientId: user.uid,
        });
      } catch (notifErr) {
        console.error(
          "Failed to route notification alert for direct chat message:",
          notifErr,
        );
      }

      // Reset
      setNewChatMessage("");
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
      alert(
        "Please select a target client first to dispatch a document request.",
      );
      return;
    }
    if (!reqDocName.trim()) {
      alert("Please enter a Document Name to identify what is requested.");
      return;
    }

    try {
      setDataLoading(true);
      const parentUserEmail =
        clients.find((c) => c.uid === chatScopeUid)?.email ||
        selectedClientEmail ||
        "client@manohar.com";

      const docObj: Omit<ClientDocument, "id"> = {
        userId: chatScopeUid,
        userEmail: parentUserEmail,
        name: reqDocName,
        description:
          reqDocDesc ||
          "Official statutory file upload required by Manohar Consultants.",
        url: "",
        fileType: "PENDING",
        size: "0 KB",
        uploadedAt: Date.now(),
        category: reqDocCategory,
        status: "requested",
      };

      await addDoc(collection(db, "documents"), docObj);

      const senderName = "Manohar Business Consulting Panel (Admin)";
      const reqMessageText = `📢 DOCUMENT REQUESTED: [${reqDocName}] (${reqDocCategory})\nInstructions: ${reqDocDesc || "Please upload the requested paperwork."}`;

      const chatMsgObj: Omit<ChatMessage, "id"> = {
        clientScopeId: chatScopeUid,
        senderId: user.uid,
        senderEmail: user.email || "",
        senderName: senderName,
        text: reqMessageText,
        timestamp: Date.now(),
      };

      await addDoc(collection(db, "chats"), chatMsgObj);

      // Trigger client notification
      try {
        await addDoc(collection(db, "notifications"), {
          userId: chatScopeUid,
          userEmail: parentUserEmail,
          title: "New Document Requested",
          message: `CA Admin has requested: [${reqDocName}] (${reqDocCategory})`,
          createdAt: Date.now(),
          read: false,
          type: "request",
        });
      } catch (notifErr) {
        console.error(
          "Failed to route notification alert for document request:",
          notifErr,
        );
      }

      setFeedback({
        message: `Secure Document Request published for "${reqDocName}". Portal notified.`,
        type: "success",
      });
      setTimeout(() => setFeedback(null), 4000);

      setReqDocName("");
      setReqDocDesc("");
      setShowRequestForm(false);
    } catch (err: any) {
      console.error("Failed to request document: ", err);
      alert("Request failed: " + err.message);
    } finally {
      setDataLoading(false);
    }
  };

  const handleUploadRequestedDocument = async (
    reqDoc: ClientDocument,
    file: File,
  ) => {
    if (!user) return;
    try {
      setUploadingReqDocId(reqDoc.id);
      setActiveReqDocUploadProgress(10);

      let finalUrl = "";
      let finalSize = "";
      if (file.size > 1024 * 1024) {
        finalSize = (file.size / (1024 * 1024)).toFixed(2) + " MB";
      } else {
        finalSize = (file.size / 1024).toFixed(1) + " KB";
      }
      const fileTypeStr = file.name.split(".").pop()?.toUpperCase() || "FILE";

      // Hybrid Upload strategy: (same as handleCreateDoc)
      if (file.size <= 800 * 1024) {
        setActiveReqDocUploadProgress(40);
        const base64Url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });
        finalUrl = base64Url;
        setActiveReqDocUploadProgress(100);
      } else {
        setActiveReqDocUploadProgress(50);
        const storagePath = `documents/${reqDoc.userId}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        const uploadedUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const prog = Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
              );
              setActiveReqDocUploadProgress(prog);
            },
            (err) => reject(err),
            async () => {
              const dlUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(dlUrl);
            },
          );
        });
        finalUrl = uploadedUrl;
      }

      const updatedDocPayload = {
        url: finalUrl,
        fileType: fileTypeStr,
        size: finalSize,
        uploadedAt: Date.now(),
        status: "uploaded" as any,
      };

      await updateDoc(doc(db, "documents", reqDoc.id), updatedDocPayload);

      const senderName =
        user.displayName || user.email?.split("@")[0] || "Client Desk";
      const fulfilledMessageText = `✅ FULFILLED DOCUMENT REQ: Loaded file for [${reqDoc.name}].\nFile Name: ${file.name} (${finalSize})`;

      const chatMsgObj: Omit<ChatMessage, "id"> = {
        clientScopeId: reqDoc.userId,
        senderId: user.uid,
        senderEmail: user.email || "",
        senderName: senderName,
        text: fulfilledMessageText,
        timestamp: Date.now(),
      };

      await addDoc(collection(db, "chats"), chatMsgObj);

      // Trigger admin notification on document upload fulfillment
      try {
        await addDoc(collection(db, "notifications"), {
          userId: "admin",
          userEmail: "gjyoshimanohar@gmail.com",
          title: "Document Request Fulfilled",
          message: `${senderName} completed upload of requested document: [${reqDoc.name}]`,
          createdAt: Date.now(),
          read: false,
          type: "document",
          relatedClientId: user.uid,
        });
      } catch (notifErr) {
        console.error(
          "Failed to route notification alert for document fulfillment:",
          notifErr,
        );
      }

      setFeedback({
        message: `"${reqDoc.name}" has been successfully uploaded and delivered!`,
        type: "success",
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
      // MIGRATION OF PLACEHOLDER RECORDS
      // If admin approved requests for a user before they registered, migrate those records to their real UID.
      if (activeUser.email) {
        const placeholderQuery = query(
          collection(db, "users"),
          where("email", "==", activeUser.email),
          where("isPendingPlaceholder", "==", true),
        );
        const placeholderSnaps = await getDocs(placeholderQuery);

        for (const p of placeholderSnaps.docs) {
          const pUid = p.data().uid || p.id;

          // Migrate applications
          const appQ = query(
            collection(db, "applications"),
            where("userId", "==", pUid),
          );
          const appSnaps = await getDocs(appQ);
          for (const a of appSnaps.docs) {
            await updateDoc(doc(db, "applications", a.id), {
              userId: activeUser.uid,
            });
          }

          // Migrate documents
          const docQ = query(
            collection(db, "documents"),
            where("userId", "==", pUid),
          );
          const docSnaps = await getDocs(docQ);
          for (const d of docSnaps.docs) {
            await updateDoc(doc(db, "documents", d.id), {
              userId: activeUser.uid,
            });
          }

          // Migrate chats
          const chatQ = query(
            collection(db, "chats"),
            where("userId", "==", pUid),
          );
          const chatSnaps = await getDocs(chatQ);
          for (const c of chatSnaps.docs) {
            await updateDoc(doc(db, "chats", c.id), { userId: activeUser.uid });
          }

          // Migrate notifications
          const notifQ = query(
            collection(db, "notifications"),
            where("userId", "==", pUid),
          );
          const notifSnaps = await getDocs(notifQ);
          for (const n of notifSnaps.docs) {
            await updateDoc(doc(db, "notifications", n.id), {
              userId: activeUser.uid,
            });
          }

          // Delete the placeholder user doc from CRM
          await deleteDoc(doc(db, "users", p.id));
        }
      }

      const userRef = doc(db, "users", activeUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data()?.isSeeded) {
        console.log("User is already seeded, skipping duplicate run.");
        return;
      }

      const checkQuery = query(
        collection(db, "applications"),
        where("userId", "==", activeUser.uid),
      );
      const checkSnap = await getDocs(checkQuery);

      // If no application exists, let's create a beautiful profile mapping with default files
      if (checkSnap.empty) {
        console.log(
          "Seeding premium demo dashboard items to Firestore securely for key: ",
          activeUser.email,
        );

        // 1. Create a user document in users collection if not exists
        await setDoc(
          doc(db, "users", activeUser.uid),
          {
            uid: activeUser.uid,
            email: activeUser.email,
            displayName:
              activeUser.displayName ||
              activeUser.email?.split("@")[0] ||
              "Premium Client",
            createdAt: Date.now(),
            isSeeded: true,
          },
          { merge: true },
        );

        // 2. Prepare seed Applications
        const sampleApps: Omit<Application, "id">[] = [
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || "",
            title: "GST Registration Certificate (Regular GST)",
            type: "GST Service",
            status: "Submitted to Department",
            currentStep:
              "Pending departmental field inspection of regional physical address proof",
            description:
              "Registration of business entity to obtain official GSTIN license for legal commercial operations under GST standard regime.",
            createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
            updatedAt: Date.now() - 12 * 60 * 60 * 1000,
            estimatedCompletion: "June 15, 2026",
            steps: [
              {
                title: "Documents Collection",
                description:
                  "PAN card, Aadhaar, bank proof, and office rent deed verified",
                date: "May 25, 2026",
                completed: true,
              },
              {
                title: "Application Compilation",
                description:
                  "Form GST REG-01 prepared and client signatures validated",
                date: "May 29, 2026",
                completed: true,
              },
              {
                title: "Submission",
                description: "Form ARN-892701 issued by Ministry of Revenue",
                date: "June 02, 2026",
                completed: true,
              },
              {
                title: "Departmental Review",
                description:
                  "Awaiting physical address verification by state tax officer",
                date: "June 05, 2026",
                completed: false,
              },
              {
                title: "Approval & Issuance",
                description:
                  "GSTIN generated and certified GST-06 certificate delivery",
                date: "TBD",
                completed: false,
              },
            ],
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || "",
            title: "Manohar Wealth Private Limited Incorporation",
            type: "Corporate Compliance",
            status: "Approved & Issued",
            currentStep:
              "COI issued by MCA ROC. Corporate Identity Number generated.",
            description:
              "End-to-end incorporation including SPICe+ filing, Name Approval (RUN), MOA & AOA Drafting, and allotment of PAN/TAN.",
            createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
            updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
            estimatedCompletion: "Completed",
            steps: [
              {
                title: "DSC & DIN Allotment",
                description:
                  "Digital Signatures obtained and Director Identification Numbers assigned",
                date: "May 10, 2026",
                completed: true,
              },
              {
                title: "RUN Name Reservation",
                description:
                  "Business name reservation approved by MCA central registration center",
                date: "May 15, 2026",
                completed: true,
              },
              {
                title: "SPICe+ Part B Filing",
                description:
                  "Incorporation documents and declarations submitted securely",
                date: "May 20, 2026",
                completed: true,
              },
              {
                title: "COI & Certificate Release",
                description:
                  "Certificate of Incorporation received and MCA database refreshed",
                date: "June 04, 2026",
                completed: true,
              },
            ],
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || "",
            title: "Income Tax Return (ITR-3) Filing FY 2025-26",
            type: "Direct Tax",
            status: "Pending Documents",
            currentStep:
              "Awaiting client's demat capital gains statement & housing loan interest certificate",
            description:
              "Strategic tax planning, preparation, and comprehensive filing of personal/business income tax returns to optimize allowances and deductions.",
            createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
            updatedAt: Date.now(),
            estimatedCompletion: "July 31, 2026",
            steps: [
              {
                title: "AIS/TIS Analysis",
                description:
                  "Scanned comprehensive Annual Information System statement against client bank books",
                date: "June 04, 2026",
                completed: true,
              },
              {
                title: "Client Documents Upload",
                description:
                  "Waiting for Demat capital gains ledger, rental proof, and insurance premium bills",
                date: "Awaiting Upload",
                completed: false,
              },
              {
                title: "Draft Tax Computation",
                description: "Tax calculation under old vs new tax regime",
                date: "Planned",
                completed: false,
              },
              {
                title: "Submission & E-Verification",
                description:
                  "Final ITR dispatch and verification via Aadhaar OTP",
                date: "Planned",
                completed: false,
              },
            ],
          },
        ];

        for (const app of sampleApps) {
          await addDoc(collection(db, "applications"), app);
        }

        // 3. Prepare seed Documents (certificates/filings)
        const sampleDocs: Omit<ClientDocument, "id">[] = [
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || "",
            name: "Certificate of Incorporation - MCA.pdf",
            description:
              "Certified Memorandum of Incorporation for Manohar Wealth Services Private Limited from standard registry.",
            url: "#",
            fileType: "PDF",
            size: "442 KB",
            uploadedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
            category: "Corporate Certificates",
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || "",
            name: "GST Registration Certificate Form GST-06.pdf",
            description:
              "Authorized regular tax registration cert with complete schedules containing core business fields.",
            url: "#",
            fileType: "PDF",
            size: "305 KB",
            uploadedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
            category: "Tax Licensing",
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || "",
            name: "Provisional Balance Sheet & PL Draft.xlsx",
            description:
              "Audited provisional financials mapped with complete general ledgers for financing evaluation.",
            url: "#",
            fileType: "Excel",
            size: "1.2 MB",
            uploadedAt: Date.now() - 12 * 60 * 60 * 1000,
            category: "Financial Statements",
          },
        ];

        for (const docObj of sampleDocs) {
          await addDoc(collection(db, "documents"), docObj);
        }

        // 4. Prepare seed Compliance Tracker
        const sampleFilings: Omit<ComplianceFiling, "id">[] = [
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || "",
            title: "GSTR-1 GST Monthly Outward Supplies (May 2026)",
            serviceType: "GST",
            dueDate: Date.now() + 5 * 24 * 60 * 60 * 1000, // early June 11
            status: "In Progress",
            financialYear: "2026-27",
            period: "May 2026",
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || "",
            title: "Advance Tax Installment - Q1 (15% Share)",
            serviceType: "Income Tax",
            dueDate: Date.now() + 9 * 24 * 60 * 60 * 1000, // June 15
            status: "Pending Client Action",
            financialYear: "2026-27",
            period: "Q1 FY27",
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || "",
            title: "GSTR-3B Monthly Tax Computation (April 2026)",
            serviceType: "GST",
            dueDate: Date.now() - 16 * 24 * 60 * 60 * 1000, // May 20
            status: "Filed",
            financialYear: "2026-27",
            period: "April 2026",
            arn: "ARN-GST209930812",
            filedDate: "2026-05-18",
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || "",
            title: "Corporate Income Tax Filing (ITR-6) FY25-26",
            serviceType: "Income Tax",
            dueDate: Date.now() + 115 * 24 * 60 * 60 * 1000, // Sept 30
            status: "Upcoming",
            financialYear: "2025-26",
            period: "Annual Return",
          },
        ];

        for (const filing of sampleFilings) {
          await addDoc(collection(db, "compliance_filings"), filing);
        }

        // 5. Prepare seed Notifications
        const sampleNotifications = [
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || "",
            title: "Welcome to Manohar Consulting",
            message:
              "Welcome to CA Jyoshi Manohar's secure portal! Your customized tracker environments have been configured successfully.",
            createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
            read: true,
            type: "general" as const,
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || "",
            title: "Client Action Required",
            message:
              "Please upload your Q1 demat capital gains statement & housing loan interest certificate for ITR-3 evaluation.",
            createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
            read: false,
            type: "request" as const,
          },
          {
            userId: activeUser.uid,
            userEmail: activeUser.email || "",
            title: "April GSTR-3B Filed Successfully",
            message:
              "Your GSTR-3B Monthly Tax Computation has been filed by CA Admin. ARN receipt prepared inside the track panel.",
            createdAt: Date.now() - 12 * 60 * 60 * 1000,
            read: false,
            type: "document" as const,
          },
        ];

        for (const notif of sampleNotifications) {
          await addDoc(collection(db, "notifications"), notif);
        }
      }
    } catch (err) {
      console.error(
        "Failed to seed premium default user dashboard widgets:",
        err,
      );
    }
  };

  // Auth Handling
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        // Create user doc
        await setDoc(
          doc(db, "users", cred.user.uid),
          {
            uid: cred.user.uid,
            email: cred.user.email,
            displayName: displayName || email.split("@")[0],
            isAdmin: false,
            createdAt: Date.now(),
          },
          { merge: true },
        );

        try {
          await addDoc(collection(db, "notifications"), {
            userId: "admin",
            userEmail: "gjyoshimanohar@gmail.com",
            title: "New Client Registered",
            message: `${displayName || email.split("@")[0]} (${cred.user.email}) just registered directly via the portal.`,
            createdAt: Date.now(),
            read: false,
            type: "system",
            relatedClientId: cred.user.uid,
          });
        } catch (nErr) {
          console.error("Failed to notify admin of registration", nErr);
        }

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
    const demoEmail = "demo.client@jyoshimanohar.com";
    const demoPassword = "clientPass123";

    try {
      // Attempt login
      await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
    } catch (loginErr: any) {
      // If error (such as user not existing in clean database instances), create account immediately
      if (
        loginErr.code === "auth/user-not-found" ||
        loginErr.message?.includes("not found") ||
        loginErr.code === "auth/invalid-credential"
      ) {
        try {
          const cred = await createUserWithEmailAndPassword(
            auth,
            demoEmail,
            demoPassword,
          );
          await setDoc(
            doc(db, "users", cred.user.uid),
            {
              uid: cred.user.uid,
              email: demoEmail,
              displayName: "Premium Demo Client",
              isAdmin: false,
              createdAt: Date.now(),
            },
            { merge: true },
          );

          await ensureDataIsSeeded(cred.user);
        } catch (createErr: any) {
          setAuthError(
            "Failed to initialize demo credential. Please try registering with a custom email instead.",
          );
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
    setSelectedClientId("");
  };

  // Dynamic on-the-fly PDF and Tax summary report generator
  const triggerDocumentDownload = (file: ClientDocument) => {
    // If there is a real uploaded file URL or custom external URL, open/download it directly securely
    if (file.url && file.url !== "#" && file.url.trim() !== "") {
      const link = document.createElement("a");
      link.href = file.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      // fallback download attribute (might get ignored for cross-origin URLs but helps for same-origin)
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setFeedback({
        message: `Opening secure download stream for "${file.name}"...`,
        type: "success",
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
Authorized Client   : ${user?.email || "N/A"}
Service Sector      : ${file.category || "General Audit & Taxes"}

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
    const blob = new Blob([docHeader], { type: "text/plain" });
    const blobUrl = URL.createObjectURL(blob);

    const dLink = document.createElement("a");
    dLink.href = blobUrl;
    dLink.download =
      file.name.endsWith(".xlsx") || file.name.endsWith(".pdf")
        ? file.name
        : `${file.name}.txt`;
    document.body.appendChild(dLink);
    dLink.click();
    document.body.removeChild(dLink);
    URL.revokeObjectURL(blobUrl);

    setFeedback({
      message: `"${file.name}" has been dynamic-compiled and downloaded to your local device successfully!`,
      type: "success",
    });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Create Application (Admin Flow)
  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetClient = opsModalType ? opsTargetClientId : selectedClientId;
    const targetClientEmail = opsModalType 
      ? clients.find(c => c.uid === opsTargetClientId)?.email || ""
      : selectedClientEmail;
    if (!targetClient) {
      alert("Please select a target client first.");
      return;
    }
    try {
      const parentUserEmail =
        clients.find((c) => c.uid === selectedClientId)?.email ||
        selectedClientEmail ||
        "client@manohar.com";
      const newApp: Omit<Application, "id"> = {
        userId: targetClient,
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
          {
            title: "Application Created",
            description: "CA Jyoshi Manohar initialized the tax filing process",
            date: new Date().toLocaleDateString(),
            completed: true,
          },
          {
            title: "Internal Verification",
            description: newAppStep || "Awaiting document verification",
            date: "In Progress",
            completed: false,
          },
        ],
      };

      await addDoc(collection(db, "applications"), newApp);

      // Trigger notification for the client
      try {
        await addDoc(collection(db, "notifications"), {
          userId: targetClient,
          userEmail: parentUserEmail,
          title: "New Application Tracker Launched",
          message: `CA Admin has launched a new tracker: [${newAppTitle}] (${newAppType})`,
          createdAt: Date.now(),
          read: false,
          type: "request",
        });
      } catch (notifErr) {
        console.error(
          "Failed to add notifier for manual application push:",
          notifErr,
        );
      }

      setNewAppTitle("");
      setNewAppDesc("");
      setNewAppStep("");
      setNewAppEstComp("");
      if (opsModalType) setOpsModalType(null);
      setFeedback({
        message:
          "Successfully created new target client application status block!",
        type: "success",
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error(err);
      setFeedback({
        message:
          "Failed to create application entry in Firestore: " + err.message,
        type: "error",
      });
    }
  };

  // Create Document (Admin Flow)
  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetClient = opsModalType ? opsTargetClientId : selectedClientId;
    const targetClientEmail = opsModalType 
      ? clients.find(c => c.uid === opsTargetClientId)?.email || ""
      : selectedClientEmail;
    if (!targetClient) {
      alert("Please select a target client first.");
      return;
    }

    try {
      setDataLoading(true);
      const parentUserEmail =
        clients.find((c) => c.uid === selectedClientId)?.email ||
        selectedClientEmail ||
        "client@manohar.com";
      let finalUrl = customUrl || "#";
      let finalSize = newDocSize || "240 KB";
      let finalName = newDocName;

      // Check if a local file was picked for upload
      if (uploadFile) {
        if (!finalName) {
          finalName = uploadFile.name;
        } else {
          // If name doesn't contain extension, keep original file extension
          const origExt = uploadFile.name.split(".").pop();
          if (
            origExt &&
            !finalName.toLowerCase().endsWith("." + origExt.toLowerCase())
          ) {
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
            reader.onerror = (error) => reject(error);
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

              uploadTask.on(
                "state_changed",
                (snapshot) => {
                  const progress = Math.round(
                    (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
                  );
                  setUploadProgress(progress);
                },
                (error) => {
                  console.error("Storage upload failed: ", error);
                  reject(error);
                },
                async () => {
                  try {
                    const downloadUrl = await getDownloadURL(
                      uploadTask.snapshot.ref,
                    );
                    resolve(downloadUrl);
                  } catch (urlErr) {
                    reject(urlErr);
                  }
                },
              );
            });

            finalUrl = await uploadTaskPromise;
          } catch (storageErr: any) {
            console.error("Firebase Storage upload exception: ", storageErr);
            throw new Error(
              "Your uploaded file is over 800 KB and Firebase Storage has not yet been initialized/enabled in your Firebase Console. " +
                "To solve this instantly: either keep your file size under 800 KB (so it is processed by our client-side base64 vault), " +
                "paste an external Google Drive/Dropbox shared link, or go to console.firebase.google.com to enable Storage.",
            );
          }
        }
      }

      if (!finalName) {
        finalName = "Document.pdf";
      }

      // Extract uppercase file type
      const hasExt = finalName.includes(".");
      const fileExt = hasExt
        ? finalName.split(".").pop()?.toUpperCase() || "PDF"
        : "PDF";

      const newDocument: Omit<ClientDocument, "id"> = {
        userId: targetClient,
        userEmail: parentUserEmail,
        name: finalName,
        description: newDocDesc || "CA-certified official client report file.",
        url: finalUrl,
        fileType: fileExt,
        size: finalSize,
        uploadedAt: Date.now(),
        category: newDocCategory,
      };

      await addDoc(collection(db, "documents"), newDocument);

      // Trigger notification for the client
      try {
        await addDoc(collection(db, "notifications"), {
          userId: targetClient,
          userEmail: parentUserEmail,
          title: "New Document Received",
          message: `CA Admin has uploaded an official document: [${finalName}] (Category: ${newDocCategory})`,
          createdAt: Date.now(),
          read: false,
          type: "document",
        });
      } catch (notifErr) {
        console.error("Failed to add notifier for manual doc push:", notifErr);
      }

      // Reset form fields
      setNewDocName("");
      setNewDocDesc("");
      setUploadFile(null);
      setUploadProgress(null);
      setCustomUrl("");
      if (opsModalType) setOpsModalType(null);
      setFeedback({
        message:
          "Successfully delivered official secure document file package to client portal!",
        type: "success",
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error(err);
      setFeedback({
        message: "Upload or save error: " + err.message,
        type: "error",
      });
    } finally {
      setDataLoading(false);
      setUploadProgress(null);
    }
  };

  // Create Compliance Filing (Admin Flow)
  const handleCreateFiling = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetClient = opsModalType ? opsTargetClientId : selectedClientId;
    const targetClientEmail = opsModalType 
      ? clients.find(c => c.uid === opsTargetClientId)?.email || ""
      : selectedClientEmail;
    if (!targetClient) {
      alert("Please select a target client first.");
      return;
    }
    try {
      const parentUserEmail =
        clients.find((c) => c.uid === selectedClientId)?.email ||
        selectedClientEmail ||
        "client@manohar.com";
      const timestampDueDate = newFilingDueDate
        ? new Date(newFilingDueDate).getTime()
        : Date.now() + 30 * 24 * 60 * 60 * 1000;

      const newFiling: Omit<ComplianceFiling, "id"> = {
        userId: targetClient,
        userEmail: parentUserEmail,
        title: newFilingTitle,
        serviceType: newFilingService,
        dueDate: timestampDueDate,
        status: newFilingStatus,
        financialYear: newFilingFY,
        period: newFilingPeriod,
        arn: newFilingARN || "",
        filedDate:
          newFilingStatus === "Filed"
            ? new Date().toISOString().split("T")[0]
            : null,
      };

      await addDoc(collection(db, "compliance_filings"), newFiling);

      // Trigger notification for the client
      try {
        await addDoc(collection(db, "notifications"), {
          userId: targetClient,
          userEmail: parentUserEmail,
          title: "New Compliance Tracker Item",
          message: `CA Admin scheduled a new compliance tracker item: [${newFilingTitle}] (${newFilingService})`,
          createdAt: Date.now(),
          read: false,
          type: "request",
        });
      } catch (notifErr) {
        console.error(
          "Failed to add notifier for manual compliance date push:",
          notifErr,
        );
      }

      setNewFilingTitle("");
      setNewFilingARN("");
      if (opsModalType) setOpsModalType(null);
      setFeedback({
        message:
          "Successfully loaded real-time compliance tracker filing item!",
        type: "success",
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error(err);
      setFeedback({
        message: "Filing tracker registry error: " + err.message,
        type: "error",
      });
    }
  };

  const handleCreateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetClient = opsModalType ? opsTargetClientId : selectedClientId;
    if (!targetClient) {
      alert("Please select a target client first.");
      return;
    }
    if (!newLoginPortal || !newLoginUsername) {
      alert("Please fill in the portal name and username.");
      return;
    }
    try {
      setIsAddingLogin(true);

      if (editingLoginId) {
        await updateDoc(doc(db, "client_logins", editingLoginId), {
          portalName: newLoginPortal,
          username: newLoginUsername,
          password: newLoginPassword,
          notes: newLoginNotes,
        });
        setFeedback({
          message: "Successfully updated the client login.",
          type: "success",
        });
        setEditingLoginId(null);
      } else {
        const newLogin: Omit<ClientLogin, "id"> = {
          userId: targetClient,
          portalName: newLoginPortal,
          username: newLoginUsername,
          password: newLoginPassword,
          notes: newLoginNotes,
          createdAt: Date.now(),
        };

        await addDoc(collection(db, "client_logins"), newLogin);
        setFeedback({
          message: "Successfully securely registered the client login.",
          type: "success",
        });
      }

      setNewLoginPortal("Income Tax Portal");
      setNewLoginUsername("");
      setNewLoginPassword("");
      setNewLoginNotes("");
      setShowAddLoginModal(false);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      console.error(err);
      setFeedback({
        message: "Failed to store login: " + err.message,
        type: "error",
      });
    } finally {
      setIsAddingLogin(false);
    }
  };

  const handleCancelEditLogin = () => {
    setEditingLoginId(null);
    setNewLoginPortal("Income Tax Portal");
    setNewLoginUsername("");
    setNewLoginPassword("");
    setNewLoginNotes("");
    setShowAddLoginModal(false);
  };

  const getPortalUrl = (portalName: string) => {
    switch (portalName) {
      case "Income Tax Portal":
        return "https://eportal.incometax.gov.in/iec/foservices/#/login";
      case "GST Portal":
        return "https://services.gst.gov.in/services/login";
      case "MCA Portal":
        return "https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html";
      case "EPFO Portal":
        return "https://unifiedportal-emp.epfindia.gov.in/epfo/";
      case "TRACES Portal":
        return "https://www.tdscpc.gov.in/app/login.xhtml";
      case "ESI Portal":
        return "https://www.esic.in/ESICInsurance1/ESICInsurancePortal/PortalLogin.aspx";
      default:
        return "#";
    }
  };

  const handlePortalLogin = (login: ClientLogin) => {
    const url = getPortalUrl(login.portalName);

    if (url !== "#") {
      // Broadcast the autofill intent to the browser extension (using CustomEvent)
      document.dispatchEvent(
        new CustomEvent("PORTAL_LOGIN_AUTOFILL", {
          detail: {
            portalName: login.portalName,
            url: url,
            username: login.username,
            password: login.password,
          },
        }),
      );

      window.open(url, "_blank");
    }

    if (login.password) {
      copyToClipboard(
        login.password,
        "Password copied to clipboard. Opening portal...",
      );
    } else if (login.username) {
      copyToClipboard(
        login.username,
        "Username copied to clipboard. Opening portal...",
      );
    }
  };

  // Core administrative updater to advance steps and statuses seamlessly
  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setFeedback({ message: successMessage, type: "success" });
      } else {
        throw new Error("Clipboard API not available");
      }
    } catch (error) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      // move out of viewport
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.prepend(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setFeedback({ message: successMessage, type: "success" });
      } catch (err) {
        console.error("Fallback copy failed", err);
        setFeedback({ message: "Failed to copy to clipboard", type: "error" });
      } finally {
        textArea.remove();
      }
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleUpdateAppStatus = async (
    appId: string,
    status: Application["status"],
    nextStep: string,
  ) => {
    try {
      await updateDoc(doc(db, "applications", appId), {
        status: status,
        currentStep: nextStep,
        updatedAt: Date.now(),
      });

      const appToUpdate = applications.find((a) => a.id === appId);
      if (appToUpdate) {
        try {
          await addDoc(collection(db, "notifications"), {
            userId: appToUpdate.userId,
            userEmail: appToUpdate.userEmail || "",
            title: "Application Tracker Updated",
            message: `Your application [${appToUpdate.title}] step was updated: "${nextStep}"`,
            createdAt: Date.now(),
            read: false,
            type: "request",
          });
        } catch (nErr) {
          console.error("Failed to push update notification:", nErr);
        }
      }

      setFeedback({
        message: "Perfect! Client status advanced successfully.",
        type: "success",
      });
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
            reader.onerror = (error) => reject(error);
          });
          finalFileUrl = base64Url;
        } else {
          // Standard storage upload
          try {
            const storagePath = `requests/${user.uid}/${Date.now()}_${requestFile.name}`;
            const storageRef = ref(storage, storagePath);
            const uploadTask = uploadBytesResumable(storageRef, requestFile);

            finalFileUrl = await new Promise<string>((resolve, reject) => {
              uploadTask.on(
                "state_changed",
                (snapshot) => {
                  const progress = Math.round(
                    (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
                  );
                  setRequestUploadProgress(30 + Math.round(progress * 0.6));
                },
                (err) => reject(err),
                async () => {
                  const dlUrl = await getDownloadURL(uploadTask.snapshot.ref);
                  resolve(dlUrl);
                },
              );
            });
          } catch (storageErr: any) {
            console.warn(
              "Storage upload failed, using base64 fallback:",
              storageErr,
            );
            const base64Url = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(requestFile);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = (error) => reject(error);
            });
            finalFileUrl = base64Url;
          }
        }
        setRequestUploadProgress(90);

        const sizeKB = Math.round(requestFile.size / 1024);
        finalFileSize =
          sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(2)} MB` : `${sizeKB} KB`;
        finalFileType =
          requestFile.name.split(".").pop()?.toUpperCase() || "PDF";
      }

      // Save the draft proposal inside 'client_requests' collection
      const clientRequestObj: any = {
        userId: user.uid,
        userEmail: user.email || "",
        clientName: user.displayName || user.email?.split("@")[0] || "Client",
        title: requestTitle,
        type: requestType, // 'engagement', 'task', 'document'
        category: requestCategory,
        description: requestDescription || "Requested online by client.",
        createdAt: Date.now(),
        status: "pending",
      };

      if (requestFile) {
        if (finalFileUrl) {
          clientRequestObj.fileUrl = finalFileUrl;
        }
        clientRequestObj.fileName = requestFile.name;
        clientRequestObj.fileSize = finalFileSize;
        clientRequestObj.fileType = finalFileType;
      }

      await addDoc(collection(db, "client_requests"), clientRequestObj);

      const capitalizedType =
        requestType.charAt(0).toUpperCase() + requestType.slice(1);
      const chatMsgText = `📢 CLIENT PROPOSAL SUBMITTED: [${requestTitle}]\nType: ${capitalizedType}\nCategory: ${requestCategory}\nDetails: ${requestDescription || "None specified"}${requestFile ? `\n📎 Attachment: ${requestFile.name}` : ""}\n(Awaiting review and approval state on CA desk)`;

      const chatMsgObj: Omit<ChatMessage, "id"> = {
        clientScopeId: user.uid,
        senderId: user.uid,
        senderEmail: user.email || "",
        senderName: user.displayName || user.email?.split("@")[0] || "Client",
        text: chatMsgText,
        timestamp: Date.now(),
      };
      await addDoc(collection(db, "chats"), chatMsgObj);

      try {
        await addDoc(collection(db, "notifications"), {
          userId: "admin",
          userEmail: "gjyoshimanohar@gmail.com",
          title: "New Client Proposal",
          message: `${user.displayName || user.email?.split("@")[0] || "Client"} has submitted proposal: [${requestTitle}]`,
          createdAt: Date.now(),
          read: false,
          type: "request",
          relatedClientId: user.uid,
        });
      } catch (nErr) {
        console.error("Failed to push request notification:", nErr);
      }

      setFeedback({
        message:
          "Your proposal has been registered on the CA Desk awaiting review!",
        type: "success",
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
      const unreads = notifications.filter((n) => !n.read);
      const promises = unreads.map((n) =>
        updateDoc(doc(db, "notifications", n.id), { read: true }),
      );
      await Promise.all(promises);
    } catch (err: any) {
      console.error("Failed to mark all notifications as read: ", err);
    }
  };

  const handleNotificationClick = async (notif: PortalNotification) => {
    if (!notif.read) {
      try {
        await updateDoc(doc(db, "notifications", notif.id), { read: true });
      } catch (err: any) {
        console.error("Failed to mark notification as read: ", err);
      }
    }

    setNotificationsOpen(false);

    if (isAdmin && notif.relatedClientId) {
      setSelectedClientId(notif.relatedClientId);
      const cli = clients.find((c) => c.uid === notif.relatedClientId);
      if (cli) {
        setSelectedClientEmail(cli.email);
      }
    }

    if (notif.type === "chat") {
      setActiveTab("chat");
    } else if (notif.title?.includes("Document") || notif.type === "document") {
      setActiveTab("documents");
    } else if (
      notif.title?.includes("Application") ||
      notif.title?.includes("Tracker")
    ) {
      setActiveTab("applications");
    } else if (
      notif.title?.includes("Compliance") ||
      notif.title?.includes("Filing")
    ) {
      setActiveTab("compliance");
    } else if (
      notif.title?.includes("Proposal") ||
      notif.title?.includes("Registered") ||
      notif.type === "request"
    ) {
      if (isAdmin) {
        setActiveTab("admin");
      } else {
        setActiveTab("applications");
      }
    } else {
      setActiveTab("portal-dashboard");
    }
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (err: any) {
      console.error("Failed to mark notification as read: ", err);
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (err: any) {
      console.error("Failed to delete notification: ", err);
    }
  };

  const handleDeclineRequest = async (
    req: ClientRequest,
    customReason?: string,
  ) => {
    try {
      if (!req || !req.id) return;

      const reason =
        customReason ||
        "Standard statutory criteria check mismatch. Please check your parameters and file attachment, or propose an alternative service draft.";

      // 1. Update status to 'declined' in Firestore to update document state
      await updateDoc(doc(db, "client_requests", req.id), {
        status: "declined",
      });

      // 2. Delete request document from the collection
      await deleteDoc(doc(db, "client_requests", req.id));

      // 3. Post notification chat inside consultation room chat notifying client about the decline
      const chatMsgText = `❌ REQUEST DECLINED: The proposal entitled "${req.title}" (${req.category}) has been declined by CA Jyoshi Manohar's admin team. Reason specified: ${reason}`;

      const chatMsgObj: Omit<ChatMessage, "id"> = {
        clientScopeId: req.userId,
        senderId: user ? user.uid : "admin_manohar",
        senderEmail: user ? user.email || "" : "gjyoshimanohar@gmail.com",
        senderName: "Manohar Business Consulting Panel (Admin)",
        text: chatMsgText,
        timestamp: Date.now(),
      };
      await addDoc(collection(db, "chats"), chatMsgObj);

      // Trigger client notification
      try {
        await addDoc(collection(db, "notifications"), {
          userId: req.userId,
          userEmail: req.userEmail || "",
          title: "Proposal Declined",
          message: `Your service proposal "${req.title}" was declined. Reason: ${reason}`,
          createdAt: Date.now(),
          read: false,
          type: "request",
        });
      } catch (notifErr) {
        console.error(
          "Failed to route notification alert for declined proposal:",
          notifErr,
        );
      }

      setFeedback({
        message: `Successfully declined request "${req.title}". Portal and support channels notified!`,
        type: "success",
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

      let finalUserId = req.userId;
      let passwordCreated = false;

      // Check if this email already exists in our client registry
      const existingClient = clients.find(
        (c) => c.email.toLowerCase() === req.userEmail?.toLowerCase(),
      );

      if (existingClient) {
        // Auto-link to existing user
        finalUserId = existingClient.uid;
      } else if (req.userId === "anonymous" && acceptUserPassword) {
        // If no existing client and admin provided a password, create the account
        try {
          const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            req.userEmail,
            acceptUserPassword,
          );
          finalUserId = userCredential.user.uid;
          passwordCreated = true;
          await signOut(secondaryAuth); // Clear the secondary auth state safely

          // Register in the CRM database so they appear in 'clients' list
          await setDoc(doc(db, "users", finalUserId), {
            uid: finalUserId,
            email: req.userEmail,
            displayName: req.clientName || "New Client",
            kycStatus: "Pending",
            services: [],
            createdAt: Date.now(),
          });

          // Send automated email via full-stack Express API proxy (powered by Brevo)
          try {
            const emailRes = await fetch("/api/send-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: req.userEmail,
                subject: `Welcome to Manohar Business Consulting - Your Portal Access to ${req.title}`,
                htmlContent: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                  <h2>Welcome to Manohar Business Consulting</h2>
                  <p>Dear Client,</p>
                  <p>Your consultation request for <strong>${req.title}</strong> has been approved. We have created a secure client portal for you to track milestones, invoices, and share documents.</p>
                  <p><strong>Login Details:</strong><br/>
                  Email: ${req.userEmail}<br/>
                  Password: ${acceptUserPassword}</p>
                  <p>Please log in to your dashboard to get started.</p>
                  <br/>
                  <p>Best regards,<br/>CA Jyoshi Manohar<br/>Manohar Business Consulting</p>
                </div>
                `,
              }),
            });
            const emailData = await emailRes.json();

            if (!emailRes.ok) {
              console.error("Email API failed:", emailData);
              alert(
                `Account created, but failed to send the email: ${emailData.error || "Server error"}. Please check your Brevo API key configuration in Settings.`,
              );
            } else {
              console.log(
                `[EMAIL DISPATCH] Sent to ${req.userEmail} successfully.`,
              );
            }
          } catch (emailErr) {
            console.error("Failed to dispatch welcome email:", emailErr);
            alert(
              "Failed to communicate with the email server. Please check your connection.",
            );
          }
        } catch (authErr: any) {
          console.error("Failed to provision new client account:", authErr);
          if (authErr.code === "auth/email-already-in-use") {
            alert(
              `This email (${req.userEmail}) is already registered in Firebase Auth, but missing from the Clients record. Please accept this request without assigning a password. When the client logs into the portal using their existing password, their account will sync the new request.`,
            );
          } else {
            alert(
              `Account creation failed: ${authErr.message || "Unknown error"}`,
            );
          }
          setIsProcessingApproval(false);
          return;
        }
      } else if (req.userId === "anonymous") {
        finalUserId = "pending_" + Date.now();
        await setDoc(doc(db, "users", finalUserId), {
          uid: finalUserId,
          email: req.userEmail,
          displayName: req.clientName || "Pending Registration",
          kycStatus: "Pending",
          services: [],
          createdAt: Date.now(),
          isPendingPlaceholder: true,
        });
      }

      // Parse customized steps from state text
      const parsedSteps = acceptStepsText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line, idx) => {
          // Clean leading numbers or prefixes gracefully like "1." "Step 1:" "-" etc
          const cleanText = line.replace(/^\d+[\.\s\-:]+/, "").trim();
          return {
            title: cleanText,
            description:
              idx === 0
                ? "Statutory onboarding & checklists verified successfully"
                : `Milestone execution phase ${idx + 1}`,
            date:
              idx === 0 ? new Date().toLocaleDateString() : "Pending CA Desk",
            completed: idx === 0,
          };
        });

      // 1. Create target instance based on request type
      if (req.type === "engagement" || req.type === "task") {
        const appTitle =
          req.type === "engagement"
            ? `Engagement: ${req.title}`
            : `Task: ${req.title}`;
        const newApp: Omit<Application, "id"> = {
          userId: finalUserId,
          userEmail: req.userEmail,
          title: appTitle,
          type: req.category || "Consulting Service",
          status: "Under Review",
          currentStep:
            parsedSteps[0]?.title || "Awaiting document verification",
          description: req.description || "Requested and approved online.",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          estimatedCompletion: acceptEstCompletion || "June 30, 2026",
          steps: parsedSteps,
        };

        await addDoc(collection(db, "applications"), newApp);

        // If supporting file attachment exists in the request, register it inside documents
        if (req.fileUrl) {
          await addDoc(collection(db, "documents"), {
            userId: finalUserId,
            userEmail: req.userEmail,
            name: req.fileName || `Attachment_${req.title}.pdf`,
            description: `Supporting draft for approved engagement: "${req.title}"`,
            url: req.fileUrl,
            fileType: req.fileType || "PDF",
            size: req.fileSize || "Unknown size",
            uploadedAt: Date.now(),
            category: "Client Attachments",
          });
        }

        // Post chat message to consultation room
        const chatMsgObj: Omit<ChatMessage, "id"> = {
          clientScopeId: finalUserId,
          senderId: user ? user.uid : "admin_manohar",
          senderEmail: user ? user.email || "" : "gjyoshimanohar@gmail.com",
          senderName: "Manohar Business Consulting Panel (Admin)",
          text: passwordCreated
            ? `✅ CLIENT ACCOUNT ACTIVATED & REQUEST APPROVED: CA Jyoshi Manohar has approved your proposal [${req.title}]. Your credentials have been emailed to ${req.userEmail}.\nService: ${newApp.type}\nEst. Completion: ${newApp.estimatedCompletion}\nWelcome to the firm!`
            : `✅ REQUEST APPROVED: CA Jyoshi Manohar has approved and launched the tracking flow for your proposal: [${req.title}]!\nService: ${newApp.type}\nEst. Completion: ${newApp.estimatedCompletion}\nMilestone tracker initialized inside Client Dashboard. Close review tracking active.`,
          timestamp: Date.now(),
        };
        await addDoc(collection(db, "chats"), chatMsgObj);
      } else if (req.type === "document") {
        const docName = req.fileName || `Approved Doc: ${req.title}`;
        const newDocument = {
          userId: finalUserId,
          userEmail: req.userEmail,
          name: docName,
          description:
            req.description || `Approved verification paperwork: ${req.title}`,
          url: req.fileUrl || "#",
          fileType: req.fileType || "PDF",
          size: req.fileSize || "0 KB",
          uploadedAt: Date.now(),
          category: req.category || "Certificates",
          status: "Under Review",
        };

        await addDoc(collection(db, "documents"), newDocument);

        // Post chat message to consultation room
        const chatMsgObj: Omit<ChatMessage, "id"> = {
          clientScopeId: finalUserId,
          senderId: user ? user.uid : "admin_manohar",
          senderEmail: user ? user.email || "" : "gjyoshimanohar@gmail.com",
          senderName: "Manohar Business Consulting Panel (Admin)",
          text: `✅ DOCUMENT INGESTION COMPLETE: Manohar Consulting has verified and approved document package: [${docName}] into standard vaults. Review is set to live.`,
          timestamp: Date.now(),
        };
        await addDoc(collection(db, "chats"), chatMsgObj);
      }

      // Trigger client notification on approval
      try {
        await addDoc(collection(db, "notifications"), {
          userId: finalUserId,
          userEmail: req.userEmail || "",
          title: passwordCreated
            ? "Welcome! Account Setup Complete"
            : "Proposal Approved",
          message: passwordCreated
            ? `We've initiated "${req.title}" and deployed your private portal. Check email for your secure login password.`
            : `Your service proposal "${req.title}" has been approved! Tracking dashboard is now active.`,
          createdAt: Date.now(),
          read: false,
          type: "request",
        });
      } catch (notifErr) {
        console.error(
          "Failed to route notification alert for approved proposal:",
          notifErr,
        );
      }

      // 2. Remove from pending client_requests
      await deleteDoc(doc(db, "client_requests", req.id));

      setFeedback({
        message: passwordCreated
          ? `Proposal approved, account ${req.userEmail} created, & emails dispatched.`
          : `Proposal "${req.title}" successfully approved and active.`,
        type: "success",
      });
      setTimeout(() => setFeedback(null), 4000);

      // 3. Reset states
      setAcceptingReqId(null);
      setAcceptEstCompletion("June 30, 2026");
      setAcceptStepsText(
        "1. Intake checklist & document verify\n2. CA audit & compliance draft analysis\n3. Execution filings and certification",
      );
      setAcceptUserPassword("");
    } catch (err: any) {
      console.error(err);
      alert("Error approving client request: " + err.message);
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleToggleStepCompleted = async (
    appId: string,
    stepIndex: number,
  ) => {
    try {
      const appToUpdate = applications.find((a) => a.id === appId);
      if (!appToUpdate || !appToUpdate.steps) return;

      const updatedSteps = appToUpdate.steps.map((s, idx) => {
        if (idx === stepIndex) {
          return { ...s, completed: !s.completed };
        }
        return s;
      });

      await updateDoc(doc(db, "applications", appId), {
        steps: updatedSteps,
        updatedAt: Date.now(),
      });
      setFeedback({
        message: "Milestone status updated in real-time!",
        type: "success",
      });
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
      const appToUpdate = applications.find((a) => a.id === appId);
      if (!appToUpdate) return;

      const currentSteps = appToUpdate.steps || [];
      const updatedSteps = [
        ...currentSteps,
        {
          title: newStepTitle,
          description: newStepDesc || "Status verification log",
          date: newStepDate || "In Progress",
          completed: false,
        },
      ];

      await updateDoc(doc(db, "applications", appId), {
        steps: updatedSteps,
        updatedAt: Date.now(),
      });

      setNewStepTitle("");
      setNewStepDesc("");
      setNewStepDate("");
      setAddingStepForAppId(null);
      setFeedback({
        message: "New verification step added successfully!",
        type: "success",
      });
      setTimeout(() => setFeedback(null), 2500);
    } catch (err: any) {
      alert("Failed to add milestone: " + err.message);
    }
  };

  const handleStartEditingStep = (
    appId: string,
    stepIndex: number,
    step: {
      title: string;
      description: string;
      date: string;
      completed: boolean;
    },
  ) => {
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
      const appToUpdate = applications.find((a) => a.id === appId);
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

      await updateDoc(doc(db, "applications", appId), {
        steps: updatedSteps,
        updatedAt: Date.now(),
      });

      setEditingStepAppId(null);
      setEditingStepIndex(null);
      setFeedback({ message: "Milestone details saved!", type: "success" });
      setTimeout(() => setFeedback(null), 2500);
    } catch (err: any) {
      alert("Failed to save milestone: " + err.message);
    }
  };

  const handleDeleteStep = async (appId: string, stepIndex: number) => {
    if (!confirm("Are you sure you want to delete this step?")) return;
    try {
      const appToUpdate = applications.find((a) => a.id === appId);
      if (!appToUpdate || !appToUpdate.steps) return;

      const updatedSteps = appToUpdate.steps.filter(
        (_, idx) => idx !== stepIndex,
      );

      await updateDoc(doc(db, "applications", appId), {
        steps: updatedSteps,
        updatedAt: Date.now(),
      });

      setFeedback({ message: "Verification step removed!", type: "success" });
      setTimeout(() => setFeedback(null), 2500);
    } catch (err: any) {
      alert("Failed to delete step: " + err.message);
    }
  };

  const handleUpdateFilingStatus = async (
    filingId: string,
    status: ComplianceFiling["status"],
    arn?: string,
  ) => {
    try {
      const updates: Partial<ComplianceFiling> = { status };
      if (status === "Filed") {
        updates.arn =
          arn || `ARN-${Math.floor(100000 + Math.random() * 900000)}`;
        updates.filedDate = new Date().toISOString().split("T")[0];
      } else {
        updates.arn = "";
        updates.filedDate = null;
      }
      await updateDoc(doc(db, "compliance_filings", filingId), updates);

      const filingToUpdate = complianceFilings.find((f) => f.id === filingId);
      if (filingToUpdate) {
        try {
          await addDoc(collection(db, "notifications"), {
            userId: filingToUpdate.userId,
            userEmail: filingToUpdate.userEmail || "",
            title: "Compliance Filing Status Updated",
            message: `Your filing [${filingToUpdate.title}] GSTR/ITR status is now updated to: "${status}"`,
            createdAt: Date.now(),
            read: false,
            type: "request",
          });
        } catch (nErr) {
          console.error("Failed to push filing update notification:", nErr);
        }
      }

      setFeedback({
        message: "Compliance Filing status updated successfully in real-time!",
        type: "success",
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      alert("Filing update failed: " + err.message);
    }
  };

  // Delete operational items
  const handleDeleteItem = async (
    col: "applications" | "documents" | "compliance_filings",
    itemId: string,
  ) => {
    if (
      !confirm(
        "Are you absolutely sure you want to remove this client record permanently? This cannot be undone.",
      )
    )
      return;
    try {
      await deleteDoc(doc(db, col, itemId));
      setFeedback({
        message: "Item deleted successfully from client registers.",
        type: "success",
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  const handleDeleteClientById = async (
    clientId: string,
    clientEmail: string,
  ) => {
    if (!clientId) {
      alert("Please select a client to delete first.");
      return;
    }

    // Safety check: Cannot delete self
    if (clientId === user?.uid) {
      alert(
        "Security alert: You cannot delete your own admin/active user profile.",
      );
      return;
    }

    const emailDisplay = clientEmail || "this client";
    if (
      !confirm(
        `Are you absolutely sure you want to PERMANENTLY delete client profile for "${emailDisplay}"?\n\nThis will purge all their tracker records, documents and filings. This action is irreversible.`,
      )
    ) {
      return;
    }

    try {
      setDataLoading(true);

      // 1. Delete associated applications
      const appsSnap = await getDocs(
        query(collection(db, "applications"), where("userId", "==", clientId)),
      );
      const appDeletes = appsSnap.docs.map((d) =>
        deleteDoc(doc(db, "applications", d.id)),
      );

      // 2. Delete associated documents
      const docsSnap = await getDocs(
        query(collection(db, "documents"), where("userId", "==", clientId)),
      );
      const docDeletes = docsSnap.docs.map((d) =>
        deleteDoc(doc(db, "documents", d.id)),
      );

      // 3. Delete associated compliance filings
      const filingsSnap = await getDocs(
        query(
          collection(db, "compliance_filings"),
          where("userId", "==", clientId),
        ),
      );
      const filingDeletes = filingsSnap.docs.map((d) =>
        deleteDoc(doc(db, "compliance_filings", d.id)),
      );

      // Execute all subcollection deletes
      await Promise.all([...appDeletes, ...docDeletes, ...filingDeletes]);

      // 4. Delete the user document itself
      await deleteDoc(doc(db, "users", clientId));

      // Reset selection if the deleted client was active
      if (selectedClientId === clientId) {
        setSelectedClientId("");
        setSelectedClientEmail("");
      }

      setFeedback({
        message:
          "Successfully deleted client profile and purged all associated records from Firestore registers!",
        type: "success",
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (e: any) {
      console.error("Failed to delete client: ", e);
      alert("Failed to delete client: " + e.message);
    } finally {
      setDataLoading(false);
    }
  };

  const handleAddNewClientInModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientEmail) {
      alert("Please enter a valid email address.");
      return;
    }

    try {
      setNewClientLoading(true);
      let finalUid =
        editingClientUid || newClientEmail.replace(/[^a-zA-Z0-9]/g, "_");

      const shouldCreateAuthUser =
        !editingClientUid && newClientPassword && newClientPassword.length >= 6;
      if (shouldCreateAuthUser) {
        const secondaryApp =
          getApps().find((app) => app.name === "SecondaryApp") ||
          initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);
        const cred = await createUserWithEmailAndPassword(
          secondaryAuth,
          newClientEmail,
          newClientPassword,
        );
        finalUid = cred.user.uid;
        await secondaryAuth.signOut();
      }

      await setDoc(
        doc(db, "users", finalUid),
        {
          uid: finalUid,
          email: newClientEmail,
          displayName: newClientName || newClientEmail.split("@")[0],
          kycStatus: newClientKyc,
          services: newClientServices,
          entityType: newClientEntityType,
          mobile: newClientMobile,
          gstin: newClientGstin,
          pan: newClientPan,
          tan: newClientTan,
          address: newClientAddress,
          updatedAt: Date.now(),
          ...(editingClientUid ? {} : { createdAt: Date.now() }),
        },
        { merge: true },
      );
      setSelectedClientId(finalUid);
      setSelectedClientEmail(newClientEmail);
      setNewClientEmail("");
      setNewClientPassword("");
      setNewClientName("");
      setNewClientKyc("Pending");
      setNewClientServices([]);
      setNewClientEntityType("Individual");
      setNewClientMobile("");
      setNewClientGstin("");
      setNewClientPan("");
      setNewClientTan("");
      setNewClientAddress("");
      setEditingClientUid(null);
      setShowAddNewClientModal(false);
      setFeedback({
        message: editingClientUid
          ? "Successfully updated client profile!"
          : "Successfully created client profile" +
            (shouldCreateAuthUser ? " with login access!" : " stub!"),
        type: "success",
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert(
        `Failed to ${editingClientUid ? "update" : "create"} stub: ` +
          err.message,
      );
    } finally {
      setNewClientLoading(false);
    }
  };

  // Helper sorting and visual mappings
  const getStatusBadge = (status: Application["status"]) => {
    const maps = {
      "Pending Documents": "bg-amber-100 text-amber-800 border-amber-200/50",
      "Under Review": "bg-blue-100 text-blue-800 border-blue-200/50",
      "Submitted to Department":
        "bg-purple-100 text-purple-800 border-purple-200/50",
      "Query Raised": "bg-red-100 text-red-800 border-red-200/50",
      "Approved & Issued":
        "bg-emerald-100 text-emerald-800 border-emerald-200/50",
    };
    return maps[status] || "bg-slate-100 text-slate-800 border-slate-200";
  };

  const getFilingStatusBadge = (status: ComplianceFiling["status"]) => {
    const maps = {
      Filed: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      "In Progress": "bg-blue-50 text-blue-700 border-blue-200/80",
      "Pending Client Action": "bg-amber-50 text-amber-700 border-amber-200/80",
      Upcoming: "bg-slate-50 text-slate-600 border-slate-200",
    };
    return maps[status] || "bg-slate-50 text-slate-600 border-slate-200";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm font-medium text-slate-600 tracking-wider font-mono">
            ESTABLISHING SECURE AUDIT CONNS...
          </p>
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
            className="bg-white border border-slate-100/60 shadow-2xl p-8 sm:p-12 rounded-3xl"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-primary flex items-center justify-center rounded-xl mx-auto mb-4 shadow-md">
                <span className="text-white font-semibold text-xl tracking-tighter">
                  JM
                </span>
              </div>
              <h2 className="text-2xl text-primary tracking-tight tracking-tight font-medium">
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
                      className="w-full bg-slate-50 border border-slate-100/60 rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium text-primary focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
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
                    className="w-full bg-slate-50 border border-slate-100/60 rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium text-primary focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
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
                    className="w-full bg-slate-50 border border-slate-100/60 rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium text-primary focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="••••••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-primary text-white py-3.5 rounded-xl font-medium text-xs uppercase tracking-widest hover:bg-secondary transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center space-x-2 mt-4 cursor-pointer"
              >
                {authLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {isSignUp ? "Generate Secure Account" : "Login"}
                    </span>
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
                  : "New client? Setup your legal portal registration here"}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // SIGNED IN VIEW
  return (
    <main className="min-h-screen pt-28 pb-20 bg-[#FDFDFD]">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Banner Notification feedback messages */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-24 left-1/2 -translate-x-1/2 z-[80] w-[90%] max-w-lg p-4 rounded-xl border shadow-lg ${
                feedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              } flex items-start gap-2`}
            >
              <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
              <div className="text-xs font-semibold">{feedback.message}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Title Ribbon */}
        <div className="bg-white border border-slate-100/60 rounded-3xl p-6 sm:p-8 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-50">
          <div className="flex items-start gap-4">
            <div>
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 text-primary text-[10px] uppercase font-bold tracking-widest rounded-full w-max border border-primary/10">
                <Shield className="h-3 w-3" />
                <span>Secure CA Terminal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl text-primary tracking-tight tracking-tight font-medium mt-2 flex items-center gap-4 flex-wrap">
                <span>
                  Welcome,{" "}
                  {isAdmin
                    ? "Jyoshi Manohar"
                    : user.displayName || user.email?.split("@")[0]}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-1.5">
                Active Session Token:{" "}
                <span className="font-mono text-[11px] font-bold bg-slate-100 px-1 rounded text-primary">
                  {user.uid.substring(0, 8).toUpperCase()}
                </span>{" "}
                • Enterprise Class Encryption Enabled
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary transition-all whitespace-nowrap cursor-pointer h-9"
                >
                  <span>Blog Admin</span>
                </Link>
              )}
              

              {/* Real-time Notifications Bell dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="flex items-center justify-center p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600 hover:text-primary shadow-sm relative cursor-pointer h-9 w-9"
                  title="Notifications Desk"
                >
                  <Bell className="h-4 w-4" />
                  {notifications.filter((n) => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-extrabold text-white animate-pulse">
                      {notifications.filter((n) => !n.read).length}
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
                          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                            Notifications Desk
                          </span>
                          <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {notifications.length} total
                          </span>
                        </div>
                        {notifications.filter((n) => !n.read).length > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-[11px] font-bold text-primary hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
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
                            <p className="text-xs text-slate-600 font-medium ">
                              Awaiting notifications...
                            </p>
                            <p className="text-[10px] text-slate-400 max-w-[240px] leading-relaxed mx-auto">
                              Any active administrative service alerts will
                              appear securely in real-time here.
                            </p>
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            // Determine type specifics
                            let iconEl = (
                              <Bell className="h-4 w-4 text-purple-600" />
                            );
                            let badgeBg = "bg-purple-50 border-purple-100";
                            if (notif.type === "chat") {
                              iconEl = (
                                <MessageSquare className="h-4 w-4 text-blue-600" />
                              );
                              badgeBg = "bg-blue-50 border-blue-100";
                            } else if (notif.type === "document") {
                              iconEl = (
                                <FileCheck2 className="h-4 w-4 text-emerald-600" />
                              );
                              badgeBg = "bg-emerald-50 border-emerald-100";
                            } else if (notif.type === "request") {
                              iconEl = (
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                              );
                              badgeBg = "bg-amber-50 border-amber-100";
                            }

                            return (
                              <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-4 transition-colors flex gap-3 group relative cursor-pointer hover:bg-slate-50 ${notif.read ? "bg-slate-50/40 text-slate-500/80" : "bg-white"}`}
                              >
                                <div
                                  className={`h-8 w-8 rounded-xl flex items-center justify-center border shrink-0 ${badgeBg}`}
                                >
                                  {iconEl}
                                </div>
                                <div className="space-y-1 pr-6 flex-1 text-left">
                                  <div className="flex items-start justify-between gap-1.5">
                                    <h4
                                      className={`text-xs leading-none ${notif.read ? "font-medium text-slate-500" : "font-extrabold text-primary"}`}
                                    >
                                      {notif.title}
                                    </h4>
                                    <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                                      {new Date(
                                        notif.createdAt,
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                  <p
                                    className={`text-[11px] leading-relaxed ${notif.read ? "text-slate-400/85" : "text-slate-600"}`}
                                  >
                                    {notif.message}
                                  </p>
                                </div>

                                <div className="absolute right-2 top-2 flex flex-col gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  {!notif.read && (
                                    <button
                                      onClick={(e) =>
                                        handleMarkAsRead(notif.id, e)
                                      }
                                      className="p-1 border border-slate-200 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                      title="Mark read"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) =>
                                      handleDeleteNotification(notif.id, e)
                                    }
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
                <span className="bg-primary hover:bg-secondary text-white text-white border border-transparent font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  ADMIN PORTAL ACCESS
                </span>
              )}
              {!isAdmin && (
                <button
                  onClick={() => setShowNewRequestModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-secondary text-white/90 border border-transparent text-white font-semibold rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
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
            {isAdmin && (
              <div
                className={`relative z-[60] flex items-center gap-2 bg-primary text-white px-3 py-1.5 rounded-xl text-sm font-sans tracking-normal shadow-md animate-in fade-in slide-in-from-right-2 duration-300 border border-primary/20 ${!selectedClientId ? "opacity-80" : ""}`}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  {selectedClientId ? (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  ) : null}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${selectedClientId ? "bg-amber-500" : "bg-slate-400"}`}
                  ></span>
                </span>
                <span className="font-semibold px-1 shrink-0">
                  Active client:
                </span>
                <CustomSelect
                  value={selectedClientId || ""}
                  onChange={(val) => {
                    if (val) {
                      setSelectedClientId(val);
                      setSelectedClientEmail(
                        clients.find((c) => c.uid === val)?.email || "",
                      );
                    } else {
                      setSelectedClientId("");
                      setSelectedClientEmail("");
                      setActiveTab("clients");
                    }
                  }}
                  options={[
                    { value: "", label: "None selected" },
                    ...clients.map((c) => ({
                      value: c.uid,
                      label: c.displayName || c.email,
                    })),
                  ]}
                  className={`bg-transparent ${selectedClientId ? "text-amber-300" : "text-slate-300"} font-semibold outline-none border-none py-1 px-2 rounded-lg cursor-pointer transition-colors w-40 min-w-[150px]`}
                />
                {selectedClientId && (
                  <button
                    onClick={() => {
                      setSelectedClientId("");
                      setSelectedClientEmail("");
                      setActiveTab("clients");
                    }}
                    className="ml-1 p-1 bg-white/10 hover:bg-red-500/80 rounded-lg transition-colors cursor-pointer text-white shrink-0"
                    title="Clear Focus"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            
            {/* Operations Console Dropdown */}
            {isAdmin && (
              <div className="relative w-full sm:w-auto mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpsDropdownOpen(!isOpsDropdownOpen)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 border border-transparent font-semibold rounded-xl text-sm transition-all shadow-md cursor-pointer hover:shadow-lg w-full sm:w-auto"
                >
                  <Upload className="h-4 w-4" />
                  <span>Operations Console</span>
                </button>

                {isOpsDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-transparent"
                      onClick={() => setIsOpsDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-3 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-3 duration-200 text-left">
                      <div className="p-4 bg-slate-50 border-b border-slate-100">
                        <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                          Operations Console
                        </span>
                      </div>
                      <div className="p-2 space-y-1">
                        <button
                          onClick={() => {
                            setEditingClientUid(null);
                            setNewClientEmail("");
                            setNewClientName("");
                            setNewClientMobile("");
                            setNewClientEntityType("Individual");
                            setNewClientGstin("");
                            setNewClientPan("");
                            setNewClientAddress("");
                            setNewClientKyc("Pending");
                            setShowAddNewClientModal(true);
                            setIsOpsDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-primary/5 hover:text-primary rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Users className="h-3.5 w-3.5" /> Add New Client
                        </button>
                        <button
                          onClick={() => { setOpsModalType("app"); setIsOpsDropdownOpen(false); }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-primary/5 hover:text-primary rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Briefcase className="h-3.5 w-3.5" /> Push Service Engagement
                        </button>
                        <button
                          onClick={() => { setOpsModalType("doc"); setIsOpsDropdownOpen(false); }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-primary/5 hover:text-primary rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5" /> Deliver Legal Document
                        </button>
                        <button
                          onClick={() => { setOpsModalType("filing"); setIsOpsDropdownOpen(false); }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-primary/5 hover:text-primary rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Calendar className="h-3.5 w-3.5" /> Push Compliance Calendar
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Grid and Tabs layout */}
        <div
          className={`flex flex-col lg:flex-row gap-8 transition-all duration-300 items-start`}
        >
          {/* Navigation drawer rail (Desktop) */}
          <div
            className={`w-full ${isSidebarOpen ? "lg:w-[300px]" : "lg:w-fit"} shrink-0 flex flex-col gap-3 transition-all duration-300`}
          >
            {/* Toggle Button Always Visible */}
            <div className="flex justify-start mb-1 h-10 w-full shrink-0">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:text-primary hover:bg-primary/5 transition-all outline-none cursor-pointer shadow-sm hover:shadow shrink-0"
                title="Toggle Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* Sidebar Contents */}
            <div className="space-y-3 transition-all duration-300 w-full">
              {isAdmin && (
                <div className="mb-4">
                  <button
                    type="button"
                    id="portal-dashboard-nav-btn"
                    onClick={() => setActiveTab("portal-dashboard")}
                    className={`w-full flex items-center ${isSidebarOpen ? "justify-between p-4" : "justify-center p-3"} rounded-xl text-left transition-all border ${
                      activeTab === "portal-dashboard"
                        ? "bg-primary text-white border-primary shadow-md"
                        : "bg-white text-slate-700 hover:text-primary hover:bg-slate-50 border-slate-100/60"
                    } mb-2 cursor-pointer`}
                  >
                    <div className="flex items-center gap-3">
                      <LayoutDashboard className="h-4 w-4 shrink-0" />
                      {isSidebarOpen && (
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Portal Dashboard
                        </span>
                      )}
                    </div>
                    {isSidebarOpen && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === "portal-dashboard" ? "bg-white/15 text-white" : "bg-emerald-100 text-emerald-800"}`}
                      >
                        Active
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    id="clients-master-nav-btn"
                    onClick={() => setActiveTab("clients")}
                    className={`w-full flex items-center ${isSidebarOpen ? "justify-between p-4" : "justify-center p-3"} rounded-xl text-left transition-all border ${
                      activeTab === "clients"
                        ? "bg-primary text-white border-primary shadow-md"
                        : "bg-white text-slate-700 hover:text-primary hover:bg-slate-50 border-slate-100/60"
                    } mb-2 cursor-pointer`}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 shrink-0" />
                      {isSidebarOpen && (
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Clients master
                        </span>
                      )}
                    </div>
                    {isSidebarOpen && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === "clients" ? "bg-white/15 text-white" : "bg-slate-100 text-slate-800"}`}
                      >
                        {clients.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    id="client-requests-nav-btn"
                    onClick={() => setActiveTab("requests")}
                    className={`w-full flex items-center ${isSidebarOpen ? "justify-between p-4" : "justify-center p-3"} rounded-xl text-left transition-all border ${
                      activeTab === "requests"
                        ? "bg-primary text-white border-primary shadow-md"
                        : "bg-white text-slate-700 hover:text-primary hover:bg-slate-50 border-slate-100/60"
                    } mb-2 cursor-pointer`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 shrink-0" />
                      {isSidebarOpen && (
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Client Requests
                        </span>
                      )}
                    </div>
                    {isSidebarOpen && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === "requests" ? "bg-white/15 text-white" : "bg-amber-100 text-amber-800"}`}
                      >
                        {
                          clientRequests.filter((r) => r.status === "pending")
                            .length
                        }
                      </span>
                    )}
                  </button>
                </div>
              )}

              {(!isAdmin || selectedClientId) && (
                <>
                  <button
                    onClick={() => setActiveTab("applications")}
                    className={`w-full flex items-center ${isSidebarOpen ? "justify-between p-4" : "justify-center p-3"} rounded-xl text-left transition-all border ${
                      activeTab === "applications"
                        ? "bg-primary text-white border-primary shadow-md"
                        : "bg-white text-slate-700 hover:text-primary hover:bg-slate-50 border-slate-100/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-4 w-4 shrink-0" />
                      {isSidebarOpen && (
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Application tracker
                        </span>
                      )}
                    </div>
                    {isSidebarOpen && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === "applications" ? "bg-white/15 text-white" : "bg-slate-100 text-slate-800"}`}
                      >
                        {applications.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab("documents")}
                    className={`w-full flex items-center ${isSidebarOpen ? "justify-between p-4" : "justify-center p-3"} rounded-xl text-left transition-all border ${
                      activeTab === "documents"
                        ? "bg-primary text-white border-primary shadow-md"
                        : "bg-white text-slate-700 hover:text-primary hover:bg-slate-50 border-slate-100/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FolderLock className="h-4 w-4 shrink-0" />
                      {isSidebarOpen && (
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Document vaults
                        </span>
                      )}
                    </div>
                    {isSidebarOpen && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === "documents" ? "bg-white/15 text-white" : "bg-slate-100 text-slate-800"}`}
                      >
                        {documents.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab("compliance")}
                    className={`w-full flex items-center ${isSidebarOpen ? "justify-between p-4" : "justify-center p-3"} rounded-xl text-left transition-all border ${
                      activeTab === "compliance"
                        ? "bg-primary text-white border-primary shadow-md"
                        : "bg-white text-slate-700 hover:text-primary hover:bg-slate-50 border-slate-100/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 shrink-0" />
                      {isSidebarOpen && (
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Compliance track
                        </span>
                      )}
                    </div>
                    {isSidebarOpen && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === "compliance" ? "bg-white/15 text-white" : "bg-slate-100 text-slate-800"}`}
                      >
                        {complianceFilings.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab("chat")}
                    className={`w-full flex items-center ${isSidebarOpen ? "justify-between p-4" : "justify-center p-3"} rounded-xl text-left transition-all border ${
                      activeTab === "chat"
                        ? "bg-primary text-white border-primary shadow-md"
                        : "bg-white text-slate-700 hover:text-primary hover:bg-slate-50 border-slate-100/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      {isSidebarOpen && (
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Consultation Chat
                        </span>
                      )}
                    </div>
                    {isSidebarOpen && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === "chat" ? "bg-white/15 text-white" : "bg-slate-100 text-slate-800"}`}
                      >
                        {chatMessages.length}
                      </span>
                    )}
                  </button>

                  {isAdmin && (
                    <>
<button
                        onClick={() => setActiveTab("logins")}
                        className={`w-full flex items-center ${isSidebarOpen ? "justify-between p-4" : "justify-center p-3"} rounded-xl text-left transition-all border ${
                          activeTab === "logins"
                            ? "bg-primary text-white border-primary shadow-md"
                            : "bg-white text-slate-700 hover:text-primary hover:bg-slate-50 border-slate-100/60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Key className="h-4 w-4 shrink-0" />
                          {isSidebarOpen && (
                            <span className="text-xs font-bold uppercase tracking-wider">
                              Access Credentials
                            </span>
                          )}
                        </div>
                        {isSidebarOpen && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === "logins" ? "bg-white/15 text-white" : "bg-slate-100 text-slate-800"}`}
                          >
                            {clientLogins.length}
                          </span>
                        )}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Dynamic Content boards */}
          <div
            className={`flex-1 space-y-6 transition-all duration-300 w-full min-w-0`}
          >
            {/* Real-time Loader Indicator */}
            {dataLoading && (
              <div className="flex items-center space-x-2 bg-white/60 p-4 rounded-xl shadow-sm border border-slate-100/60">
                <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                <span className="text-xs font-medium text-slate-600">
                  Verifying synchronization across active registers...
                </span>
              </div>
            )}

            {/* CLIENT REQUESTS TAB */}
            {activeTab === "requests" && isAdmin && (
              <div className="space-y-6">
                <div className="flex items-start gap-4 bg-white p-6 rounded-2xl border border-slate-100/60 shadow-sm relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -z-1" />
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-primary tracking-tight tracking-tight">
                      Client Proposals Inbox
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                      Review, approve, and spawn automated client workspace
                      milestones from incoming proposals.
                    </p>
                  </div>
                </div>

                {/* Awaiting Review list */}
                <div className="bg-white border border-slate-100/60 rounded-2xl p-3 sm:p-4 shadow-sm text-left">
                  <div className="border-b border-slate-100/60 pb-2 mb-3 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-semibold text-primary tracking-tight flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
                        <span>
                          Client Proposals Inbox Queues (
                          {
                            clientRequests.filter((r) => r.status === "pending")
                              .length
                          }
                          )
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Approve, decline and spawn automated client workspace
                        milestones
                      </p>
                    </div>
                  </div>

                  {clientRequests.filter((r) => r.status === "pending")
                    .length === 0 ? (
                    <div className="py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-slate-700">
                        Proposal Queue All Clear
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 max-w-sm mx-auto">
                        No pending proposals awaiting review.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {clientRequests
                        .filter((r) => r.status === "pending")
                        .map((req) => {
                          const isAccepting = acceptingReqId === req.id;
                          const isDeclining = decliningReqId === req.id;
                          return (
                            <div
                              key={req.id}
                              className="bg-white border border-slate-100/60 rounded-2xl p-5 shadow-sm hover:border-slate-200 hover:shadow-xs transition-all flex flex-col gap-4 text-left relative overflow-hidden"
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-dashed border-slate-100/60">
                                <div>
                                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                                      {req.type?.toUpperCase()}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-805 border border-amber-200 px-2 py-0.5 rounded">
                                      {req.category}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-semibold text-primary tracking-tight">
                                    {req.title}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 mt-1 font-sans">
                                    Proposed by:{" "}
                                    <span className="font-bold text-slate-700 underline">
                                      {req.clientName}
                                    </span>{" "}
                                    ({req.userEmail}) •{" "}
                                    {new Date(req.createdAt).toLocaleString()}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAcceptingReqId(req.id);
                                      setDecliningReqId(null);
                                      const nextMonth = new Date();
                                      nextMonth.setMonth(
                                        nextMonth.getMonth() + 1,
                                      );
                                      setAcceptEstCompletion(
                                        nextMonth.toLocaleDateString("en-US", {
                                          month: "long",
                                          day: "numeric",
                                          year: "numeric",
                                        }),
                                      );
                                      if (req.type === "document") {
                                        setAcceptStepsText(
                                          "1. Client attachment intake verification\n2. Certified document review checklist\n3. Approval and secure storage vaulting",
                                        );
                                      } else {
                                        setAcceptStepsText(
                                          "1. Intake checklist & document verify\n2. CA audit & compliance draft analysis\n3. Execution filings and certification",
                                        );
                                      }
                                    }}
                                    className="bg-primary hover:bg-secondary text-white text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDecliningReqId(req.id);
                                      setAcceptingReqId(null);
                                      setDeclineReason(
                                        "Standard statutory criteria check mismatch. Please check your parameters and file attachment, or propose an alternative service draft.",
                                      );
                                    }}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg border border-rose-100 transition-colors cursor-pointer"
                                  >
                                    Decline
                                  </button>
                                </div>
                              </div>

                              <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100/60">
                                <span className="font-bold text-[9px] uppercase tracking-wider font-mono text-slate-400 block mb-1">
                                  Details & Scope Description:
                                </span>
                                {req.description}

                                {req.fileUrl && (
                                  <div className="mt-3 flex items-center justify-between bg-white border border-slate-100/60 p-2.5 rounded-xl">
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
                                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                                    >
                                      <Download className="h-3 w-3" />
                                      <span>Download</span>
                                    </a>
                                  </div>
                                )}
                              </div>

                              {/* Acceptance Customizer */}
                              {isAccepting && (
                                <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl space-y-3 mt-3 text-left">
                                  <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800 font-mono uppercase tracking-wider">
                                    <span>
                                      ⚙️ Initialise Tracker Milestones
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setAcceptingReqId(null)}
                                      className="hover:underline text-emerald-600"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                  <div className="space-y-3">
                                    {req.userId === "anonymous" &&
                                      !clients.some(
                                        (c) =>
                                          c.email.toLowerCase() ===
                                          req.userEmail?.toLowerCase(),
                                      ) && (
                                        <div>
                                          <label className="block text-[8.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                            Assign Client Login Password
                                          </label>
                                          <input
                                            type="text"
                                            value={acceptUserPassword}
                                            onChange={(e) =>
                                              setAcceptUserPassword(
                                                e.target.value,
                                              )
                                            }
                                            placeholder="Enter generated password to email the client"
                                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500 font-medium"
                                          />
                                        </div>
                                      )}
                                    {req.userId === "anonymous" &&
                                      clients.some(
                                        (c) =>
                                          c.email.toLowerCase() ===
                                          req.userEmail?.toLowerCase(),
                                      ) && (
                                        <div className="bg-emerald-50 border border-emerald-100 p-2 rounded text-emerald-700 text-[10px] flex items-center gap-2">
                                          <CheckCircle className="h-3 w-3" />
                                          <span>
                                            Account exists: {req.userEmail}.
                                            Request will be linked
                                            automatically.
                                          </span>
                                        </div>
                                      )}
                                    <div>
                                      <label className="block text-[8.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Estimated Completion
                                      </label>
                                      <input
                                        type="text"
                                        value={acceptEstCompletion}
                                        onChange={(e) =>
                                          setAcceptEstCompletion(e.target.value)
                                        }
                                        className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500 font-medium"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[8.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                        Steps Schedule (One step per line)
                                      </label>
                                      <textarea
                                        rows={3}
                                        value={acceptStepsText}
                                        onChange={(e) =>
                                          setAcceptStepsText(e.target.value)
                                        }
                                        className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-500 resize-none font-medium"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setAcceptingReqId(null)}
                                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100"
                                    >
                                      Close
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAcceptRequestFinal(req)
                                      }
                                      disabled={isProcessingApproval}
                                      className="px-3 py-1.5 bg-primary hover:bg-secondary text-white disabled:opacity-55 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                                    >
                                      {isProcessingApproval ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-3 w-3" />
                                      )}
                                      <span>Approve & Deploy Workspace</span>
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Decline Customizer */}
                              {isDeclining && (
                                <div className="bg-rose-50/70 border border-rose-250 p-4 rounded-xl space-y-3 mt-3 text-left">
                                  <div className="flex justify-between items-center text-[10px] font-bold text-rose-850 font-mono uppercase tracking-wider">
                                    <span>❌ Refusal Notification Draft</span>
                                    <button
                                      type="button"
                                      onClick={() => setDecliningReqId(null)}
                                      className="hover:underline text-rose-600 font-sans"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                  <div>
                                    <label className="block text-[8.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                      Rejection Reason Alert
                                    </label>
                                    <textarea
                                      rows={2}
                                      value={declineReason}
                                      onChange={(e) =>
                                        setDeclineReason(e.target.value)
                                      }
                                      className="w-full bg-white border border-slate-200 text-slate-850 rounded-lg p-2.5 text-xs outline-none focus:border-rose-500 resize-none font-medium"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setDecliningReqId(null)}
                                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100"
                                    >
                                      Close
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeclineRequest(req, declineReason)
                                      }
                                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      <span>Confirm Refuse</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CENTRAL EXECUTIVE PORTAL DASHBOARD (ADMIN-ONLY) */}
            {activeTab === "portal-dashboard" && isAdmin && (
              <div className="space-y-6">
                {/* Header card */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100/60 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -z-1" />
                  <div className="flex items-start gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/60">
                      <LayoutDashboard className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-primary tracking-tight tracking-tight">
                        Executive Portal Analytics
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                        Control center overview of registered client workspaces,
                        statutory filings, documents vault, and active
                        consultation requests.
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Portal Desk Live
                    </span>
                  </div>
                </div>

                {/* KPI Metrics bento grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* KPI 1 */}
                  <div
                    onClick={() => setActiveTab("clients")}
                    className="bg-white border border-slate-100/60 rounded-2xl p-5 shadow-xs hover:border-slate-200 hover:shadow-md transition-all cursor-pointer text-left relative overflow-hidden group"
                  >
                    <div className="absolute -right-2 -bottom-2 opacity-5 text-primary">
                      <Users className="h-16 w-16" />
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 mb-3">
                      <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-all">
                        <Users className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Total Clients
                      </span>
                    </div>
                    <p className="text-3xl font-semibold text-primary tracking-tight">
                      {clients.length}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-2 truncate">
                      {clients.filter((c) => c.kycStatus === "Approved").length}{" "}
                      KYC Approved •{" "}
                      {
                        clients.filter(
                          (c) => c.kycStatus === "Pending" || !c.kycStatus,
                        ).length
                      }{" "}
                      Pending
                    </p>
                  </div>

                  {/* KPI 2 */}
                  <div
                    onClick={() => setActiveTab("admin")}
                    className="bg-white border border-slate-100/60 rounded-2xl p-5 shadow-xs hover:border-slate-200 hover:shadow-md transition-all cursor-pointer text-left relative overflow-hidden group"
                  >
                    <div className="absolute -right-2 -bottom-2 opacity-5 text-primary">
                      <Bell className="h-16 w-16" />
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 mb-3">
                      <div className="p-2 bg-slate-50 rounded-lg text-amber-600 bg-amber-50">
                        <Bell className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Pending Proposals
                      </span>
                    </div>
                    <p className="text-3xl font-semibold text-primary tracking-tight font-mono">
                      {
                        clientRequests.filter((r) => r.status === "pending")
                          .length
                      }
                    </p>
                    <p className="text-[10px] text-slate-500 mt-2 truncate font-sans">
                      Requires immediate CA verification & deployment
                    </p>
                  </div>

                  {/* KPI 3 */}
                  <div
                    onClick={() => setActiveTab("applications")}
                    className="bg-white border border-slate-100/60 rounded-2xl p-5 shadow-xs hover:border-slate-200 hover:shadow-md transition-all cursor-pointer text-left relative overflow-hidden group"
                  >
                    <div className="absolute -right-2 -bottom-2 opacity-5 text-primary">
                      <Briefcase className="h-16 w-16" />
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 mb-3">
                      <div className="p-2 bg-slate-50 rounded-lg text-rose-600 bg-rose-50">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Service Trackers
                      </span>
                    </div>
                    <p className="text-3xl font-semibold text-primary tracking-tight font-mono">
                      {applications.length}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-2 truncate font-sans">
                      Active service tracker workflows in real-time
                    </p>
                  </div>

                  {/* KPI 4 */}
                  <div
                    onClick={() => setActiveTab("compliance")}
                    className="bg-white border border-slate-100/60 rounded-2xl p-5 shadow-xs hover:border-slate-200 hover:shadow-md transition-all cursor-pointer text-left relative overflow-hidden group"
                  >
                    <div className="absolute -right-2 -bottom-2 opacity-5 text-primary">
                      <Calendar className="h-16 w-16" />
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 mb-3">
                      <div className="p-2 bg-slate-50 rounded-lg text-emerald-600 bg-emerald-50">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Compliance Filings
                      </span>
                    </div>
                    <p className="text-3xl font-semibold text-primary tracking-tight font-mono">
                      {complianceFilings.length}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-2 truncate font-sans">
                      Upcoming, in-progress or filed compliance records
                    </p>
                  </div>
                </div>

                {/* Main Body Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Client requests (2 columns wide) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Quick Interactive Client Directory */}
                    <div className="bg-white border border-slate-100/60 rounded-3xl p-6 sm:p-8 shadow-sm text-left">
                      <div className="flex justify-between items-center border-b border-slate-100/60 pb-3 mb-5">
                        <div>
                          <h3 className="text-base font-semibold text-primary tracking-tight flex items-center gap-1.5">
                            <Users className="h-4.5 w-4.5 text-primary" />
                            <span>
                              Direct Workspace Focus Launcher ({clients.length})
                            </span>
                          </h3>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Quickly select customer profile to track documents,
                            filings, and chats
                          </p>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100/60 text-[10px] font-bold uppercase tracking-wider">
                              <th className="py-3 px-4 text-left">
                                Client Profile
                              </th>
                              <th className="py-3 px-4 text-left">
                                Entity & Scope
                              </th>
                              <th className="py-3 px-4 text-left">KYC</th>
                              <th className="py-3 px-4 text-right">
                                Go to active portals
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {clients.map((c) => (
                              <tr
                                key={c.uid}
                                className="hover:bg-slate-50/60 transition-colors"
                              >
                                <td className="py-3.5 px-4 text-left">
                                  <div className="font-semibold text-primary">
                                    {c.displayName || "Stub Profile"}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {c.email}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-left">
                                  <div className="font-medium text-slate-700 text-[11px]">
                                    {c.entityType || "Individual"}
                                  </div>
                                  <div
                                    className="text-[10px] text-slate-450 truncate max-w-[150px]"
                                    title={(c.services || []).join(", ")}
                                  >
                                    {(c.services || []).join(", ") ||
                                      "No active scope setup"}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-left">
                                  <span
                                    className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                      c.kycStatus === "Approved"
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                                        : "bg-amber-50 text-amber-850 border border-amber-100"
                                    }`}
                                  >
                                    {c.kycStatus || "Pending"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex justify-end items-center gap-1.5">
                                    <button
                                      onClick={() =>
                                        switchClientAndTab(
                                          c.uid,
                                          c.email,
                                          "applications",
                                        )
                                      }
                                      className="p-1 px-2.5 bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-700 hover:text-black rounded-lg text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                                      title="Application Track"
                                    >
                                      <Briefcase className="h-3 w-3 text-slate-400" />
                                      <span>Apps</span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        switchClientAndTab(
                                          c.uid,
                                          c.email,
                                          "documents",
                                        )
                                      }
                                      className="p-1 px-2.5 bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-700 hover:text-black rounded-lg text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                                      title="Docs Vault"
                                    >
                                      <FileText className="h-3 w-3 text-slate-400" />
                                      <span>Vault</span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        switchClientAndTab(
                                          c.uid,
                                          c.email,
                                          "chat",
                                        )
                                      }
                                      className="p-1 px-2.5 bg-slate-55 hover:bg-slate-150 border border-slate-200 text-slate-700 hover:text-black rounded-lg text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                                      title="Consultation Chat Room"
                                    >
                                      <MessageSquare className="h-3 w-3 text-slate-400" />
                                      <span>Chat</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Mini charts & stat feeds (1 column wide) */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Active Applications by Type */}
                    <div className="bg-white border border-slate-100/60 rounded-3xl p-6 shadow-sm text-left">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-slate-100/60 pb-3 mb-4 flex items-center gap-1.5 font-mono">
                        <Activity className="h-4 w-4 text-rose-500" />
                        <span>Ongoing Services (Types)</span>
                      </h4>

                      <div className="space-y-4">
                        {[
                          "GST Registration",
                          "GST Return Filing",
                          "Income Tax Filing (ITR)",
                          "Corporate Audits",
                          "TDS and PF filing",
                        ].map((type) => {
                          const matchingCount = applications.filter(
                            (a) => a.type === type,
                          ).length;
                          const total = applications.length || 1;
                          const pct = Math.round((matchingCount / total) * 100);
                          return (
                            <div key={type} className="space-y-1">
                              <div className="flex justify-between text-[11px] font-medium text-slate-700">
                                <span className="truncate max-w-[130px] font-sans">
                                  {type}
                                </span>
                                <span className="font-mono text-[10px]">
                                  {matchingCount} items ({pct}%)
                                </span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pending Filings & Compliance stats */}
                    <div className="bg-white border border-slate-100/60 rounded-3xl p-6 shadow-sm text-left">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-slate-100/60 pb-3 mb-4 flex items-center gap-1.5 font-mono">
                        <Calendar className="h-4 w-4 text-emerald-500" />
                        <span>Filing statuses</span>
                      </h4>

                      <div className="space-y-4">
                        {[
                          {
                            status: "Upcoming",
                            count: complianceFilings.filter(
                              (f) => f.status === "Upcoming",
                            ).length,
                            color: "bg-slate-400",
                          },
                          {
                            status: "In Progress",
                            count: complianceFilings.filter(
                              (f) => f.status === "In Progress",
                            ).length,
                            color: "bg-amber-500",
                          },
                          {
                            status: "Pending Client Action",
                            count: complianceFilings.filter(
                              (f) => f.status === "Pending Client Action",
                            ).length,
                            color: "bg-rose-500",
                          },
                          {
                            status: "Filed",
                            count: complianceFilings.filter(
                              (f) => f.status === "Filed",
                            ).length,
                            color: "bg-primary",
                          },
                        ].map((item) => {
                          const total = complianceFilings.length || 1;
                          const pct = Math.round((item.count / total) * 100);
                          return (
                            <div key={item.status} className="space-y-1">
                              <div className="flex justify-between text-[11px] font-medium text-slate-700">
                                <span className="truncate max-w-[150px] font-sans">
                                  {item.status}
                                </span>
                                <span className="font-mono text-[10px]">
                                  {item.count} filings
                                </span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${item.color} rounded-full transition-all duration-500`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Recent Documents list */}
                    <div className="bg-white border border-slate-100/60 rounded-3xl p-6 shadow-sm text-left">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider border-b border-slate-100/60 pb-3 mb-4 flex items-center gap-1.5 font-mono">
                        <FileText className="h-4 w-4 text-primary" />
                        <span>Recent Vault Uploads</span>
                      </h4>

                      {documents.length === 0 ? (
                        <p className="text-[10px] text-slate-400 py-4 text-center">
                          No client vault items uploaded yet.
                        </p>
                      ) : (
                        <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                          {documents.slice(0, 5).map((docObj) => (
                            <div
                              key={docObj.id}
                              className="text-xs p-2.5 bg-slate-50 border border-slate-100/60/60 rounded-xl relative overflow-hidden text-left hover:border-slate-200 transition-colors"
                            >
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                                  {docObj.category || "General"}
                                </span>
                                <span className="text-[8px] font-mono text-slate-500 bg-white border border-slate-100/60 px-1.5 rounded">
                                  {docObj.fileType}
                                </span>
                              </div>
                              <p className="font-semibold text-slate-800 line-clamp-1 mt-1 font-sans text-[11px]">
                                {docObj.name}
                              </p>
                              <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">
                                Size: {docObj.size} •{" "}
                                {new Date(
                                  docObj.uploadedAt,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* APPLICATION TRACKER BOARD */}
            {activeTab === "applications" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-100/60 shadow-sm">
                  <h2 className="text-lg font-medium text-primary tracking-tight">
                    Active Service Applications ({applications.length})
                  </h2>
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
                        <span>
                          Pending Proposals awaiting CA Review (
                          {clientRequests.length})
                        </span>
                      </h3>
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Awaiting CA Review
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {clientRequests.map((req) => (
                        <div
                          key={req.id}
                          className="bg-white border border-slate-100/60 rounded-2xl p-5 shadow-sm text-left relative overflow-hidden group hover:border-slate-300 transition-all"
                        >
                          <div className="absolute right-0 top-0 h-1 text-amber-400 bg-amber-400 w-full animate-pulse" />
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <div>
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                {req.type}
                              </span>
                              <h4 className="text-xs font-bold text-slate-800 mt-1.5">
                                {req.title}
                              </h4>
                            </div>
                            <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-widest font-mono">
                              pending ca
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                            {req.description}
                          </p>
                          <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-50 text-[9px] text-slate-400">
                            <span>
                              Posted:{" "}
                              {new Date(req.createdAt).toLocaleDateString()}
                            </span>
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
                  <div className="bg-white rounded-3xl p-16 text-center border border-slate-100/60 shadow-sm max-w-xl mx-auto">
                    <FileCheck2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-sm font-bold text-slate-700">
                      No Applications Assigned
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                      If you recently signed up, our team is seeding standard
                      default documents. Use the Demo Mode or ask CA Jyoshi
                      Manohar Admin to push a target tracking portfolio.
                    </p>
                  </div>
                ) : (
                  applications.map((app) => {
                    const client = clients.find((c) => c.uid === app.userId);
                    const clientInfo = client
                      ? `${client.displayName || "Client"} (${client.email})`
                      : app.userEmail || "Unknown Client";
                    return (
                      <motion.div
                        key={app.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-slate-100/60 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-shadow relative"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {app.type}
                            </span>
                            <h3 className="text-lg font-medium text-primary tracking-tight mt-1">
                              {app.title}
                            </h3>
                            {isAdmin && !selectedClientId && (
                              <p className="text-[11px] font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                                <UserIcon className="h-3.5 w-3.5" />
                                Client:{" "}
                                <span className="text-slate-700">
                                  {clientInfo}
                                </span>
                              </p>
                            )}
                          </div>
                          <span
                            className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full border ${getStatusBadge(app.status)}`}
                          >
                            {app.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed mb-6 bg-slate-50/50 p-4 border border-slate-100/60/50 rounded-xl">
                          {app.description}
                        </p>

                        {/* Timeline flow */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="h-4 w-4 text-primary" />
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                              Milestones & Verification Steps
                            </span>
                          </div>

                          <div className="relative border-l-2 border-slate-100/60 pl-6 ml-3 space-y-6">
                            {app.steps?.map((step, idx) => {
                              const isEditingThisStep =
                                editingStepAppId === app.id &&
                                editingStepIndex === idx;
                              return (
                                <div key={idx} className="relative group">
                                  {isAdmin ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleStepCompleted(app.id, idx)
                                      }
                                      title="Click to toggle completed state"
                                      className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all ${
                                        step.completed
                                          ? "border-primary ring-4 ring-primary/10"
                                          : "border-slate-300 hover:border-primary"
                                      }`}
                                    >
                                      {step.completed ? (
                                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                      ) : (
                                        <div className="w-1 h-1 bg-transparent group-hover:bg-slate-300 rounded-full" />
                                      )}
                                    </button>
                                  ) : (
                                    <span
                                      className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                                        step.completed
                                          ? "border-primary ring-4 ring-primary/10"
                                          : "border-slate-200"
                                      }`}
                                    >
                                      {step.completed && (
                                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                      )}
                                    </span>
                                  )}

                                  {isEditingThisStep ? (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 mt-1">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-sans">
                                        <input
                                          type="text"
                                          value={editStepTitle}
                                          onChange={(e) =>
                                            setEditStepTitle(e.target.value)
                                          }
                                          placeholder="Step Title"
                                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-primary font-medium"
                                        />
                                        <input
                                          type="text"
                                          value={editStepDate}
                                          onChange={(e) =>
                                            setEditStepDate(e.target.value)
                                          }
                                          placeholder="e.g. May 25, 2026 or In Progress"
                                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-primary font-mono"
                                        />
                                      </div>
                                      <textarea
                                        value={editStepDesc}
                                        onChange={(e) =>
                                          setEditStepDesc(e.target.value)
                                        }
                                        placeholder="Brief milestone milestone description..."
                                        rows={2}
                                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-primary font-sans"
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
                                          onClick={() =>
                                            handleSaveStepEdit(app.id, idx)
                                          }
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
                                          <span
                                            className={`text-[12px] font-bold ${step.completed ? "text-primary font-semibold" : "text-slate-400"}`}
                                          >
                                            {step.title}
                                          </span>
                                          {isAdmin && (
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleStartEditingStep(
                                                    app.id,
                                                    idx,
                                                    step,
                                                  )
                                                }
                                                className="p-1 text-slate-400 hover:text-primary transition cursor-pointer"
                                                title="Edit step details"
                                              >
                                                <Edit2 className="h-3 w-3" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleDeleteStep(app.id, idx)
                                                }
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
                                      <p className="text-xs text-slate-500 mt-0.5">
                                        {step.description}
                                      </p>
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
                                      <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                                        Milestone Name*
                                      </label>
                                      <input
                                        type="text"
                                        value={newStepTitle}
                                        onChange={(e) =>
                                          setNewStepTitle(e.target.value)
                                        }
                                        placeholder="e.g. Scrutiny of MOA Draft"
                                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-primary font-medium font-sans outline-none focus:border-primary"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                                        Target Date / Day
                                      </label>
                                      <input
                                        type="text"
                                        value={newStepDate}
                                        onChange={(e) =>
                                          setNewStepDate(e.target.value)
                                        }
                                        placeholder="e.g. June 15, 2026 or Pending client"
                                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-primary font-medium font-sans outline-none focus:border-primary"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                                      Actionable Description
                                    </label>
                                    <input
                                      type="text"
                                      value={newStepDesc}
                                      onChange={(e) =>
                                        setNewStepDesc(e.target.value)
                                      }
                                      placeholder="Brief notes detailing statutory checkpoints"
                                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-primary font-medium font-sans outline-none focus:border-primary"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAddingStepForAppId(null)
                                      }
                                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl py-1.5 px-3 text-xs font-bold transition-all cursor-pointer"
                                    >
                                      Discard
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAddMilestoneStep(app.id)
                                      }
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
                                    setNewStepTitle("");
                                    setNewStepDesc("");
                                    setNewStepDate("");
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
                        <div className="border-t border-slate-100/60/80 pt-4 mt-6 flex flex-wrap justify-between items-center text-xs font-semibold text-slate-500 gap-2">
                          <span>
                            Estimated Complete:{" "}
                            <span className="text-slate-800 font-bold">
                              {app.estimatedCompletion || "TBD"}
                            </span>
                          </span>
                          <span>
                            Client Ref:{" "}
                            <span className="text-primary font-mono">
                              {app.id?.substring(0, 8).toUpperCase() || "STUB"}
                            </span>
                          </span>
                        </div>

                        {/* Admin update triggers inside the card dynamically */}
                        {isAdmin && (
                          <div className="border-t border-red-50 pt-4 mt-4 bg-rose-50/20 p-4 rounded-xl flex flex-wrap gap-2 justify-between items-center">
                            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-widest flex items-center gap-1">
                              <Shield className="h-3.5 w-3.5" /> Quick Advance
                              state
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() =>
                                  handleUpdateAppStatus(
                                    app.id,
                                    "Query Raised",
                                    "Officer requested modified digital utility sign lease deed",
                                  )
                                }
                                className="bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-transform active:scale-95 cursor-pointer"
                              >
                                Raise Query
                              </button>
                              <button
                                onClick={() =>
                                  handleUpdateAppStatus(
                                    app.id,
                                    "Submitted to Department",
                                    "Pending department validation and review",
                                  )
                                }
                                className="bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-200 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-transform active:scale-95 cursor-pointer"
                              >
                                Submit
                              </button>
                              <button
                                onClick={() =>
                                  handleUpdateAppStatus(
                                    app.id,
                                    "Approved & Issued",
                                    "Incorporation COI/GSTIN distributed to client",
                                  )
                                }
                                className="bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-transform active:scale-95 cursor-pointer"
                              >
                                Issue Cert
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteItem("applications", app.id)
                                }
                                className="bg-slate-100 text-slate-800 border border-slate-200 hover:bg-rose-100 hover:text-rose-800 hover:border-rose-200 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-transform active:scale-95 cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}

            {/* DOCUMENT VAULT BOARD (DOWNLOAD CENTER) */}
            {activeTab === "documents" &&
              (() => {
                const requestedDocs = documents.filter(
                  (d) => d.status === "requested" || d.fileType === "PENDING",
                );
                const regularDocs = documents.filter(
                  (d) => d.status !== "requested" && d.fileType !== "PENDING",
                );

                return (
                  <div className="space-y-6">
                    {/* PENDING DOCUMENT REQUESTS IF ANY */}
                    {requestedDocs.length > 0 && (
                      <div className="bg-amber-50/40 border border-amber-200/50 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/30 pb-4 mb-2">
                          <div className="flex items-start gap-2.5">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <h3 className="text-sm font-bold text-amber-900 tracking-tight">
                                Outstanding Official Paperwork Requests
                              </h3>
                              <p className="text-[11px] text-amber-700 font-medium">
                                Please upload the requested digital files to
                                verify and complete statutory filings.
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-250 shrink-0">
                            {requestedDocs.length} PENDING ACTION
                            {requestedDocs.length > 1 ? "S" : ""}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {requestedDocs.map((reqDoc) => {
                            const isUploadingThisItem =
                              uploadingReqDocId === reqDoc.id;
                            const client = clients.find(
                              (c) => c.uid === reqDoc.userId,
                            );
                            const clientInfo = client
                              ? `${client.displayName || "Client"} (${client.email})`
                              : reqDoc.userEmail || "Unknown Client";
                            return (
                              <div
                                key={reqDoc.id}
                                className="bg-white border border-amber-200/60 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-amber-400/85 transition-all"
                              >
                                <div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold bg-amber-155 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-full uppercase tracking-widest font-mono">
                                      {reqDoc.category || "REQUIRED"}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-semibold">
                                      {new Date(
                                        reqDoc.uploadedAt,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <h3 className="text-sm font-bold text-primary mt-3 flex items-center gap-1.5 leading-snug">
                                    <FileQuestion className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                                    <span>{reqDoc.name}</span>
                                  </h3>
                                  {isAdmin && !selectedClientId && (
                                    <p className="text-[10px] font-medium text-slate-500 mt-1.5 flex items-center gap-1">
                                      <UserIcon className="h-3 w-3" />
                                      Client:{" "}
                                      <span className="text-slate-700">
                                        {clientInfo}
                                      </span>
                                    </p>
                                  )}
                                  <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
                                    {reqDoc.description}
                                  </p>
                                </div>

                                <div className="pt-2">
                                  {isAdmin ? (
                                    <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100 text-center">
                                      <p className="text-[10px] text-amber-800 font-bold flex items-center justify-center gap-1">
                                        <Clock className="h-3 w-3.5 animate-pulse text-amber-600 animate-duration-1000" />
                                        <span>Awaiting Client Upload</span>
                                      </p>
                                      <p className="text-[9px] text-amber-600 mt-0.5">
                                        Admin remains on stand-by until client
                                        delivers paperwork
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="bg-slate-50 hover:bg-slate-100/70 border border-dashed border-slate-200 rounded-xl p-3.5 text-center relative flex flex-col items-center justify-center cursor-pointer transition-all">
                                      <input
                                        type="file"
                                        disabled={
                                          isUploadingThisItem ||
                                          activeReqDocUploadProgress !== null
                                        }
                                        onChange={(e) => {
                                          const file =
                                            e.target.files?.[0] || null;
                                          if (file) {
                                            handleUploadRequestedDocument(
                                              reqDoc,
                                              file,
                                            );
                                          }
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-15"
                                      />
                                      <Upload className="h-4.5 w-4.5 text-primary mb-1 mt-0.5" />
                                      <p className="text-[10px] font-bold text-slate-700">
                                        Attach and Deliver File
                                      </p>
                                      <p className="text-[8px] text-slate-400 font-mono">
                                        PDF, EXCEL, IMAGES, CSV UP TO 10MB
                                      </p>
                                    </div>
                                  )}

                                  {isUploadingThisItem &&
                                    activeReqDocUploadProgress !== null && (
                                      <div className="mt-2 text-left space-y-1">
                                        <div className="flex justify-between text-[9px] font-bold text-primary font-mono">
                                          <span>
                                            Delivering document securely...
                                          </span>
                                          <span>
                                            {activeReqDocUploadProgress}%
                                          </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1">
                                          <div
                                            className="bg-primary h-1 rounded-full transition-all"
                                            style={{
                                              width: `${activeReqDocUploadProgress}%`,
                                            }}
                                          ></div>
                                        </div>
                                      </div>
                                    )}

                                  {isAdmin && (
                                    <div className="mt-3 pt-3 border-t border-slate-100/60 flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteItem(
                                            "documents",
                                            reqDoc.id,
                                          )
                                        }
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

                    <div className="bg-white p-6 rounded-2xl border border-slate-100/60 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-medium text-primary tracking-tight">
                          Document Command Central
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                          Official MCA filings, Income tax acknowledgements, and
                          certification letters.
                        </p>
                      </div>
                      <div className="flex bg-slate-100 rounded-xl p-1 w-max border self-start">
                        <button
                          onClick={() => setServiceFilter("All")}
                          className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${serviceFilter === "All" ? "bg-white text-primary shadow-sm" : "text-slate-600"}`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setServiceFilter("Certificates")}
                          className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${serviceFilter === "Certificates" ? "bg-white text-primary shadow-sm" : "text-slate-600"}`}
                        >
                          Certificates
                        </button>
                        <button
                          onClick={() => setServiceFilter("Financials")}
                          className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${serviceFilter === "Financials" ? "bg-white text-primary shadow-sm" : "text-slate-600"}`}
                        >
                          Financials
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {regularDocs.length === 0 ? (
                        <div className="col-span-full bg-white rounded-3xl p-16 text-center border border-slate-100/60 shadow-sm">
                          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                          <h3 className="text-sm font-bold text-slate-700">
                            Vault Empty
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Certified audit copies will appear here once drafted
                            by CA Manohar.
                          </p>
                        </div>
                      ) : (
                        regularDocs
                          .filter(
                            (d) =>
                              serviceFilter === "All" ||
                              (d.category &&
                                d.category
                                  .toLowerCase()
                                  .includes(
                                    serviceFilter.toLowerCase().substring(0, 5),
                                  )),
                          )
                          .map((docItem) => {
                            const client = clients.find(
                              (c) => c.uid === docItem.userId,
                            );
                            const clientInfo = client
                              ? `${client.displayName || "Client"} (${client.email})`
                              : docItem.userEmail || "Unknown Client";
                            return (
                              <motion.div
                                key={docItem.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white border border-slate-100/60 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-shadow flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex justify-between items-start mb-3">
                                    <span className="text-[9px] font-bold bg-primary/5 border border-primary/10 text-primary px-2.5 py-1 rounded-full uppercase tracking-widest">
                                      {docItem.fileType || "PDF"}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-500 font-semibold">
                                      {docItem.size}
                                    </span>
                                  </div>
                                  <h3 className="text-sm font-bold text-primary tracking-tight leading-snug line-clamp-1">
                                    {docItem.name}
                                  </h3>
                                  {isAdmin && !selectedClientId && (
                                    <p className="text-[10px] font-medium text-slate-500 mt-1.5 flex items-center gap-1">
                                      <UserIcon className="h-3 w-3" />
                                      Client:{" "}
                                      <span className="text-slate-700">
                                        {clientInfo}
                                      </span>
                                    </p>
                                  )}
                                  <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed min-h-[40px] line-clamp-2">
                                    {docItem.description}
                                  </p>
                                  <div className="text-[10px] text-slate-400 mt-3 font-semibold pb-4">
                                    Delivery:{" "}
                                    {new Date(
                                      docItem.uploadedAt,
                                    ).toLocaleDateString()}
                                  </div>
                                </div>

                                <div className="border-t border-slate-50 pt-4 flex gap-2 justify-between items-center mt-3">
                                  <button
                                    onClick={() =>
                                      triggerDocumentDownload(docItem)
                                    }
                                    className="bg-primary hover:bg-slate-950 text-white w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm focus:ring-2 focus:ring-primary inline-flex transition-colors cursor-pointer"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    <span>Download Document</span>
                                  </button>

                                  {isAdmin && (
                                    <button
                                      onClick={() =>
                                        handleDeleteItem(
                                          "documents",
                                          docItem.id,
                                        )
                                      }
                                      className="bg-red-50 border border-red-200 text-red-600 p-2.5 rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
                                      title="Delete document"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })
                      )}
                    </div>
                  </div>
                );
              })()}

            {/* COMPLIANCE CHRONOLOGY TRACKER */}
            {activeTab === "compliance" && (
              <div className="space-y-6">
                {/* Visual scorecard for client transparency */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100/60 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Total Filed returns
                      </span>
                      <h4 className="text-xl font-bold text-primary tracking-tight mt-0.5">
                        {
                          complianceFilings.filter((f) => f.status === "Filed")
                            .length
                        }{" "}
                        Completed
                      </h4>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100/60 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100">
                      <AlertTriangle className="h-6 w-6 font-bold" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Immediate action
                      </span>
                      <h4 className="text-xl font-bold text-primary tracking-tight mt-0.5">
                        {
                          complianceFilings.filter(
                            (f) => f.status === "Pending Client Action",
                          ).length
                        }{" "}
                        Outstanding
                      </h4>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100/60 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                      <Clock className="h-6 w-6 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Filing horizon
                      </span>
                      <h4 className="text-xl font-bold text-primary tracking-tight mt-0.5">
                        {
                          complianceFilings.filter(
                            (f) =>
                              f.status === "Upcoming" ||
                              f.status === "In Progress",
                          ).length
                        }{" "}
                        Pending
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Calendar compliance board */}
                <div className="bg-white border border-slate-100/60 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <h2 className="text-lg font-medium text-primary tracking-tight mb-6 border-b border-slate-100/60 pb-4 flex items-center justify-between">
                    <span>
                      Static Compliance Checklist & Timeline (Real-Time
                      Calendar)
                    </span>
                    <span className="text-xs font-mono font-bold text-primary bg-primary/5 px-2.5 py-1 border border-primary/10 rounded-full">
                      FY 2026-2027
                    </span>
                  </h2>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100/60">
                          <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Compliance Details
                          </th>
                          <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Cycle / Period
                          </th>
                          <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Due Date
                          </th>
                          <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Filing Status
                          </th>
                          <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">
                            Acknowledgement
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {complianceFilings.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-8 text-center text-xs text-slate-400"
                            >
                              No scheduled returns. Contact CA Manohar
                              compliance desk to activate statutory calendars.
                            </td>
                          </tr>
                        ) : (
                          complianceFilings.map((filing) => {
                            const client = clients.find(
                              (c) => c.uid === filing.userId,
                            );
                            const clientInfo = client
                              ? `${client.displayName || "Client"} (${client.email})`
                              : "Unknown Client";
                            return (
                              <tr
                                key={filing.id}
                                className="hover:bg-slate-50/40 relative"
                              >
                                <td className="py-4 pr-4">
                                  <div className="text-xs font-bold text-primary leading-tight">
                                    {filing.title}
                                  </div>
                                  {isAdmin && !selectedClientId && (
                                    <div className="text-[10px] font-medium text-slate-500 mt-1.5 flex items-center gap-1">
                                      <UserIcon className="h-3 w-3" />
                                      Client:{" "}
                                      <span className="text-slate-700">
                                        {clientInfo}
                                      </span>
                                    </div>
                                  )}
                                  <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                    {filing.serviceType} Return
                                  </div>
                                </td>
                                <td className="py-4 text-xs font-semibold text-slate-700">
                                  {filing.period}{" "}
                                  <span className="text-[10px] text-slate-400 px-1 hover:underline">
                                    ({filing.financialYear})
                                  </span>
                                </td>
                                <td className="py-4 text-xs font-mono font-medium text-slate-600">
                                  {new Date(filing.dueDate).toLocaleDateString(
                                    undefined,
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )}
                                </td>
                                <td className="py-4 font-medium text-primary">
                                  {isAdmin ? (
                                    <CustomSelect
                                      value={filing.status}
                                      onChange={(val) =>
                                        handleUpdateFilingStatus(
                                          filing.id,
                                          val as any,
                                          filing.arn,
                                        )
                                      }
                                      className="bg-white border border-slate-200 rounded-lg h-7 font-bold text-slate-800 text-[10px]"
                                      options={[
                                        "Upcoming",
                                        "In Progress",
                                        "Pending Client Action",
                                        "Filed",
                                      ]}
                                    />
                                  ) : (
                                    <span
                                      className={`px-2.5 py-1 text-[9px] uppercase font-bold tracking-widest rounded-full border ${getFilingStatusBadge(filing.status)}`}
                                    >
                                      {filing.status}
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 text-right">
                                  {filing.status === "Filed" ? (
                                    <div className="flex flex-col items-end gap-1">
                                      {isAdmin ? (
                                        <div className="flex items-center gap-1.5 justify-end">
                                          <div className="flex flex-col items-end">
                                            <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wider">
                                              Success (Filed)
                                            </span>
                                            <input
                                              type="text"
                                              defaultValue={filing.arn || ""}
                                              placeholder="Enter ARN"
                                              onBlur={(e) => {
                                                if (
                                                  e.target.value !== filing.arn
                                                ) {
                                                  handleUpdateFilingStatus(
                                                    filing.id,
                                                    "Filed",
                                                    e.target.value,
                                                  );
                                                }
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  handleUpdateFilingStatus(
                                                    filing.id,
                                                    "Filed",
                                                    (
                                                      e.target as HTMLInputElement
                                                    ).value,
                                                  );
                                                }
                                              }}
                                              className="w-24 bg-white border border-slate-200 rounded-lg py-0.5 px-1.5 text-[9px] text-right font-mono outline-none focus:border-primary"
                                            />
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteItem(
                                                "compliance_filings",
                                                filing.id,
                                              )
                                            }
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
                                          <span className="text-[9px] font-mono font-semibold text-slate-400 mt-0.5">
                                            {filing.arn || "ARN-GENERATED"}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-2">
                                      {isAdmin && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDeleteItem(
                                              "compliance_filings",
                                              filing.id,
                                            )
                                          }
                                          className="text-slate-400 hover:text-red-650 p-1 rounded hover:bg-rose-50 cursor-pointer transition-colors"
                                          title="Remove return checkout from calendar"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          if (isAdmin) {
                                            const val =
                                              prompt(
                                                "Mark status as Filed? Enter Government ARN reference ID (optional):",
                                              ) ||
                                              `ARN-${Math.floor(100000 + Math.random() * 900000)}`;
                                            handleUpdateFilingStatus(
                                              filing.id,
                                              "Filed",
                                              val,
                                            );
                                          } else {
                                            alert(
                                              "Disclaimer: If supporting tax logs or general ledger registers are pending, compile records and upload the spreadsheet files to Document vaults first so CA can sign off and dispatch.",
                                            );
                                          }
                                        }}
                                        className="text-[10px] font-bold text-primary hover:text-primary uppercase tracking-widest border border-slate-100/60 hover:bg-white bg-slate-50/50 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                                      >
                                        {isAdmin ? "Mark Filed" : "Prepare"}
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* CONSULTATION & QUERY DESK CHAT FLOOD */}
            {activeTab === "chat" && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-100/60 p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100/60 pb-6 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <span>Consultation & Direct Query Desk</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 max-w-xl">
                        Real-time chat line for regulatory inquiries, structural
                        advice, and direct document uploads.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                        {isAdmin
                          ? "Admin Desk Active"
                          : "Manohar CA Support Live"}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`grid grid-cols-1 ${!isAdmin || !isSidebarOpen ? "lg:grid-cols-1" : "lg:grid-cols-4"} gap-6`}
                  >
                    {/* If Admin, show Client Selection Sidebar on left */}
                    {isAdmin && (
                      <div
                        className={`${isSidebarOpen ? "lg:col-span-1 block" : "hidden"} border-r border-slate-100/60 pr-0 lg:pr-6 space-y-4`}
                      >
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
                                    ? "bg-primary text-white border-primary shadow-sm"
                                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-100/60"
                                }`}
                              >
                                <p className="text-xs font-bold truncate">
                                  {c.displayName ||
                                    c.email?.split("@")[0] ||
                                    "Client"}
                                </p>
                                <p
                                  className={`text-[10px] truncate ${isActive ? "text-slate-200" : "text-slate-400"} mt-0.5`}
                                >
                                  {c.email}
                                </p>
                              </button>
                            );
                          })}
                          {clients.length === 0 && (
                            <p className="text-[11px] text-slate-400 italic">
                              No registered clients found.
                            </p>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          To create a new client thread, use the *Create client
                          stub* tool in the top Admin Control Room.
                        </p>
                      </div>
                    )}

                    {/* Message board container */}
                    <div
                      className={`${isAdmin && isSidebarOpen ? "lg:col-span-3" : "lg:col-span-1"} flex flex-col min-h-[450px]`}
                    >
                      {/* Active Consultation Header */}
                      <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-100/60/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Active Conversation Scope
                          </p>
                          <h4 className="text-xs font-bold text-primary mt-1">
                            {isAdmin ? (
                              selectedClientId ? (
                                <span className="flex items-center gap-1.5 text-primary">
                                  <span>{selectedClientEmail}</span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    ({selectedClientId})
                                  </span>
                                </span>
                              ) : (
                                <span className="text-amber-600">
                                  No client selected. Please select a client
                                  thread.
                                </span>
                              )
                            ) : (
                              <span className="text-primary">
                                Manohar Wealth Private Advisory Panel (Admin
                                Line)
                              </span>
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
                            <span>
                              {showRequestForm
                                ? "Close Form"
                                : "Request Document"}
                            </span>
                          </button>
                        ) : !isAdmin ? (
                          <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-500 font-medium">
                              Recipient Desk: Administrator
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {/* Messages Listing */}
                      <div className="flex-1 border border-slate-100/60 rounded-2xl p-4 bg-slate-50/35 overflow-y-auto max-h-[350px] min-h-[250px] space-y-4 flex flex-col">
                        {chatMessagesLoading ? (
                          <div className="flex flex-col items-center justify-center py-10 space-y-2 m-auto">
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                            <p className="text-xs text-slate-500">
                              Retrieving secure chat vault transcript...
                            </p>
                          </div>
                        ) : chatMessages.length === 0 ? (
                          <div className="text-center py-12 m-auto max-w-sm">
                            <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                            <p className="text-xs font-bold text-slate-700">
                              No messages in this consulting thread yet
                            </p>
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
                                  isMyMessage
                                    ? "self-end items-end"
                                    : "self-start items-start"
                                }`}
                              >
                                {/* Participant tag */}
                                <span className="text-[9px] text-slate-400 font-semibold mb-1 opacity-80 px-1">
                                  {msg.senderName} •{" "}
                                  {new Date(msg.timestamp).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </span>

                                {/* Speech bubble */}
                                <div
                                  className={`p-3.5 rounded-2xl text-xs font-medium leading-relaxed ${
                                    isMyMessage
                                      ? "bg-primary text-white rounded-tr-none shadow-sm"
                                      : "bg-white border border-slate-200/80 text-primary rounded-tl-none shadow-sm"
                                  }`}
                                >
                                  {msg.text && (
                                    <p className="whitespace-pre-wrap">
                                      {msg.text}
                                    </p>
                                  )}

                                  {/* File attachment */}
                                  {msg.fileUrl && (
                                    <div
                                      className={`mt-3 p-3 rounded-xl flex items-center justify-between gap-4 border overflow-hidden ${
                                        isMyMessage
                                          ? "bg-slate-950/15 border-white/10 text-white"
                                          : "bg-slate-50 border-slate-200 text-slate-800"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 truncate">
                                        <FileText
                                          className={`h-4.5 w-4.5 shrink-0 ${isMyMessage ? "text-slate-100" : "text-primary"}`}
                                        />
                                        <div className="truncate text-left">
                                          <p className="text-[11px] font-bold truncate max-w-[150px] sm:max-w-[220px]">
                                            {msg.fileName}
                                          </p>
                                          <p
                                            className={`text-[9px] mt-0.5 font-semibold ${isMyMessage ? "text-slate-300" : "text-slate-400"}`}
                                          >
                                            {msg.fileType || "FILE"} •{" "}
                                            {msg.fileSize || "Unknown Size"}
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
                                            ? "bg-white text-primary hover:bg-slate-100"
                                            : "bg-primary text-white hover:bg-secondary"
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
                      <form
                        onSubmit={handleSendChatMessage}
                        className="mt-4 space-y-2"
                      >
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
                                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                                  Document Name*
                                </label>
                                <input
                                  type="text"
                                  value={reqDocName}
                                  onChange={(e) =>
                                    setReqDocName(e.target.value)
                                  }
                                  placeholder="e.g. Audit Ledger FY26"
                                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-primary font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                                  Vault Category
                                </label>
                                <CustomSelect
                                  value={reqDocCategory}
                                  onChange={(val) => setReqDocCategory(val)}
                                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-primary font-medium"
                                  options={[
                                    "Certificates",
                                    "Financials",
                                    "Audit Reports",
                                    "Tax Filing",
                                    "KYC Verification",
                                  ]}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                                  Instructions for Client
                                </label>
                                <input
                                  type="text"
                                  value={reqDocDesc}
                                  onChange={(e) =>
                                    setReqDocDesc(e.target.value)
                                  }
                                  placeholder="Upload signed PDF copies"
                                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-primary font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
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
                                <p className="text-[11px] font-bold text-primary truncate max-w-[250px] sm:max-w-[400px]">
                                  {chatFile.name}
                                </p>
                                <p className="text-[9px] text-slate-400 mt-0.5 font-semibold">
                                  Ready to send in chat (
                                  {(chatFile.size / 1024).toFixed(1)} KB)
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
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-primary font-medium outline-none focus:border-primary focus:bg-white transition-all disabled:opacity-50"
                          />

                          {/* Submit button */}
                          <button
                            type="submit"
                            disabled={
                              chatFileUploadProgress !== null ||
                              (isAdmin && !selectedClientId) ||
                              (!newChatMessage.trim() && !chatFile)
                            }
                            className={`p-3 rounded-xl text-white font-bold transition-all flex items-center justify-center shrink-0 shadow-md cursor-pointer ${
                              chatFileUploadProgress !== null ||
                              (isAdmin && !selectedClientId) ||
                              (!newChatMessage.trim() && !chatFile)
                                ? "bg-slate-300 cursor-not-allowed shadow-none"
                                : "bg-primary hover:bg-slate-950 hover:-translate-y-0.5"
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
            {activeTab === "admin" && isAdmin && (
              <div className="space-y-8">
                {/* Panel Overview */}
                <div className="bg-slate-950 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-lg">
                  <h2 className="text-xl text-white tracking-tight flex items-center gap-2">
                    <Shield className="h-5 w-5 text-amber-500" />
                    <span>Operations Console</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Set up direct profiles. Securely push interactive data
                    blocks, certified PDF vouchers, or GSTR compliance dates to
                    the selected client's command interface in real-time.
                  </p>
                </div>

                {/* Section: Pending Client Requests (Admin Review Panel) */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/50 mb-6">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-primary tracking-tight tracking-tight flex items-center gap-2">
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
                        Incoming requests proposed by customers in real-time.
                        Review terms, customize milestones, and approve or
                        decline proposals.
                      </p>
                    </div>
                  </div>

                  {clientRequests.length === 0 ? (
                    <div className="bg-white border border-slate-100/60 rounded-2xl py-8 px-6 text-center shadow-sm">
                      <div className="mx-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      </div>
                      <p className="text-xs font-semibold text-slate-800">
                        No Pending Requests
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        The consulting client intake cue is currently empty. All
                        clear for now!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {clientRequests.map((req) => {
                        const isAccepting = acceptingReqId === req.id;
                        return (
                          <div
                            key={req.id}
                            className="bg-white border border-slate-100/60 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col gap-4 text-left"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-dashed border-slate-100/60">
                              <div>
                                <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 px-2.5 py-1 rounded-full mb-2">
                                  {req.type === "engagement" && (
                                    <Briefcase className="h-3 w-3" />
                                  )}
                                  {req.type === "task" && (
                                    <Activity className="h-3 w-3" />
                                  )}
                                  {req.type === "document" && (
                                    <FileText className="h-3 w-3" />
                                  )}
                                  <span>
                                    {req.type?.toUpperCase()} • {req.category}
                                  </span>
                                </span>
                                <h4 className="text-sm font-bold text-primary tracking-tight tracking-tight">
                                  {req.title}
                                </h4>
                                <p className="text-[10px] text-slate-500 mt-1">
                                  Proposed by:{" "}
                                  <span className="font-bold text-slate-700 underline">
                                    {req.clientName}
                                  </span>{" "}
                                  ({req.userEmail}) •{" "}
                                  {new Date(req.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAcceptingReqId(req.id);
                                    const nextMonth = new Date();
                                    nextMonth.setMonth(
                                      nextMonth.getMonth() + 1,
                                    );
                                    setAcceptEstCompletion(
                                      nextMonth.toLocaleDateString("en-US", {
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                      }),
                                    );
                                    if (req.type === "document") {
                                      setAcceptStepsText(
                                        "1. Client attachment intake verification\n2. Certified document review checklist\n3. Approval and secure storage vaulting",
                                      );
                                    } else {
                                      setAcceptStepsText(
                                        "1. Intake checklist & document verify\n2. CA audit & compliance draft analysis\n3. Execution filings and certification",
                                      );
                                    }
                                  }}
                                  className="bg-primary hover:bg-secondary text-white text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDecliningReqId(req.id);
                                    setDeclineReason(
                                      "Standard statutory criteria check mismatch. Please check your parameters and file attachment, or propose an alternative service draft.",
                                    );
                                  }}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl border border-rose-100 transition-colors cursor-pointer"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>

                            {/* Brief summary info */}
                            <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100/60/80">
                              <span className="font-bold text-[9px] uppercase tracking-wider font-mono text-slate-400 block mb-1">
                                Details & Scope:
                              </span>
                              {req.description}

                              {req.fileUrl && (
                                <div className="mt-3 flex items-center justify-between bg-white border border-slate-100/60 p-2.5 rounded-xl">
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
                                <div className="space-y-4">
                                  {req.userId === "anonymous" &&
                                    !clients.some(
                                      (c) =>
                                        c.email.toLowerCase() ===
                                        req.userEmail?.toLowerCase(),
                                    ) && (
                                      <div>
                                        <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                          Assign Client Login Password
                                        </label>
                                        <input
                                          type="text"
                                          required
                                          value={acceptUserPassword}
                                          onChange={(e) =>
                                            setAcceptUserPassword(
                                              e.target.value,
                                            )
                                          }
                                          placeholder="Enter generated password to email the client"
                                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-primary font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                        />
                                      </div>
                                    )}
                                  {req.userId === "anonymous" &&
                                    clients.some(
                                      (c) =>
                                        c.email.toLowerCase() ===
                                        req.userEmail?.toLowerCase(),
                                    ) && (
                                      <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-emerald-700 text-xs font-medium flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4" />
                                        <span>
                                          Account exists: {req.userEmail}.
                                          Request will be linked automatically.
                                        </span>
                                      </div>
                                    )}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Expected Completion Date
                                      </label>
                                      <input
                                        type="text"
                                        required
                                        value={acceptEstCompletion}
                                        onChange={(e) =>
                                          setAcceptEstCompletion(e.target.value)
                                        }
                                        placeholder="e.g. July 31, 2026"
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-primary font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                        Track Milestones Checklist (One step per
                                        line)
                                      </label>
                                      <textarea
                                        rows={3}
                                        required
                                        value={acceptStepsText}
                                        onChange={(e) =>
                                          setAcceptStepsText(e.target.value)
                                        }
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-primary font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                                      />
                                      <span className="text-[9px] text-slate-400 mt-1 block">
                                        Milestones will be set dynamically
                                        inside the client application tracker.
                                      </span>
                                    </div>
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
                                    onClick={() =>
                                      handleAcceptRequestFinal(req)
                                    }
                                    disabled={isProcessingApproval}
                                    className="bg-primary hover:bg-secondary text-white disabled:opacity-50 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
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
                                  <h5 className="text-[11px] font-bold text-rose-800 uppercase tracking-widest font-mono flex items-center gap-1.5 ">
                                    <XCircle className="h-4 w-4 text-rose-600 animate-pulse" />
                                    <span>
                                      Decline Proposal & Inform Client
                                    </span>
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
                                        "Regulatory digital KYC compliance authentication is pending. Onboarding required first.",
                                      ].map((preset) => (
                                        <button
                                          key={preset}
                                          type="button"
                                          onClick={() =>
                                            setDeclineReason(preset)
                                          }
                                          className={`text-[9.5px] px-2.5 py-1.5 rounded-lg border text-left transition-all font-sans font-medium cursor-pointer ${
                                            declineReason === preset
                                              ? "bg-rose-100 border-rose-300 text-rose-900 font-semibold shadow-xs"
                                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                                          }`}
                                        >
                                          {preset}
                                        </button>
                                      ))}
                                    </div>

                                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                      Decline Reason (Fully customisable text,
                                      dispatched to client in real-time)
                                    </label>
                                    <textarea
                                      rows={3}
                                      required
                                      value={declineReason}
                                      onChange={(e) =>
                                        setDeclineReason(e.target.value)
                                      }
                                      placeholder="Specify why the statutory or compliance criteria check failed..."
                                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-primary font-medium outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none font-sans"
                                    />
                                    <span className="text-[9px] text-slate-400 mt-1 block">
                                      {" "}
                                      This reason will automatically notify the
                                      client's consultation log and dashboard
                                      feed.
                                    </span>
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
                                    onClick={() =>
                                      handleDeclineRequest(req, declineReason)
                                    }
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

                </div>
            )}

            {/* LOGINS ADMIN PANEL */}
            {activeTab === "logins" && isAdmin && (
              <div className="space-y-8">
                <div className="bg-slate-950 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-lg">
                  <h2 className="text-xl text-white tracking-tight flex items-center gap-2">
                    <Key className="h-5 w-5 text-amber-500" />
                    <span>Access Credentials Manager</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Set up direct profiles. Securely save interactive data
                    blocks related to various government portals of the selected
                    client.
                  </p>
                </div>

                {/* List of active logins */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100/60">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Shield className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-bold text-primary uppercase tracking-widest">
                        Active Accounts Vault
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingLoginId(null);
                          setNewLoginPortal("Income Tax Portal");
                          setNewLoginUsername("");
                          setNewLoginPassword("");
                          setNewLoginNotes("");
                          setShowAddLoginModal(true);
                        }}
                        className="text-[10px] bg-slate-900 hover:bg-black text-white font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                      <button
                        onClick={downloadBrowserExtension}
                        className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200"
                        title="Download Autofill Extension for Google Chrome"
                      >
                        Download Autofill Extension
                      </button>
                    </div>
                  </div>

                  {/* Tip for the extension */}
                  <div className="mb-4 text-[10px] text-slate-500 bg-blue-50/50 p-3 rounded-xl border border-blue-100 leading-relaxed">
                    <strong className="text-blue-700 block mb-1">
                      To enable 1-Click Portal Autofill:
                    </strong>
                    1. Click 'Download Autofill Extension'. Extract the ZIP
                    file.
                    <br />
                    2. Go to{" "}
                    <code className="bg-blue-100 px-1 rounded text-blue-800">
                      chrome://extensions
                    </code>
                    .<br />
                    3. Enable <strong>Developer mode</strong> (top right).
                    <br />
                    4. Click <strong>Load unpacked</strong> and select the
                    extracted folder.
                    <br />
                    5. Return here and click "Portal Login"!
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    {clientLogins.filter((c) =>
                      isAdmin && !selectedClientId
                        ? true
                        : c.userId === selectedClientId,
                    ).length === 0 ? (
                      <div className="py-10 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100/60">
                        <p className="text-xs font-semibold">
                          No remote accounts loaded.
                        </p>
                      </div>
                    ) : (
                      clientLogins
                        .filter((c) =>
                          isAdmin && !selectedClientId
                            ? true
                            : c.userId === selectedClientId,
                        )
                        .map((login) => (
                          <div
                            key={login.id}
                            className="p-4 rounded-xl border border-slate-100/60 bg-white hover:border-slate-300 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-primary">
                                {login.portalName}
                              </h4>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingLoginId(login.id);
                                    setNewLoginPortal(login.portalName);
                                    setNewLoginUsername(login.username);
                                    setNewLoginPassword(login.password || "");
                                    setNewLoginNotes(login.notes || "");
                                    setShowAddLoginModal(true);
                                  }}
                                  className="text-slate-400 hover:text-blue-500"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm("Delete this account info?")) {
                                      await deleteDoc(
                                        doc(db, "client_logins", login.id),
                                      );
                                      if (editingLoginId === login.id) {
                                        handleCancelEditLogin();
                                      }
                                    }
                                  }}
                                  className="text-slate-400 hover:text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100/60 text-xs">
                              <div className="grid grid-cols-2 gap-3 flex-1">
                                <div>
                                  <span className="block text-[9px] uppercase font-bold text-slate-500 mb-0.5">
                                    UID / PAN
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-800">
                                      {login.username}
                                    </span>
                                    <button
                                      onClick={() => {
                                        copyToClipboard(
                                          login.username,
                                          "Username copied to clipboard",
                                        );
                                      }}
                                      className="text-slate-400 hover:text-slate-600 focus:outline-none"
                                      title="Copy Username"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <span className="block text-[9px] uppercase font-bold text-slate-500 mb-0.5">
                                    Credentials
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-medium text-slate-600">
                                      {!login.password
                                        ? "—"
                                        : visiblePasswordIds.has(login.id)
                                          ? login.password
                                          : "••••••••"}
                                    </span>
                                    {login.password && (
                                      <>
                                        <button
                                          onClick={() => {
                                            const nextSet = new Set(
                                              visiblePasswordIds,
                                            );
                                            if (nextSet.has(login.id))
                                              nextSet.delete(login.id);
                                            else nextSet.add(login.id);
                                            setVisiblePasswordIds(nextSet);
                                          }}
                                          className="text-slate-400 hover:text-slate-600 focus:outline-none"
                                          title={
                                            visiblePasswordIds.has(login.id)
                                              ? "Hide Password"
                                              : "Show Password"
                                          }
                                        >
                                          {visiblePasswordIds.has(login.id) ? (
                                            <EyeOff className="h-3 w-3" />
                                          ) : (
                                            <Eye className="h-3 w-3" />
                                          )}
                                        </button>
                                        <button
                                          onClick={() => {
                                            copyToClipboard(
                                              login.password!,
                                              "Password copied to clipboard",
                                            );
                                          }}
                                          className="text-slate-400 hover:text-slate-600 focus:outline-none"
                                          title="Copy Password"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handlePortalLogin(login)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg shrink-0 transition-colors"
                              >
                                <span className="font-bold uppercase tracking-wider text-[9px]">
                                  Portal Login
                                </span>
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            </div>
                            {login.notes && (
                              <p className="mt-3 text-[10px] text-slate-500 border-t border-slate-100/60 pt-2">
                                {login.notes}
                              </p>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CLIENTS MASTER BOARD */}
            {activeTab === "clients" && isAdmin && (
              <div className="space-y-6">
                {/* Header card with Add Client Action on top right */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100/60 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/60">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-primary tracking-tight tracking-tight">
                        Clients Master Register
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                        Create client stubs, view client account records, delete
                        client profiles, and select the specific client thread
                        context you want to manage across the workspace portals.
                      </p>
                    </div>
                  </div>

                  {/* Add Client Action Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingClientUid(null);
                      setNewClientEmail("");
                      setNewClientPassword("");
                      setNewClientName("");
                      setNewClientKyc("Pending");
                      setNewClientServices([]);
                      setNewClientEntityType("Individual");
                      setNewClientMobile("");
                      setNewClientGstin("");
                      setNewClientPan("");
                      setNewClientTan("");
                      setNewClientAddress("");
                      setShowAddNewClientModal(true);
                    }}
                    className="shrink-0 self-start md:self-center bg-primary hover:bg-secondary text-white text-white transition-all font-bold px-5 py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer border border-transparent font-sans"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Client</span>
                  </button>
                </div>

                {/* Active Client Registry and Filter */}
                <div className="bg-white border border-slate-100/60 rounded-3xl p-6 sm:p-8 shadow-sm text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100/60 pb-3 mb-5 gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-primary tracking-tight flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-primary" />
                        <span>
                          Active Client Space Registers ({clients.length})
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Click profile cards to switch active workspace focus
                      </p>
                    </div>

                    {/* Search box inline */}
                    <div className="relative w-full sm:w-48">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter email / name..."
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-primary hover:border-slate-200 focus:ring-1 focus:ring-primary transition-all text-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {/* Client stubs from Firestore */}
                    {clients
                      .filter((c) => {
                        if (!clientSearchQuery) return true;
                        return (
                          c.email
                            .toLowerCase()
                            .includes(clientSearchQuery.toLowerCase()) ||
                          (c.displayName &&
                            c.displayName
                              .toLowerCase()
                              .includes(clientSearchQuery.toLowerCase()))
                        );
                      })
                      .map((c) => {
                        const isFocused = selectedClientId === c.uid;
                        return (
                          <div
                            key={c.uid}
                            className={`p-4 rounded-2xl border transition-all flex justify-between items-center group relative ${
                              isFocused
                                ? "border-primary bg-slate-50 ring-1 ring-primary/20"
                                : "border-slate-100/60 hover:bg-slate-50 bg-white"
                            }`}
                          >
                            <div
                              onClick={() => {
                                setSelectedClientId(c.uid);
                                setSelectedClientEmail(c.email);
                                setActiveTab("applications");
                              }}
                              className="flex-1 text-left cursor-pointer pr-3 min-w-0"
                            >
                              <p className="text-xs font-bold text-primary flex items-center gap-1.5 min-w-0">
                                <span className="truncate">
                                  {c.displayName || c.email.split("@")[0]}
                                </span>
                                {isFocused && (
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                                )}
                              </p>
                              <div className="flex flex-col gap-1.5 mt-1">
                                <p className="text-[10px] text-slate-400 font-mono truncate font-medium">
                                  {c.email}
                                </p>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {c.kycStatus === "Verified" ? (
                                    <span className="text-[8px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 font-bold uppercase rounded border border-emerald-200">
                                      KYC VERIFIED
                                    </span>
                                  ) : c.kycStatus === "Rejected" ? (
                                    <span className="text-[8px] px-1.5 py-0.5 bg-rose-100 text-rose-700 font-bold uppercase rounded border border-rose-200">
                                      KYC REJECTED
                                    </span>
                                  ) : (
                                    <span className="text-[8px] px-1.5 py-0.5 bg-amber-100 text-amber-700 font-bold uppercase rounded border border-amber-200">
                                      KYC PENDING
                                    </span>
                                  )}

                                  {c.services?.slice(0, 2).map((srv) => (
                                    <span
                                      key={srv}
                                      className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-600 font-bold uppercase rounded border border-slate-200"
                                    >
                                      {srv}
                                    </span>
                                  ))}
                                  {(c.services?.length || 0) > 2 && (
                                    <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-600 font-bold uppercase rounded border border-slate-200">
                                      +{c.services!.length - 2}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isFocused ? (
                                <span className="text-[9px] font-bold text-primary bg-slate-100 px-2.5 py-1 rounded-full shrink-0">
                                  Active Focus
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedClientId(c.uid);
                                    setSelectedClientEmail(c.email);
                                    setActiveTab("applications");
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-[10px] sm:text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer"
                                >
                                  Focus client
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingClientUid(c.uid);
                                  setNewClientEmail(c.email);
                                  setNewClientPassword("");
                                  setNewClientName(c.displayName || "");
                                  setNewClientKyc(c.kycStatus || "Pending");
                                  setNewClientServices(c.services || []);
                                  setNewClientEntityType(
                                    c.entityType || "Individual",
                                  );
                                  setNewClientMobile(c.mobile || "");
                                  setNewClientGstin(c.gstin || "");
                                  setNewClientPan(c.pan || "");
                                  setNewClientTan(c.tan || "");
                                  setNewClientAddress(c.address || "");
                                  setShowAddNewClientModal(true);
                                }}
                                className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors cursor-pointer shrink-0"
                                title="Edit client profile"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="w-4 h-4"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClientById(c.uid, c.email);
                                }}
                                disabled={c.uid === user?.uid}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                                title="Delete client profile"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                    {clients.filter((c) => {
                      if (!clientSearchQuery) return true;
                      return (
                        c.email
                          .toLowerCase()
                          .includes(clientSearchQuery.toLowerCase()) ||
                        (c.displayName &&
                          c.displayName
                            .toLowerCase()
                            .includes(clientSearchQuery.toLowerCase()))
                      );
                    }).length === 0 && (
                      <div className="py-12 text-center text-slate-400 text-xs italic">
                        No registered clients found matching filter.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add New Login Modal */}
      <AnimatePresence>
        {showAddLoginModal && (
          <div
            id="add-login-modal-overlay"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0 }}
              className="bg-white rounded-[2rem] shadow-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto relative"
            >
              <button
                onClick={() => setShowAddLoginModal(false)}
                className="absolute right-6 top-6 p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
              {/* Register New Login Form */}
              <div className="bg-white rounded-3xl">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100/60">
                  <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Key className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-primary uppercase tracking-widest">
                    Register Portal Access
                  </h3>
                </div>

                <form onSubmit={handleCreateLogin} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                      Government Portal
                    </label>
                    <CustomSelect
                      value={newLoginPortal}
                      onChange={(val) => setNewLoginPortal(val)}
                      className="w-full bg-slate-50 border border-slate-100/60 rounded-xl p-3.5 text-xs text-primary font-medium"
                      options={[
                        "Income Tax Portal",
                        "GST Portal",
                        "MCA Portal",
                        "EPFO Portal",
                        "TRACES Portal",
                        "ESI Portal",
                        "Other",
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                        Username / ID
                      </label>
                      <input
                        type="text"
                        value={newLoginUsername}
                        onChange={(e) => setNewLoginUsername(e.target.value)}
                        placeholder="e.g. PAN or GSTIN"
                        className="w-full bg-slate-50 border border-slate-100/60 rounded-xl p-3.5 text-xs text-primary outline-none focus:border-primary font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showLoginPassword ? "text" : "password"}
                          value={newLoginPassword}
                          onChange={(e) => setNewLoginPassword(e.target.value)}
                          placeholder="Password"
                          className="w-full bg-slate-50 border border-slate-100/60 rounded-xl p-3.5 pr-10 text-xs text-primary outline-none focus:border-primary font-medium"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowLoginPassword(!showLoginPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showLoginPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                      Admin Remarks (optional)
                    </label>
                    <textarea
                      value={newLoginNotes}
                      onChange={(e) => setNewLoginNotes(e.target.value)}
                      placeholder="Internal use only notes..."
                      className="w-full bg-slate-50 border border-slate-100/60 rounded-xl p-3.5 text-xs text-primary outline-none focus:border-primary font-medium min-h-[80px] resize-none"
                    />
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="submit"
                      disabled={!selectedClientId || isAddingLogin}
                      className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-xl py-3.5 text-[11px] font-bold uppercase tracking-wider transition-all"
                    >
                      {isAddingLogin
                        ? editingLoginId
                          ? "Updating..."
                          : "Registering..."
                        : editingLoginId
                          ? "Update Authenticator Profile"
                          : "Save Authenticator Profile"}
                    </button>
                    {editingLoginId && (
                      <button
                        type="button"
                        onClick={handleCancelEditLogin}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      
      
      {/* Operations Console Modals */}
      <AnimatePresence>
        {opsModalType && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setOpsModalType(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-[2rem] shadow-2xl border border-slate-100/60 w-full max-w-2xl overflow-hidden font-sans text-primary flex flex-col max-h-[90vh] relative z-10"
            >
              <div className="bg-slate-900 px-6 py-5 text-white flex justify-between items-center relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/15 to-transparent pointer-events-none" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="bg-indigo-500/20 p-2 rounded-xl text-indigo-300 border border-indigo-500/25">
                    {opsModalType === 'app' && <Briefcase className="h-5 w-5 text-indigo-300" />}
                    {opsModalType === 'doc' && <FileText className="h-5 w-5 text-indigo-300" />}
                    {opsModalType === 'filing' && <Calendar className="h-5 w-5 text-indigo-300" />}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight">
                      {opsModalType === 'app' && "Push Service Engagement"}
                      {opsModalType === 'doc' && "Deliver Legal Certified Document"}
                      {opsModalType === 'filing' && "Push Scheduled Compliance Calendar Date"}
                    </h3>
                    <p className="text-[10px] text-indigo-200/75 font-medium uppercase tracking-wider">
                      Operations Console Action
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpsModalType(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer z-10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 md:p-8 overflow-y-auto space-y-5 flex-1">
                {opsModalType === 'app' && (
                  <form onSubmit={handleCreateApp} className="space-y-5">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                        Target Client *
                      </label>
                      <CustomSelect
                        value={opsTargetClientId}
                        onChange={(val) => setOpsTargetClientId(val)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-primary"
                        options={[
                          { value: "", label: "Select Client..." },
                          ...clients.map((c) => ({
                            value: c.uid,
                            label: c.displayName || c.email,
                          }))
                        ]}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                          Application Title *
                        </label>
                        <input
                          type="text"
                          value={newAppTitle}
                          onChange={(e) => setNewAppTitle(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500 hover:border-slate-200 focus:ring-1 focus:ring-indigo-500 transition-all text-primary placeholder:text-slate-400"
                          placeholder="e.g. GST Registration"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                          Service Type
                        </label>
                        <CustomSelect
                          value={newAppType}
                          onChange={(val) => setNewAppType(val)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-primary"
                          options={[
                            "GST Registration",
                            "Income Tax Filing",
                            "Company Incorporation",
                            "Trademark Registration",
                            "TDS Return",
                            "Audit Report",
                            "Other Service"
                          ]}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                          Initial Status
                        </label>
                        <CustomSelect
                          value={newAppStatus}
                          onChange={(val) => setNewAppStatus(val as any)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-primary"
                          options={[
                            "Pending Documents",
                            "Processing",
                            "Completed"
                          ]}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                          Estimated Completion (Optional)
                        </label>
                        <input
                          type="date"
                          value={newAppEstComp}
                          onChange={(e) => setNewAppEstComp(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500 hover:border-slate-200 focus:ring-1 focus:ring-indigo-500 transition-all text-primary"
                        />
                      </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-md"
                      >
                        Push Tracker
                      </button>
                    </div>
                  </form>
                )}
                {opsModalType === 'doc' && (
                  <form onSubmit={handleCreateDoc} className="space-y-5">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                        Target Client *
                      </label>
                      <CustomSelect
                        value={opsTargetClientId}
                        onChange={(val) => setOpsTargetClientId(val)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-primary"
                        options={[
                          { value: "", label: "Select Client..." },
                          ...clients.map((c) => ({
                            value: c.uid,
                            label: c.displayName || c.email,
                          }))
                        ]}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                          Document Title *
                        </label>
                        <input
                          type="text"
                          value={newDocName}
                          onChange={(e) => setNewDocName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500 hover:border-slate-200 focus:ring-1 focus:ring-indigo-500 transition-all text-primary placeholder:text-slate-400"
                          placeholder="e.g. FY 2025-26 Balance Sheet"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                          Category
                        </label>
                        <CustomSelect
                          value={newDocCategory}
                          onChange={(val) => setNewDocCategory(val)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-primary"
                          options={[
                            "Financials",
                            "Certificates",
                            "Legal",
                            "Other"
                          ]}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                          Secure File Package (PDF/Excel)
                        </label>
                        <input
                          type="file"
                          onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                          External Web Link (Optional)
                        </label>
                        <input
                          type="url"
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500 hover:border-slate-200 focus:ring-1 focus:ring-indigo-500 transition-all text-primary placeholder:text-slate-400"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={uploadProgress !== null}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-md disabled:opacity-50"
                      >
                        {uploadProgress !== null ? "Encrypting & Delivering..." : "Deliver Secure Document"}
                      </button>
                    </div>
                  </form>
                )}
                {opsModalType === 'filing' && (
                  <form onSubmit={handleCreateFiling} className="space-y-5">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                        Target Client *
                      </label>
                      <CustomSelect
                        value={opsTargetClientId}
                        onChange={(val) => setOpsTargetClientId(val)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-primary"
                        options={[
                          { value: "", label: "Select Client..." },
                          ...clients.map((c) => ({
                            value: c.uid,
                            label: c.displayName || c.email,
                          }))
                        ]}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                          Filing Title *
                        </label>
                        <input
                          type="text"
                          value={newFilingTitle}
                          onChange={(e) => setNewFilingTitle(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500 hover:border-slate-200 focus:ring-1 focus:ring-indigo-500 transition-all text-primary placeholder:text-slate-400"
                          placeholder="e.g. GSTR-3B Return"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                          Tax Domain
                        </label>
                        <CustomSelect
                          value={newFilingService}
                          onChange={(val) => setNewFilingService(val)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-primary"
                          options={[
                            "GST",
                            "Income Tax",
                            "ROC",
                            "TDS",
                            "Other"
                          ]}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                          Filing Status
                        </label>
                        <CustomSelect
                          value={newFilingStatus}
                          onChange={(val) => setNewFilingStatus(val as any)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-primary"
                          options={[
                            "Upcoming",
                            "Overdue",
                            "Filed"
                          ]}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                          Statutory Due Date *
                        </label>
                        <input
                          type="date"
                          value={newFilingDueDate}
                          onChange={(e) => setNewFilingDueDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold outline-none focus:bg-white focus:border-indigo-500 hover:border-slate-200 focus:ring-1 focus:ring-indigo-500 transition-all text-primary"
                          required
                        />
                      </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-md"
                      >
                        Push Calendar Date
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
{/* Add New Client Dialog Modal */}
      <AnimatePresence>
        {showAddNewClientModal && (
          <div
            id="add-new-client-modal-overlay"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              id="add-new-client-modal-card"
              className="bg-white rounded-[2rem] shadow-2xl border border-slate-100/60/80 w-full max-w-2xl overflow-hidden font-sans text-primary flex flex-col max-h-[90vh]"
            >
              {/* Header Section */}
              <div className="bg-slate-900 px-6 py-5 text-white flex justify-between items-center relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/15 to-transparent pointer-events-none" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="bg-amber-500/20 p-2 rounded-xl text-amber-300 border border-amber-500/25">
                    <Users className="h-5 w-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight">
                      {editingClientUid
                        ? "Edit Client Account"
                        : "Add New Client Account"}
                    </h3>
                    <p className="text-[10px] text-amber-200/75 font-medium uppercase tracking-wider">
                      {editingClientUid
                        ? "Update workspace profile"
                        : "Register workspace profile stub"}
                    </p>
                  </div>
                </div>
                <button
                  id="close-add-client-modal-btn"
                  type="button"
                  onClick={() => setShowAddNewClientModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body Form */}
              <form
                id="add-new-client-form"
                onSubmit={handleAddNewClientInModal}
                className="p-6 md:p-8 space-y-5 text-left flex-1 overflow-y-auto"
              >
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                    Client Name / Organization Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Industries Ltd"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-amber-500 hover:border-slate-200 focus:ring-1 focus:ring-amber-500 transition-all text-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                    Client Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      disabled={!!editingClientUid}
                      placeholder="e.g. contact@clientcorp.com"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-amber-500 hover:border-slate-200 focus:ring-1 focus:ring-amber-500 transition-all ${!!editingClientUid ? "text-slate-400 cursor-not-allowed opacity-70" : "text-primary"}`}
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1.5 leading-relaxed">
                    A profile workspace context will be created mapped to this
                    email handle.
                  </p>
                </div>

                {!editingClientUid && (
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                      Client Login Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        placeholder="e.g. Set initial password"
                        value={newClientPassword}
                        onChange={(e) => setNewClientPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-amber-500 hover:border-slate-200 focus:ring-1 focus:ring-amber-500 transition-all text-primary"
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1.5 leading-relaxed">
                      If provided, the client can use these credentials to log
                      in. Must be at least 6 characters.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                      Entity Type *
                    </label>
                    <CustomSelect
                      value={newClientEntityType}
                      onChange={(val) => setNewClientEntityType(val)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-primary"
                      options={[
                        "Individual",
                        "Company",
                        "LLP",
                        "Partnership",
                        "Trust",
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                      Mobile Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9876543210"
                      value={newClientMobile}
                      onChange={(e) => setNewClientMobile(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-amber-500 hover:border-slate-200 transition-all text-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                      GSTIN *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      value={newClientGstin}
                      onChange={(e) => setNewClientGstin(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-amber-500 hover:border-slate-200 transition-all text-primary uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                      PAN *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ABCDE1234F"
                      value={newClientPan}
                      onChange={(e) => setNewClientPan(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-amber-500 hover:border-slate-200 transition-all text-primary uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                      TAN *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ABCD12345E"
                      value={newClientTan}
                      onChange={(e) => setNewClientTan(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-amber-500 hover:border-slate-200 transition-all text-primary uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                    Address *
                  </label>
                  <textarea
                    required
                    placeholder="Enter full address"
                    value={newClientAddress}
                    onChange={(e) => setNewClientAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-amber-500 hover:border-slate-200 transition-all text-primary resize-none h-20"
                  />
                </div>

                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                      Client KYC Status *
                    </label>
                    <CustomSelect
                      value={newClientKyc}
                      onChange={(val) => setNewClientKyc(val)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-primary"
                      options={["Pending", "Verified", "Rejected"]}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                      Services We Offer *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Audit",
                        "Accounting",
                        "Tax Filing",
                        "Payroll",
                        "Legal Advice",
                      ].map((srv) => (
                        <button
                          key={srv}
                          type="button"
                          onClick={() => {
                            if (newClientServices.includes(srv)) {
                              setNewClientServices((prev) =>
                                prev.filter((s) => s !== srv),
                              );
                            } else {
                              setNewClientServices((prev) => [...prev, srv]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer border ${
                            newClientServices.includes(srv)
                              ? "bg-primary text-white border-primary shadow-sm"
                              : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {srv}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-[10px] text-amber-800 leading-relaxed">
                  <span className="font-bold block mb-0.5">
                    ℹ Workspace Virtualization
                  </span>
                  The administrator and staff can then instantly assign GST,
                  Income Tax filings, document checklist requests, or support
                  chat tickets specifically to this client.
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddNewClientModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-primary font-bold rounded-xl py-3 text-xs uppercase tracking-wider transition cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={newClientLoading}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold rounded-xl py-3 px-4 text-xs uppercase tracking-wider transition shadow-sm hover:scale-[1.01] active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {newClientLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>
                          {editingClientUid ? "Updating..." : "Creating..."}
                        </span>
                      </>
                    ) : (
                      <>
                        {editingClientUid ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-3.5 h-3.5"
                          >
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                          </svg>
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {editingClientUid ? "Update Client" : "Create Client"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Client New Request Modal Dialog */}
      <AnimatePresence>
        {showNewRequestModal && (
          <div
            id="new-request-modal-overlay"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              id="new-request-modal-card"
              className="bg-white rounded-[2rem] shadow-2xl border border-slate-100/60/80 w-full max-w-2xl overflow-hidden font-sans"
            >
              {/* Header Section */}
              <div className="bg-slate-900 px-6 py-5 text-white flex justify-between items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="bg-primary/20 p-2 rounded-xl text-primary-light border border-primary/25">
                    <Sparkles className="h-5 w-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight">
                      Create New Request / Engagement
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Dispatched in real-time to Manohar Business Consulting
                      Portal
                    </p>
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
              <form
                id="new-request-submission-form"
                onSubmit={handleSubmitNewRequest}
                className="p-6 md:p-8 space-y-5"
              >
                {/* Select Request Type */}
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                    What can Manohar Business Consulting help you with?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      id="req-type-btn-engagement"
                      type="button"
                      onClick={() => setRequestType("engagement")}
                      className={`flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        requestType === "engagement"
                          ? "border-primary bg-primary/[0.02] ring-1 ring-primary"
                          : "border-slate-100/60 hover:border-slate-300 bg-slate-50/50 hover:bg-white"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl mb-3 ${requestType === "engagement" ? "bg-primary/10 text-primary" : "bg-slate-200/55 text-slate-500"}`}
                      >
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        New Engagement
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1 font-normal leading-relaxed text-wrap">
                        Book a new corporate consulting service or client audit.
                      </span>
                    </button>

                    <button
                      id="req-type-btn-task"
                      type="button"
                      onClick={() => setRequestType("task")}
                      className={`flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        requestType === "task"
                          ? "border-primary bg-primary/[0.02] ring-1 ring-primary"
                          : "border-slate-100/60 hover:border-slate-300 bg-slate-50/50 hover:bg-white"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl mb-3 ${requestType === "task" ? "bg-primary/10 text-primary" : "bg-slate-200/55 text-slate-500"}`}
                      >
                        <Activity className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        New Tracker Task
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1 font-normal leading-relaxed text-wrap">
                        Request regular business operations or statutory
                        filings.
                      </span>
                    </button>

                    <button
                      id="req-type-btn-document"
                      type="button"
                      onClick={() => setRequestType("document")}
                      className={`flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        requestType === "document"
                          ? "border-primary bg-primary/[0.02] ring-1 ring-primary"
                          : "border-slate-100/60 hover:border-slate-300 bg-slate-50/50 hover:bg-white"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl mb-3 ${requestType === "document" ? "bg-primary/10 text-primary" : "bg-slate-200/55 text-slate-500"}`}
                      >
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        Upload Verification Paperwork
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1 font-normal leading-relaxed text-wrap">
                        Submit certificates, ledgers, or business KYC paperwork.
                      </span>
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
                      placeholder={
                        requestType === "document"
                          ? "e.g. FY 25-26 Board Resolution Draft"
                          : "e.g. Corporate GST Filing May"
                      }
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl p-3 text-xs text-primary font-medium outline-none focus:border-primary transition-colors font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">
                      Service Category
                    </label>
                    <CustomSelect
                      value={requestCategory}
                      onChange={(val) => setRequestCategory(val)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-primary font-medium cursor-pointer"
                      options={[
                        "GST Registration",
                        "GST Monthly Return",
                        "Income Tax Return",
                        "ROC Compliance / MCA",
                        "Company Incorporation",
                        "FEMA & RBI Compliance",
                        "Audit & Assurance / Ledger Check",
                        "Other Corporate Advisory",
                      ]}
                    />
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
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl p-3 text-xs text-primary outline-none focus:border-primary transition-all font-sans leading-relaxed"
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
                        Max size 15 MB. Files under 800 KB are instantly
                        serialized for robust offline access.
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
                    <div className="mt-3 flex items-center justify-between bg-white border border-slate-100/60 p-2 rounded-xl text-xs text-slate-800">
                      <span className="font-medium truncate max-w-xs sm:max-w-md">
                        {requestFile.name} (
                        {(requestFile.size / 1024).toFixed(1)} KB)
                      </span>
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
                  <div
                    id="request-submit-progress"
                    className="w-[100%] bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden"
                  >
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${requestUploadProgress}%` }}
                    />
                  </div>
                )}

                {/* Actions row */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100/60">
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
