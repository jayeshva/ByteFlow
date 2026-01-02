
import React, { useEffect, useState } from 'react';
import { X, Check, Zap, Crown, Rocket, Loader2 } from 'lucide-react';
import { SubscriptionService, type Plan } from '../services/api';

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanName?: string;
}

const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({ 
  isOpen, 
  onClose,
  currentPlanName = 'FREE'
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await SubscriptionService.getPlans();
      setPlans(response.plans || []);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      setCheckoutLoading(planId);
      const response = await SubscriptionService.createCheckout(planId);
      if (response.paymentLink) {
        // Close modal first
        onClose();
        // Redirect to Dodo checkout in same window
        window.location.href = response.paymentLink;
      }
    } catch (error) {
      console.error('Failed to create checkout:', error);
      setCheckoutLoading(null);
    }
  };

  const getPlanIcon = (name: string) => {
    switch (name) {
      case 'FREE': return <Zap className="w-8 h-8" />;
      case 'PRO': return <Crown className="w-8 h-8" />;
      case 'ULTRA': return <Rocket className="w-8 h-8" />;
      default: return <Zap className="w-8 h-8" />;
    }
  };

  const getPlanGradient = (name: string) => {
    switch (name) {
      case 'FREE': return 'from-gray-500 to-gray-600';
      case 'PRO': return 'from-indigo-500 to-purple-600';
      case 'ULTRA': return 'from-amber-500 to-orange-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const formatPrice = (paise: number) => {
    if (paise === 0) return 'Free';
    return `₹${(paise / 100).toLocaleString()}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Choose Your Plan</h2>
            <p className="text-sm text-gray-500 mt-1">Scale your Instagram automation with the right plan</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isCurrentPlan = plan.name === currentPlanName;
                const isPro = plan.name === 'PRO';
                
                return (
                  <div 
                    key={plan.id}
                    className={`relative rounded-[1.5rem] border-2 transition-all duration-300 ${
                      isPro 
                        ? 'border-indigo-500 shadow-xl shadow-indigo-100 scale-105' 
                        : 'border-gray-100 hover:border-gray-200 hover:shadow-lg'
                    }`}
                  >
                    {/* Popular badge */}
                    {isPro && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-4 py-1 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="p-6">
                      {/* Plan icon & name */}
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getPlanGradient(plan.name)} flex items-center justify-center text-white mb-4`}>
                        {getPlanIcon(plan.name)}
                      </div>
                      
                      <h3 className="text-xl font-black text-gray-900">{plan.displayName || plan.name}</h3>
                      
                      {/* Price */}
                      <div className="mt-4 mb-6">
                        <span className="text-4xl font-black text-gray-900">{formatPrice(plan.priceMonthly)}</span>
                        {plan.priceMonthly > 0 && (
                          <span className="text-gray-500 font-medium">/month</span>
                        )}
                      </div>

                      {/* DM limit highlight */}
                      <div className="bg-gray-50 rounded-xl p-4 mb-6">
                        <p className="text-sm text-gray-500">Monthly DM Limit</p>
                        <p className="text-2xl font-black text-indigo-600">
                          {plan.name === 'ULTRA' ? 'Unlimited' : plan.dmLimitMonthly.toLocaleString() + ' DMs'} 
                        </p>
                      </div>

                      {/* Features */}
                      <ul className="space-y-3 mb-6">
                        {(plan.features as string[] || []).map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-600">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA Button */}
                      {isCurrentPlan ? (
                        <button 
                          disabled
                          className="w-full py-3 px-6 rounded-xl font-bold text-gray-400 bg-gray-100 cursor-not-allowed"
                        >
                          Current Plan
                        </button>
                      ) : plan.name === 'FREE' ? (
                        <button 
                          disabled
                          className="w-full py-3 px-6 rounded-xl font-bold text-gray-500 border-2 border-gray-200 cursor-not-allowed"
                        >
                          Included
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={checkoutLoading === plan.id}
                          className={`w-full py-3 px-6 rounded-xl font-bold text-white transition-all ${
                            isPro 
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:shadow-indigo-200' 
                              : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-amber-200'
                          } ${checkoutLoading === plan.id ? 'opacity-75' : ''}`}
                        >
                          {checkoutLoading === plan.id ? (
                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                          ) : (
                            `Upgrade to ${plan.displayName || plan.name}`
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <p className="text-center text-sm text-gray-500">
            All plans include 24/7 automation. Upgrade or downgrade anytime.
            <br />
            <span className="text-xs text-gray-400">Powered by Dodo Payments • Secure checkout</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlansModal;
