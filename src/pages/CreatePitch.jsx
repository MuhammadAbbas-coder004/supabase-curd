import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, CheckCircle, Loader2 } from 'lucide-react';

const CreatePitch = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    funding_goal: '',
    category: '',
    video_url: '',
    duration: ''
  });

  useEffect(() => {
    const detectDuration = async () => {
      if (!formData.video_url) return;

      // Vimeo
      if (formData.video_url.includes('vimeo.com')) {
        try {
          const response = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(formData.video_url)}`);
          const data = await response.json();
          if (data && data.duration) {
            const mins = Math.floor(data.duration / 60);
            const secs = (data.duration % 60).toString().padStart(2, '0');
            setFormData(prev => ({ ...prev, duration: `${mins}:${secs}` }));
          }
        } catch (err) {
          console.error("Vimeo detect error:", err);
        }
      } 
      // Direct
      else if (!formData.video_url.includes('youtube') && !formData.video_url.includes('youtu.be')) {
        const v = document.createElement('video');
        v.preload = "metadata";
        v.src = formData.video_url;
        v.onloadedmetadata = () => {
          const mins = Math.floor(v.duration / 60);
          const secs = Math.floor(v.duration % 60).toString().padStart(2, '0');
          setFormData(prev => ({ ...prev, duration: `${mins}:${secs}` }));
          v.remove();
        };
        v.onerror = () => v.remove();
      }
    };

    detectDuration();
  }, [formData.video_url]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('pitches')
        .insert([
          {
            owner_id: user.id,
            title: formData.title,
            description: formData.description,
            funding_goal: parseFloat(formData.funding_goal),
            category: formData.category,
            video_url: formData.video_url,
            duration: formData.duration
          }
        ]);

      if (error) throw error;
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      alert('Error creating pitch: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700/50 p-8 md:p-10">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Create a New Pitch</h1>
          <p className="text-slate-500 dark:text-slate-400">Provide the details of your startup to attract top-tier investors.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Pitch Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white transition-shadow"
                placeholder="e.g. NextGen AI Assistant"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
              <textarea
                required
                rows="4"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white transition-shadow resize-none"
                placeholder="Describe your product, market size, and vision..."
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Funding Goal (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.funding_goal}
                  onChange={(e) => setFormData({...formData, funding_goal: e.target.value})}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white transition-shadow"
                  placeholder="500000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white transition-shadow appearance-none"
              >
                <option value="">Select a category</option>
                <option value="SaaS">SaaS</option>
                <option value="Fintech">Fintech</option>
                <option value="Healthtech">Healthtech</option>
                <option value="Edtech">Edtech</option>
                <option value="E-commerce">E-commerce</option>
                <option value="Web3">Web3 / Crypto</option>
                <option value="AI">Artificial Intelligence</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Video Pitch Link</label>
              <div className="relative">
                <UploadCloud className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white transition-shadow"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">Optional: Add a YouTube or Vimeo link to your pitch deck.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Video Duration</label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white transition-shadow"
                placeholder="e.g. 5:20"
              />
              <p className="text-xs text-slate-500 mt-2">Format: MM:SS (e.g., 2:30)</p>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-xl font-bold text-lg transition-all hover:shadow-xl hover:shadow-indigo-600/30 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <span>Launch Pitch</span>
                  <CheckCircle className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePitch;
