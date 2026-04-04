import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, PlayCircle, Loader2 } from 'lucide-react';

const Pitches = () => {
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPitches();
  }, []);

  const fetchPitches = async () => {
    try {
      const { data, error } = await supabase
        .from('pitches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPitches(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPitches = pitches.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="animate-fade-in-up">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">Discover Next-Gen Startups</h1>
        <p className="text-lg text-slate-500 dark:text-slate-400">Explore groundbreaking ideas, watch pitch decks, and find your next big investment opportunity.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-10 w-full lg:w-2/3 mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by title or category..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-full border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-white shadow-sm transition-all"
          />
        </div>
        <button className="flex items-center justify-center space-x-2 px-8 py-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white font-medium hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all">
          <Filter className="w-5 h-5" />
          <span>Filters</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
           <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPitches.length > 0 ? filteredPitches.map((pitch) => (
            <div key={pitch.id} className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-xl transition-all hover:-translate-y-1 group">
              <div className="relative h-48 bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                {pitch.video_url ? (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/40 transition-colors cursor-pointer">
                    <PlayCircle className="w-16 h-16 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                  </div>
                ) : (
                  <div className="text-slate-400 dark:text-slate-500 font-medium">No Video</div>
                )}
                {/* Fallback pattern */}
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]"></div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                    {pitch.category || 'Technology'}
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                    ${pitch.funding_goal ? pitch.funding_goal.toLocaleString() : 'N/A'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{pitch.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 mb-6 relative">
                  {pitch.description}
                </p>
                <button className="w-full py-3 rounded-xl bg-slate-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                  View Pitch Details
                </button>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 border-dashed">
              <p className="text-slate-500 text-lg">No pitches found. Be the first to create one!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Pitches;
