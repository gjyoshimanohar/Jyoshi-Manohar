import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Lazy load route pages to segment bundle chunks and prevent any secondary module-execution issues on the landing page
const Home = lazy(() => import('./pages/Home'));
const BlogList = lazy(() => import('./pages/BlogList'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Admin = lazy(() => import('./pages/Admin'));
const Tasks = lazy(() => import('./pages/Tasks'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const UnderConstruction = lazy(() => import('./pages/UnderConstruction'));

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
              </Routes>
            </Suspense>
          </div>
          <Footer />
        </div>
      </Router>
    </HelmetProvider>
  );
}
