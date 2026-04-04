import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session && allowedRoles.length > 0) {
        // Fetch user role if route requires specific roles
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (userData) setUserRole(userData.role);
      }
      setLoading(false);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession && allowedRoles.length > 0) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', newSession.user.id)
          .single();
        if (userData) setUserRole(userData.role);
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [allowedRoles]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Not logged in
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Logged in, but route restricted by roles
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Redirect to a general dashboard or unauthorized page
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
