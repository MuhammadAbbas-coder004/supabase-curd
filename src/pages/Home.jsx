import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, ShieldCheck, Rocket, Play, User, DollarSign, Tag, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Home = () => {
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPitches();
  }, []);

  const fetchPitches = async () => {
    try {
      // 1. Fetch latest 3 pitches
      const { data: pitchesData, error: pitchesError } = await supabase
        .from('pitches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (pitchesError) throw pitchesError;

      if (pitchesData && pitchesData.length > 0) {
        // 2. Fetch profiles for these pitches
        const ownerIds = [...new Set(pitchesData.map(p => p.owner_id))];
        const { data: profilesData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, name')
          .in('user_id', ownerIds);

        if (!profileError && profilesData) {
          const profilesMap = profilesData.reduce((acc, profile) => {
            acc[profile.user_id] = profile;
            return acc;
          }, {});

          const enrichedPitches = pitchesData.map(pitch => ({
            ...pitch,
            profiles: profilesMap[pitch.owner_id] || null
          }));
          setPitches(enrichedPitches);
        } else {
          setPitches(pitchesData);
        }
      } else {
        setPitches([]);
      }
    } catch (error) {
      console.error("Error fetching featured pitches:", error);
      setPitches([]);
    } finally {
      setLoading(false);
    }
  };

  const getThumbnailUrl = (url) => {
    if (!url) return "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800";
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = url.match(ytRegex);
    if (ytMatch && ytMatch[1]) return `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
    return "https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&q=80&w=800";
  };

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-20 lg:py-32 flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-0 -z-10 w-full h-full bg-slate-50 dark:bg-slate-900">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-30 dark:opacity-20 blur-[100px] bg-gradient-to-b from-indigo-500 rounded-full mix-blend-multiply dark:mix-blend-screen pointer-events-none"></div>
        </div>
        
        <div className="inline-flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-full mb-8 font-medium text-sm animate-fade-in-up">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
          <span>The future of startup funding</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl text-slate-900 dark:text-white mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Where Visionaries Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Investors</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-2xl mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Building a full-stack start-up platform. Pitch your ideas, secure funding, and scale your business effortlessly.
        </p>
        
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <Link to="/register?role=product_owner" className="px-8 py-4 rounded-full bg-indigo-600 text-white font-semibold flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-all hover:scale-105 shadow-xl shadow-indigo-600/30">
            <span>Pitch a Product</span>
            <Rocket className="w-5 h-5" />
          </Link>
          <Link to="/register?role=investor" className="px-8 py-4 rounded-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold flex items-center justify-center space-x-2 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all hover:scale-105 shadow-xl shadow-slate-200/20 dark:shadow-none">
            <span>Invest in Startups</span>
            <TrendingUp className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Featured Pitches Section */}
      <section className="w-full py-20 px-4 md:px-0 max-w-6xl">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Featured Pitches</h2>
            <p className="text-slate-600 dark:text-slate-400">Discover the most promising startups and visionaries.</p>
          </div>
          <Link to="/pitches" className="hidden sm:flex items-center space-x-2 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
            <span>Browse all pitches</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {pitches.length > 0 ? pitches.map((pitch) => (
              <div key={pitch.id} className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-xl transition-all hover:-translate-y-1 group">
                <div className="relative h-48 bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <img 
                    src={getThumbnailUrl(pitch.video_url)} 
                    alt={pitch.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Link to="/pitches" className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/30 group-hover:scale-110 group-hover:bg-indigo-600/90 group-hover:border-indigo-400 transition-all duration-300">
                      <Play className="w-8 h-8 fill-current ml-1" />
                    </Link>
                  </div>
                  <div className="absolute top-4 left-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-indigo-600 px-3 py-1 rounded-full">
                      {pitch.category || 'Startup'}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors">{pitch.title}</h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mb-4">
                    <User className="w-3 h-3" />
                    <span>{pitch.profiles?.name || 'Anonymous Founder'}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2 mb-6 leading-relaxed">
                    {pitch.description}
                  </p>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-50 dark:border-slate-700">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Goal</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">${pitch.funding_goal?.toLocaleString()}</span>
                    </div>
                    <Link to="/pitches" className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-colors">
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-slate-500">No pitches found yet.</p>
                <Link to="/create-pitch" className="text-indigo-600 font-semibold mt-2 inline-block">Be the first to pitch!</Link>
              </div>
            )}
          </div>
        )}
        
        <div className="flex sm:hidden justify-center">
          <Link to="/pitches" className="flex items-center space-x-2 px-8 py-4 rounded-full bg-indigo-600 text-white font-semibold shadow-xl shadow-indigo-600/30">
            <span>Browse all pitches</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-20 px-4 md:px-0 max-w-6xl">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-xl transition-shadow group">
            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Rocket className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Seamless Pitching</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Upload your concepts, pitch decks, and goals. Connect instantly with a global network of proven investors.
            </p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-xl transition-shadow group">
            <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Smart Analytics</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Track investor interest, view count, and active engagements dynamically through our interactive dashboard.
            </p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-xl transition-shadow group">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Secure Platform</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Built on Supabase featuring strict enterprise-grade Row Level Security and transparent role-based access.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
