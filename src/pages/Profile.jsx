import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User, Mail, Shield, Save, Loader2, Camera, X, Check } from 'lucide-react';
import Cropper from 'react-easy-crop';

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: '',
    bio: '',
    business_details: '',
    avatar_url: ''
  });

  // Cropper State
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      setProfile({
        name: profileData?.name || session.user.user_metadata?.full_name || session.user.email.split('@')[0],
        email: session.user.email || '',
        role: userData?.role || '',
        bio: profileData?.bio || '',
        business_details: profileData?.business_details || profileData?.investment_interests || '',
        avatar_url: session.user.user_metadata?.avatar_url || profileData?.avatar_url || ''
      });
    } catch (error) {
      console.error('Profile fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 200;
    canvas.height = 200;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      200,
      200
    );

    return canvas.toDataURL('image/jpeg');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImage(reader.result);
        setShowCropper(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCropSave = async () => {
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      setProfile(prev => ({ ...prev, avatar_url: croppedImage }));
      setShowCropper(false);
      setImage(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Update Auth Metadata (For Photo & Name)
      await supabase.auth.updateUser({
        data: { 
          avatar_url: profile.avatar_url,
          full_name: profile.name
        }
      });

      // 2. Update Profiles Table
      const profileData = {
        user_id: session.user.id,
        name: profile.name,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        business_details: profile.business_details,
        investment_interests: profile.role === 'investor' ? profile.business_details : null
      };

      await supabase.from('profiles').upsert(profileData, { onConflict: 'user_id' });
      await supabase.from('users').update({ avatar_url: profile.avatar_url }).eq('id', session.user.id);

      window.dispatchEvent(new Event('profileUpdated'));
      await getProfile();
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      {/* Professional Cropper Modal */}
      {showCropper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Crop Profile Picture</h3>
              <button onClick={() => setShowCropper(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            
            <div className="relative h-96 w-full bg-slate-900">
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium text-slate-600 dark:text-slate-400">
                  <span>Zoom</span>
                  <span>{zoom.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setShowCropper(false)}
                  className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropSave}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2"
                >
                  <Check className="w-5 h-5" />
                  <span>Set Picture</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Your Profile</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account settings and personal information.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col items-center text-center">
          <div className="relative group">
            <div className="h-32 w-32 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-xl shadow-indigo-600/20 mb-6">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile.name?.charAt(0) || 'U'
              )}
            </div>
            <label className="absolute bottom-6 right-0 p-2 bg-white dark:bg-slate-700 rounded-full shadow-lg border border-slate-100 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 hover:scale-110 transition-transform cursor-pointer z-30">
              <Camera className="w-5 h-5" />
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white truncate w-full px-4">{profile.name}</h2>
          <div className="mt-2 px-4 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-black rounded-full uppercase tracking-widest">
            {profile.role.replace('_', ' ')}
          </div>
          <p className="text-sm text-slate-500 mt-4 px-6">{profile.bio || 'Add a bio to tell others about yourself.'}</p>
          
          <div className="w-full pt-8 mt-8 border-t border-slate-100 dark:border-slate-700/50 space-y-4">
             <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
               <Mail className="w-4 h-4 mr-3 text-indigo-500" />
               <span className="truncate">{profile.email}</span>
             </div>
             <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
               <Shield className="w-4 h-4 mr-3 text-indigo-500" />
               <span>Verified Account</span>
             </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700/50">
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
                <div className="relative opacity-60">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="email" 
                    disabled
                    value={profile.email}
                    className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none dark:text-white cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                  {profile.role === 'investor' ? 'Investment Interests / Focus' : 'Company / Organization'}
                </label>
                <input 
                  type="text" 
                  value={profile.business_details}
                  onChange={(e) => setProfile({...profile, business_details: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                  placeholder={profile.role === 'investor' ? "e.g. Fintech, AI, Sustainable Energy" : "e.g. Capital Ventures Ltd"}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Professional Bio</label>
                <textarea 
                  rows="4"
                  value={profile.bio}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white resize-none"
                  placeholder="Tell us about your experience and what you're looking for..."
                ></textarea>
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={saving}
                className="w-full md:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
