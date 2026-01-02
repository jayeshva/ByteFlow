
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Instagram, Zap, ShieldCheck, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useDispatch, useSelector } from 'react-redux';
import { setUserProfile } from '../store/userSlice';
import { MetaApiService } from '../services/api';
import type { RootState } from '../store/store';

interface OnboardingScreenProps {
  onConnected?: (account?: { igUsername?: string }) => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onConnected }) => {
  const [step, setStep] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const syncCompleteRef = useRef(false);
  const user = useSelector((state: RootState) => state.user.profile);
  const dispatch = useDispatch();

  const fireConfetti = useCallback(() => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;
    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }
      const particleCount = 80 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  }, []);

  const handleSyncSuccess = useCallback(
    (account?: { igUsername?: string }) => {
      console.log("Sync succeeded with account:", account);
      syncCompleteRef.current = true;
      setIsSyncing(false);
      setStep(4);
      fireConfetti();
       localStorage.setItem('isIGConnected', 'true');
        const profileUpdate: { isIGConnected: boolean; username?: string } = {
          isIGConnected: true,
        };
        if (account?.igUsername) {
          profileUpdate.username = account.igUsername;
        }
        dispatch(setUserProfile(profileUpdate));
        onConnected?.(account);

      // window.setTimeout(() => {
       
      // }, 5000);
    },
    [dispatch, fireConfetti, onConnected]
  );

  useEffect(() => {
    console.log("Setting up message listener for auth popup...");
    const handleMessage = (event: MessageEvent) => {
      console.log("Received message event:", event);
      if (event.origin !== window.location.origin) return;
      const payload = event.data as { type?: string; payload?: any };
      if (payload?.type === 'meta:auth:syncing') {
        console.log("Syncing started...");
        setIsSyncing(true);
        setErrorMessage(null);
        return;
      }
      if (payload?.type === 'meta:auth:success') {
        console.log("Syncing succeeded with payload:", payload);
        handleSyncSuccess(payload.payload?.account);
        return;
      }
      if (payload?.type === 'meta:auth:error') {
        console.log("Syncing failed with payload:", payload);
        syncCompleteRef.current = true;
        setIsSyncing(false);
        setErrorMessage(payload.payload?.message || 'Instagram connection failed.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleSyncSuccess]);

  const getInstaConnectionUrl = async () => {
  setIsLoading(true);
  setErrorMessage(null);

  try {
    const loginURL = await MetaApiService.getInstagramLoginUrl();

    const popup = window.open(
      loginURL,
      'instagram-auth',
      'width=540,height=720,menubar=no,toolbar=no,status=no'
    );

    if (!popup) {
      // popup blocked → full redirect
      window.location.assign(loginURL);
      return;
    }

    // 🔑 USER FLOW CONTINUES → show syncing screen
    setIsSyncing(true);
    syncCompleteRef.current = false;

    const monitor = window.setInterval(() => {
      
      console.log("Monitoring popup window...");
      if (syncCompleteRef.current) {
        clearInterval(monitor);
        return;
      }

      if (popup.closed) {
        clearInterval(monitor);
        syncCompleteRef.current = true;
        setIsSyncing(false);
        setErrorMessage('Connection window closed before completing.');
      }
    }, 500);

  } catch (error) {
    console.error("Failed to get Instagram connection URL:", error);
    setErrorMessage('Unable to start Instagram connection.');
  } finally {
    // 🔑 Stop ONLY button loading, not syncing
    setIsLoading(false);
  }
};

  
  const handleConnect = () => {
    getInstaConnectionUrl();
  };

  if (isSyncing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-10 text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Synchronizing with Meta</h2>
          <p className="text-gray-500 text-sm font-medium">
            We are verifying your Instagram connection and syncing your account data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center mt-20 p-6">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Left Side: Steps */}
        <div className="space-y-12 py-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Final Configuration.</h1>
            <p className="text-gray-500 font-medium">Link your professional presence to activate the engine.</p>
          </div>

          <div className="space-y-8">
            <div className="flex items-start space-x-6">
              <div className="shrink-0 w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="font-black text-gray-900 tracking-tight">App Account Ready</h3>
                <p className="text-xs text-gray-400 font-medium leading-relaxed mt-1">Workspace created and secured.</p>
              </div>
            </div>

            <div className="flex items-start space-x-6">
              {step > 2 ? (
                <div className="shrink-0 w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
              ) : (
                <div className="shrink-0 w-10 h-10 rounded-2xl border-2 border-indigo-600 text-indigo-600 flex items-center justify-center animate-pulse">
                  <span className="font-black text-sm">2</span>
                </div>
              )}
              <div>
                <h3 className="font-black text-gray-900 tracking-tight">Link Instagram</h3>
                <p className="text-xs text-gray-400 font-medium leading-relaxed mt-1">Connect your professional account to unlock story, live, and DM automations.</p>
              </div>
            </div>

            <div className={`flex items-start space-x-6 ${step < 3 ? 'opacity-40' : ''} transition-opacity duration-500`}>
              <div className={`shrink-0 w-10 h-10 rounded-2xl border-2 flex items-center justify-center ${step === 3 ? 'border-indigo-600 text-indigo-600 animate-pulse' : 'border-gray-200 text-gray-400'}`}>
                <span className="font-black text-sm">3</span>
              </div>
              <div>
                <h3 className="font-black text-gray-900 tracking-tight">Setup Automations</h3>
                <p className="text-xs text-gray-400 font-medium leading-relaxed mt-1">Configure triggers and start going viral.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Meta Card */}
        <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-gray-100 flex flex-col items-center text-center self-start">
          <div className="w-24 h-24 rounded-[2.5rem] instagram-gradient flex items-center justify-center text-white mb-8 shadow-2xl shadow-pink-200">
            <Instagram size={48} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-4">Connect Instagram</h2>
          <p className="text-gray-400 font-medium mb-10 leading-relaxed text-sm">
            InstaFlow requires authorized access to your Professional Account to monitor community activity and send DMs.
          </p>

          <button 
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black py-6 rounded-[2rem] flex items-center justify-center space-x-4 shadow-2xl shadow-indigo-100 hover:scale-[1.03] active:scale-95 transition-all group"
          >
            <Zap size={24} className="group-hover:rotate-12 transition-transform" />
            <span className="uppercase tracking-widest text-sm">{isLoading ? 'Connecting...' : user.isIGConnected ? 'Connected' : 'Connect Now'}</span>
          </button>
          {errorMessage ? (
            <p className="mt-4 text-xs text-red-500 font-semibold">{errorMessage}</p>
          ) : null}

          <div className="mt-12 flex items-center space-x-3 text-green-600 bg-green-50 px-6 py-3 rounded-2xl border border-green-100">
            <ShieldCheck size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">Official Meta Partner Connection</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;
