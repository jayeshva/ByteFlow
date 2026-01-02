
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

const SubscriptionSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);

  const planName = searchParams.get('plan') || 'Pro';

  useEffect(() => {
    // Give some time for webhook to process
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      navigate('/dashboard');
    }
  }, [loading, countdown, navigate]);

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success Card */}
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-indigo-100/50 p-8 text-center">
          {/* Animated Success Icon */}
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-25"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-black text-gray-900 mb-2">
            Payment Successful! 🎉
          </h1>
          
          {/* Subtitle */}
          <p className="text-gray-500 mb-6">
            Welcome to <span className="font-bold text-indigo-600">{planName}</span>! Your subscription is now active.
          </p>

          {/* Benefits Box */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span className="font-bold text-indigo-900">Your New Benefits</span>
            </div>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✓ Increased monthly DM limit</li>
              <li>✓ Priority automation processing</li>
              <li>✓ Advanced analytics dashboard</li>
            </ul>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Activating your subscription...</span>
            </div>
          ) : (
            <>
              {/* CTA Button */}
              <button
                onClick={handleGoToDashboard}
                className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* Auto-redirect notice */}
              <p className="text-xs text-gray-400 mt-4">
                Redirecting automatically in {countdown}s...
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Need help? Contact support@instaflow.com
        </p>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
