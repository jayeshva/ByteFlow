
import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, MessageCircle, Play, Pause, Clapperboard, Calendar, AlertCircle, Loader2, Volume2, VolumeX } from 'lucide-react';
import type { InstagramPost } from '../types';
import { MetaApiService } from '../services/api';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

interface PostDetailModalProps {
  post: InstagramPost;
  onClose: () => void;
}

interface Reply {
  id: string;
  text: string;
  username: string;
  timestamp: string;
}

interface Comment {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  replies: Reply[];
}

const PostDetailModal: React.FC<PostDetailModalProps> = ({ post, onClose }) => {
  const user = useSelector((state: RootState) => state.user.profile);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch comments when modal opens
  useEffect(() => {
    const loadComments = async () => {
      setIsLoadingComments(true);
      try {
        const result = await MetaApiService.fetchComments(post.id);
        setComments(result.comments);
        setNextCursor(result.paging.nextCursor);
        setHasMore(result.paging.hasMore);
      } catch (error) {
        console.error('Failed to load comments:', error);
      } finally {
        setIsLoadingComments(false);
      }
    };
    loadComments();
  }, [post.id]);

  // Load more comments
  const loadMoreComments = async () => {
    if (!nextCursor || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const result = await MetaApiService.fetchComments(post.id, nextCursor);
      setComments(prev => [...prev, ...result.comments]);
      setNextCursor(result.paging.nextCursor);
      setHasMore(result.paging.hasMore);
    } catch (error) {
      console.error('Failed to load more comments:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-[3rem] w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in zoom-in duration-300">
        
        {/* Left: Media View */}
        <div className="w-full md:w-3/5 bg-black flex items-center justify-center relative group cursor-pointer" onClick={togglePlay}>
          {post.mediaType === 'VIDEO' ? (
            <>
              {isVideoLoading && <Loader2 className="absolute text-white animate-spin" size={32} />}
              {videoError ? (
                <div className="flex flex-col items-center text-white p-8 text-center space-y-4">
                  <AlertCircle size={48} className="text-red-500" />
                  <p className="text-sm font-bold">Video format not supported or link expired</p>
                </div>
              ) : (
                <video 
                  ref={videoRef}
                  src={post.mediaUrl} 
                  className={`w-full h-full object-contain transition-opacity duration-300 ${isVideoLoading ? 'opacity-0' : 'opacity-100'}`}
                  loop
                  muted={isMuted}
                  playsInline
                  onCanPlay={() => setIsVideoLoading(false)}
                  onError={() => { setVideoError(true); setIsVideoLoading(false); }}
                />
              )}
              
              {/* Play/Pause Center Overlay */}
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100 bg-black/20'}`}>
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-2xl">
                  {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} className="ml-1" fill="white" />}
                </div>
              </div>

              {/* Audio Toggle Top Right */}
              <button 
                onClick={toggleMute} 
                className="absolute top-8 right-8 p-3 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white transition-all hover:bg-white/20 active:scale-95 z-10"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              <div className="absolute top-8 left-8 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl text-white flex items-center space-x-2 border border-white/10">
                <Clapperboard size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Reel</span>
              </div>
            </>
          ) : (
            <img src={post.mediaUrl} className="w-full h-full object-contain" />
          )}
        </div>

        {/* Right: Comments & Info */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Top Bar */}
          <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-4">
               <div className="w-12 h-12 rounded-xl instagram-gradient p-0.5 shrink-0">
                  <div className="w-full h-full bg-white rounded-xl p-0.5 overflow-hidden">
                    {user.profilePictureUrl ? (
                      <img 
                        src={user.profilePictureUrl} 
                        alt={user.username} 
                        className="w-full h-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-lg instagram-gradient flex items-center justify-center text-white font-bold">
                        {user.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
               </div>
               <div>
                 <p className="text-sm font-black text-gray-900">@{user.username || 'User'}</p>
                 <div className="flex items-center space-x-2 text-[10px] font-bold text-gray-400">
                   <Calendar size={12} />
                   <span>{post.timestamp}</span>
                 </div>
               </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
            {/* Caption Section */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Caption</h3>
              <div className="text-sm text-gray-800 leading-relaxed font-medium bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="whitespace-pre-wrap break-words">{post.caption}</p>
              </div>

              <div className="flex space-x-6 px-2">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Heart size={18} fill="#ef4444" className="text-red-500" />
                  <span className="text-xs font-black">{post.likes.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <MessageCircle size={18} className="text-indigo-600" />
                  <span className="text-xs font-black">{post.comments} Comments</span>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Community Buzz</h3>
              <div className="space-y-4">
                {isLoadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-indigo-600" size={24} />
                    <span className="ml-3 text-sm text-gray-500">Loading comments...</span>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-400">No comments yet</p>
                  </div>
                ) : (
                  <>
                    {comments.map((comment) => (
                      <div key={comment.id} className="space-y-3">
                        {/* Main Comment */}
                        <div className="p-5 bg-white rounded-2xl border border-gray-100 flex items-start space-x-4">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                            {comment.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-black text-gray-900">@{comment.username}</span>
                              <span className="text-[9px] font-bold text-gray-300">{comment.timestamp}</span>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed font-medium">{comment.text}</p>
                          </div>
                        </div>
                        
                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-8 space-y-2">
                            <div className="flex items-center space-x-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                              <div className="w-4 h-px bg-gray-200"></div>
                              <span>{comment.replies.length} {comment.replies.length === 1 ? 'Reply' : 'Replies'}</span>
                            </div>
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start space-x-3">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white text-[10px] font-bold shadow-sm shrink-0">
                                  {reply.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[11px] font-bold text-gray-800">@{reply.username}</span>
                                    <span className="text-[8px] font-bold text-gray-300">{reply.timestamp}</span>
                                  </div>
                                  <p className="text-[11px] text-gray-500 leading-relaxed">{reply.text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Load More Button */}
                    {hasMore && (
                      <button
                        onClick={loadMoreComments}
                        disabled={isLoadingMore}
                        className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="animate-spin" size={14} />
                            <span>Loading more...</span>
                          </>
                        ) : (
                          <span>Load More Comments</span>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetailModal;
