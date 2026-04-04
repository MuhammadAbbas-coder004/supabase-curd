import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, ShieldCheck, Rocket } from 'lucide-react';

const Home = () => {
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
