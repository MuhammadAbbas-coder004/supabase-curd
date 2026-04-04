import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { PlusCircle, Eye, Handshake, Users, TrendingUp, Presentation } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [userRole, setUserRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ views: 0, interests: 0, pitches: 0 });
  const [myPitches, setMyPitches] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (userData) setUserRole(userData.role);
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (profileData) setProfile(profileData);

      // Mock fetching user specific data
      if (userData?.role === 'product_owner') {
        const { data: pitches } = await supabase
          .from('pitches')
          .select('*')
          .eq('owner_id', user.id);
          
        setMyPitches(pitches || []);
        
        // Calculate real total views
        const totalViews = (pitches || []).reduce((acc, p) => acc + (p.views_count || 0), 0);
        
        // Fetch real interests
        const pitchIds = (pitches || []).map(p => p.id);
        let interestCount = 0;
        let activities = [];

        if (pitchIds.length > 0) {
          const { data: interestData, count } = await supabase
            .from('interests')
            .select('*, profiles:investor_id(name)', { count: 'exact' })
            .in('pitch_id', pitchIds)
            .order('created_at', { ascending: false });
          
          interestCount = count || 0;
          activities = (interestData || []).slice(0, 3).map(item => ({
            id: item.id,
            type: 'interest',
            title: 'New investor interest',
            desc: `${item.profiles?.name || 'An investor'} showed interest in your pitch.`,
            time: item.created_at
          }));
        }

        setMetrics({
          views: totalViews,
          interests: interestCount,
          pitches: pitches?.length || 0,
        });
        setRecentActivity(activities);
      }
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // REAL-TIME SUBSCRIPTION
  useEffect(() => {
    let channel;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('dashboard-updates')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'pitches' },
          (payload) => {
            // Filter by owner_id in JS for better reliability
            if (payload.new.owner_id === user.id) {
              setMyPitches(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
              // Update metrics
              setMetrics(prev => ({
                ...prev,
                views: (prev.views - (payload.old.views_count || 0)) + (payload.new.views_count || 0)
              }));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'interests' },
          async (payload) => {
            // Check if it belongs to one of our pitches (a bit manual here as filter can only be simple)
            const { data: belongs } = await supabase
              .from('pitches')
              .select('id')
              .eq('id', payload.new.pitch_id)
              .eq('owner_id', user.id)
              .single();

            if (belongs) {
              setMetrics(prev => ({ ...prev, interests: prev.interests + 1 }));
              // Extract investor name for activity
              const { data: profile } = await supabase.from('profiles').select('name').eq('user_id', payload.new.investor_id).single();
              const newActivity = {
                id: payload.new.id,
                type: 'interest',
                title: 'New investor interest',
                desc: `${profile?.name || 'An investor'} showed interest in your pitch.`,
                time: payload.new.created_at
              };
              setRecentActivity(prev => [newActivity, ...prev].slice(0, 3));
            }
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
    return Math.floor(views / 50) + 1; // 1 Level for every 50 views
  };

  const chartData = myPitches.map(p => ({
    name: p.title.length > 8 ? p.title.substring(0, 8) + '...' : p.title,
    views: p.views_count || 0
  })).slice(0, 5); // Show top 5 pitches

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome back, {profile?.name || 'User'}!</h1>
            {userRole === 'product_owner' && (
              <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-lg shadow-indigo-600/20 animate-pulse">
                LEVEL {calculateLevel(metrics.views)}
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400">Here's what's happening with your account today.</p>
        </div>
        {userRole === 'product_owner' && (
          <Link to="/create-pitch" className="hidden sm:flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-medium transition-all shadow-lg shadow-indigo-600/30 hover:scale-105">
            <PlusCircle className="w-5 h-5" />
            <span>Create Pitch</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Views</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{metrics.views}</h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
              <Eye className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm text-green-600 font-medium">+15% from last month</p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Active Interests</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{metrics.interests}</h3>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl">
              <Handshake className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm text-green-600 font-medium">+5 new this week</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{userRole === 'product_owner' ? 'Your Pitches' : 'Investments'}</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{metrics.pitches}</h3>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl">
              {userRole === 'product_owner' ? <Presentation className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
            </div>
          </div>
          <p className="text-sm text-slate-500">Active on platform</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Performance Overview</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip cursor={{fill: 'rgba(99, 102, 241, 0.1)'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="views" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Recent Activity</h3>
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
              <p className="text-sm text-slate-500 text-center py-10 italic">No recent activity yet.</p>
            )}
          </div>
        </div>
      </div>
      
      {userRole === 'product_owner' && myPitches.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50">
           <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Your Pitches</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myPitches.map((pitch) => (
                 <div key={pitch.id} className="border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:shadow-lg transition-all">
                    <h4 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">{pitch.title}</h4>
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">{pitch.description}</p>
                    <div className="flex justify-between items-center">
                       <span className="text-sm font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 px-3 py-1 rounded-full">{pitch.category || 'Startup'}</span>
                       <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">${pitch.funding_goal?.toLocaleString()}</span>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
