import { useEffect } from "react";
import { MetaApiService } from "../services/api";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { setUserProfile } from "../store/userSlice";

const useMetaProfile = () => {
  const user = useSelector((state: RootState) => state.user.profile);
  const dispatch = useDispatch();

  const fetchProfile = async () => {
    try {
      if (!user.isLoggedIn) return;
      const response = await MetaApiService.metaProfile();
    //   console.log("Instagram Profile:", response);
      dispatch(
        setUserProfile({
          username: response.username,
          igName: response.name,
          profilePic: response.profile_picture_url,
          profilePictureUrl: response.profile_picture_url,
          followersCount: response.followers_count,
          followingCount: response.follows_count,
          isIGConnected: response.isIGconnected,
          fullName: response.userFullName,
          email: response.userEmail,
        })
      );
      return response;
    } catch (error) {
      console.error("Error fetching Instagram profile:", error);
    }
  };

  useEffect(() => {
    // Refetch profile when login status or IG connection status changes
    if (user.isLoggedIn) {
      fetchProfile();
    }
  }, [user.isLoggedIn, user.isIGConnected]);

  return { user };
};

export default useMetaProfile;

