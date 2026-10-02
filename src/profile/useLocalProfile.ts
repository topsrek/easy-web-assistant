import { useCallback, useState } from 'react';
import { emptyProfile, profileSchema, type Profile } from '../../shared/schema';
import { readLocalProfile, removeLocalProfile, writeLocalProfile } from './storage';

export function useLocalProfile() {
  const [loaded] = useState(() => readLocalProfile());
  const [profile, setProfile] = useState<Profile>(loaded.profile);
  const [completed, setCompleted] = useState(loaded.completed);
  const [storageError, setStorageError] = useState<string | null>(loaded.error);

  const saveProfile = useCallback((nextProfile: Profile): boolean => {
    const parsed = profileSchema.safeParse(nextProfile);
    if (!parsed.success) {
      setStorageError('This profile could not be saved because some details are invalid.');
      return false;
    }
    setProfile(parsed.data);
    setCompleted(true);
    const saved = writeLocalProfile(parsed.data);
    setStorageError(saved ? null : 'Your changes are only available in this browser session because browser storage is unavailable.');
    return saved;
  }, []);

  const deleteProfile = useCallback((): boolean => {
    const removed = removeLocalProfile();
    if (removed) {
      setProfile(emptyProfile);
      setCompleted(false);
      setStorageError(null);
      return true;
    }

    setStorageError('Your saved profile could not be deleted. It is still stored in this browser.');
    return false;
  }, []);

  return {
    profile,
    completed,
    storageError,
    saveProfile,
    deleteProfile,
  };
}
