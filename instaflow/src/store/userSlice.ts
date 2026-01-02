import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UserProfile } from '../types';

const getInitialLoginStatus = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('isLoggedIn') === 'true';
};

const getInitialIGConnectionStatus = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('isIGConnected') === 'true';
};


const baseProfile: UserProfile = {
  username: '',
  fullName: '',
  profilePic: '',
  profilePictureUrl: '',
  followers: 0,
  followersCount: 0,
  followingCount: 0,
  following: 0,
  isLoggedIn: getInitialLoginStatus(),
  isIGConnected: getInitialIGConnectionStatus(),
  email: '',
  igName: ''
};

type UserState = {
  profile: UserProfile;
};

const initialState: UserState = {
  profile: { ...baseProfile },
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserProfile(state, action: PayloadAction<Partial<UserProfile>>) {
      state.profile = { ...state.profile, ...action.payload };
    },
    setLoginStatus(state, action: PayloadAction<boolean>) {
      state.profile.isLoggedIn = action.payload;
    },
    resetUser(state) {
      state.profile = { ...baseProfile, isLoggedIn: false };
    },
  },
});

export const { setUserProfile, setLoginStatus, resetUser } = userSlice.actions;
export default userSlice.reducer;
