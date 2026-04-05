import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Play, Loader2, X, Globe, DollarSign, Tag, Calendar, User, Trash2, Handshake } from 'lucide-react';

const Pitches = () => {
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPitch, setSelectedPitch] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [detectedDurations, setDetectedDurations] = useState({});
  const [editingDurationId, setEditingDurationId] = useState(null);
  const [tempDuration, setTempDuration] = useState('');
  const [interestMessage, setInterestMessage] = useState('');
  const [isSubmittingInterest, setIsSubmittingInterest] = useState(false);
  const videoRef = React.useRef(null);

  useEffect(() => {
    fetchPitches();
    getCurrentUser();
    
    // BACKUP POLLING: Every 30 seconds, manually refresh data 
    // in case Supabase Realtime is disabled or failing.
    const pollInterval = setInterval(() => {
      console.log("Pitches: Polling for fresh data...");
      fetchPitches();
    }, 30000);

    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    if (pitches.length > 0) {
      pitches.forEach(pitch => {
        if (pitch.video_url && !pitch.duration && !detectedDurations[pitch.id]) {
          detectDuration(pitch.id, pitch.video_url);
        }
      });
    }
  }, [pitches]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (userData) setUserRole(userData.role);
    }
  };

  const handleInterest = async () => {
    if (!interestMessage.trim()) return;
    setIsSubmittingInterest(true);
    try {
      const { error } = await supabase.from('interests').insert([
        { 
          pitch_id: selectedPitch.id, 
          investor_id: currentUserId,
          message: interestMessage 
        }
      ]);
      if (error) throw error;
      alert("Interest sent successfully! The founder will be notified.");
      setInterestMessage('');
    } catch (err) {
      console.error("Interest error:", err);
      alert("Error sending interest: " + err.message);
    } finally {
      setIsSubmittingInterest(false);
    }
  };

  const incrementViewCount = async (pitchId) => {
    try {
      const pitch = pitches.find(p => p.id === pitchId);
      if (!pitch) return;
      const newCount = (pitch.views_count || 0) + 1;
      
      console.log("Pitches: Incrementing views locally for pitch", pitchId);
      setPitches(prev => prev.map(p => p.id === pitchId ? { ...p, views_count: newCount } : p));
      
      const { error: rpcError } = await supabase.rpc('increment_pitch_views', { target_pitch_id: pitchId });
      
      if (rpcError) {
          console.warn("Pitches: RPC failed, trying Direct Update fallback:", rpcError.message);
          const { error: updateError } = await supabase.from('pitches').update({ views_count: newCount }).eq('id', pitchId);
          if (updateError) console.warn("Pitches: Direct update also failed (expected if not owner).", updateError.message);
      }
      
      console.log("Pitches: Logging view in pitch_views table...");
      const { error: insertError } = await supabase.from('pitch_views').insert([{ 
        pitch_id: pitchId, 
        viewer_id: currentUserId || null 
      }]);
      
      if (insertError) {
        console.error("Pitches: Failed to insert into pitch_views!", insertError.message);
      } else {
        console.log("Pitches: Successfully logged view in pitch_views.");
      }
    } catch (err) {
      console.error("View increment error:", err);
    }
  };

  const handleDelete = async (pitchId) => {
    if (!window.confirm('Are you sure you want to delete this pitch? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('pitches')
        .delete()
        .eq('id', pitchId);

      if (error) throw error;
      
      // Optimistic update
      setPitches(pitches.filter(p => p.id !== pitchId));
      alert('Pitch deleted successfully!');
    } catch (error) {
      console.error('Error deleting pitch:', error);
      alert('Error deleting pitch: ' + error.message);
    }
  };

  const saveDuration = async (pitchId) => {
    try {
      const { error } = await supabase
        .from('pitches')
        .update({ duration: tempDuration })
        .eq('id', pitchId);

      if (error) throw error;
      
      // Update local state
      setPitches(pitches.map(p => p.id === pitchId ? { ...p, duration: tempDuration } : p));
      setEditingDurationId(null);
      setTempDuration('');
    } catch (error) {
      console.error('Error saving duration:', error);
      alert('Error updating duration: ' + error.message);
    }
  };

  const fetchPitches = async () => {
    try {
      const { data, error } = await supabase
        .from('pitches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const ownerIds = [...new Set(data.map(p => p.owner_id))];
        const { data: profilesData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .in('user_id', ownerIds);

        if (!profileError && profilesData) {
          const profilesMap = profilesData.reduce((acc, profile) => {
            acc[profile.user_id] = profile;
            return acc;
          }, {});

          const enrichedPitches = data.map(pitch => ({
            ...pitch,
            profiles: profilesMap[pitch.owner_id] || null
          }));
          setPitches(enrichedPitches);
        } else {
          setPitches(data);
        }
      } else {
        setPitches([]);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setPitches([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPitches = pitches.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getEmbedUrl = (url) => {
    if (!url) return "";
    
    // YouTube
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = url.match(ytRegex);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&mute=0&controls=1&rel=0&modestbranding=1`;
    }

    // Vimeo
    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=0&muted=0`;
    }

    return url; // Direct link
  };

  const getThumbnailUrl = (url) => {
    if (!url) return "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800";
    
    // YouTube
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = url.match(ytRegex);
    if (ytMatch && ytMatch[1]) {
      return `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
    }

    // Vimeo
    const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[1]) {
      // Note: Full vimeo thumbnail usually needs an API call, but this is a placeholder
      return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
    }

    return "https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&q=80&w=800"; // General business/tech image
  };

  const detectDuration = async (id, url) => {
    if (!url) return;
    if (detectedDurations[id]) return;

    // Vimeo oEmbed (Provides real duration)
    if (url.includes('vimeo.com')) {
      try {
        const response = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        if (data && data.duration) {
          const mins = Math.floor(data.duration / 60);
          const secs = (data.duration % 60).toString().padStart(2, '0');
          setDetectedDurations(prev => ({ ...prev, [id]: `${mins}:${secs}` }));
          return;
        }
      } catch (err) {
        console.error("Vimeo oEmbed error:", err);
      }
    }

    // Direct Video Files (MP4, etc)
    if (!url.includes('youtube.com') && !url.includes('youtu.be') && !url.includes('vimeo.com')) {
        const v = document.createElement('video');
        v.preload = "metadata";
        v.src = url;
        v.onloadedmetadata = () => {
          const mins = Math.floor(v.duration / 60);
          const secs = Math.floor(v.duration % 60).toString().padStart(2, '0');
          setDetectedDurations(prev => ({ ...prev, [id]: `${mins}:${secs}` }));
          v.remove();
        };
        v.onerror = () => v.remove();
    }
  };

  const formatDuration = (pitch) => {
    if (pitch.duration) return pitch.duration;
    if (detectedDurations[pitch.id]) return detectedDurations[pitch.id];
    
    // Fallback pseudo-random duration based on ID for YouTube
    const idNum = pitch.id.split('-').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const mins = (idNum % 8) + 1; // 1 to 8 mins
    const secs = (idNum % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

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
                <img 
                  src={getThumbnailUrl(pitch.video_url)} 
                  alt={pitch.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors"></div>
                
                {pitch.video_url ? (
                  <div 
                    className="absolute inset-0 flex items-center justify-center cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPitch(pitch);
                      setShowVideo(true);
                      incrementViewCount(pitch.id);
                    }}
                  >
                    <div className="group/btn relative w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/20 shadow-[0_0_30px_rgba(79,70,229,0.3)] group-hover:scale-110 group-hover:bg-indigo-600/90 group-hover:border-indigo-400 group-hover:shadow-[0_0_50px_rgba(79,70,229,0.6)] transition-all duration-500 overflow-hidden">
                      {/* Ripple effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                      <div className="absolute inset-0 animate-ping-slow rounded-full bg-white/10"></div>
                      
                      <div className="pl-1">
                        <Play className="w-10 h-10 fill-current drop-shadow-[0_0_10px_rgba(0,0,0,0.3)]" />
                      </div>
                      
                      {/* Inner Shine */}
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute z-10 text-white font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">No Video</div>
                )}
                
                {/* Views indicator */}
                {pitch.video_url && (
                  <div className="absolute bottom-3 left-3 bg-black/60 text-white text-[10px] font-medium px-2 py-1 rounded backdrop-blur-sm">
                    {pitch.views_count || 0} views
                  </div>
                )}
                
                {/* Duration indicator */}
                {pitch.video_url && (
                  <div className="absolute bottom-3 right-3 flex items-center space-x-1">
                    {editingDurationId === pitch.id ? (
                      <div className="flex items-center bg-black/90 p-1 rounded border border-indigo-500 animate-zoom-in">
                        <input 
                          type="text" 
                          autoFocus
                          value={tempDuration}
                          onChange={(e) => setTempDuration(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveDuration(pitch.id)}
                          onBlur={() => setEditingDurationId(null)}
                          className="bg-transparent text-white text-[10px] w-10 outline-none text-center"
                          placeholder="0:00"
                        />
                      </div>
                    ) : (
                      <div 
                        onClick={(e) => {
                          if (currentUserId === pitch.owner_id) {
                            e.stopPropagation();
                            setEditingDurationId(pitch.id);
                            setTempDuration(formatDuration(pitch));
                          }
                        }}
                        className={`bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center space-x-1 ${currentUserId === pitch.owner_id ? 'cursor-edit hover:bg-black group/time' : ''}`}
                      >
                         <span>{formatDuration(pitch)}</span>
                         {currentUserId === pitch.owner_id && (
                           <X className="w-2.5 h-2.5 ml-1 hidden group-hover/time:block opacity-60 hover:opacity-100" onClick={(e) => {
                             e.stopPropagation();
                             setEditingDurationId(null);
                           }}/>
                         )}
                      </div>
                    )}
                  </div>
                )}
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
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{pitch.title}</h3>
                  {currentUserId === pitch.owner_id && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(pitch.id);
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete Pitch"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400 mb-4">
                  <User className="w-3 h-3" />
                  <span>By {pitch.profiles?.name || 'Anonymous Founder'}</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 mb-6 relative">
                  {pitch.description}
                </p>
                <button 
                  onClick={() => {
                    setSelectedPitch(pitch);
                    setShowDetails(true);
                  }}
                  className="w-full py-3 rounded-xl bg-slate-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                >
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
      {/* Video Modal */}
      {showVideo && selectedPitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl">
            <button 
              onClick={() => {
                setShowVideo(false);
              }}
              className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            {getEmbedUrl(selectedPitch.video_url).includes('embed') ? (
              <iframe
                src={getEmbedUrl(selectedPitch.video_url)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            ) : (
              <video 
                ref={videoRef}
                src={selectedPitch.video_url} 
                controls 
                playsInline
                className="w-full h-full"
              ></video>
            )}
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedPitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="relative h-48 bg-indigo-600 flex items-center justify-end p-6 overflow-hidden">
               {/* Decorative Circles */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
              
              <button 
                onClick={() => {
                  setShowDetails(false);
                  setSelectedPitch(null);
                }}
                className="relative z-10 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="absolute inset-0 flex items-center justify-start p-10">
                <h2 className="text-3xl font-bold text-white max-w-md">{selectedPitch.title}</h2>
              </div>
            </div>

            <div className="p-8 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-400">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                    <Tag className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold opacity-60">Category</p>
                    <p className="font-medium text-slate-900 dark:text-white">{selectedPitch.category || 'Tech'}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-400">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold opacity-60">Funding Goal</p>
                    <p className="font-medium text-slate-900 dark:text-white">${selectedPitch.funding_goal?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-400">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold opacity-60">Posted On</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {new Date(selectedPitch.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-400">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                    <User className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold opacity-60">Founder</p>
                    <p className="font-medium text-slate-900 dark:text-white truncate max-w-[120px]">
                      {selectedPitch.profiles?.name || 'Anonymous'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Founder Details</h4>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{selectedPitch.profiles?.name}</p>
                    <p className="text-xs text-slate-500">{selectedPitch.profiles?.email}</p>
                  </div>
                  <a 
                    href={`mailto:${selectedPitch.profiles?.email}?subject=Investment Interest: ${selectedPitch.title}`}
                    className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 transition-colors"
                  >
                    Send Email
                  </a>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">About the Startup</h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {selectedPitch.description}
                </p>
              </div>

              {/* Interest Form for Investors */}
              {userRole === 'investor' && currentUserId !== selectedPitch.owner_id && (
                <div className="mt-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800/50">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Interested in Investing?</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Send a message to the founder to start a conversation.</p>
                  <textarea 
                    value={interestMessage}
                    onChange={(e) => setInterestMessage(e.target.value)}
                    placeholder="Tell the founder why you're interested..."
                    className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all text-sm mb-4"
                    rows="3"
                  ></textarea>
                  <button 
                    onClick={handleInterest}
                    disabled={isSubmittingInterest || !interestMessage.trim()}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:hover:scale-100 transition-all active:scale-95 flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20"
                  >
                    {isSubmittingInterest ? <Loader2 className="w-5 h-5 animate-spin" /> : <Handshake className="w-5 h-5" />}
                    <span>Submit Interest</span>
                  </button>
                </div>
              )}

              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700/50 flex space-x-4">
                <button 
                  onClick={() => {
                    setShowDetails(false);
                    incrementViewCount(selectedPitch.id);
                    setTimeout(() => setShowVideo(true), 100);
                  }}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 hover:scale-[1.02] transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Watch Pitch</span>
                </button>
                <a 
                  href={`mailto:${selectedPitch.profiles?.email}?subject=Investment Interest: ${selectedPitch.title}`}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-center"
                >
                  Contact Founder
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pitches;
