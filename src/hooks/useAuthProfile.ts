import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { profileApi } from '../services/profileApi';
import { getUserInitials } from '../utils/userInitials';
import { readCachedProfilePhoto, writeCachedProfilePhoto } from '../utils/profileImage';

export function useAuthProfile() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  const syncPhoto = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setPhotoURL(null);
      return;
    }

    const cached = readCachedProfilePhoto(nextUser.uid);
    if (cached) {
      setPhotoURL(cached);
    } else if (nextUser.photoURL) {
      setPhotoURL(nextUser.photoURL);
    }

    try {
      const profile = await profileApi.get();
      if (profile.photoURL) {
        setPhotoURL(profile.photoURL);
        writeCachedProfilePhoto(nextUser.uid, profile.photoURL);
      }
    } catch {
      if (!cached && nextUser.photoURL) {
        setPhotoURL(nextUser.photoURL);
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const current = auth.currentUser;
    setUser(current);
    await syncPhoto(current);
  }, [syncPhoto]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      void syncPhoto(nextUser).finally(() => setLoading(false));
    });
    return unsub;
  }, [syncPhoto]);

  const displayName = user?.displayName ?? '';
  const email = user?.email ?? '';
  const initials = useMemo(() => getUserInitials(displayName, email), [displayName, email]);

  const setProfilePhotoURL = useCallback((url: string | null) => {
    setPhotoURL(url);
    const uid = auth.currentUser?.uid;
    if (uid && url) writeCachedProfilePhoto(uid, url);
  }, []);

  return {
    user,
    loading,
    displayName,
    email,
    photoURL,
    initials,
    memberSince: user?.metadata.creationTime,
    refreshProfile,
    setProfilePhotoURL,
  };
}
