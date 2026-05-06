import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Folder, 
  LogOut, 
  Briefcase, 
  ChevronLeft, 
  ChevronRight,
  UserCircle,
  History
} from 'lucide-react';

const Sidebar = ({ isCollapsed, setIsCollapsed, userRole, profile, activePage }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navLinks = [
    { name: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'My Pitches', icon: Folder, path: '/pitches' },
    { name: 'Messages', icon: MessageSquare, path: '/messages' },
    ...(userRole === 'investor' ? [{ name: 'History', icon: History, path: '/history' }] : []),
    { name: 'Profile', icon: UserCircle, path: '/profile' },
  ];

  return (
    <aside className={`fixed lg:static inset-y-0 left-0 ${isCollapsed ? 'lg:w-20' : 'lg:w-72'} w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/50 z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 h-full flex flex-col p-4`}>
      <div className="flex items-center h-10 mb-10 px-2 overflow-hidden">
        <div className={`flex items-center shrink-0 transition-all duration-300 ${isCollapsed ? 'w-full justify-center' : 'w-auto space-x-3'}`}>
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-600/20 shrink-0">
            <Briefcase className="h-7 w-7 text-white" />
          </div>
          <span className={`text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            InvestHub
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-hidden">
        {navLinks.map((link) => (
          <Link
            key={link.name}
            to={link.path}
            title={isCollapsed ? link.name : ''}
            className={`flex items-center h-12 transition-all duration-300 rounded-2xl group relative ${
              activePage === link.name 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-indigo-600 dark:hover:text-white'
            } ${isCollapsed ? 'px-0 justify-center' : 'px-4'}`}
          >
            <div className={`shrink-0 flex items-center justify-center transition-all duration-300 ${isCollapsed ? 'w-full' : 'w-7'}`}>
              <link.icon className={`w-6 h-6 ${activePage === link.name ? 'text-white' : 'group-hover:scale-110 transition-transform'}`} />
            </div>
            <span className={`ml-3 font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              {link.name}
            </span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-700/50 space-y-4">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex items-center h-11 w-full hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl text-slate-500 dark:text-slate-400 transition-colors duration-200 group relative px-3"
        >
          <div className={`flex items-center justify-center shrink-0 transition-all duration-300 ${isCollapsed ? 'w-full' : 'w-7'}`}>
            {isCollapsed ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
          </div>
          <span className={`ml-3 text-sm font-semibold whitespace-nowrap transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            Collapse Sidebar
          </span>
        </button>

        <div className={`bg-slate-50 dark:bg-slate-900/50 rounded-2xl transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}>
           <div className={`flex items-center transition-all duration-300 ${isCollapsed ? 'justify-center' : 'space-x-3'} mb-3`}>
              <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                {profile?.name?.charAt(0) || 'U'}
              </div>
              <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{profile?.name || 'User'}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{userRole?.replace('_', ' ')}</p>
              </div>
           </div>
           <button 
            onClick={handleLogout}
            title={isCollapsed ? 'Sign Out' : ''}
            className={`w-full flex items-center h-10 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold text-sm transition-all duration-300 ${isCollapsed ? 'justify-center' : 'px-2 space-x-3'}`}
           >
             <div className={`shrink-0 flex items-center justify-center transition-all duration-300 ${isCollapsed ? 'w-full' : 'w-7'}`}>
               <LogOut className="w-6 h-6" />
             </div>
             <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
               Sign Out
             </span>
           </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
