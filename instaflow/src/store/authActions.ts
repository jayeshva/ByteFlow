import type { AppDispatch } from './store';
import { setLoginStatus, setUserProfile, resetUser } from './userSlice';
import { setStorageItem, removeStorageItem } from '../lib/utils';
import { MetaApiService } from '../services/api';

export const handleLoginSuccess = (result: any) => async (dispatch: AppDispatch) => {
    // 1. Update Storage
    setStorageItem('accessToken', result.accessToken || '');
    setStorageItem('refreshToken', result.refreshToken || '');
    setStorageItem('isLoggedIn', 'true');
    setStorageItem('isIGConnected', result.user.isIGConnected ? 'true' : 'false');

    // 2. Fetch IG Profile if connected
    if (result.user.isIGConnected) {
        try {
            const igProfile = await MetaApiService.metaProfile();
            if (igProfile) {
                dispatch(setUserProfile({
                    isIGConnected: true,
                    username: igProfile.username,
                    igName: igProfile.name,
                    profilePic: igProfile.profile_pic_url,
                    profilePictureUrl: igProfile.profile_pic_url,
                    followersCount: igProfile.followers_count,
                    followingCount: igProfile.follows_count,
                }));
            }
        } catch (error) {
            console.error('Failed to fetch IG profile during login:', error);
            dispatch(setUserProfile({ isIGConnected: true }));
        }
    } else {
        dispatch(setUserProfile({ isIGConnected: false }));
    }

    // 3. Update Redux Login Status
    dispatch(setLoginStatus(true));
};

export const handleLogout = () => (dispatch: AppDispatch) => {
    // 1. Clear Storage
    removeStorageItem('accessToken');
    removeStorageItem('refreshToken');
    removeStorageItem('isLoggedIn');
    removeStorageItem('isIGConnected');

    // 2. Reset Redux
    dispatch(resetUser());
};
