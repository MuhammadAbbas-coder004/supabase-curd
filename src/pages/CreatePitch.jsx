import React, { useState, useEffect } from 'react';
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in again to create a pitch.");
      const user = session.user;

      const { data: existingPitch } = await supabase
        .from('pitches')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      const pitchData = {
        owner_id: user.id,
        title: formData.title,
        description: formData.description,
        funding_goal: parseFloat(formData.funding_goal),
        category: formData.category,
        video_url: formData.video_url
      };

      if (existingPitch) {
        const { error: updateError } = await supabase
          .from('pitches')
          .update({
            ...pitchData,
            created_at: new Date().toISOString()
          })
          .eq('id', existingPitch.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('pitches')
          .insert([pitchData]);

        if (insertError) throw insertError;
      }

      navigate('/dashboard');
    } catch (error) {
      console.error("Pitch Save Error:", error);
      alert('Error: ' + error.message);
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Video Pitch</label>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <UploadCloud className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white transition-shadow"
                    placeholder="https://youtube.com/... or upload"
                  />
                </div>
                <button
                  type="button"
                  className="relative px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold transition-all flex items-center justify-center space-x-2 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <UploadCloud className="w-5 h-5" />
                  <span>Upload Video</span>
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept="video/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      
                      try {
                        setLoading(true);
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${Math.random()}.${fileExt}`;
                        const filePath = `${fileName}`;

                        const { error: uploadError } = await supabase.storage
                          .from('pitches')
                          .upload(filePath, file);

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage
                          .from('pitches')
                          .getPublicUrl(filePath);

                        setFormData(prev => ({ ...prev, video_url: publicUrl }));
                        alert("Video uploaded successfully!");
                      } catch (error) {
                        console.error('Error uploading video:', error);
                        alert('Upload failed: ' + error.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                  />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">Upload your pitch video directly or paste a link from YouTube/Vimeo.</p>
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
