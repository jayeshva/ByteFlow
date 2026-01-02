
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw, MessageCircle } from 'lucide-react';

const SubscriptionCancel: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  const handleRetry = () => {
    // Go to dashboard where they can try upgrade again
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Cancel Card */}
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-gray-100/50 p-8 text-center">
          {/* Icon */}
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
              <XCircle className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-black text-gray-900 mb-2">
            Payment Cancelled
          </h1>
          
          {/* Subtitle */}
          <p className="text-gray-500 mb-6">
            Your payment was cancelled. No charges were made to your account.
          </p>

          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 mb-6">
            <p className="text-sm text-amber-800">
              <strong>Changed your mind?</strong> No worries! You can upgrade anytime from your dashboard.
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
            
            <button
              onClick={handleGoBack}
              className="w-full py-3 px-6 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mt-6 text-center">
          <p className="text-sm text-gray-500 mb-3">
            Having trouble with payment?
          </p>
          <a 
            href="mailto:support@instaflow.com"
            className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:underline"
          >
            <MessageCircle className="w-4 h-4" />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCancel;
