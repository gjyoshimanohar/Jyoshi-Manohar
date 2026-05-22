import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import React from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import BlogList from './pages/BlogList';
import BlogPost from './pages/BlogPost';
import Admin from './pages/Admin';
import Tasks from './pages/Tasks';
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

export default function App() {
  const isBlogSubdomain = window.location.hostname.startsWith('blogs.');

  return (
    <Router>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-grow">
          {isBlogSubdomain ? (
            <Routes>
              <Route path="/" element={<BlogList />} />
              <Route path="/:slug" element={<BlogPost />} />
            </Routes>
          ) : (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/blog" element={<BlogList />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/services/:id" element={<UnderConstruction />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/tasks" element={<Tasks />} />
            </Routes>
          )}
        </div>
        <Footer />
      </div>
    </Router>
  );
}
