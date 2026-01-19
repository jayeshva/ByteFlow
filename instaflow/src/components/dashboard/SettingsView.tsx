
import React, { useState } from 'react';
import type { UserProfile } from '../../types';
import { Shield, Bell, Instagram, Smartphone, CreditCard, ChevronRight, Check, Crown, Loader2 } from 'lucide-react';
import { formatDate, formatNumber } from '../../lib/utils';

import { SubscriptionPlansModal } from '../subscription';

import { useCurrentSubscription } from '../../hooks';


interface SettingsViewProps {
  user: UserProfile;
}

const SettingsView: React.FC<SettingsViewProps> = ({ user }) => {
  const { data: subscriptionData, isLoading: loading } = useCurrentSubscription();

  const [showPlansModal, setShowPlansModal] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageSubscription = async () => {
    // We still need SubscriptionService for the portal link if not in hooks
    const { SubscriptionService } = await import('../../services/api');

    try {
      setPortalLoading(true);
      const { portalLink } = await SubscriptionService.getPortalLink();
      if (portalLink) {
        window.open(portalLink, '_blank');
      }
    } catch (error) {
      console.error('Failed to get portal link:', error);
      // If no portal available, open plans modal instead
      setShowPlansModal(true);
    } finally {
      setPortalLoading(false);
    }
  };

  const formatPrice = (paise: number) => {
    if (paise === 0) return 'Free';
    return `₹${(paise / 100).toLocaleString()}/mo`;
  };

  // Using centralized formatDate and formatNumber from src/lib/utils.ts


  const SettingItem = ({ icon: Icon, label, desc, action, onClick }: any) => (
    <div 
      className={`flex items-center justify-between p-6 hover:bg-gray-50 rounded-[1.5rem] transition-all ${onClick ? 'cursor-pointer' : ''} group`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-5">
        <div className="p-3 bg-white border border-gray-100 rounded-2xl group-hover:shadow-md transition-shadow">
          <Icon size={20} className="text-indigo-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900">{label}</h4>
          <p className="text-xs text-gray-400 font-medium">{desc}</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        {action && <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">{action}</span>}
        <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
      </div>
    </div>
  );

  const plan = subscriptionData?.plan;
  const subscription = subscriptionData?.subscription;
  const usage = subscriptionData?.usage;

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Account & Profile</h1>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Manage your creator presence and app preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm text-center">
            <div className="relative inline-block mb-6">
              <img src={user.profilePictureUrl} alt="" className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-white shadow-xl" />
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center border-4 border-white">
                <Check size={20} />
              </div>
            </div>
            <h2 className="text-xl font-black text-gray-900">{user.igName}</h2>
            <p className="text-indigo-600 text-sm font-bold mb-6">@{user.username}</p>
            
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-50">
              <div>
                <p className="text-lg font-black text-gray-900">{formatNumber(user.followersCount ?? 0)}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Followers</p>
              </div>
              <div>
                <p className="text-lg font-black text-gray-900">{formatNumber(user.followingCount ?? 0)}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Following</p>
              </div>

            </div>
          </div>
        </div>

        {/* Settings List */}
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white p-4 rounded-[3rem] border border-gray-100 shadow-sm">
            <h3 className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Application Settings</h3>
            <div className="space-y-1">
              <SettingItem icon={Instagram} label="Connected Account" desc={` ${user.igName} @${user.username}`} action="Verified" />
              <SettingItem icon={Shield} label="Security & API" desc="Manage your Instagram API credentials and tokens" />
              <SettingItem icon={Bell} label="Notification Center" desc="Browser and mobile alerts for automation triggers" />
              <SettingItem icon={Smartphone} label="Devices" desc="Manage where your InstaFlow account is logged in" />
            </div>
          </div>

          {/* Subscription Card */}
          <div className="bg-white p-4 rounded-[3rem] border border-gray-100 shadow-sm">
            <h3 className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Subscription & Billing</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="space-y-1">
                {/* Current Plan Display */}
                <div className="p-6 rounded-[1.5rem]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-5">
                      <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl">
                        <Crown size={20} className="text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">
                          {plan?.displayName || plan?.name || 'Free'} Plan
                        </h4>
                        <p className="text-xs text-gray-400 font-medium">
                          {subscription?.status === 'active' && subscription.currentPeriodEnd
                            ? `Renews on ${formatDate(subscription.currentPeriodEnd)}`
                            : 'No active subscription'}
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-black text-indigo-600">
                      {formatPrice(plan?.priceMonthly || 0)}
                    </span>
                  </div>

                  {/* Usage Stats */}
                  {usage && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                      <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span>DM Usage This Month</span>
                        <span className="font-bold">{formatNumber(usage.dmSentThisMonth)} / {formatNumber(usage.dmQuotaMonthly)}</span>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (usage.dmSentThisMonth / usage.dmQuotaMonthly) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowPlansModal(true)}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-indigo-200 transition-all"
                  >
                    {plan?.name === 'FREE' ? 'Upgrade Plan' : 'Change Plan'}
                  </button>
                  {subscription?.dodoCustomerId && (
                    <button
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                      className="py-3 px-6 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:border-gray-300 transition-all"
                    >
                      {portalLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Manage Billing'}
                    </button>
                  )}
                </div>

                <SettingItem 
                  icon={CreditCard} 
                  label="Payment Methods" 
                  desc="Manage your payment methods"
                  onClick={handleManageSubscription}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Plans Modal */}
      <SubscriptionPlansModal 
        isOpen={showPlansModal}
        onClose={() => setShowPlansModal(false)}
        currentPlanName={plan?.name || 'FREE'}
      />
    </div>
  );
};

export default SettingsView;
