import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { PlusCircle, Eye, Handshake, Users, TrendingUp, Presentation, LayoutDashboard, MessageSquare, Folder, Settings, LogOut, Menu, X, Briefcase, Bell, Search, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, LabelList } from 'recharts';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [userRole, setUserRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ views: 0, interests: 0, pitches: 0 });
  const [myPitches, setMyPitches] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfileData();

    // BACKUP POLLING: Refresh data every 10 seconds 
    // This is a safety net if Supabase Realtime isn't enabled.
    const interval = setInterval(() => {
      console.log("Dashboard: Backup Polling...");
      fetchProfileData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) return;
      const user = authSession.user;
      setSession(authSession);

      // 1. Fetch all pitches and all view history (for analytics)
      const { data: globalPitches } = await supabase.from('pitches').select('*');
      const { data: globalViews } = await supabase.from('pitch_views').select('viewed_at, pitch_id');
      
      // Process all pitches for global metrics
      const processedPitches = (globalPitches || []).map(p => {
        const viewHistoryCount = (globalViews || []).filter(v => v.pitch_id === p.id).length;
        return {
          ...p,
          views: Math.max(Number(p.views_count) || 0, viewHistoryCount)
        };
      });

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
        
      const role = userData?.role?.toLowerCase();
      if (userData) setUserRole(role);
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (profileData) setProfile(profileData);

      if (role === 'product_owner') {
        const { data: pitches } = await supabase
          .from('pitches')
          .select('*')
          .eq('owner_id', user.id);
          
        setMyPitches(pitches || []);
        
        const totalViews = (pitches || []).reduce((acc, p) => acc + (p.views_count || 0), 0);
        const pitchIds = (pitches || []).map(p => p.id);
        
        if (pitchIds.length > 0) {
          // 1. Get ALL interests for my pitches
          const { data: interestData, count: interestCount } = await supabase
            .from('interests')
            .select('*', { count: 'exact' })
            .in('pitch_id', pitchIds);
          
          // 2. Calculate interests from last 7 days
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const newInterestsCount = (interestData || []).filter(i => i.created_at >= sevenDaysAgo).length;
          
          setMetrics(prev => ({
            ...prev,
            interests: interestCount || 0,
            newInterests: newInterestsCount
          }));

          // 3. Get recent interest details for activity feed
          const { data: recentInterests } = await supabase
            .from('interests')
            .select('*, pitches(title)')
            .in('pitch_id', pitchIds)
            .order('created_at', { ascending: false })
            .limit(5);

          const interestActivities = (recentInterests || []).map(item => ({
            id: item.id,
            type: 'interest',
            title: 'New investor interest',
            desc: `An investor showed interest in your pitch "${item.pitches?.title || 'Startup'}"`,
            time: item.created_at
          }));

          const { data: viewHistory, count: totalHistoryCount } = await supabase
            .from('pitch_views')
            .select('viewed_at, pitches(title)', { count: 'exact' })
            .in('pitch_id', pitchIds)
            .order('viewed_at', { ascending: false });
          
          const reliableViews = Math.max(totalViews, totalHistoryCount || 0);

          setMetrics(prev => ({
            ...prev,
            views: reliableViews,
            pitches: pitches?.length || 0,
          }));

          const viewActivities = (viewHistory || []).slice(0, 5).map(v => ({
            id: `view-${v.viewed_at}`,
            type: 'view',
            title: 'Pitch Viewed',
            desc: `Someone just watched your pitch "${v.pitches?.title || 'Startup'}"`,
            time: v.viewed_at
          }));

          const combinedActivities = [...interestActivities, ...viewActivities]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 5);

          setRecentActivity(combinedActivities);
          
          const last7DaysHistory = (viewHistory || []).filter(v => 
             new Date(v.viewed_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          );
          processChartData(last7DaysHistory);
        } else {
          setChartData([]);
        }
      } else if (role === 'investor') {
        const { count: interestCount } = await supabase
          .from('interests')
          .select('*', { count: 'exact', head: true })
          .eq('investor_id', user.id);

        // 1. Calculate platform total views using both views_count and pitch_views history
        let totalPlatformViews = (processedPitches || []).reduce((sum, p) => sum + (p.views || 0), 0);
        
        // 2. Count messages
        const { count: messageCount } = await supabase
          .from('direct_messages')
          .select('*', { count: 'exact', head: true })
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

        setMetrics({
          views: totalPlatformViews,
          interests: interestCount || 0,
          pitches: messageCount || 0
        });

        // Recent Activity with sample if empty
        const { data: interestsWithPitches } = await supabase
          .from('interests')
          .select('*, pitches(title, category)')
          .eq('investor_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        let activities = (interestsWithPitches || []).map(item => ({
          id: item.id,
          type: 'interest',
          title: 'Interest Expressed',
          desc: `You showed interest in "${item.pitches?.title}"`,
          time: item.created_at
        }));

        if (activities.length === 0) {
          activities = [{
            id: 'welcome-1',
            type: 'info',
            title: 'Welcome to InvestHub',
            desc: 'Start exploring pitches to see your activity here.',
            time: new Date().toISOString()
          }];
        }
        setRecentActivity(activities);

        setMyPitches(processedPitches);
        
        // Investor Chart: Top 6 Videos by Views (using .views from processedPitches)
        if (processedPitches && processedPitches.length > 0) {
          let sortedPitches = [...processedPitches].sort((a, b) => (b.views || 0) - (a.views || 0));

          const trendData = sortedPitches.slice(0, 6).map((pitch) => {
            const views = pitch.views || 0;
            return {
              name: pitch.title ? (pitch.title.length > 10 ? pitch.title.substring(0, 10) + '...' : pitch.title) : 'Startup',
              views: views
            };
          });
          setChartData(trendData);
        } else {
          setChartData([]);
        }
      }
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (viewHistory) => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      
      const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      const count = (viewHistory || []).filter(v => {
        const vDate = new Date(v.viewed_at).toLocaleDateString('en-CA');
        return vDate === dateStr;
      }).length;

      data.push({
        date: dayName,
        views: count,
        fullDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
    setChartData(data);
  };

  // REAL-TIME SUBSCRIPTION
  useEffect(() => {
    let channel;

    const setupRealtime = async () => {
      channel = supabase
        .channel('dashboard-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'interests' },
          () => fetchProfileData()
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'pitches' },
          () => fetchProfileData()
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'pitches' },
          () => fetchProfileData()
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'pitch_views' },
          () => {
            fetchProfileData();
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const calculateLevel = (views) => {
    return Math.floor(views / 50) + 1;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navLinks = [
    { name: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'My Pitches', icon: Folder, path: '/pitches' },
    { name: 'Messages', icon: MessageSquare, path: '/messages' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-t-4 border-b-4 border-indigo-600 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
               <Briefcase className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <p className="mt-4 text-slate-500 font-medium animate-pulse">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 animate-fade-in-up pb-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="px-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              {userRole === 'product_owner' ? 'Dashboard Overview' : 'Investor Portal'}
            </h1>
            {userRole === 'product_owner' && (
              <span className="px-3 py-1 bg-indigo-600 text-white text-[9px] md:text-[10px] font-black rounded-full shadow-lg shadow-indigo-600/30 animate-pulse uppercase tracking-widest">
                LEVEL {calculateLevel(metrics.views)}
              </span>
            )}
          </div>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium">
            {userRole === 'product_owner' ? 'Monitoring your startup growth and investor relations.' : 'Explore startups and manage your investment interests.'}
          </p>
        </div>
        {userRole === 'product_owner' && (
          <Link to="/create-pitch" className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 text-sm md:text-base">
            <PlusCircle className="w-5 h-5" />
            <span>Create New Pitch</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex justify-between items-start mb-2 md:mb-4">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-sm font-medium">
                {userRole === 'product_owner' ? 'Total Views' : 'Platform Video Views'}
              </p>
              <h3 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white mt-1">{metrics.views}</h3>
            </div>
            <div className="p-2 md:p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
              {userRole === 'product_owner' ? <Eye className="w-4 h-4 md:w-6 h-6" /> : <TrendingUp className="w-4 h-4 md:w-6 h-6" />}
            </div>
          </div>
          <p className="text-[10px] md:text-sm text-green-600 font-medium">{userRole === 'product_owner' ? '+15% from last month' : 'New startups every day'}</p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex justify-between items-start mb-2 md:mb-4">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-sm font-medium">
                {userRole === 'product_owner' ? 'Active Interests' : 'Interests Expressed'}
              </p>
              <h3 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white mt-1">{metrics.interests}</h3>
            </div>
            <div className="p-2 md:p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl">
              <Handshake className="w-4 h-4 md:w-6 h-6" />
            </div>
          </div>
          <p className="text-[10px] md:text-sm text-green-600 font-medium">{userRole === 'product_owner' ? `+${metrics.newInterests || 0} new this week` : 'Active follow-ups'}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 sm:col-span-2 md:col-span-1">
          <div className="flex justify-between items-start mb-2 md:mb-4">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-sm font-medium">
                {userRole === 'product_owner' ? 'Your Pitches' : 'Total Messages'}
              </p>
              <h3 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white mt-1">{metrics.pitches}</h3>
            </div>
            <div className="p-2 md:p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl">
              {userRole === 'product_owner' ? <Presentation className="w-4 h-4 md:w-6 h-6" /> : <MessageSquare className="w-4 h-4 md:w-6 h-6" />}
            </div>
          </div>
          <p className="text-[10px] md:text-sm text-slate-500">Active conversation hub</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="p-6 md:p-8 lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {userRole === 'product_owner' ? 'Growth Analytics' : 'Video Views Analysis'}
            </h3>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full">{userRole === 'product_owner' ? 'Last 7 Days' : 'Total Views'}</span>
          </div>
          <div className="h-80 w-full">
            {chartData && chartData.length > 0 ? (
              userRole === 'product_owner' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip 
                      cursor={{fill: 'rgba(99, 102, 241, 0.05)'}} 
                      contentStyle={{
                        borderRadius: '16px', 
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        backgroundColor: 'rgba(30, 41, 59, 0.8)', 
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                        padding: '12px'
                      }} 
                      itemStyle={{color: '#fff', fontWeight: 'bold'}}
                      labelStyle={{color: '#94a3b8'}}
                    />
                    <Bar dataKey="views" fill="url(#colorViews)" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="views" position="top" fill="#4f46e5" fontSize={11} fontWeight="bold" offset={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <defs>
                      <linearGradient id="colorInvestor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} allowDecimals={false} />
                    <Tooltip 
                      cursor={{fill: 'rgba(79, 70, 229, 0.05)'}} 
                      contentStyle={{
                        borderRadius: '16px', 
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        backgroundColor: 'rgba(30, 41, 59, 0.8)', 
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                        padding: '12px'
                      }} 
                      itemStyle={{color: '#fff', fontWeight: 'bold'}}
                      labelStyle={{color: '#94a3b8'}}
                      formatter={(value) => [`${value} Views`, 'Video Views']}
                    />
                    <Bar dataKey="views" fill="url(#colorInvestor)" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="views" position="top" fill="#4f46e5" fontSize={11} fontWeight="bold" offset={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            ) : (
              <div className="h-full flex items-center justify-center">
                 <p className="text-slate-400 italic text-sm">No analytics data available yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">
            {userRole === 'product_owner' ? 'Recent Activity' : 'Your History'}
          </h3>
          <div className="space-y-6">
            {recentActivity.length > 0 ? recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4">
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-900 dark:text-white font-medium">{activity.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{activity.desc}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-500 text-center py-10 italic">
                {userRole === 'product_owner' ? 'No recent activity yet.' : 'No interests expressed yet.'}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {myPitches.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
           <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                <Play className="w-5 h-5 text-indigo-600 fill-current" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Pitches
              </h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myPitches.map((pitch) => (
                 <Link to={`/pitches`} key={pitch.id} className="border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:shadow-lg transition-all block">
                    <h4 className="font-bold text-lg mb-2 text-slate-900 dark:text-white truncate" title={pitch.title}>{pitch.title}</h4>
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">{pitch.description}</p>
                     <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-slate-50 dark:border-slate-700/30">
                        <span className="text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 px-2 py-0.5 rounded-full truncate max-w-[100px]">{pitch.category || 'Startup'}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full flex items-center space-x-1">
                            <Eye className="w-3 h-3" />
                            <span>{pitch.views_count || 0}</span>
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                             ${pitch.funding_goal ? (pitch.funding_goal >= 1000000 ? (pitch.funding_goal/1000000).toFixed(1) + 'M' : pitch.funding_goal.toLocaleString()) : '0'}
                          </span>
                        </div>
                     </div>
                 </Link>
              ))}
           </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
