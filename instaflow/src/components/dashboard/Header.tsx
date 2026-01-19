
import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import type { UserProfile } from '../../types';
import UserAvatar from '../shared/UserAvatar';

interface HeaderProps {
  user: UserProfile;
  onProfileClick?: () => void;
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onProfileClick, onMenuClick }) => {
  const isLoading = !user.fullName && !user.igName;

  return (
    <header className="h-16 md:h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-8 shrink-0 z-10">
      {/* Mobile Menu Button */}
      <button 
        onClick={onMenuClick}
        className="md:hidden p-2 hover:bg-gray-100 rounded-xl text-gray-600"
      >
        <Menu size={24} />
      </button>

      {/* Search Bar - Hidden on mobile */}
      <div className="flex-1 max-w-xl hidden md:block">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search keywords, posts, or logs..." 
            className="w-full bg-gray-50 border border-transparent rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3 md:space-x-6 ml-auto md:ml-4">
        <button className="relative text-gray-400 hover:text-indigo-600 transition-colors p-2 hover:bg-gray-50 rounded-xl">
          <Bell size={20} className="md:w-[22px] md:h-[22px]" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>        
        <div 
          className="flex items-center space-x-2 md:space-x-4 pl-3 md:pl-6 border-l border-gray-100 cursor-pointer hover:opacity-80 transition-opacity group"
          onClick={onProfileClick}
        >
          <div className="text-right hidden sm:block">
            {isLoading ? (
              <>
                <div className="skeleton h-4 w-24 rounded-lg mb-1"></div>
                <div className="skeleton h-3 w-16 rounded-lg"></div>
              </>
            ) : (
              <>
                <p className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{user.igName ? user.igName : user.fullName}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{user.username ? `@${user.username}` : ''}</p>
              </>
            )}
          </div>
          {isLoading ? (
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl skeleton"></div>
          ) : (
            <UserAvatar user={{username: user.fullName ? user.fullName : user.username || '', profilePictureUrl:user.profilePictureUrl, profilePic:user.profilePic}} />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

