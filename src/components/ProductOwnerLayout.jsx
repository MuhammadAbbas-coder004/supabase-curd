import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Sidebar from './Sidebar';
import { Menu, Search, Bell } from 'lucide-react';
import Navbar from './Navbar';

const ProductOwnerLayout = () => {
  const [userRole, setUserRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      // Fetch user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      setUserRole(userData?.role);

      // Fetch profile with error handling
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle(); 
      
      const metadataName = session.user.user_metadata?.full_name;
      const fallbackName = session.user.email.split('@')[0];

      if (profileData) {
        // Use metadata fallback for name and photo if missing in DB
        const updatedProfile = {
          ...profileData,
          name: profileData.name || metadataName || fallbackName,
          avatar_url: profileData.avatar_url || session.user.user_metadata?.avatar_url
        };
        setProfile(updatedProfile);
      } else {
        // AUTO-FIX: Create profile object in state IMMEDIATELY from metadata
        const tempProfile = {
          user_id: session.user.id,
          name: metadataName || fallbackName,
          avatar_url: session.user.user_metadata?.avatar_url
        };
        setProfile(tempProfile);

        // Try to save it to DB in background
        supabase.from('profiles').insert([{ user_id: session.user.id, name: tempProfile.name }]).then(({ error }) => {
          if (error) console.warn("Layout: Background profile creation failed", error.message);
        });
      }
      
      setLoading(false);
    };

    checkRole();

    // Listen for profile updates from the Profile page
    window.addEventListener('profileUpdated', checkRole);
    return () => window.removeEventListener('profileUpdated', checkRole);
  }, [navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const activePage = location.pathname === '/dashboard' ? 'Overview' : 
                     location.pathname === '/pitches' ? 'My Pitches' :
                     location.pathname === '/messages' ? 'Messages' :
                     location.pathname === '/profile' ? 'Profile' :
                     location.pathname === '/history' ? 'History' : '';

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed} 
        userRole={userRole} 
        profile={profile} 
        activePage={activePage}
      />

      {/* Main Content */}
      <main className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-500 ${isSidebarCollapsed ? 'pl-20 lg:pl-0' : 'pl-0'} ${!isSidebarCollapsed ? 'blur-[2px] pointer-events-none md:blur-0 md:pointer-events-auto' : ''}`}>
        {/* Top Header */}
        <header className="h-16 md:h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between px-4 md:px-10 z-30">
          <div className="flex items-center space-x-3 md:space-x-4">
            {/* Hamburger Button Removed */}
            <div className="hidden sm:flex relative group">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
               <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 w-40 md:w-64 transition-all"
               />
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-5">
            <button className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
            <div className="h-6 w-[1px] bg-slate-200 dark:border-slate-700 mx-1"></div>
             <div className="flex items-center space-x-2 md:space-x-3">
                <p className="hidden sm:block text-sm font-bold text-slate-900 dark:text-white truncate max-w-[100px]">{profile?.name || 'User'}</p>
                <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl overflow-hidden bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/20">
                 {profile?.avatar_url ? (
                   <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                   profile?.name?.charAt(0) || 'U'
                 )}
                </div>
             </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductOwnerLayout;
