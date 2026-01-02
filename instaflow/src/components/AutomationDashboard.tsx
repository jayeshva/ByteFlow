
import React, { useState } from 'react';
import { type AutomationRule, type InstagramPost, TriggerType, type ActivityLog } from '../types';
// Added Sparkles to the imported icons from lucide-react
import { Trash2, ToggleLeft, ToggleRight, MessageSquare, Calendar, Activity, TrendingUp, User, ChevronRight, Sparkles, Clapperboard, CalendarClock, Edit3, Settings2 } from 'lucide-react';

interface AutomationDashboardProps {
  rules: AutomationRule[];
  posts: InstagramPost[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigateToPosts?: () => void;
  onEdit: (rule: AutomationRule) => void;
  logs: ActivityLog[];
  hasMoreLogs?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}


const AutomationDashboard: React.FC<AutomationDashboardProps> = ({ 
  rules, 
  posts, 
  logs, 
  onToggle, 
  onEdit, 
  onDelete, 
  onNavigateToPosts,
  hasMoreLogs = false,
  isLoadingMore = false,
  onLoadMore
}) => {
  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
        <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center text-indigo-400 animate-bounce shadow-xl shadow-indigo-50">
          <Activity size={48} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Your Engine is Dormant</h2>
          <p className="text-gray-500 max-w-md mx-auto mt-3 font-medium">
            You haven't setup any comment-to-DM flows yet. Start growing your engagement today by picking a post!
          </p>
        </div>
        <button 
          onClick={onNavigateToPosts}
          className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all flex items-center space-x-2"
        >
          <span>Choose a Post to Automate</span>
          <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  const formatSchedule = (scheduling?: AutomationRule['scheduling']) => {
    if (!scheduling?.enabled) return 'Indefinite';
    if (!scheduling.startDate && !scheduling.endDate) return 'Always On';
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const start = scheduling.startDate ? new Date(scheduling.startDate).toLocaleDateString(undefined, options) : 'Now';
    const end = scheduling.endDate ? new Date(scheduling.endDate).toLocaleDateString(undefined, options) : 'Ever';
    
    return `${start} - ${end}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
      {/* Main Rules List */}
      <div className="lg:col-span-2 space-y-6 lg:space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">Active Flows</h1>
            <p className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Managing {rules.length} conversion loops</p>
          </div>
          <div className="flex space-x-2">
            <div className="px-3 sm:px-5 py-2 sm:py-2.5 bg-green-50 text-green-600 rounded-xl sm:rounded-2xl border border-green-100 flex items-center space-x-2 shadow-sm">
              <TrendingUp size={14} className="sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">+24.8% Engagement</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {rules.map((rule) => {
            const post = posts.find(p => p.id === rule.postId);
            const scheduleText = formatSchedule(rule.scheduling);
            const isExpired = rule.scheduling?.enabled && rule.scheduling.endDate && new Date(rule.scheduling.endDate) < new Date();
            const isActive = rule.active && !isExpired;

            return (
              <div key={rule.id} className={`group bg-white rounded-[2.5rem] p-6 sm:p-8 transition-all duration-300 border shadow-sm hover:shadow-xl ${isActive ? 'border-transparent shadow-indigo-100/50' : 'border-gray-50 opacity-70 grayscale-[0.5]'}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  
                  {/* Left: Content & Visual */}
                  <div className="flex items-center space-x-6 flex-1 min-w-0">
                    <div className="relative shrink-0">
                      <div className={`absolute -inset-2 rounded-[2rem] blur-xl transition-opacity duration-500 ${isActive ? 'bg-indigo-400/20 opacity-100' : 'opacity-0'}`}></div>
                      <img src={post?.mediaUrl} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.8rem] object-cover relative z-10 border-2 border-white shadow-lg" />
                      
                      {/* Video Indicator Badge */}
                      {post?.mediaType === 'VIDEO' && (
                        <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-md p-1.5 rounded-lg text-white z-20 border border-white/20">
                          <Clapperboard size={10} />
                        </div>
                      )}

                      <div className="absolute -bottom-2 -right-2 bg-white p-2.5 rounded-2xl shadow-xl border border-gray-50 z-20">
                        <MessageSquare size={14} className="text-indigo-600" />
                      </div>
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-xl ${
                          rule.triggerType === TriggerType.AI_INTENT ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {rule.triggerType.replace('_', ' ')}
                        </span>
                        {rule.scheduling?.enabled && (
                          <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-xl flex items-center space-x-1.5 ${isExpired ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}`}>
                            <CalendarClock size={10} />
                            <span>{isExpired ? 'Expired' : 'Scheduled'}</span>
                          </span>
                        )}
                        {post?.mediaType === 'VIDEO' && (
                          <span className="text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                            Reel
                          </span>
                        )}
                      </div>
                      
                      <h4 className={`text-base sm:text-lg font-black tracking-tight line-clamp-1 mb-2 transition-colors ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                        {rule.flowName || 'Untitled Flow'}
                      </h4>
                      
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        <div className="flex items-center">
                          <Calendar size={12} className="mr-1.5" /> 
                          <span>Oct 25</span>
                        </div>
                        <div className={`flex items-center ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                          <TrendingUp size={12} className="mr-1.5" /> 
                          <span>{rule.stats.totalSent} Sends</span>
                        </div>
                        {rule.scheduling?.enabled && (
                          <div className="flex items-center text-indigo-400/70">
                            <CalendarClock size={12} className="mr-1.5" /> 
                            <span className="truncate max-w-[120px]">{scheduleText}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Modern Actions */}
                  <div className="flex sm:flex-col items-center justify-between sm:justify-center w-full sm:w-auto gap-6 sm:gap-4 pl-0 sm:pl-8 border-t sm:border-t-0 sm:border-l border-gray-50 pt-4 sm:pt-0 shrink-0">
                    
                    {/* Toggle Switch */}
                    <button 
                      onClick={() => onToggle(rule.id)}
                      className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 ${isActive ? 'bg-indigo-600 shadow-lg shadow-indigo-100' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${isActive ? 'translate-x-8' : 'translate-x-1'}`} />
                    </button>

                    {/* Secondary Actions */}
                    <div className="flex items-center space-x-2">
                       <button 
                        onClick={() => onEdit(rule)}
                        className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all group/btn"
                        title="Edit Automation"
                      >
                        <Edit3 size={18} className="group-hover/btn:scale-110 transition-transform" />
                      </button>
                      <button 
                        onClick={() => onDelete(rule.id)}
                        className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all group/btn"
                        title="Delete Automation"
                      >
                        <Trash2 size={18} className="group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-900">Live Pulse Feed</h3>
          </div>
          <Settings2 size={14} className="text-gray-300 cursor-pointer hover:text-indigo-600 transition-colors" />
        </div>
        
        <div className="bg-white border border-gray-100 rounded-[2rem] lg:rounded-[3rem] overflow-hidden flex flex-col h-[400px] lg:h-[750px] shadow-sm lg:sticky lg:top-10">
          <div className="p-7 border-b border-gray-50 bg-gray-50/20">
            <div className="flex items-center space-x-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <Activity size={12} className="text-indigo-500" />
              <span>Global Activity Monitor</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {logs?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-[1.5rem] flex items-center justify-center text-gray-200">
                  <Sparkles size={24} />
                </div>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-relaxed">Waiting for engagement triggers...</p>
              </div>
            ) : (
              logs?.map(log => (
                <div 
                  key={log.id} 
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-50 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all duration-200 group"
                >
                  {/* Status Dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    log.action === 'Sent DM' ? 'bg-green-500' : 
                    log.action === 'Failed' ? 'bg-red-500' :
                    'bg-gray-300'
                  }`} />
                  
                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0">
                    <User size={12} className="text-indigo-500" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span 
                      className="text-[11px] font-bold text-gray-900 truncate max-w-[100px]"
                      title={`@${log.username}`}
                    >
                      @{log.username}
                    </span>
                    <span 
                      className="text-[10px] text-gray-400 truncate flex-1"
                      title={log.comment}
                    >
                      "{log.comment}"
                    </span>
                  </div>
                  
                  {/* Flow Name Badge */}
                  {log.flowName && (
                    <span 
                      className="text-[8px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-wide truncate max-w-[100px] shrink-0"
                      title={log.flowName}
                    >
                      {log.flowName}
                    </span>
                  )}
                  
                  {/* Timestamp */}
                  <span className="text-[9px] text-gray-300 font-medium shrink-0 w-[60px] text-right">{log.timestamp}</span>
                </div>
              ))
            )}
            
            {/* Load More Button */}
            {hasMoreLogs && (
              <button
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="w-full py-3 mt-4 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? 'Loading...' : 'Load More Activity'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationDashboard;
