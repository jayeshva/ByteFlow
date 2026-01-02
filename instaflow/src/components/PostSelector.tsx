
import React, { useState } from 'react';
import type { InstagramPost } from '../types';
import { Clapperboard, Eye, Heart, MessageCircle, RefreshCw, Zap, CheckCircle } from 'lucide-react';

interface PostSelectorProps {
  onSelectPost: (post: InstagramPost) => void;
  onSyncPosts: () => void;
  onViewPost: (post: InstagramPost) => void;
  posts: InstagramPost[];
  isSyncing?: boolean;
  automatedPostIds?: string[];  // List of post IDs that have automations
}

// Skeleton card component for loading state
const PostSkeleton: React.FC = () => (
  <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm flex flex-col">
    <div className="aspect-square skeleton"></div>
    <div className="p-5 flex-1 flex flex-col space-y-3">
      <div className="skeleton h-3 w-full rounded-lg"></div>
      <div className="skeleton h-3 w-3/4 rounded-lg"></div>
      <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
        <div className="skeleton h-3 w-16 rounded-lg"></div>
        <div className="skeleton h-6 w-20 rounded-full"></div>
      </div>
    </div>
  </div>
);

const PostSelector: React.FC<PostSelectorProps> = ({
  onSelectPost,
  onSyncPosts,
  posts,
  onViewPost,
  isSyncing,
  automatedPostIds = [],
}) => {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  
  const isLoading = isSyncing && posts.length === 0;

  // Check if a post has automation
  const isPostAutomated = (postId: string) => automatedPostIds.includes(postId);

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Your Feeds</h1>
          <p className="text-gray-500 font-medium">Select a reel or post to view comments and setup automation</p>
        </div>
        <div className="flex space-x-3">
        
            <button
          onClick={onSyncPosts}
          disabled={isSyncing}
          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center space-x-2 shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Feed'}</span>
        </button>
        </div>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          // Show skeleton cards while loading
          [...Array(8)].map((_, index) => (
            <PostSkeleton key={`skeleton-${index}`} />
          ))
        ) : (
          posts.map((post) => {
            const hasAutomation = isPostAutomated(post.id);
            
            return (
          <div 
            key={post.id} 
            className="group relative bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer flex flex-col"
          >
            <div className="aspect-square relative overflow-hidden bg-gray-100" onClick={() => onSelectPost(post)}>
              {post.mediaType === 'VIDEO' ? (
               <img 
                  src={post.thumbnailURL || post.mediaUrl} 
                  alt={post.caption} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <img 
                  src={post.mediaUrl} 
                  alt={post.caption} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              )}
              
              {post.mediaType === 'VIDEO' && activeVideoId !== post.id && (
                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md p-2 rounded-xl text-white">
                  <Clapperboard size={16} />
                </div>
              )}

              {/* Automated indicator badge */}
              {hasAutomation && (
                <div className="absolute top-4 left-4 bg-emerald-500 text-white px-2.5 py-1 rounded-lg flex items-center space-x-1.5 shadow-lg">
                  <Zap size={12} fill="white" />
                  <span className="text-[10px] font-black uppercase tracking-wide">Active</span>
                </div>
              )}

              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center space-y-4 text-white p-6">
                <button 
                  onClick={(e) => { e.stopPropagation(); onViewPost(post); }}
                  className="w-full py-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 text-xs font-black uppercase tracking-[0.2em] hover:bg-white hover:text-indigo-600 transition-all flex items-center justify-center space-x-2"
                >
                  <Eye size={16} />
                  <span>Inspect Post</span>
                </button>
                <div className="flex space-x-6">
                  <div className="flex flex-col items-center">
                    <Heart size={20} fill="white" />
                    <span className="font-black text-xs">{post.likes}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <MessageCircle size={20} fill="white" />
                    <span className="font-black text-xs">{post.comments}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-5 flex-1 flex flex-col" onClick={() => onSelectPost(post)}>
              <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-relaxed mb-4">
                {post.caption || 'No caption provided.'}
              </p>
              <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                   <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{post.timestamp}</span>
                   {post.mediaType === 'VIDEO' && <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest border border-indigo-100 px-2 py-0.5 rounded-lg">Reel</span>}
                </div>
                {hasAutomation ? (
                  <span className="text-[9px] bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full font-black uppercase flex items-center space-x-1">
                    <CheckCircle size={10} />
                    <span>Automated</span>
                  </span>
                ) : (
                  <button className="text-[9px] bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full font-black uppercase hover:bg-indigo-600 hover:text-white transition-all flex items-center space-x-1">
                    <Zap size={10} />
                    <span>Automate</span>
                  </button>
                )}
              </div>
            </div>
          </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PostSelector;
