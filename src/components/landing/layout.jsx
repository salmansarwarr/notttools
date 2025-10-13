import React, { useState, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./header";
import { Footer } from "./footer";
import { Sidebar } from "./Sidebar";

const LandingLayout = ({ showFooter = true }) => {
  const [isHeroInView, setIsHeroInView] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const topRef = useRef(null);

  useEffect(() => {
    // Intersection Observer for top section to control header transparency
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeroInView(entry.isIntersecting);
      },
      { threshold: 0.9 }
    );

    if (topRef.current) {
      observer.observe(topRef.current);
    }

    return () => {
      if (topRef.current) observer.unobserve(topRef.current);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Header */}
      <div className="fixed top-0 left-0 w-full z-50">
        <Header isHeroInView={isHeroInView} onSidebarToggle={toggleSidebar} />
      </div>

      {/* Top reference point for intersection observer */}
      <div ref={topRef} className="absolute top-0 h-20 w-full pointer-events-none" />

      {/* Main Content */}
      <main className="relative">
        <Outlet />
      </main>

      {/* Footer */}
      {showFooter && <Footer />}
    </div>
  );
};

export default LandingLayout;