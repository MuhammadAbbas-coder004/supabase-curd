import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Briefcase, Menu, X, LogOut, User } from 'lucide-react';

const Navbar = () => {
  const [session, setSession] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-50 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">InvestHub</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/pitches" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">Pitches</Link>
            {session ? (
              <>
                <Link to="/messages" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">Messages</Link>
                <Link to="/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">Dashboard</Link>
                <div className="flex items-center space-x-4">
                  <button onClick={handleLogout} className="flex items-center space-x-2 px-4 py-2 rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors">
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 font-medium transition-colors">Log in</Link>
                <Link to="/register" className="px-5 py-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 font-medium transition-all hover:scale-105">Sign up</Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600 dark:text-slate-300 hover:text-indigo-600">
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link to="/pitches" className="block px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 font-medium">Pitches</Link>
            {session ? (
              <>
                <Link to="/messages" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 font-medium">Messages</Link>
                <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 font-medium">Dashboard</Link>
                <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-red-600 font-medium">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="block px-3 py-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 font-medium">Log in</Link>
                <Link to="/register" className="block px-3 py-2 text-indigo-600 font-medium">Sign up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
