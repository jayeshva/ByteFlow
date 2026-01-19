
import React, { useState } from 'react';
import { 
  X, Sparkles, Check, MessageCircle, Zap, UserPlus, 
  Mail, ShieldCheck, ArrowRight, MessageSquare,
  CalendarDays, Clock, Link, Plus, Trash2
} from 'lucide-react';
import { AutomationType, TriggerType, type AutomationRule, type InstagramPost } from '../../types';
import PhonePreview from './PhonePreview';

import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { formatDate, formatNumber } from '../../lib/utils';
import { sanitizeInput } from '../../lib/security';


import { useCreateAutomation, useUpdateAutomation } from '../../hooks';
import { useToast } from '../../hooks/useToast';


interface NewAutomationModalProps {
  post: InstagramPost;
  initialRule?: AutomationRule | null;
  onClose: () => void;
  onSave: () => void;
}


const DEFAULT_PUBLIC_REPLIES = [
  'Check your DMs! 📩',
  'Sent you a message! ✨',
  'DM incoming! Check it out 💬',
  'Just messaged you! 🎉',
  'See your inbox! 📬',
];

const NewAutomationModal: React.FC<NewAutomationModalProps> = ({ post, initialRule, onClose, onSave }) => {
  const user = useSelector((state: RootState) => state.user.profile);
  const [triggerType, setTriggerType] = useState<TriggerType>(initialRule?.triggerType || TriggerType.CONTAINS);
  // Parse keywords: handle both array and comma-separated string
  const parseKeywords = (rule: any): string[] => {
    if (!rule) return [];
    if (Array.isArray(rule.triggerKeywords) && rule.triggerKeywords.length > 0) {
      return rule.triggerKeywords;
    }
    if (rule.keyword) {
      return rule.keyword.split(',').map((k: string) => k.trim()).filter(Boolean);
    }
    return [];
  };
  const [keywords, setKeywords] = useState<string[]>(parseKeywords(initialRule));
  const [keywordInput, setKeywordInput] = useState('');
  const [message, setMessage] = useState(initialRule?.responseMessage || '');
  
  // Parse public replies: handle both array and single string
  const parsePublicReplies = (rule: any): string[] => {
    if (!rule) return DEFAULT_PUBLIC_REPLIES;
    if (Array.isArray(rule.publicReplies) && rule.publicReplies.length > 0) {
      return rule.publicReplies;
    }
    if (rule.publicReply) {
      return [rule.publicReply];
    }
    return DEFAULT_PUBLIC_REPLIES;
  };
  const [publicReplies, setPublicReplies] = useState<string[]>(parsePublicReplies(initialRule));
  const [isPublicReplyEnabled, setIsPublicReplyEnabled] = useState(
    !!(initialRule?.publicReplies?.length) || !!initialRule?.publicReply || !!initialRule?.enablePublicReply
  );
  // const [isSuggesting, setIsSuggesting] = useState(false);


  const createMutation = useCreateAutomation();
  const updateMutation = useUpdateAutomation();
  const toast = useToast();

  
  // Keyword management functions
  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };
  
  const removeKeyword = (keywordToRemove: string) => {
    setKeywords(keywords.filter(k => k !== keywordToRemove));
  };
  
  const handleKeywordInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword();
    } else if (e.key === 'Backspace' && !keywordInput && keywords.length > 0) {
      removeKeyword(keywords[keywords.length - 1]);
    }
  };
  
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
  
  // Require Follow feature
  const [isRequireFollowEnabled, setIsRequireFollowEnabled] = useState(initialRule?.requireFollow || false);
  const [followPromptText, setFollowPromptText] = useState(initialRule?.followPromptText || '');

  
  // CTA Buttons - ensure IDs are present for saved buttons
  const parseCtaButtons = (rule: any): Array<{ id: string; label: string; url: string }> => {
    if (!rule?.ctaButtons || !Array.isArray(rule.ctaButtons)) return [];
    return rule.ctaButtons.map((btn: any) => ({
      id: btn.id || crypto.randomUUID(),
      label: btn.label || '',
      url: btn.url || '',
    }));
  };
  const [ctaButtons, setCtaButtons] = useState<Array<{ id: string; label: string; url: string }>>(parseCtaButtons(initialRule));

  
  const addCtaButton = () => {
    setCtaButtons([...ctaButtons, { id: crypto.randomUUID(), label: '', url: '' }]);
  };
  
  const removeCtaButton = (id: string) => {
    setCtaButtons(ctaButtons.filter(btn => btn.id !== id));
  };
  
  const updateCtaButton = (id: string, field: 'label' | 'url', value: string) => {
    setCtaButtons(ctaButtons.map(btn => btn.id === id ? { ...btn, [field]: value } : btn));
  };
  
  // Preview tab state
  const [previewTab, setPreviewTab] = useState<'post' | 'comments' | 'dm'>('dm');

  // const handleSuggest = async () => {
  //   setIsSuggesting(true);
  //   const results = await suggestAutomation(post.caption);
  //   if (results && results.length > 0) {
  //     setKeywords([results[0].keyword]);
  //     setMessage(results[0].reply);
  //     setPublicReplies([results[0].publicReply]);
  //     setIsPublicReplyEnabled(true);

  //   }
  //   setIsSuggesting(false);
  // };

  const getMatchType = () => {
    switch (triggerType) {
      case TriggerType.EXACT_MATCH:
        return 'EXACT';
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
      triggerKeyword: (triggerType === TriggerType.CONTAINS || triggerType === TriggerType.EXACT_MATCH) ? keywords.join(',') : null,
      triggerKeywords: (triggerType === TriggerType.CONTAINS || triggerType === TriggerType.EXACT_MATCH) ? keywords : [],
      privateReplyText: sanitizeInput(message),
      publicReplyText: isPublicReplyEnabled ? (sanitizeInput(publicReplies[0]) || '') : '',
      publicReplies: isPublicReplyEnabled ? publicReplies.map(r => sanitizeInput(r)).filter(r => r.trim() !== '') : [],
      enablePublicReply: isPublicReplyEnabled || false,
      isAutomationTimingEnabled: isSchedulingEnabled || false,

      automationStartTime: (isSchedulingEnabled && startDate) ? new Date(startDate + ':00.000Z').toISOString() : null,
      automationEndTime: (isSchedulingEnabled && endDate) ? new Date(endDate + ':00.000Z').toISOString() : null,
      isEnabled: true,
      matchType: getMatchType(),
      scopeType: 'POST',
      flowName: sanitizeInput(flowName) || `Flow for ${post.caption?.slice(0, 20) || post.id}...`,
      // Require Follow feature
      requireFollow: isRequireFollowEnabled,
      followPromptText: isRequireFollowEnabled ? (sanitizeInput(followPromptText) || null) : null,
      // CTA Buttons (only include buttons that have both label and url)
      ctaButtons: ctaButtons.filter(btn => btn.label.trim() && btn.url.trim()).map(btn => ({
        ...btn,
        label: sanitizeInput(btn.label),
      })),
    };

    return payload;
  };


  const validateForm = (): string | null => {
    // Flow name is required
    if (!flowName.trim()) {
      return 'Flow Name is required';
    }
    
    // Keyword is required for EXACT_MATCH and CONTAINS trigger types
    if ((triggerType === TriggerType.EXACT_MATCH || triggerType === TriggerType.CONTAINS) && keywords.length === 0) {
      return 'At least one trigger keyword is required for this trigger type';
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

  const handleActivate = () => {
    // Validate form before submitting
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload = buildAutomationPayload();

    if (initialRule?.id) {
      updateMutation.mutate(
        { id: initialRule.id, payload },
        {
          onSuccess: () => {
            onSave();
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          onSave();
        },
      });
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-[#fcfcfd] rounded-[2rem] sm:rounded-[3rem] w-full max-w-7xl h-[95vh] max-h-[950px] overflow-hidden flex flex-col shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-300">
        
        {/* --- Header with Source Post --- */}
        <div className="px-6 sm:px-8 py-4 border-b border-gray-100 bg-white/90 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center justify-between">
            {/* Left: Title + Source Post */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <Zap size={18} fill="white" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 tracking-tight">
                    {initialRule ? 'Refine Automation' : 'Design Automation'}
                  </h2>
                </div>
              </div>
              
              {/* Source Post Mini Preview */}
              <div className="hidden md:flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-gray-900 overflow-hidden flex-shrink-0">
                  <img 
                    src={post.thumbnailURL || post.mediaUrl} 
                    className="w-full h-full object-cover" 
                    alt="Post"
                  />
                </div>
                <div className="max-w-[200px]">
                  <p className="text-[10px] font-bold text-gray-700 truncate">{post.caption || 'No caption'}</p>
                  <div className="flex items-center space-x-2 text-[9px] text-gray-400">
                    <span>❤️ {formatNumber(post.likes)}</span>
                    <span>•</span>
                    <span>{formatDate(post.timestamp)}</span>
                  </div>

                </div>
              </div>
            </div>

            {/* Right: Visual Builder tag + Close */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
                <Sparkles size={12} className="text-indigo-600" />
                <span className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">Visual Builder</span>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* --- Main Content: Phone Preview + Configuration --- */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* --- LEFT: Phone Preview --- */}
          <div className="hidden lg:flex w-[460px] shrink-0 border-r border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 p-10 flex-col items-center justify-center overflow-hidden relative">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
            
            
            <div className="relative z-10 w-full flex flex-col items-center">
              <div className="flex items-center justify-end w-full max-w-[280px] mb-6">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-500/5 rounded-full border border-green-500/20 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
                  <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Real-time</span>
                </div>
              </div>

              <div className="transform scale-[1.05] sm:scale-[1] origin-top transition-transform duration-500">
                <PhonePreview
                  username={user.username || user.igName || 'bytebees'}
                  profilePic={user.profilePictureUrl || user.profilePic}
                  postImage={post.thumbnailURL || post.mediaUrl}
                  postCaption={post.caption}
                  likes={post.likes}
                  comments={post.comments}
                  dmMessage={message}
                  publicReply={isPublicReplyEnabled ? (publicReplies[0] || '') : ''}
                  triggerKeyword={keywords[0] || ''}
                  ctaButtons={ctaButtons}
                  activeTab={previewTab}
                  onTabChange={setPreviewTab}
                />


              </div>
            </div>
          </div>

          {/* --- RIGHT: Configuration Form --- */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar bg-white/50">
            <div className="max-w-2xl mx-auto space-y-10 pb-10">
              
              {/* Step 1: Flow Name & Trigger Mechanism */}
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/20 space-y-8">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-[14px] font-black shadow-lg shadow-indigo-100">1</div>
                  <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-[0.1em]">Build Your Flow</h3>
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

                {triggerType !== TriggerType.EVERY_COMMENT && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 ml-1">
                      <Zap size={14} className="text-gray-400" />
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Trigger Keywords</label>
                    </div>
                    
                    {/* Keywords Tags */}
                    <div className="flex flex-wrap gap-2 p-4 bg-gray-50 border border-gray-100 rounded-xl min-h-[56px]">
                      {keywords.map((kw) => (
                        <span key={kw} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold">
                          {kw}
                          <button
                            type="button"
                            onClick={() => removeKeyword(kw)}
                            className="text-indigo-500 hover:text-indigo-700 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      <input 
                        type="text" 
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyDown={handleKeywordInputKeyDown}
                        onBlur={addKeyword}
                        placeholder={keywords.length === 0 ? 'Type keyword and press Enter...' : 'Add more...'}
                        className="flex-1 min-w-[120px] bg-transparent outline-none font-bold text-sm text-gray-800 placeholder:text-gray-400"
                      />
                    </div>
                    <p className="text-[9px] text-gray-400 ml-1">Press Enter or comma to add. Backspace to remove last.</p>
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
                  {/* <button 
                    // onClick={handleSuggest} 
                    disabled={isSuggesting} 
                    className="flex items-center space-x-2 text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors"
                  >
                    <Sparkles size={14} />
                    <span>{isSuggesting ? 'Thinking...' : 'AI Smart Build'}</span>
                  </button> */}
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
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        {publicReplies.map((reply, index) => (
                          <div key={index} className="relative group">
                            <input 
                              type="text" 
                              value={reply}
                              maxLength={30}
                              onChange={(e) => {
                                const newReplies = [...publicReplies];
                                newReplies[index] = e.target.value;
                                setPublicReplies(newReplies);
                              }}
                              placeholder="e.g. Sent you a DM! Check requests 📩"
                              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all text-sm font-bold pr-20"
                            />
                            <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                              <span className={`text-[10px] font-black ${reply.length >= 25 ? 'text-orange-500' : 'text-gray-300'}`}>
                                {reply.length}/30
                              </span>
                            </div>
                            {publicReplies.length > 1 && (
                              <button 
                                onClick={() => setPublicReplies(publicReplies.filter((_, i) => i !== index))}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                        
                        {publicReplies.length < 5 && (
                          <button 
                            onClick={() => setPublicReplies([...publicReplies, ''])}
                            className="w-full py-3 border-2 border-dashed border-gray-100 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center justify-center space-x-2"
                          >
                            <Plus size={14} />
                            <span>Add Random Variation ({publicReplies.length}/5)</span>
                          </button>
                        )}
                        <p className="text-[9px] text-gray-400 ml-1 italic">
                          Randomly selects one message for each comment to avoid Instagram spam detection.
                        </p>
                      </div>
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

                  {/* Require Follow Toggle */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between ml-1">
                      <div className="flex items-center space-x-2">
                        <UserPlus size={14} className="text-gray-400" />
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Require Follow</label>
                      </div>
                      <button 
                        onClick={() => setIsRequireFollowEnabled(!isRequireFollowEnabled)}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors outline-none ${isRequireFollowEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isRequireFollowEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    {isRequireFollowEnabled && (
                      <>
                        <p className="text-[10px] text-indigo-400 font-medium ml-1 italic">Users must follow your account to receive the DM</p>
                        <input 
                          type="text" 
                          value={followPromptText}
                          onChange={(e) => setFollowPromptText(e.target.value)}
                          placeholder="e.g. Follow us to receive exclusive content! 🎁"
                          className="w-full px-6 py-4 bg-gray-50 border border-gray-100 focus:border-indigo-500 focus:bg-white rounded-xl outline-none transition-all text-sm font-bold animate-in slide-in-from-top-2 duration-200"
                        />
                      </>
                    )}
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between ml-1">
                      <div className="flex items-center space-x-2">
                        <Link size={14} className="text-gray-400" />
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">CTA Buttons (Links)</label>
                      </div>
                      <button 
                        onClick={addCtaButton}
                        className="flex items-center space-x-1 text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <Plus size={12} />
                        <span>Add</span>
                      </button>
                    </div>
                    
                    {ctaButtons.length > 0 && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                        {ctaButtons.map((btn) => (
                          <div key={btn.id} className="flex items-center space-x-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <input 
                              type="text" 
                              value={btn.label}
                              onChange={(e) => updateCtaButton(btn.id, 'label', e.target.value)}
                              placeholder="Button Label"
                              className="flex-1 px-3 py-2 bg-white border border-gray-200 focus:border-indigo-500 rounded-lg outline-none text-sm font-medium"
                            />
                            <input 
                              type="url" 
                              value={btn.url}
                              onChange={(e) => updateCtaButton(btn.id, 'url', e.target.value)}
                              placeholder="https://..."
                              className="flex-[2] px-3 py-2 bg-white border border-gray-200 focus:border-indigo-500 rounded-lg outline-none text-sm font-medium"
                            />
                            <button 
                              onClick={() => removeCtaButton(btn.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        <p className="text-[9px] text-gray-400 ml-1">Links will be tracked for analytics</p>
                      </div>
                    )}
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
                createMutation.isPending ||
                updateMutation.isPending ||
                !message ||
                (triggerType === TriggerType.CONTAINS && keywords.length === 0)
              }
              className="px-12 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center space-x-3 transition-all hover:scale-105 active:scale-95"
            >
              <span className="uppercase tracking-widest">
                {(createMutation.isPending || updateMutation.isPending) ? 'Activating...' : initialRule ? 'Save Loop' : 'Activate Engine'}
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
