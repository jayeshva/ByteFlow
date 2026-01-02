import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { MetaApiService } from '../services/api';
import { setUserProfile } from '../store/userSlice';

type CallbackStatus = 'syncing' | 'success' | 'error';

type AccountPayload = {
  igUsername?: string;
};

const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<CallbackStatus>('syncing');
  const [message, setMessage] = useState('Connecting to Meta...');
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state') || '';
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    const notifyOpener = (type: string, payload?: Record<string, unknown>) => {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type, payload }, window.location.origin);
      }
    };

    if (error || !code) {
      const errorMessage =
        errorDescription || 'Instagram authorization failed. Please try again.';
      setStatus('error');
      setMessage(errorMessage);
      notifyOpener('meta:auth:error', { message: errorMessage });
      return;
    }

    notifyOpener('meta:auth:syncing');

    MetaApiService.completeAuth(code, state, { popup: true })
      .then((data: { account?: AccountPayload } | undefined) => {
        setStatus('success');
        setMessage('Instagram connected. You can close this window.');
        notifyOpener('meta:auth:success', { account: data?.account });

        if (!window.opener || window.opener.closed) {
          localStorage.setItem('isIGConnected', 'true');
          const profileUpdate: { isIGConnected: boolean; username?: string } = {
            isIGConnected: true,
          };
          if (data?.account?.igUsername) {
            profileUpdate.username = data.account.igUsername;
          }
          dispatch(setUserProfile(profileUpdate));
          window.setTimeout(() => navigate('/dashboard', { replace: true }), 3000);
        } else {
          window.setTimeout(() => window.close(), 3000);
        }
      })
      .catch((err: { message?: string }) => {
        const errorMessage = err?.message || 'Instagram connection failed.';
        setStatus('error');
        setMessage(errorMessage);
        notifyOpener('meta:auth:error', { message: errorMessage });
      });
  }, [dispatch, navigate]);

  return (
    <div className="h-screen flex items-center justify-center instagram-gradient text-white p-6">
      <div className="text-center space-y-4 max-w-md">
        {status === 'syncing' ? (
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
        ) : null}
        <p className="font-black uppercase tracking-widest text-sm">{message}</p>
        {status === 'error' ? (
          <p className="text-xs text-white/80 font-medium">
            You can close this tab and try connecting again.
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default AuthCallback;
