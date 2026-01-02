
import React, { useEffect } from 'react';
import { Routes, Route, Navigate} from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from './store/store';

import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import AuthCallback from './components/AuthCallback';
import SubscriptionSuccess from './components/SubscriptionSuccess';
import SubscriptionCancel from './components/SubscriptionCancel';
import { MetaApiService } from './services/api';
import useMetaProfile from './hooks/useMetaProfile';

export type TabType = 'posts' | 'automations' | 'analytics' | 'settings' | 'onboarding';

const App: React.FC = () => {
  const { user } = useMetaProfile();
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate to={user.isLoggedIn ? '/dashboard' : '/login'} replace />
        }
      />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/auth-callback" element={<AuthCallback />} />
      <Route
        path="/dashboard"
        element={user.isLoggedIn ? <Dashboard /> : <Navigate to="/login" replace />}
      />
      {/* Subscription pages */}
      <Route path="/subscription/success" element={<SubscriptionSuccess />} />
      <Route path="/subscription/cancel" element={<SubscriptionCancel />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
