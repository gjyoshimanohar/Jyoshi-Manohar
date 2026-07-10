import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

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
import UnderConstruction from './pages/UnderConstruction';

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

export default function App() {
  return (
    <HelmetProvider>
      <Router>
        <ScrollToTop />
        <Helmet defaultTitle="CA Jyoshi Manohar | Chartered Accountant" titleTemplate="%s | CA Jyoshi Manohar">
          <meta name="description" content="Official website of CA Jyoshi Manohar. Offering expert personal taxation, corporate auditing, financial advisory, GST compliance, and accounting services." />
          
          {/* Open Graph / Facebook */}
          <meta property="og:type" content="website" />
          <meta property="og:title" content="CA Jyoshi Manohar | Chartered Accountant" />
          <meta property="og:description" content="Official website of CA Jyoshi Manohar. Offering expert personal taxation, corporate auditing, financial advisory, GST compliance, and accounting services." />
          <meta property="og:image" content="https://jyoshimanohar-com.web.app/logo.svg" />
          <meta property="og:url" content="https://jyoshimanohar-com.web.app" />

          {/* Twitter */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="CA Jyoshi Manohar | Chartered Accountant" />
          <meta name="twitter:description" content="Official website of CA Jyoshi Manohar. Offering expert taxation, auditing, and financial advisory." />
          <meta name="twitter:image" content="https://jyoshimanohar-com.web.app/logo.svg" />

          <meta name="keywords" content="Jyoshi Manohar, CA Jyoshi Manohar, Chartered Accountant, Tax Consultant, Audit Services, GST Planning, Financial Advisor" />
          <meta name="author" content="CA Jyoshi Manohar" />
          <meta name="robots" content="index, follow" />
        </Helmet>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <div className="flex-grow">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/blog" element={<BlogList />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/services/:id" element={<UnderConstruction />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/dashboard" element={<ClientDashboard />} />
                <Route path="/profile" element={<UserProfile />} />
              </Routes>
            </Suspense>
          </div>
          <Footer />
        </div>
      </Router>
    </HelmetProvider>
  );
}
