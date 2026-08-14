import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SEO from './components/SEO';
import { getOrganizationSchema, getPersonSchema, getWebsiteSchema } from './utils/seoSchemas';

// A robust helper to handle chunk loading errors in production when assets change during a deployment/server restart
function lazyWithRetry(componentImport: () => Promise<any>) {
  return lazy(async () => {
    try {
      const component = await componentImport();
      try {
        sessionStorage.removeItem('page-has-been-force-refreshed');
      } catch (e) {}
      return component;
    } catch (error) {
      console.error("Dynamic import failed, attempting to reload the page:", error);
      try {
        const hasRefreshed = sessionStorage.getItem('page-has-been-force-refreshed');
        if (!hasRefreshed) {
          sessionStorage.setItem('page-has-been-force-refreshed', 'true');
          window.location.reload();
          return { default: () => null };
        }
      } catch (e) {}
      throw error;
    }
  });
}

// Static import of route pages to prevent module-execution/chunk issues and dynamic import failures
import Home from './pages/Home';
import BlogList from './pages/BlogList';
import BlogPost from './pages/BlogPost';
import Admin from './pages/Admin';
import Tasks from './pages/Tasks';
import ClientDashboard from './pages/ClientDashboard';
import UserProfile from './pages/UserProfile';
import ServiceDetail from './pages/ServiceDetail';
import Toolkit from './pages/Toolkit';

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  React.useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
    } else {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [pathname, hash]);

  return null;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
          <div className="max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              !
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-600 mb-6">
              The application encountered a temporary rendering issue.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-md"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
      <Router>
        <ScrollToTop />
        <Helmet defaultTitle="CA Jyoshi Manohar | Chartered Accountant" titleTemplate="%s | CA Jyoshi Manohar" />
        <SEO schemas={[getOrganizationSchema(), getPersonSchema(), getWebsiteSchema()]} />
        <Toaster position="bottom-right" toastOptions={{ className: 'text-sm font-medium', style: { borderRadius: '12px', background: '#333', color: '#fff' } }} />
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <div className="flex-grow">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/blog" element={<BlogList />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/services/:id" element={<ServiceDetail />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/dashboard" element={<ClientDashboard />} />
                <Route path="/profile" element={<UserProfile />} />
                <Route path="/toolkit" element={<Toolkit />} />
              </Routes>
            </Suspense>
          </div>
          <Footer />
        </div>
      </Router>
    </HelmetProvider>
    </ErrorBoundary>
  );
}
