
import React from 'react';

interface PhoneMockupProps {
  username: string;
  message: string;
  profilePic: string;
}

const PhoneMockup: React.FC<PhoneMockupProps> = ({ username, message, profilePic }) => {
  return (
    <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[500px] w-[250px] shadow-xl">
      <div className="w-[124px] h-[18px] bg-gray-800 top-0 left-1/2 -translate-x-1/2 absolute rounded-b-2xl"></div>
      <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
      <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
      <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
      <div className="rounded-[2rem] overflow-hidden w-full h-full bg-white flex flex-col">
        {/* Instagram Header */}
        <div className="p-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-200">
            <img src={profilePic} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold">{username}</p>
            <p className="text-[8px] text-gray-400">Active now</p>
          </div>
        </div>
        
        {/* Chat Area */}
        <div className="flex-1 p-3 flex flex-col justify-end space-y-2 bg-gray-50">
          <div className="max-w-[80%] bg-indigo-600 text-white p-2 rounded-2xl rounded-tr-sm self-end shadow-sm">
            <p className="text-[10px] leading-tight">
              {message || "Type your response to see preview..."}
            </p>
          </div>
          <div className="text-[8px] text-gray-400 self-end mr-1">Seen</div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 flex items-center space-x-2">
          <div className="flex-1 h-6 bg-gray-100 rounded-full flex items-center px-3">
            <div className="w-full h-2 bg-gray-200 rounded-full"></div>
          </div>
          <div className="w-4 h-4 rounded-full bg-indigo-100"></div>
        </div>
      </div>
    </div>
  );
};

export default PhoneMockup;
