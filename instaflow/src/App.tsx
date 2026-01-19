import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { LoginScreen,AuthCallback } from './components/auth';
import { Dashboard } from './components/dashboard';
import { SubscriptionSuccess, SubscriptionCancel } from './components/subscription';
import { LandingPage } from './pages/Landing';
import { ToastContainer } from './components/ui/Toast';

import useMetaProfile from './hooks/useMetaProfile';

export type TabType = 'posts' | 'automations' | 'analytics' | 'settings' | 'onboarding';

const App: React.FC = () => {
  const { user } = useMetaProfile();

  return (
    <>
      {/* Global Toast Container */}
      <ToastContainer />

      <Routes>
        {/* Landing Page - Public */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth Routes */}
        <Route 
          path="/login" 
          element={user.isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginScreen />} 
        />
        <Route path="/auth-callback" element={<AuthCallback />} />

        {/* Protected Dashboard */}
        <Route
          path="/dashboard"
          element={user.isLoggedIn ? <Dashboard /> : <Navigate to="/login" replace />}
        />

        {/* Subscription pages */}
        <Route path="/subscription/success" element={<SubscriptionSuccess />} />
        <Route path="/subscription/cancel" element={<SubscriptionCancel />} />

        {/* Catch all - redirect to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
