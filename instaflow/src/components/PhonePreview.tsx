import React from 'react';

interface PhonePreviewProps {
  username?: string;
  profilePic?: string;
  postImage?: string;
  postCaption?: string;
  likes?: number;
  comments?: number;
  dmMessage?: string;
  publicReply?: string;
  triggerKeyword?: string;
  ctaButtons?: Array<{ id: string; label: string; url: string }>;
  activeTab: 'post' | 'comments' | 'dm';
  onTabChange: (tab: 'post' | 'comments' | 'dm') => void;
}

const PhonePreview: React.FC<PhonePreviewProps> = ({
  username = 'bytebees',
  profilePic,
  postImage,
  postCaption = '',
  likes = 0,
  comments = 0,
  dmMessage = '',
  publicReply = '',
  triggerKeyword = 'link',
  ctaButtons = [],
  activeTab,
  onTabChange,
}) => {
  
  // Helper component for avatar
  const Avatar = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClasses = {
      sm: 'w-5 h-5 text-[6px]',
      md: 'w-6 h-6 text-[7px]',
      lg: 'w-7 h-7 text-[8px]',
    };
    
    if (profilePic) {
      return (
        <img 
          src={profilePic} 
          alt={username} 
          className={`${sizeClasses[size]} rounded-full object-cover border border-zinc-700`}
        />
      );
    }
    
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white`}>
        {username.charAt(0).toUpperCase()}
      </div>
    );
  };
  
  return (
    <div className="flex flex-col items-center w-full">
      {/* Device Frame */}
      <div className="relative mx-auto border-gray-800 bg-gray-800 border-[10px] rounded-[2.5rem] h-[580px] w-[290px] shadow-2xl">

        {/* Physical Buttons */}
        <div className="h-[24px] w-[3px] bg-gray-800 absolute -start-[13px] top-[60px] rounded-s-lg"></div>
        <div className="h-[36px] w-[3px] bg-gray-800 absolute -start-[13px] top-[100px] rounded-s-lg"></div>
        <div className="h-[36px] w-[3px] bg-gray-800 absolute -start-[13px] top-[145px] rounded-s-lg"></div>
        <div className="h-[50px] w-[3px] bg-gray-800 absolute -end-[13px] top-[115px] rounded-e-lg"></div>
        
        {/* Screen */}
        <div className="rounded-[2rem] overflow-hidden w-full h-full bg-black relative flex flex-col">
          {/* Status Bar */}
          <div className="h-7 px-5 flex justify-between items-center bg-black text-white text-[10px] font-semibold select-none z-50">
            <span>9:41</span>
            <div className="flex gap-1 items-center">
              <div className="flex space-x-[2px]">
                <div className="w-[3px] h-2 bg-white rounded-sm" />
                <div className="w-[3px] h-2.5 bg-white rounded-sm" />
                <div className="w-[3px] h-3 bg-white rounded-sm" />
                <div className="w-[3px] h-3.5 bg-white rounded-sm" />
              </div>
              <div className="w-5 h-2.5 border border-white rounded-sm ml-1 relative">
                <div className="absolute inset-[1px] bg-white rounded-[1px]" style={{width: '80%'}} />
              </div>
            </div>
          </div>

          {/* Dynamic Notch */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-[80px] h-[22px] bg-black rounded-2xl z-50 flex items-center justify-center">
            <div className="w-[30px] h-[3px] bg-zinc-800 rounded-full"></div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden relative">
            
            {/* POST VIEW */}
            {activeTab === 'post' && (
              <div className="flex flex-col h-full bg-black text-white font-sans animate-in fade-in duration-200">
                {/* Post Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-900 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-[1.5px]">
                      <Avatar size="md" />
                    </div>
                    <span className="font-bold text-[10px] tracking-tight">{username}</span>
                  </div>
                  <button className="text-white">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                  </button>
                </div>

                {/* Image - using flex-1 to fill available space */}
                <div className="flex-1 bg-zinc-900 flex items-center justify-center min-h-0">
                  {postImage ? (
                    <img src={postImage} className="w-full h-full object-cover" alt="post" />

                  ) : (
                    <div className="flex flex-col items-center text-zinc-600">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      <span className="text-[9px] mt-1.5 font-medium">No media</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between px-3 py-2 shrink-0">
                  <div className="flex items-center gap-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                  </div>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                </div>

                {/* Likes & Caption */}
                <div className="px-3 space-y-1 pb-3 shrink-0">
                  <p className="font-bold text-[11px] tracking-tight">{likes.toLocaleString()} likes</p>
                  <p className="text-[11px] leading-snug line-clamp-2">
                    <span className="font-bold mr-1">{username}</span>
                    <span className="text-zinc-300">{postCaption || 'Add a caption...'}</span>
                  </p>
                  <button 
                    onClick={() => onTabChange('comments')}
                    className="text-zinc-500 text-[10px] block hover:underline"
                  >
                    View all {comments} comments
                  </button>
                  <p className="text-[8px] text-zinc-500 uppercase tracking-widest">2 hours ago</p>
                </div>
              </div>
            )}


            {/* COMMENTS VIEW */}
            {activeTab === 'comments' && (
              <div className="flex flex-col h-full bg-black text-white font-sans overflow-hidden animate-in fade-in duration-200">
                {/* Blurred background */}
                {postImage && (
                  <div className="absolute inset-0 z-0 opacity-20 blur-sm overflow-hidden h-[100px]">
                    <img src={postImage} className="w-full h-full object-cover" alt="" />
                  </div>
                )}

                {/* Bottom Sheet */}
                <div className="z-10 bg-zinc-900/95 backdrop-blur-xl mt-16 rounded-t-[20px] flex-1 flex flex-col border-t border-zinc-800">
                  <div className="flex justify-center py-2">
                    <div className="w-8 h-1 bg-zinc-700 rounded-full"></div>
                  </div>
                  
                  <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
                    <div className="w-6"></div>
                    <span className="font-bold text-[12px]">Comments</span>
                    <button onClick={() => onTabChange('post')} className="text-zinc-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>

                  {/* Comment List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-4">
                    {/* User Comment */}
                    <div className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] font-bold shrink-0">U</div>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[10px]">user123</span>
                          <span className="text-zinc-500 text-[9px]">Now</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-zinc-200">{triggerKeyword || 'Keyword'}</p>
                        <span className="text-zinc-500 text-[9px] font-semibold">Reply</span>
                      </div>
                    </div>

                    {/* Bot Reply */}
                    {publicReply && (
                      <div className="flex gap-2 ml-6">
                        <Avatar size="lg" />
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[10px]">{username}</span>
                            <span className="bg-blue-500 text-white text-[7px] px-1 py-0.5 rounded font-bold">AUTHOR</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-zinc-200">{publicReply}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comment Input */}
                  <div className="p-3 bg-zinc-900 border-t border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Avatar size="lg" />
                      <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-full px-3 py-1.5">
                        <span className="text-zinc-500 text-[10px]">Add a comment...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DM VIEW */}
            {activeTab === 'dm' && (
              <div className="flex flex-col h-full bg-black text-white font-sans animate-in fade-in duration-200">
                {/* DM Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-900 shrink-0">
                  <div className="flex items-center gap-2">
                    <button onClick={() => onTabChange('post')} className="text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <div className="flex items-center gap-2">
                      <Avatar size="md" />
                      <span className="font-semibold text-[11px]">{username}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">

                  {/* DM Message Bubble */}
                  {dmMessage ? (
                    <div className="flex items-end gap-2">
                      <div className="shrink-0 mb-1">
                        <Avatar size="sm" />
                      </div>
                      <div className="max-w-[85%]">
                        <div className="bg-zinc-900 text-zinc-100 px-3 py-2.5 rounded-[18px] rounded-bl-[4px] border border-zinc-800">
                          <p className="text-[11px] leading-relaxed whitespace-pre-wrap break-words">{dmMessage}</p>
                          
                          {/* CTA Buttons inside message */}
                          {ctaButtons.length > 0 && (
                            <div className="mt-2.5 space-y-1.5">
                              {ctaButtons.map((btn) => (
                                <button key={btn.id} className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-xl text-center font-semibold text-white border border-zinc-600 text-[10px]">
                                  {btn.label || 'Click here'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  ) : (
                    <div className="flex flex-col items-center py-6 text-zinc-600">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      <p className="text-[9px] mt-1.5 font-medium">Type a DM to preview</p>
                    </div>
                  )}
                </div>

                {/* DM Input */}
                <div className="p-2.5 bg-black flex items-center gap-2 border-t border-zinc-900">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </div>
                  <div className="flex-1 bg-zinc-900 rounded-full px-3 py-1.5 flex items-center gap-2 border border-zinc-800">
                    <span className="text-zinc-500 text-[10px]">Message...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Home Indicator */}
          <div className="h-5 w-full flex justify-center items-end pb-1.5 bg-black z-50">
            <div className="w-[80px] h-1 bg-white/30 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center mt-4">
        <div className="inline-flex bg-zinc-900 rounded-xl p-1 border border-zinc-800">
          {[
            { key: 'post', label: 'Post' },
            { key: 'comments', label: 'Comments' },
            { key: 'dm', label: 'DM' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key as 'post' | 'comments' | 'dm')}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === tab.key 
                  ? 'bg-white text-black shadow-md' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PhonePreview;
