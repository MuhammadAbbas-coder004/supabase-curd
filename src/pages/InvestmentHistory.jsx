import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Handshake, Calendar, DollarSign, Tag, Search, Loader2, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const InvestmentHistory = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('interests')
        .select('*, pitches(title, category, funding_goal, description, owner_id)')
        .eq('investor_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => 
    item.pitches?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.pitches?.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up pb-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Investment History</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">A transparent record of all startup pitches you've shown interest in.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search history..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
            />
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <span className="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">{filteredHistory.length} Total Interests</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Startup Pitch</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Goal</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date Expressed</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredHistory.length > 0 ? filteredHistory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                  <td className="px-6 py-6">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 mr-4">
                        <Handshake className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{item.pitches?.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-1 max-w-xs">{item.pitches?.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {item.pitches?.category || 'Tech'}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center text-sm font-semibold text-slate-900 dark:text-white">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                      <span>{item.pitches?.funding_goal?.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 mr-2" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <Link 
                      to={`/messages?user=${item.pitches?.owner_id}`}
                      className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      <span>Open Chat</span>
                      <ArrowUpRight className="w-3 h-3 ml-1" />
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center text-slate-500 italic">
                    You haven't shown interest in any pitches yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvestmentHistory;
