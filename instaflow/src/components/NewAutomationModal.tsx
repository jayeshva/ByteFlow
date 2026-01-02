
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Sparkles, Send, Check, MessageCircle, Zap, Smartphone, UserPlus, 
  Mail, Play, Pause, MessageSquareText, Clapperboard, Heart, ShieldCheck, 
  AlertCircle, Loader2, ArrowRight, MessageSquare, ListTree, Volume2, VolumeX,
  CalendarDays, Clock
} from 'lucide-react';
import { suggestAutomation } from '../services/geminiService';
import { AutomationType, TriggerType, type AutomationRule, type InstagramPost } from '../types';
import { MetaApiService } from '../services/api';

interface NewAutomationModalProps {
  post: InstagramPost;
  initialRule?: AutomationRule | null;
  onClose: () => void;
  onSave: (rule: Partial<AutomationRule>) => void;
}

const NewAutomationModal: React.FC<NewAutomationModalProps> = ({ post, initialRule, onClose, onSave }) => {
  const [triggerType, setTriggerType] = useState<TriggerType>(initialRule?.triggerType || TriggerType.CONTAINS);
  const [keyword, setKeyword] = useState(initialRule?.keyword || '');
  const [message, setMessage] = useState(initialRule?.responseMessage || '');
  const [publicReply, setPublicReply] = useState(initialRule?.publicReply || '');
  const [isPublicReplyEnabled, setIsPublicReplyEnabled] = useState(!!initialRule?.publicReply || !!publicReply);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Scheduling State - convert ISO dates to datetime-local format (YYYY-MM-DDTHH:MM)
  const formatDateForInput = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toISOString().slice(0, 16); // Returns 'YYYY-MM-DDTHH:MM'
    } catch {
      return '';
    }
  };
  
  const [isSchedulingEnabled, setIsSchedulingEnabled] = useState(initialRule?.scheduling?.enabled || false);
  const [startDate, setStartDate] = useState(formatDateForInput(initialRule?.scheduling?.startDate));
  const [endDate, setEndDate] = useState(formatDateForInput(initialRule?.scheduling?.endDate));
  
  // Flow Name
  const [flowName, setFlowName] = useState(initialRule?.flowName || '');
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleSuggest = async () => {
    setIsSuggesting(true);
    const results = await suggestAutomation(post.caption);
    if (results && results.length > 0) {
      setKeyword(results[0].keyword);
      setMessage(results[0].reply);
      setPublicReply(results[0].publicReply);
      setIsPublicReplyEnabled(true);
    }
    setIsSuggesting(false);
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const getMatchType = () => {
    switch (triggerType) {
      case TriggerType.EXACT_MATCH:
        return 'EXACT';
      case TriggerType.AI_INTENT:
        return 'INTENT';
      case TriggerType.EVERY_COMMENT:
        return 'ALL';
      case TriggerType.CONTAINS:
      default:
        return 'CONTAINS';
    }
  };

  const buildAutomationPayload = (): Record<string, unknown> => {
    const payload = {
      automationType: AutomationType.COMMENT,
      intentLabel: "INTENT",
      scopeMediaId: post.id,
      triggerKeyword: (triggerType === TriggerType.CONTAINS || triggerType === TriggerType.EXACT_MATCH) ? keyword : null,
      privateReplyText: message,
      publicReplyText: isPublicReplyEnabled ? publicReply : '',
      enablePublicReply: isPublicReplyEnabled || false,
      isAutomationTimingEnabled: isSchedulingEnabled || false,
      automationStartTime: (isSchedulingEnabled && startDate) ? new Date(startDate + ':00.000Z').toISOString() : null,
      automationEndTime: (isSchedulingEnabled && endDate) ? new Date(endDate + ':00.000Z').toISOString() : null,
      isEnabled: true,
      matchType: getMatchType(),
      scopeType: 'POST',
      flowName: flowName || `Flow for ${post.caption?.slice(0, 20) || post.id}...`,
    };

    return payload;
  };

  const validateForm = (): string | null => {
    // Flow name is required
    if (!flowName.trim()) {
      return 'Flow Name is required';
    }
    
    // Keyword is required for EXACT_MATCH and CONTAINS trigger types
    if ((triggerType === TriggerType.EXACT_MATCH || triggerType === TriggerType.CONTAINS) && !keyword.trim()) {
      return 'Trigger keyword is required for this trigger type';
    }
    
    // If scheduling is enabled, both start and end times are required
    if (isSchedulingEnabled) {
      if (!startDate) {
        return 'Start time is required when scheduling is enabled';
      }
      if (!endDate) {
        return 'End time is required when scheduling is enabled';
      }
    }
    
    return null; // No validation errors
  };

  const handleActivate = async () => {
    // Validate form before submitting
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    const payload = buildAutomationPayload();

    setIsSaving(true);
    try {
      if (initialRule?.id) {
        await MetaApiService.updateAutomation(initialRule.id, payload);
      } else {
        await MetaApiService.createAutomation(payload);
      }
    } catch (error) {
      console.warn('Automation save call failed (placeholder).', error);
    } finally {
      setIsSaving(false);
    }
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-[#fcfcfd] rounded-[2rem] sm:rounded-[3rem] w-full max-w-[1050px] h-[90vh] sm:h-[85vh] max-h-[850px] overflow-hidden flex flex-col shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-300">
        
        {/* --- Header --- */}
        <div className="px-6 sm:px-10 py-5 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center space-x-4">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Zap size={18} fill="white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-black text-gray-900 tracking-tight">
                {initialRule ? 'Refine Automation' : 'Design Automation'}
              </h2>
              <p className="hidden sm:block text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Automating Reel #{post.id}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 px-4 sm:px-6 py-2.5 bg-indigo-50 rounded-xl sm:rounded-2xl border border-indigo-100">
            <Sparkles size={12} className="text-indigo-600" />
            <span className="text-[8px] sm:text-[10px] font-black text-indigo-900 uppercase tracking-widest">Visual Builder</span>
          </div>

          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-300 hover:text-gray-900">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* --- LEFT: Source Post --- */}
          <div className="w-full lg:w-[320px] shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 bg-white p-6 sm:p-10 flex flex-col space-y-8 overflow-y-auto custom-scrollbar z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Source Post</h3>
              <div className="flex items-center space-x-2 text-[10px] font-bold text-gray-400">
                <Heart size={12} fill="#94a3b8" />
                <span>{post.likes.toLocaleString()}</span>
              </div>
            </div>

            <div className="aspect-square w-full rounded-[2rem] bg-gray-900 overflow-hidden relative shadow-lg shrink-0 group cursor-pointer" onClick={togglePlay}>
              {post.mediaType === 'VIDEO' ? (
                <>
                  {isVideoLoading && <Loader2 className="absolute inset-0 m-auto text-white animate-spin" size={24} />}
                  <video 
                    ref={videoRef}
                    src={post.mediaUrl} 
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isVideoLoading ? 'opacity-0' : 'opacity-100'}`}
                    loop
                    muted={isMuted}
                    playsInline
                    onCanPlay={() => setIsVideoLoading(false)}
                    onError={() => { setVideoError(true); setIsVideoLoading(false); }}
                  />
                  <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100 bg-black/20'}`}>
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white">
                      {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} className="ml-0.5" fill="white" />}
                    </div>
                  </div>
                  <button onClick={toggleMute} className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-white">
                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                </>
              ) : (
                <img src={post.mediaUrl} className="w-full h-full object-cover" />
              )}
            </div>

            <div className="bg-gray-50/80 p-6 rounded-[2rem] border border-gray-100 shrink-0">
              <p className="text-[11px] font-medium text-gray-500 leading-relaxed italic">
                "{post.caption}"
              </p>
            </div>
          </div>

          {/* --- RIGHT: Configuration (Main) --- */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-12 custom-scrollbar bg-gray-50/20">
            <div className="max-w-2xl mx-auto space-y-10 pb-10">
              
              {/* Step 1: Flow Name & Trigger Mechanism */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">1</div>
                  <h3 className="text-[11px] sm:text-xs font-black text-gray-900 uppercase tracking-widest">Flow Setup</h3>
                </div>
                
                {/* Flow Name Input */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 ml-1">
                    <Sparkles size={14} className="text-indigo-600" />
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Flow Name</label>
                  </div>
                  <input 
                    type="text" 
                    value={flowName}
                    onChange={(e) => setFlowName(e.target.value)}
                    placeholder="Give your automation a name (e.g. Summer Sale DM Flow)"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all font-bold text-sm text-gray-800"
                  />
                </div>

                {/* Trigger Type Selection */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 ml-1">
                    <Zap size={14} className="text-gray-400" />
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Trigger Mechanism</label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { type: TriggerType.CONTAINS, icon: <MessageSquare size={16}/>, label: 'Contains' },
                    { type: TriggerType.EXACT_MATCH, icon: <Check size={16}/>, label: 'Exact' },
                    { type: TriggerType.AI_INTENT, icon: <Sparkles size={16}/>, label: 'AI Intent' },
                    { type: TriggerType.EVERY_COMMENT, icon: <Zap size={16}/>, label: 'Everything' },
                  ].map((btn) => (
                    <button
                      key={btn.type}
                      onClick={() => setTriggerType(btn.type)}
                      className={`py-6 rounded-[1.5rem] border-2 transition-all flex flex-col items-center justify-center space-y-2 ${
                        triggerType === btn.type ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md' : 'border-gray-50 text-gray-400 hover:border-gray-100 bg-white'
                      }`}
                    >
                      {btn.icon}
                      <span className="text-[9px] font-black uppercase tracking-widest">{btn.label}</span>
                    </button>
                  ))}
                  </div>
                </div>

                {triggerType !== TriggerType.EVERY_COMMENT && triggerType !== TriggerType.AI_INTENT && (
                  <div className="relative">
                    <input 
                      type="text" 
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="Viral Keyword (e.g. JOIN, HELP)..."
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all font-bold text-sm text-gray-800"
                    />
                    <Zap size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-indigo-400" />
                  </div>
                )}
              </div>

              {/* Step 2: Reply Sequence */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">2</div>
                    <h3 className="text-[11px] sm:text-xs font-black text-gray-900 uppercase tracking-widest">Reply Sequence</h3>
                  </div>
                  <button 
                    onClick={handleSuggest} 
                    disabled={isSuggesting} 
                    className="flex items-center space-x-2 text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors"
                  >
                    <Sparkles size={14} />
                    <span>{isSuggesting ? 'Thinking...' : 'AI Smart Build'}</span>
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between ml-1">
                      <div className="flex items-center space-x-2">
                        <MessageCircle size={14} className="text-gray-400" />
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Public Loop Boost (Optional)</label>
                      </div>
                      <button 
                        onClick={() => setIsPublicReplyEnabled(!isPublicReplyEnabled)}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors outline-none ${isPublicReplyEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isPublicReplyEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    {isPublicReplyEnabled && (
                      <input 
                        type="text" 
                        value={publicReply}
                        onChange={(e) => setPublicReply(e.target.value)}
                        placeholder="e.g. Sent you a DM! Check requests 📩"
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all text-sm font-bold animate-in slide-in-from-top-2 duration-200"
                      />
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 ml-1">
                      <Mail size={14} className="text-gray-400" />
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Personalized DM Response</label>
                    </div>
                    <textarea 
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your value-packed message here..."
                      className="w-full px-6 py-5 bg-gray-50 border border-gray-100 focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all text-sm font-medium resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Scheduling */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">3</div>
                    <h3 className="text-[11px] sm:text-xs font-black text-gray-900 uppercase tracking-widest">Loop Timing</h3>
                  </div>
                  <button 
                    onClick={() => setIsSchedulingEnabled(!isSchedulingEnabled)}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors outline-none ${isSchedulingEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isSchedulingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {isSchedulingEnabled ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-200">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 ml-1 text-gray-400">
                        <CalendarDays size={14} />
                        <label className="text-[9px] font-black uppercase tracking-widest">Start Date & Time</label>
                      </div>
                      <input 
                        type="datetime-local" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all font-bold text-xs"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 ml-1 text-gray-400">
                        <Clock size={14} />
                        <label className="text-[9px] font-black uppercase tracking-widest">End Date & Time</label>
                      </div>
                      <input 
                        type="datetime-local" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all font-bold text-xs"
                      />
                    </div>
                    <p className="sm:col-span-2 text-[10px] text-indigo-400 font-bold italic ml-1">
                      * Automation will only trigger within this window.
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 text-center">
                    <p className="text-[11px] font-bold text-gray-400">Automation will remain active indefinitely once saved.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- Footer --- */}
        <div className="px-10 sm:px-12 py-7 border-t border-gray-100 bg-white flex justify-between items-center shrink-0 z-20">
          <div className="flex items-center space-x-3 text-gray-400">
            <ShieldCheck size={18} className="text-green-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Authenticated Meta Partner</span>
          </div>

          <div className="flex items-center space-x-8">
            <button onClick={onClose} className="text-[11px] font-black text-gray-400 hover:text-black transition-colors uppercase tracking-widest">Cancel</button>
            <button 
              onClick={handleActivate}
              disabled={
                isSaving ||
                !message ||
                (triggerType === TriggerType.CONTAINS && !keyword)
              }
              className="px-12 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center space-x-3 transition-all hover:scale-105 active:scale-95"
            >
              <span className="uppercase tracking-widest">
                {isSaving ? 'Activating...' : initialRule ? 'Save Loop' : 'Activate Engine'}
              </span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewAutomationModal;
