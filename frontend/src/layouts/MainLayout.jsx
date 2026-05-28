import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MainLayout = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  // Smooth scroll to section (works with HashRouter)
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const navLinks = [
    { label: 'Features', id: 'features' },
    { label: 'Security', id: 'security' },
    { label: 'Roles', id: 'roles' },
  ];

  return (
    <div className="min-h-screen bg-[hsl(222,47%,5%)]">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-[hsl(222,47%,5%)]/95 backdrop-blur-xl border-b border-[hsl(217,33%,12%)] shadow-lg shadow-black/20' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 group"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <img src="/logo.png" alt="SyncOps" className="w-8 h-8 rounded-lg object-contain" />
              <span className="text-xl font-semibold text-[hsl(210,40%,98%)] tracking-tight">SyncOps</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollToSection(link.id)}
                  className="px-4 py-2 text-sm text-[hsl(215,20%,55%)] hover:text-[hsl(210,40%,98%)] rounded-lg hover:bg-[hsl(217,33%,12%)]/50 transition-all duration-200 cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link to="/login">
                <Button 
                  variant="ghost" 
                  className="text-[hsl(215,20%,55%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,12%)]/50"
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/create-organization">
                <Button className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all">
                  Create Organization
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg text-[hsl(215,20%,55%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,12%)]/50 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden absolute top-full left-0 right-0 bg-[hsl(222,47%,6%)] border-b border-[hsl(217,33%,12%)] shadow-xl transition-all duration-300 ${
          isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}>
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollToSection(link.id)}
                className="block w-full text-left px-3 py-2.5 text-sm text-[hsl(215,20%,55%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,12%)]/50 rounded-lg transition-colors cursor-pointer"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-3 mt-3 border-t border-[hsl(217,33%,12%)] space-y-2">
              <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                <Button 
                  variant="ghost" 
                  className="w-full text-[hsl(215,20%,55%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,12%)]/50"
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/create-organization" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white">
                  Create Organization
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
