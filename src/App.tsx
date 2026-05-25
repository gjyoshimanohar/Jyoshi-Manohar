import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Lazy load route pages to segment bundle chunks and prevent any secondary module-execution issues on the landing page
const Home = lazy(() => import('./pages/Home'));
const BlogList = lazy(() => import('./pages/BlogList'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Admin = lazy(() => import('./pages/Admin'));
const Tasks = lazy(() => import('./pages/Tasks'));
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
 <Router>
 <ScrollToTop />
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
 </Routes>
 </Suspense>
 </div>
 <Footer />
 </div>
 </Router>
 );
}
