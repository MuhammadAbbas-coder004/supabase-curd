import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Rocket, Loader2 } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || 'product_owner';

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: initialRole,
  });
  const [error, setError] = useState(null);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      // Create user record in 'users' table
      const { error: userError } = await supabase.from('users').insert([
        { id: authData.user.id, role: formData.role }
      ]);

      if (userError) {
         setError(userError.message);
         setLoading(false);
         return;
      }

      // Create profile record (Attempt with email, fallback if column missing)
      const { error: profileError } = await supabase.from('profiles').insert([
        { user_id: authData.user.id, name: formData.name, email: formData.email }
      ]);
      
      // Fallback if 'email' column doesn't exist
      if (profileError && profileError.message.includes('column "email" of relation "profiles" does not exist')) {
        const { error: fallbackError } = await supabase.from('profiles').insert([
          { user_id: authData.user.id, name: formData.name }
        ]);
        if (fallbackError) setError(fallbackError.message);
        else navigate('/dashboard');
      } else if (profileError) {
        setError(profileError.message);
      } else {
        navigate('/dashboard');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700/50 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-2xl mb-4">
            <Rocket className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Create an account</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-center">Join InvestHub and connect with the best.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/30">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'product_owner' })}
              className={`py-3 px-4 rounded-xl border font-medium transition-colors ${formData.role === 'product_owner' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              Product Owner
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'investor' })}
              className={`py-3 px-4 rounded-xl border font-medium transition-colors ${formData.role === 'investor' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              Investor
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:text-white transition-shadow"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:text-white transition-shadow"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:text-white transition-shadow"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-indigo-600/30 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Create Account</span>}
          </button>
        </form>

        <p className="mt-8 text-center text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
