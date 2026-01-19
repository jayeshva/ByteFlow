import { useState } from "react";

interface UserAvatarProps {
  user: {
    profilePictureUrl?: string;
    profilePic?: string;
    username: string;
  };
}



function UserAvatar({ user }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  const imageSrc = user.profilePictureUrl || user.profilePic;
  const firstLetter = user.username.charAt(0).toUpperCase();
   console.log("user",user)
  const handleImageError = () => {

    setImageError(true);
  };

  if (imageError || !imageSrc) {
    return (
      <div className="relative w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-sm border-2 border-indigo-50">
        <span className="text-white font-semibold text-sm">{firstLetter}</span>
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      <img 
        src={imageSrc}
        alt={user.username}
        onError={handleImageError}
        className="w-10 h-10 rounded-2xl object-cover border-2 border-indigo-50 p-0.5 shadow-sm"
      />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
    </div>
  );
}

export default UserAvatar;