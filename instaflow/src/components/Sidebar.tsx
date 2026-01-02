
import React, { useEffect, useState } from 'react';
import { Home, Zap, Settings, BarChart3, LogOut, X, ChevronUp } from 'lucide-react';
import type { TabType } from '../App';
import { logout } from '../services/http';
import { SubscriptionService, type SubscriptionData } from '../services/api';
import SubscriptionPlansModal from './SubscriptionPlansModal';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isMobileOpen = false, onMobileClose }) => {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [showPlansModal, setShowPlansModal] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const data = await SubscriptionService.getCurrentSubscription();
      setSubscriptionData(data);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    }
  };

  const NavItem = ({ icon: Icon, label, tab }: { icon: any, label: string, tab: TabType }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        onMobileClose?.();
      }}
      className={`flex items-center space-x-3 w-full p-3 rounded-xl transition-all duration-200 group ${
        activeTab === tab 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 font-semibold scale-105' 
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon size={20} className={activeTab === tab ? 'text-white' : 'group-hover:text-indigo-600 transition-colors'} />
      <span className="text-sm">{label}</span>
    </button>
  );

  // Calculate usage percentage
  const usage = subscriptionData?.usage;
  const usagePercent = usage 
    ? Math.min(100, Math.round((usage.dmSentThisMonth / usage.dmQuotaMonthly) * 100))
    : 0;
  
  const planName = subscriptionData?.plan?.displayName || subscriptionData?.plan?.name || 'Free';
  const isFreePlan = subscriptionData?.plan?.name === 'FREE' || !subscriptionData?.plan;

  // Get color based on usage
  const getUsageColor = () => {
    if (usagePercent >= 90) return { bg: 'bg-red-50', bar: 'bg-red-500', text: 'text-red-600', border: 'border-red-200' };
    if (usagePercent >= 70) return { bg: 'bg-amber-50', bar: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200' };
    return { bg: 'bg-indigo-50', bar: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-200' };
  };

  const colors = getUsageColor();

  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-between mb-10 pl-2">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setActiveTab('posts'); onMobileClose?.(); }}>
          <div className="w-10 h-10 rounded-xl instagram-gradient flex items-center justify-center text-white shadow-xl shadow-pink-100">
            <Zap size={22} fill="white" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight block leading-tight">InstaFlow</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Growth Engine</span>
          </div>
        </div>
        <button 
          onClick={onMobileClose} 
          className="md:hidden p-2 hover:bg-gray-100 rounded-xl text-gray-500"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-3">
        <NavItem icon={Home} label="Posts & Content" tab="posts" />
        <NavItem icon={Zap} label="My Automations" tab="automations" />
        <NavItem icon={BarChart3} label="Performance" tab="analytics" />
        <NavItem icon={Settings} label="Profile & Settings" tab="settings" />
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-100">
        {/* Plan Card - Clickable for upgrade */}
        <button 
          onClick={() => setShowPlansModal(true)}
          className={`w-full mb-6 p-4 ${colors.bg} rounded-2xl text-left transition-all hover:shadow-md group`}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Current Plan</p>
            {isFreePlan && (
              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ChevronUp size={10} /> Upgrade
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-indigo-900 mb-2">{planName}</p>
          <div className="w-full bg-indigo-200 rounded-full h-1.5">
            <div 
              className={`${colors.bar} h-1.5 rounded-full transition-all duration-500`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className={`text-[9px] ${colors.text} mt-2 font-bold uppercase`}>
            {usage 
              ? `${usage.dmSentThisMonth.toLocaleString()} / ${usage.dmQuotaMonthly.toLocaleString()} DMs used`
              : 'Loading usage...'}
          </p>
        </button>
        
        <button className="flex items-center space-x-3 w-full p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold" onClick={logout}>
          <LogOut size={20} />
          <span className="text-sm">Log Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col p-6 shrink-0 z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onMobileClose}
          />
          <aside className="fixed inset-y-0 left-0 w-72 bg-white flex flex-col p-6 z-50 md:hidden shadow-2xl animate-in slide-in-from-left duration-300">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Subscription Plans Modal */}
      <SubscriptionPlansModal 
        isOpen={showPlansModal}
        onClose={() => setShowPlansModal(false)}
        currentPlanName={subscriptionData?.plan?.name || 'FREE'}
      />
    </>
  );
};

export default Sidebar;
