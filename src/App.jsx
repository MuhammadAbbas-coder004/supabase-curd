import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Pitches from './pages/Pitches';
import CreatePitch from './pages/CreatePitch';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import InvestmentHistory from './pages/InvestmentHistory';
import ProtectedRoute from './components/ProtectedRoute';
import ProductOwnerLayout from './components/ProductOwnerLayout';

function AppContent() {
  const location = useLocation();
  const hideNavbar = ['/dashboard', '/create-pitch', '/messages', '/profile', '/history', '/pitches'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-sans selection:bg-indigo-500 selection:text-white">
      {!hideNavbar && <Navbar />}
      <main className={`${hideNavbar ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes with ProductOwnerLayout */}
          <Route element={<ProtectedRoute><ProductOwnerLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pitches" element={<Pitches />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/create-pitch" element={<CreatePitch />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/history" element={<InvestmentHistory />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
